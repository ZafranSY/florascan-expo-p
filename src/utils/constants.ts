export const API_CONFIG = {
  BASE_URL: 'https://api.florascan.example.com', // Replace with real base URL
  TIMEOUT: 5000,
} as const;

export const ML_THRESHOLDS = {
  HIGH_CONFIDENCE: 0.90,
  MODERATE_CONFIDENCE: 0.75,
  LOW_CONFIDENCE: 0.60,
} as const;

export const R2_PUBLIC_BASE = 'https://pub-bbe8c96eef00421cbf1ba209727a8ee6.r2.dev';

export const resolveImageUri = (uri: string | null | undefined): string | null => {
  if (!uri) return null;
  if (
    uri.startsWith('http://') ||
    uri.startsWith('https://') ||
    uri.startsWith('file://') ||
    uri.startsWith('data:')
  ) {
    return uri;
  }
  return `${R2_PUBLIC_BASE}/${uri}`;
};

