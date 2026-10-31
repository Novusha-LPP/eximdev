// Protects module saves from overwriting changes other users made after this page loaded.
// The page keeps a copy of the job as loaded and sends, with each save, the loaded values of the
// fields it is saving (__base). The server then keeps other users' newer values for fields this
// page did not change. Deploy the server before this client: older servers do not strip
// __base (DO Billing would reject the request as an unknown field).

import { isJobLiveSyncEnabled } from "./jobRealtime";

// Deep copy of the job as received, so later in-page edits cannot change it
export const snapshotJob = (job) => (job ? JSON.parse(JSON.stringify(job)) : null);

export const withLoadedBase = (payload, loadedJob) => {
  if (!isJobLiveSyncEnabled() || !loadedJob || !payload || typeof payload !== "object") return payload;
  const base = {};
  Object.keys(payload).forEach((key) => {
    if (key !== "_id" && key !== "jobId" && Object.prototype.hasOwnProperty.call(loadedJob, key)) {
      base[key] = loadedJob[key];
    }
  });
  return { ...payload, __base: base };
};
