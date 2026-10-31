import cluster from "cluster";
import { EventEmitter } from "events";

/**
 * Job change bus: tells every worker process that one or more jobs changed.
 *
 * Workers forward events to the cluster primary, which relays them to all workers
 * (including the sender). In single-process mode events are emitted locally.
 *
 * Event payload: { ids: string[] | null, years: string[], by: string | null, source: string }
 *   ids === null means "some jobs changed, ids unknown" (e.g. updateMany / bulk import).
 */

const MESSAGE_TYPE = "exim:job-change";
const FLUSH_DELAY_MS = 150;

// Kill switch: JOB_REALTIME_ENABLED=false stops all job change events (live pages,
// cross-worker cache sync and instant reconciliation), restoring the previous behaviour.
export const isJobRealtimeEnabled = () => process.env.JOB_REALTIME_ENABLED !== "false";

const emitter = new EventEmitter();
emitter.setMaxListeners(50);

let initialized = false;

// Pending events batched per (source, by) so bursts of writes become one message
const pending = new Map();
let flushTimer = null;

const deliver = (payload) => {
  if (cluster.isWorker && typeof process.send === "function") {
    try {
      process.send({ type: MESSAGE_TYPE, payload });
      return;
    } catch (err) {
      console.error("[JobChangeBus] IPC send failed, emitting locally:", err.message);
    }
  }
  emitter.emit("change", payload);
};

const flush = () => {
  flushTimer = null;
  for (const entry of pending.values()) {
    deliver({
      ids: entry.broad ? null : [...entry.ids],
      years: [...entry.years],
      by: entry.by,
      source: entry.source,
    });
  }
  pending.clear();
};

/**
 * Publish a job change. Never throws.
 * @param {{ ids?: Array<string|object>|null, years?: string[], by?: string|null, source?: string }} change
 */
export function publishJobChange({ ids = null, years = [], by = null, source = "write" } = {}) {
  if (!isJobRealtimeEnabled()) return;
  try {
    const key = `${source}|${by || ""}`;
    let entry = pending.get(key);
    if (!entry) {
      entry = { ids: new Set(), years: new Set(), by: by || null, source, broad: false };
      pending.set(key, entry);
    }
    if (ids === null) {
      entry.broad = true;
    } else {
      ids.filter(Boolean).forEach((id) => entry.ids.add(String(id)));
    }
    years.filter(Boolean).forEach((y) => entry.years.add(String(y)));

    if (!flushTimer) {
      flushTimer = setTimeout(flush, FLUSH_DELAY_MS);
    }
  } catch (err) {
    console.error("[JobChangeBus] publish failed:", err.message);
  }
}

/**
 * Subscribe to job changes in this process. Returns an unsubscribe function.
 */
export function onJobChange(listener) {
  const safeListener = (payload) => {
    try {
      const result = listener(payload);
      if (result && typeof result.catch === "function") {
        result.catch((err) => console.error("[JobChangeBus] listener failed:", err));
      }
    } catch (err) {
      console.error("[JobChangeBus] listener failed:", err);
    }
  };
  emitter.on("change", safeListener);
  return () => emitter.off("change", safeListener);
}

/**
 * Wire up IPC. Call once in the primary (relay) and once in each worker (receive).
 */
export function initJobChangeBus() {
  if (initialized) return;
  initialized = true;

  if (cluster.isPrimary) {
    cluster.on("message", (_worker, message) => {
      if (message?.type !== MESSAGE_TYPE) return;
      for (const id in cluster.workers) {
        const target = cluster.workers[id];
        if (target?.isConnected()) {
          try {
            target.send(message);
          } catch (err) {
            console.error("[JobChangeBus] relay failed:", err.message);
          }
        }
      }
    });
  } else {
    process.on("message", (message) => {
      if (message?.type === MESSAGE_TYPE) {
        emitter.emit("change", message.payload);
      }
    });
  }
}
