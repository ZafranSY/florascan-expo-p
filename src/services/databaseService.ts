import { openDatabaseSync } from 'expo-sqlite';

// Create and export a database instance synchronously
export const db = openDatabaseSync('florascan.db');

export function initDB() {
  try {
    db.execSync(`
      CREATE TABLE IF NOT EXISTS scans (
        id TEXT PRIMARY KEY NOT NULL,
        disease TEXT NOT NULL,
        confidence REAL NOT NULL,
        modelVersion TEXT NOT NULL,
        imageUri TEXT NOT NULL,
        scannedAt TEXT NOT NULL,
        isSynced INTEGER DEFAULT 0
      );
    `);
    db.execSync(`
      CREATE TABLE IF NOT EXISTS tip_feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tip_id INTEGER NOT NULL,
        vote INTEGER NOT NULL,
        voted_at TEXT NOT NULL
      );
    `);
    console.log('florascan.db initialized successfully');

    try {
      db.execSync('ALTER TABLE scans ADD COLUMN treatment TEXT;');
      console.log('Successfully added treatment column to scans table');
    } catch (migrationError: any) {
      const errMsg = migrationError?.message || '';
      if (errMsg.includes('duplicate column name') || errMsg.includes('already exists')) {
        console.log('treatment column already exists in scans table');
      } else {
        console.warn('Could not add treatment column:', migrationError);
      }
    }

    try {
      db.execSync('ALTER TABLE scans ADD COLUMN secondary_disease TEXT;');
      console.log('Successfully added secondary_disease column to scans table');
    } catch (migrationError: any) {
      const errMsg = migrationError?.message || '';
      if (errMsg.includes('duplicate column name') || errMsg.includes('already exists')) {
        console.log('secondary_disease column already exists in scans table');
      } else {
        console.warn('Could not add secondary_disease column:', migrationError);
      }
    }

    try {
      db.execSync('ALTER TABLE scans ADD COLUMN secondary_confidence REAL;');
      console.log('Successfully added secondary_confidence column to scans table');
    } catch (migrationError: any) {
      const errMsg = migrationError?.message || '';
      if (errMsg.includes('duplicate column name') || errMsg.includes('already exists')) {
        console.log('secondary_confidence column already exists in scans table');
      } else {
        console.warn('Could not add secondary_confidence column:', migrationError);
      }
    }
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
}

// Call initDB() immediately upon file load so the table is ready
initDB();

export async function logTipFeedback(tipId: number, voteType: number): Promise<boolean> {
  try {
    db.runSync(
      `INSERT INTO tip_feedback (tip_id, vote, voted_at) VALUES (?, ?, ?)`,
      [tipId, voteType, new Date().toISOString()]
    );
    console.log(`Tip feedback logged: tip_id=${tipId}, vote=${voteType}`);
    return true;
  } catch (error) {
    console.error('Failed to log tip feedback:', error);
    return false;
  }
}
