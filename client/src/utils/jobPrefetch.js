import axios from "axios";

// Starts loading a job while the pointer is still over its link, so the job page opens with the data
// already on its way. One entry per URL, used once and dropped after a few seconds.
const prefetched = new Map();
const MAX_AGE_MS = 15000;

export const prefetchJob = (url) => {
  const existing = prefetched.get(url);
  if (existing && Date.now() - existing.ts < MAX_AGE_MS) return;
  const promise = axios.get(url);
  promise.catch(() => prefetched.delete(url)); // a failed prefetch is simply forgotten
  prefetched.set(url, { promise, ts: Date.now() });
};

export const takePrefetchedJob = (url) => {
  const entry = prefetched.get(url);
  prefetched.delete(url);
  return entry && Date.now() - entry.ts < MAX_AGE_MS ? entry.promise : null;
};
