import { useCallback, useState, useEffect } from 'react';
import { useScanStore } from '@/stores/scanStore';
import { useAuthStore } from '@/stores/authStore';
import { apiService } from '@/services/api';
import { offlineQueue } from '@/services/offlineQueue';
import { ScanResult } from '@/models/ScanResult';

export const useHistoryViewModel = () => {
  const { setScanHistory, setLoading: setStoreLoading, setError: setStoreError, scanHistory, isLoading, error } = useScanStore();
  const { user } = useAuthStore();
  const [isRefreshing, setIsRefreshing] = useState(false);

  /**
   * Fetches history from both local and remote sources, merges them, and sorts by date.
   */
  const fetchHistory = useCallback(async (refresh: boolean = false) => {
    if (refresh) setIsRefreshing(true);
    else setStoreLoading(true);
    
    setStoreError(null);

    try {
      // 1. Fetch all local scans (including synced ones for reliability)
      const localScans = await offlineQueue.getAllScans();
      
      let remoteScans: ScanResult[] = [];
      
      // 2. Try to fetch remote history if user is authenticated
      if (user) {
        try {
          remoteScans = await apiService.getHistory();
        } catch (err) {
          console.log('Failed to fetch remote history, showing local data only.', err);
          // Silent failure for remote sync - we still want to show local data
        }
      }

      // 3. Merge and deduplicate (prioritize local scans for the same ID)
      const mergedMap = new Map<string, ScanResult>();
      
      // Add remote scans first
      remoteScans.forEach(scan => mergedMap.set(scan.id, scan));
      // Merge with local scans (local takes precedence for metadata/sync status, but retains remote treatment if local lacks it)
      localScans.forEach(scan => {
        const existing = mergedMap.get(scan.id);
        if (existing) {
          mergedMap.set(scan.id, {
            ...existing,
            ...scan,
            // Keep treatment if either has it
            treatment: scan.treatment || existing.treatment || null,
            // Keep local URI if available (could be file:// representing local cached image)
            imageUri: scan.imageUri || existing.imageUri,
          });
        } else {
          mergedMap.set(scan.id, scan);
        }
      });
      
      const mergedScans = Array.from(mergedMap.values());

      // 4. Sort by scannedAt descending
      mergedScans.sort((a, b) => {
        const dateA = new Date(a.scannedAt).getTime();
        const dateB = new Date(b.scannedAt).getTime();
        return dateB - dateA;
      });

      setScanHistory(mergedScans);
    } catch (err: any) {
      setStoreError(err.message || 'Failed to load scan history');
    } finally {
      if (refresh) setIsRefreshing(false);
      else setStoreLoading(false);
    }
  }, [user, setScanHistory, setStoreLoading, setStoreError]);

  /**
   * Attempts to sync all pending local scans to the backend.
   */
  const syncPendingScans = useCallback(async () => {
    if (!user) return;

    try {
      setStoreLoading(true);
      
      // Use the centralized offlineQueue sync which handles R2 uploads correctly
      await offlineQueue.syncOfflineScans();

      // Refresh history after sync attempt
      await fetchHistory();
    } catch (err: any) {
      setStoreError(err.message || 'Failed to sync pending scans');
    } finally {
      setStoreLoading(false);
    }
  }, [user, fetchHistory, setStoreLoading, setStoreError]);

  // Handle pull-to-refresh
  const refreshHistory = useCallback(() => fetchHistory(true), [fetchHistory]);

  // Initial load on mount
  useEffect(() => {
    fetchHistory();
    // Also try to sync pending scans on mount if authenticated
    if (user) {
      syncPendingScans();
    }
  }, []); // Only once on mount

  return {
    history: scanHistory,
    isLoading,
    isRefreshing,
    error,
    refreshHistory,
    syncPendingScans,
  };
};
