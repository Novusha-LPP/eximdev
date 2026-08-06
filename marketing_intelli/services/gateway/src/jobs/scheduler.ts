// ─── Job Scheduler ─────────────────────────────────────────────
// services/gateway/src/jobs/scheduler.ts

import { LiveFederationService } from '../services/liveFederation.service.js';
import { logger } from '../config/logger.js';

export async function initScheduler() {
  logger.info('⚡ Initializing Automated Real-Time Database Federation Scheduler...');

  // Initial sync on gateway boot
  LiveFederationService.syncLiveDatabase(true).catch(err => {
    logger.error(err, 'Initial live database federation error');
  });

  // Recurring 60-second real-time sync
  setInterval(() => {
    LiveFederationService.syncLiveDatabase().catch(err => {
      logger.error(err, 'Scheduled live database federation error');
    });
  }, 60_000);
}
