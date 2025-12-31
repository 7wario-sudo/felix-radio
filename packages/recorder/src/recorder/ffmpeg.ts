/**
 * ffmpeg wrapper for HLS stream recording
 * Based on legacy script logic
 */

import { spawn } from 'child_process';
import { logger } from '../lib/logger.js';

export interface RecordingOptions {
  streamUrl: string;
  durationSecs: number;
  outputPath: string;
}

/**
 * Record HLS stream to MP3 file using ffmpeg
 */
export async function recordStream(
  options: RecordingOptions
): Promise<void> {
  const { streamUrl, durationSecs, outputPath } = options;

  logger.info('Starting ffmpeg recording', {
    streamUrl,
    durationSecs,
    outputPath,
  });

  return new Promise((resolve, reject) => {
    // ffmpeg command based on legacy script:
    // -i {stream_url}
    // -t {duration}
    // -codec:a libmp3lame
    // -q:a 4
    // -ac 2
    // -ar 44100
    // {output_file}
    const args = [
      '-i', streamUrl,
      '-t', durationSecs.toString(),
      '-codec:a', 'libmp3lame',
      '-q:a', '4',
      '-ac', '2',
      '-ar', '44100',
      '-y', // Overwrite output file
      outputPath,
    ];

    logger.debug('ffmpeg command', { args: args.join(' ') });

    const ffmpeg = spawn('ffmpeg', args);

    let stderrOutput = '';

    // Capture stderr for progress logging
    ffmpeg.stderr.on('data', (data) => {
      const output = data.toString();
      stderrOutput += output;

      // Log progress (ffmpeg outputs to stderr)
      if (output.includes('time=')) {
        logger.debug('ffmpeg progress', { output: output.trim() });
      }
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        logger.info('Recording completed successfully', { outputPath });
        resolve();
      } else {
        const error = new Error(`ffmpeg exited with code ${code}`);
        logger.error('Recording failed', {
          code,
          stderr: stderrOutput,
        });
        reject(error);
      }
    });

    ffmpeg.on('error', (error) => {
      logger.error('ffmpeg process error', { error });
      reject(error);
    });
  });
}

/**
 * Generate filename based on program name and timestamp
 * Format: {program}_{YYYYMMDD-HHMM}.mp3
 * Uses Korea Standard Time (KST, UTC+9)
 */
export function generateFilename(
  programName: string,
  timestamp: Date
): string {
  // Convert to KST (UTC+9)
  const kstOffset = 9 * 60; // 9 hours in minutes
  const utcTime = timestamp.getTime() + (timestamp.getTimezoneOffset() * 60000);
  const kstTime = new Date(utcTime + (kstOffset * 60000));

  const year = kstTime.getFullYear();
  const month = String(kstTime.getMonth() + 1).padStart(2, '0');
  const day = String(kstTime.getDate()).padStart(2, '0');
  const hour = String(kstTime.getHours()).padStart(2, '0');
  const minute = String(kstTime.getMinutes()).padStart(2, '0');

  const dateStr = `${year}${month}${day}-${hour}${minute}`;
  const safeProgramName = programName.replace(/[^a-zA-Z0-9가-힣_-]/g, '_');

  return `${safeProgramName}_${dateStr}.mp3`;
}
