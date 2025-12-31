/**
 * Recording executor - handles individual recording jobs
 */

import { mkdir, unlink } from 'fs/promises';
import { stat } from 'fs/promises';
import { join } from 'path';
import type { Schedule, Config, RecordingMetadata } from '../types.js';
import { WorkersAPIClient } from '../api/client.js';
import { R2Client } from '../storage/r2Client.js';
import { recordStream, generateFilename } from '../recorder/ffmpeg.js';
import { logger } from '../lib/logger.js';

const TEMP_DIR = '/tmp/felix-recordings';

/**
 * Execute a recording job
 */
export async function executeRecording(
  schedule: Schedule,
  config: Config
): Promise<void> {
  const apiClient = new WorkersAPIClient(config);
  const r2Client = new R2Client(config);

  logger.info('Executing recording', {
    scheduleId: schedule.id,
    program: schedule.program_name,
    duration: schedule.duration_mins,
  });

  // Ensure temp directory exists
  await mkdir(TEMP_DIR, { recursive: true });

  // Generate filename and paths
  const now = new Date();
  const filename = generateFilename(schedule.program_name, now);
  const outputPath = join(TEMP_DIR, filename);
  const r2Key = R2Client.getUserRecordingKey(schedule.user_id, filename);

  let recordingId: number | null = null;

  try {
    // Create recording metadata (status: recording)
    const metadata: RecordingMetadata = {
      user_id: schedule.user_id,
      schedule_id: schedule.id,
      station_id: schedule.station_id,
      program_name: schedule.program_name,
      recorded_at: now.toISOString(),
      duration_secs: schedule.duration_mins * 60,
      file_size_bytes: 0, // Will be updated after recording
      audio_file_path: r2Key,
      status: 'recording',
    };

    recordingId = await apiClient.createRecording(metadata);

    // Record the stream
    await recordStream({
      streamUrl: schedule.stream_url,
      durationSecs: schedule.duration_mins * 60,
      outputPath,
    });

    // Get file size
    const fileStats = await stat(outputPath);

    logger.info('Recording completed', {
      filename,
      size: fileStats.size,
    });

    // Upload to R2
    await r2Client.uploadFile(outputPath, r2Key);

    // Update recording status to completed with file size
    await apiClient.updateRecordingStatus(recordingId, 'completed', undefined, fileStats.size);

    logger.info('Recording job completed successfully', {
      recordingId,
      filename,
    });
  } catch (error) {
    logger.error('Recording job failed', {
      scheduleId: schedule.id,
      error,
    });

    // Update recording status to failed
    if (recordingId) {
      await apiClient.updateRecordingStatus(
        recordingId,
        'failed',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }

    throw error;
  } finally {
    // Clean up temp file
    try {
      await unlink(outputPath);
      logger.debug('Temp file deleted', { outputPath });
    } catch (error) {
      logger.warn('Failed to delete temp file', { outputPath, error });
    }
  }
}
