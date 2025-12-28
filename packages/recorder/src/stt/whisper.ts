/**
 * OpenAI Whisper API client for speech-to-text conversion
 */

import OpenAI from 'openai';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import type { Config } from '../types.js';
import { logger } from '../lib/logger.js';

export class WhisperClient {
  private client: OpenAI;

  constructor(config: Config) {
    this.client = new OpenAI({
      apiKey: config.openaiApiKey,
    });
  }

  /**
   * Convert audio file to text using Whisper API
   */
  async convertToText(audioFilePath: string): Promise<string> {
    logger.info('Converting audio to text with Whisper', { audioFilePath });

    try {
      // Check file size (Whisper has 25MB limit)
      const fileStats = await stat(audioFilePath);
      const fileSizeMB = fileStats.size / (1024 * 1024);

      if (fileSizeMB > 25) {
        throw new Error(
          `File size ${fileSizeMB.toFixed(2)}MB exceeds Whisper API limit of 25MB`
        );
      }

      logger.debug('Audio file stats', {
        size: fileStats.size,
        sizeMB: fileSizeMB.toFixed(2),
      });

      // Create file stream
      const fileStream = createReadStream(audioFilePath);

      // Call Whisper API
      const transcription = await this.client.audio.transcriptions.create({
        file: fileStream as any,
        model: 'whisper-1',
        language: 'ko', // Korean
        response_format: 'text',
      });

      logger.info('Transcription completed', {
        textLength: transcription.length,
      });

      return transcription;
    } catch (error) {
      logger.error('Whisper API failed', { audioFilePath, error });
      throw error;
    }
  }
}
