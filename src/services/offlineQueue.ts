import NetInfo from '@react-native-community/netinfo';
import { db } from './databaseService';
import { apiService } from './api';
import { ScanResult } from '@/models/ScanResult';

export class OfflineQueueService {
  private static instance: OfflineQueueService;

  private constructor() {}

  static getInstance(): OfflineQueueService {
    if (!OfflineQueueService.instance) {
      OfflineQueueService.instance = new OfflineQueueService();
    }
    return OfflineQueueService.instance;
  }

  saveScanLocally(scan: ScanResult) {
    try {
      db.runSync(
        `INSERT OR REPLACE INTO scans (id, disease, confidence, modelVersion, imageUri, scannedAt, isSynced, treatment, secondary_disease, secondary_confidence) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          scan.id,
          scan.disease,
          scan.confidence,
          scan.modelVersion,
          scan.imageUri,
          scan.scannedAt instanceof Date ? scan.scannedAt.toISOString() : (scan.scannedAt as any),
          scan.isSynced ? 1 : 0,
          scan.treatment || null,
          scan.secondaryDisease || null,
          scan.secondaryConfidence !== undefined && scan.secondaryConfidence !== null ? scan.secondaryConfidence : null
        ]
      );
      console.log(`Scan ${scan.id} saved locally with secondary disease info if any`);
    } catch (error) {
      console.error('Failed to save scan locally', error);
      throw error;
    }
  }

  getPendingScans(): ScanResult[] {
    try {
      const rows = db.getAllSync<any>(
        'SELECT * FROM scans WHERE isSynced = 0 ORDER BY scannedAt DESC'
      );

      return rows.map(row => ({
        ...row,
        scannedAt: new Date(row.scannedAt), // Convert ISO string back to Date
        isSynced: row.isSynced === 1,
        treatment: row.treatment || null,
        secondaryDisease: row.secondary_disease || null,
        secondaryConfidence: row.secondary_confidence !== null && row.secondary_confidence !== undefined ? Number(row.secondary_confidence) : null
      }));
    } catch (error) {
      console.error('Failed to get pending scans', error);
      return [];
    }
  }

  getAllScans(): ScanResult[] {
    try {
      const rows = db.getAllSync<any>(
        'SELECT * FROM scans ORDER BY scannedAt DESC'
      );

      return rows.map(row => ({
        ...row,
        scannedAt: new Date(row.scannedAt),
        isSynced: row.isSynced === 1,
        treatment: row.treatment || null,
        secondaryDisease: row.secondary_disease || null,
        secondaryConfidence: row.secondary_confidence !== null && row.secondary_confidence !== undefined ? Number(row.secondary_confidence) : null
      }));
    } catch (error) {
      console.error('Failed to get all scans', error);
      return [];
    }
  }

  markAsSynced(id: string, imageUri?: string) {
    try {
      if (imageUri) {
        db.runSync(
          'UPDATE scans SET isSynced = 1, imageUri = ? WHERE id = ?',
          [imageUri, id]
        );
      } else {
        db.runSync(
          'UPDATE scans SET isSynced = 1 WHERE id = ?',
          [id]
        );
      }
      console.log(`Scan ${id} marked as synced (imageUri updated: ${!!imageUri})`);
    } catch (error) {
      console.error(`Failed to mark scan ${id} as synced`, error);
      throw error;
    }
  }

  async syncOfflineScans() {
    const state = await NetInfo.fetch();
    if (!state.isConnected) {
      console.log('Skipping sync: Device is offline');
      return;
    }

    const pendingScans = this.getPendingScans();
    if (pendingScans.length === 0) return;

    console.log(`Attempting to sync ${pendingScans.length} pending scans...`);

    const readyToSync = [];

    for (const scan of pendingScans) {
      try {
        if (scan.imageUri && scan.imageUri.startsWith('file://')) {
          // Upload local image to Cloudflare R2 first
          const file_key = await apiService.uploadImageToR2(scan.imageUri);
          scan.imageUri = file_key; // Reassign so DB stores cloud ref
        }
        readyToSync.push(scan);
      } catch (error) {
        console.error(`Failed to upload image for scan ${scan.id}:`, error);
        // Network hiccup on this image, skip so others can sync
      }
    }

    if (readyToSync.length > 0) {
      try {
        // Simply send the ready-to-sync scans. 
        // The apiService.syncScans will handle the mapping to snake_case.
        await apiService.syncScans(readyToSync);
        
        for (const scan of readyToSync) {
          this.markAsSynced(scan.id, scan.imageUri);
        }
      } catch (error) {
        console.error(`Failed to sync batch to /scans/sync:`, error);
      }
    }
  }

  // Bridging method so dependents don't strictly crash until properly migrated
  async addScanToQueue(scan: ScanResult) {
    this.saveScanLocally(scan);
  }
}

export const offlineQueue = OfflineQueueService.getInstance();
