import { create } from 'zustand';
import { ScanResult } from '../models/ScanResult';
import { TreatmentPlan } from '../models/TreatmentPlan';

interface ScanState {
  currentScan: ScanResult | null;
  currentTreatment: TreatmentPlan | null;
  scanHistory: ScanResult[];
  isLoading: boolean;
  error: string | null;
  secondaryDisease: string | null;
  secondaryConfidence: number | null;
  setCurrentScan: (scan: ScanResult | null) => void;
  setCurrentTreatment: (treatment: TreatmentPlan | null) => void;
  setScanHistory: (history: ScanResult[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSecondaryDisease: (disease: string | null) => void;
  setSecondaryConfidence: (confidence: number | null) => void;
  reset: () => void;
}

export const useScanStore = create<ScanState>((set) => ({
  currentScan: null,
  currentTreatment: null,
  scanHistory: [],
  isLoading: false,
  error: null,
  secondaryDisease: null,
  secondaryConfidence: null,
  setCurrentScan: (currentScan) => set({
    currentScan,
    secondaryDisease: currentScan ? (currentScan.secondaryDisease || null) : null,
    secondaryConfidence: currentScan ? (currentScan.secondaryConfidence !== undefined ? currentScan.secondaryConfidence : null) : null,
  }),
  setCurrentTreatment: (currentTreatment) => set({ currentTreatment }),
  setScanHistory: (scanHistory) => set({ scanHistory }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setSecondaryDisease: (secondaryDisease) => set({ secondaryDisease }),
  setSecondaryConfidence: (secondaryConfidence) => set({ secondaryConfidence }),
  reset: () => set({
    currentScan: null,
    currentTreatment: null,
    error: null,
    secondaryDisease: null,
    secondaryConfidence: null,
  }),
}));
