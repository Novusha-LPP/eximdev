// One shared WebSocket to the server's /job-updates endpoint.
// Components subscribe to job ids and/or years and are told when those jobs change,
// then refetch through the normal API. If the socket drops it reconnects with backoff
// and calls onReconnect so subscribers can catch up on anything they missed.

// Kill switch: build with REACT_APP_JOB_LIVE_SYNC=false to turn off live job updates
export const isJobLiveSyncEnabled = () => process.env.REACT_APP_JOB_LIVE_SYNC !== "false";

const listeners = new Set();
let socket = null;
let reconnectTimer = null;
let attempts = 0;
let everConnected = false;
let sent = { jobIds: new Set(), years: new Set() };

const socketUrl = () => {
  try {
    const api = new URL(process.env.REACT_APP_API_STRING || "/api", window.location.origin);
    const protocol = api.protocol === "https:" ? "wss:" : "ws:";
    // Keep any path prefix in front of /api (e.g. https://host/import/api -> wss://host/import/job-updates)
    const prefix = api.pathname.replace(/\/api\/?$/, "").replace(/\/$/, "");
    return `${protocol}//${api.host}${prefix}/job-updates`;
  } catch {
    return null;
  }
};

const wanted = () => {
  const jobIds = new Set();
  const years = new Set();
  listeners.forEach((l) => {
    l.jobIds.forEach((id) => jobIds.add(id));
    l.years.forEach((y) => years.add(y));
  });
  return { jobIds, years };
};

const syncSubscription = () => {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  const next = wanted();
  const added = {
    jobIds: [...next.jobIds].filter((id) => !sent.jobIds.has(id)),
    years: [...next.years].filter((y) => !sent.years.has(y)),
  };
  const removed = {
    jobIds: [...sent.jobIds].filter((id) => !next.jobIds.has(id)),
    years: [...sent.years].filter((y) => !next.years.has(y)),
  };
  try {
    if (added.jobIds.length || added.years.length) socket.send(JSON.stringify({ type: "subscribe", ...added }));
    if (removed.jobIds.length || removed.years.length) socket.send(JSON.stringify({ type: "unsubscribe", ...removed }));
    sent = next;
  } catch {
    // socket closing; resubscribed on reconnect
  }
};

const scheduleReconnect = () => {
  if (reconnectTimer || listeners.size === 0) return;
  const delay = Math.min(30000, 1000 * 2 ** attempts);
  attempts += 1;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, delay);
};

const deliver = (message) => {
  listeners.forEach((l) => {
    const ids = Array.isArray(message.ids) ? message.ids.filter((id) => l.jobIds.has(id)) : null;
    const years = message.years || [];
    const yearMatch = l.years.size > 0 && (years.length === 0 || years.some((y) => l.years.has(y)));
    if ((ids && ids.length > 0) || yearMatch) {
      try {
        l.onChange?.({ ...message, ids });
      } catch (err) {
        console.error("[jobRealtime] listener failed:", err);
      }
    }
  });
};

function connect() {
  if (socket || listeners.size === 0 || typeof WebSocket === "undefined") return;
  const url = socketUrl();
  if (!url) return;

  let ws;
  try {
    ws = new WebSocket(url);
  } catch {
    scheduleReconnect();
    return;
  }
  socket = ws;

  ws.onopen = () => {
    attempts = 0;
    sent = { jobIds: new Set(), years: new Set() };
    syncSubscription();
    if (everConnected) {
      listeners.forEach((l) => {
        try {
          l.onReconnect?.();
        } catch (err) {
          console.error("[jobRealtime] reconnect handler failed:", err);
        }
      });
    }
    everConnected = true;
  };

  ws.onmessage = (event) => {
    let message;
    try {
      message = JSON.parse(event.data);
    } catch {
      return;
    }
    if (message?.type === "job-changed") deliver(message);
  };

  ws.onclose = () => {
    if (socket === ws) socket = null;
    scheduleReconnect();
  };

  ws.onerror = () => {
    try {
      ws.close();
    } catch {
      // ignore
    }
  };
}

/**
 * Subscribe to changes of specific jobs and/or all jobs of some years.
 * @returns {Function} unsubscribe
 */
export function subscribeToJobChanges({ jobIds = [], years = [], onChange, onReconnect }) {
  if (!isJobLiveSyncEnabled()) return () => {};
  const listener = {
    jobIds: new Set(jobIds.filter(Boolean).map(String)),
    years: new Set(years.filter(Boolean).map(String)),
    onChange,
    onReconnect,
  };
  listeners.add(listener);

  if (socket && socket.readyState === WebSocket.OPEN) syncSubscription();
  else connect();

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (socket) {
        const ws = socket;
        socket = null;
        sent = { jobIds: new Set(), years: new Set() };
        try {
          ws.close();
        } catch {
          // ignore
        }
      }
      everConnected = false;
      attempts = 0;
    } else {
      syncSubscription();
    }
  };
}
