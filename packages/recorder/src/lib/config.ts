import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '../../.env') });

interface Config {
  // Workers API
  workersApiUrl: string;
  internalApiKey: string;

  // R2 Storage
  r2AccountId: string;
  r2AccessKeyId: string;
  r2SecretAccessKey: string;
  r2BucketName: string;

  // OpenAI
  openaiApiKey: string;

  // Timezone
  timezone: string;
}

function getEnvVar(name: string, required = true): string {
  const value = process.env[name];
  if (required && !value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value || '';
}

export const appConfig: Config = {
  workersApiUrl: getEnvVar('WORKERS_API_URL'),
  internalApiKey: getEnvVar('INTERNAL_API_KEY'),
  r2AccountId: getEnvVar('R2_ACCOUNT_ID'),
  r2AccessKeyId: getEnvVar('R2_ACCESS_KEY_ID'),
  r2SecretAccessKey: getEnvVar('R2_SECRET_ACCESS_KEY'),
  r2BucketName: getEnvVar('R2_BUCKET_NAME'),
  openaiApiKey: getEnvVar('OPENAI_API_KEY'),
  timezone: getEnvVar('TZ', false) || 'Asia/Seoul',
};

// Set timezone
process.env.TZ = appConfig.timezone;

console.log('[Config] Loaded configuration');
console.log('[Config] Workers API:', appConfig.workersApiUrl);
console.log('[Config] R2 Bucket:', appConfig.r2BucketName);
console.log('[Config] Timezone:', appConfig.timezone);
