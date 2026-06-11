import axios from 'axios';
import * as Crypto from 'expo-crypto';
import { useScanStore } from '../stores/scanStore';
import { useSettingsStore } from '../stores/settingsStore';
import { apiService } from '../services/api';
import { inferenceService } from '../services/inferenceService';
import { offlineQueue } from '../services/offlineQueue';
import { loadStaticTreatment } from '../utils/fallbackTreatments';
import { ML_THRESHOLDS } from '../utils/constants';
import { scheduleTreatmentReminders } from '../services/notificationService';

export function useScanViewModel() {
  const { setCurrentScan, setCurrentTreatment, setLoading, setError } = useScanStore();
  const { locale, modelVersion } = useSettingsStore();

  const runScan = async (imageUri: string) => {
    setLoading(true);
    setError(null);

    let inferredDisease: string | null = null;

    try {
      // Step 2: On-Device ML
      let finalResult;
      try {
        // Enforce a 2.5-second timeout on local inference to handle TFJS hangs or initialization delays
        finalResult = await Promise.race([
          inferenceService.runInference(imageUri),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Local inference timeout (2.5s)')), 2500)
          ),
        ]);
        inferredDisease = finalResult.disease;
      } catch (localError) {
        console.warn('Local inference failed or timed out, attempting server detection immediately:', localError);
        const serverDetection = await apiService.detectServer(imageUri);
        finalResult = {
          id: Crypto.randomUUID(), // We need a UUID if local failed
          disease: serverDetection.disease,
          confidence: serverDetection.confidence,
          secondaryDisease: serverDetection.secondaryDisease,
          secondaryConfidence: serverDetection.secondaryConfidence,
          modelVersion: 'server-only',
          imageUri,
          scannedAt: new Date(),
          isSynced: false,
        };
        inferredDisease = serverDetection.disease;
      }
      
      // Step 3: Confidence Gate (Fallback to Server if local was successful but low confidence)
      if (finalResult.modelVersion !== 'server-only' && finalResult.confidence < ML_THRESHOLDS.LOW_CONFIDENCE) {
        try {
          const serverDetection = await apiService.detectServer(imageUri);
          finalResult = {
            ...finalResult,
            disease: serverDetection.disease,
            confidence: serverDetection.confidence,
            secondaryDisease: serverDetection.secondaryDisease,
            secondaryConfidence: serverDetection.secondaryConfidence,
            modelVersion: 'server-fallback'
          };
          inferredDisease = serverDetection.disease;
        } catch (serverError) {
          console.warn('Server fallback detection failed, sticking with local inference:', serverError);
          // If server fails, we just keep the local result
        }
      }

      // Step 4: State Update (Initial local commit)
      setCurrentScan(finalResult);
      offlineQueue.saveScanLocally(finalResult);

      let isSyncedSuccessfully = false;
      try {
        if (finalResult.imageUri && finalResult.imageUri.startsWith('file://')) {
          console.log('Syncing: Uploading local image to Cloudflare R2...');
          const fileKey = await apiService.uploadImageToR2(finalResult.imageUri);
          finalResult.imageUri = fileKey;
          setCurrentScan({ ...finalResult });
        }
        
        console.log(`Syncing: Committing scan ${finalResult.id} to PostgreSQL...`);
        const syncResult = await apiService.syncScans([finalResult]);
        const syncSuccess = syncResult && syncResult.synced_ids && syncResult.synced_ids.includes(finalResult.id);
        
        if (syncSuccess) {
          finalResult.isSynced = true;
          
          // Save locally and update store to reflect synced status
          offlineQueue.saveScanLocally(finalResult);
          setCurrentScan({ ...finalResult });
          isSyncedSuccessfully = true;
          console.log(`Syncing: Scan ${finalResult.id} successfully synced to PostgreSQL.`);
        } else {
          console.warn('Immediate remote sync did not confirm scan commit, scan ID not found in synced_ids.');
        }
      } catch (syncError) {
        console.warn('Immediate remote sync failed, scan remains queued locally:', syncError);
      }

      // Step 5: LLM Treatment / Fallback
      if (isSyncedSuccessfully) {
        try {
          console.log(`LLM: Fetching remote treatment plan for disease: ${finalResult.disease}`);
          const treatment = await apiService.getTreatment(
            finalResult.disease,
            locale,
            finalResult.id,
            finalResult.secondaryDisease
          );
          setCurrentTreatment(treatment);

          if (treatment) {
            finalResult.treatment = JSON.stringify(treatment);
            offlineQueue.saveScanLocally(finalResult);
            setCurrentScan({ ...finalResult });
          }

          if (treatment && treatment.dosage_schedule) {
            scheduleTreatmentReminders(finalResult.disease, treatment.dosage_schedule, locale);
          }
        } catch (treatmentError) {
          console.warn('Failed to fetch treatment from server, using fallback:', treatmentError);
          const fallback = loadStaticTreatment(finalResult.disease);
          setCurrentTreatment(fallback);
          if (fallback) {
            finalResult.treatment = JSON.stringify(fallback);
            offlineQueue.saveScanLocally(finalResult);
            setCurrentScan({ ...finalResult });
          }
        }
      } else {
        console.log('Skipping remote treatment fetch since scan ID is not in remote DB. Loading offline standard treatment.');
        const fallback = loadStaticTreatment(finalResult.disease);
        setCurrentTreatment(fallback);
        if (fallback) {
          finalResult.treatment = JSON.stringify(fallback);
          offlineQueue.saveScanLocally(finalResult);
          setCurrentScan({ ...finalResult });
        }
      }

      // Try running background sync for any other pending scans
      offlineQueue.syncOfflineScans().catch(e => console.error('Background sync failed', e));

    } catch (error: any) {
      const isNetworkError = axios.isAxiosError(error) || 
                            error.message?.toLowerCase().includes('network') || 
                            error.message?.toLowerCase().includes('fetch') ||
                            error.message?.toLowerCase().includes('timeout');
      
      if (isNetworkError) {
        const msg = 'Could not connect to the backend server.\n\nPlease check:\n1. The backend server is running on your desktop.\n2. Tailscale is ON on both your phone and desktop.\n3. Try connecting to http://100.72.37.36:8000 in your phone\'s browser to verify.';
        setError(msg);
        if (inferredDisease) {
          const fallback = loadStaticTreatment(inferredDisease);
          setCurrentTreatment(fallback);
        }
      } else {
        setError(error.message || 'An unexpected error occurred during the scan.');
      }
    } finally {
      setLoading(false);
    }
  };

  return { runScan };
}
