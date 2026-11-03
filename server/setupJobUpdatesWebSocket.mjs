import { WebSocketServer } from "ws";
import jwt from "jsonwebtoken";
import { onJobChange } from "./services/jobChangeBus.mjs";

/**
 * Real-time job change notifications at /job-updates.
 *
 * Client -> server: { type: "subscribe" | "unsubscribe", jobIds?: string[], years?: string[] }
 * Server -> client: { type: "job-changed", ids: string[] | null, years: string[], by, source }
 *
 * Only ids and usernames are pushed; clients refetch job data through the normal
 * authenticated API, so branch and importer restrictions still apply.
 */

const MAX_SUBSCRIPTIONS = 500;
const HEARTBEAT_MS = 30000;

const readTokenFromCookie = (cookieHeader = "") => {
  for (const part of cookieHeader.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === "token") {
      try {
        return decodeURIComponent(part.slice(idx + 1).trim());
      } catch {
        return null;
      }
    }
  }
  return null;
};

const authenticate = (request) => {
  const token = readTokenFromCookie(request.headers.cookie);
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET || "fallback_secret_do_not_use_in_prod");
  } catch {
    return null;
  }
};

const toStringList = (value) =>
  Array.isArray(value) ? value.filter((v) => typeof v === "string" && v.length > 0 && v.length < 100) : [];

export function setupJobUpdatesWebSocket() {
  const wss = new WebSocketServer({ noServer: true });
  const clients = new Map(); // ws -> { username, jobIds: Set, years: Set }

  wss.on("connection", (ws, _request, user) => {
    const meta = { username: user?.username || null, jobIds: new Set(), years: new Set() };
    clients.set(ws, meta);
    ws.isAlive = true;

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    ws.on("message", (raw) => {
      let message;
      try {
        message = JSON.parse(raw);
      } catch {
        return;
      }
      if (!message || typeof message !== "object") return;

      const jobIds = toStringList(message.jobIds);
      const years = toStringList(message.years);

      if (message.type === "subscribe") {
        for (const id of jobIds) {
          if (meta.jobIds.size >= MAX_SUBSCRIPTIONS) break;
          meta.jobIds.add(id);
        }
        for (const y of years) {
          if (meta.years.size >= MAX_SUBSCRIPTIONS) break;
          meta.years.add(y);
        }
      } else if (message.type === "unsubscribe") {
        jobIds.forEach((id) => meta.jobIds.delete(id));
        years.forEach((y) => meta.years.delete(y));
      }
    });

    ws.on("close", () => clients.delete(ws));
    ws.on("error", () => clients.delete(ws));
  });

  onJobChange((change) => {
    const changeYears = change.years || [];
    for (const [ws, meta] of clients) {
      if (ws.readyState !== ws.OPEN) continue;

      const matchedIds = Array.isArray(change.ids) ? change.ids.filter((id) => meta.jobIds.has(id)) : [];
      // An event without a year (e.g. update by _id) may belong to any subscribed year
      const yearMatch =
        meta.years.size > 0 && (changeYears.length === 0 || changeYears.some((y) => meta.years.has(y)));

      if (matchedIds.length === 0 && !yearMatch) continue;

      try {
        ws.send(
          JSON.stringify({
            type: "job-changed",
            ids: change.ids === null ? null : matchedIds,
            years: changeYears,
            by: change.by || null,
            source: change.source,
          })
        );
      } catch (err) {
        console.error("[JobUpdatesWS] send failed:", err.message);
      }
    }
  });

  const heartbeat = setInterval(() => {
    for (const ws of clients.keys()) {
      if (ws.isAlive === false) {
        ws.terminate();
        clients.delete(ws);
        continue;
      }
      ws.isAlive = false;
      try {
        ws.ping();
      } catch {
        // socket already closing
      }
    }
  }, HEARTBEAT_MS);
  heartbeat.unref?.();

  return {
    wss,
    handleUpgrade(request, socket, head) {
      const user = authenticate(request);
      if (!user) {
        socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
        socket.destroy();
        return;
      }
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request, user);
      });
    },
  };
}
