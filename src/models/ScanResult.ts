export interface ScanResult {
  id: string;
  disease: string;
  confidence: number;
  modelVersion: string;
  imageUri: string;
  scannedAt: string | Date;
  isSynced: boolean;
  treatment?: string | null;
  secondaryDisease?: string;
  secondaryConfidence?: number;
}


