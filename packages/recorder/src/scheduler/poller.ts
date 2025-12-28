/**
 * Schedule poller - checks for pending recordings every minute
 */

import cron from 'node-cron';
import type { Config } from '../types.js';
import { WorkersAPIClient } from '../api/client.js';
import { executeRecording } from './executor.js';
import { logger } from '../lib/logger.js';

export class SchedulePoller {
  private apiClient: WorkersAPIClient;
  private config: Config;
  private task: cron.ScheduledTask | null = null;

  constructor(config: Config) {
    this.config = config;
    this.apiClient = new WorkersAPIClient(config);
  }

  /**
   * Start polling for pending schedules every minute
   */
  start(): void {
    logger.info('Starting schedule poller (every 1 minute)');

    // Run every minute at the start of the minute
    this.task = cron.schedule('* * * * *', async () => {
      await this.poll();
    });

    logger.info('Schedule poller started');
  }

  /**
   * Stop polling
   */
  stop(): void {
    if (this.task) {
      this.task.stop();
      logger.info('Schedule poller stopped');
    }
  }

  /**
   * Poll for pending schedules and execute recordings
   */
  private async poll(): Promise<void> {
    try {
      const now = new Date();
      const currentTime = this.formatTime(now);
      const currentDay = now.getDay(); // 0-6, Sunday=0

      logger.debug('Polling for pending schedules', { currentTime, currentDay });

      const schedules = await this.apiClient.fetchPendingSchedules(
        currentTime,
        currentDay
      );

      if (schedules.length === 0) {
        logger.debug('No pending schedules');
        return;
      }

      logger.info(`Found ${schedules.length} pending schedule(s)`);

      // Execute all pending recordings in parallel
      const promises = schedules.map((schedule) =>
        executeRecording(schedule, this.config).catch((error) => {
          logger.error('Recording execution failed', {
            scheduleId: schedule.id,
            error,
          });
        })
      );

      await Promise.all(promises);
    } catch (error) {
      logger.error('Poll failed', { error });
    }
  }

  /**
   * Format time as HH:mm
   */
  private formatTime(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }
}
