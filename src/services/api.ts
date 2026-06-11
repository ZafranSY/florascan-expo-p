import axios, { InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/authStore';
import * as FileSystem from 'expo-file-system/legacy';

import { auth } from './firebase';
import { ScanResult } from '../models/ScanResult';
import { TreatmentPlan } from '../models/TreatmentPlan';

/**
 * Raw API Response Contracts (FastAPI backend snake_case formats)
 */
export interface RawScanResponse {
  id: string;
  disease: string;
  confidence: number;
  scanned_at: string;
  image_url?: string | null;
  image_uri?: string | null;
  treatment?: string | null;
  secondary_disease?: string | null;
  secondary_confidence?: number | null;
}

export interface RawDetectionResponse {
  disease: string;
  confidence: number;
  secondary_disease?: string | null;
  secondary_confidence?: number | null;
}

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://100.72.37.36:8000';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Axios Request Interceptor
 * Automatically attaches Firebase ID Token to every request if user is logged in.
 */
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        // console.log('API Request: Token attached to', config.url);
      } else {
        console.warn('API Request: No Firebase token found for', config.url);
      }
      return config;
    } catch (error) {
      return Promise.reject(error);
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Axios Response Interceptor
 * Handles 401 errors and potentially token refresh logic.
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized (Token expired)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const newToken = await auth.currentUser?.getIdToken(true);
        
        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        useAuthStore.getState().clearAuth();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

/**
 * API Service wrapper for specific endpoints
 */
export const apiService = {
  getMyProfile: async () => {
    // Fetches the profile and auto-syncs user in the backend if new
    const response = await api.get('/auth/me');
    return response.data;
  },
  syncUserWithBackend: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
  registerProfile: async (data: { name: string; role: string; locale: string }) => {
    // Placeholder for FastAPI register endpoint
    const response = await api.post('/auth/register', data);
    return response.data;
  },
  detectServer: async (imageUri: string): Promise<{
    disease: string;
    confidence: number;
    secondaryDisease?: string;
    secondaryConfidence?: number;
  }> => {
    const formData = new FormData();
    // In React Native, image uploading over FormData usually requires a specific shape. 
    // Here we append a basic structured version.
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'scan.jpg',
    } as any);

    const response = await api.post<RawDetectionResponse>('/ml/detect', formData, {
      headers: { 'Accept': 'application/json' },
    });
    
    const data = response.data;
    return {
      disease: data.disease,
      confidence: data.confidence,
      secondaryDisease: data.secondary_disease || undefined,
      secondaryConfidence: data.secondary_confidence !== undefined && data.secondary_confidence !== null ? Number(data.secondary_confidence) : undefined,
    };
  },
  getTreatment: async (disease: string, locale: string = 'en', scanId?: string, secondaryDisease?: string | null): Promise<TreatmentPlan> => {
    const response = await api.post<TreatmentPlan>('/ml/treatment', { 
      disease, 
      locale, 
      scan_id: scanId,
      secondary_disease: secondaryDisease || null
    });
    return response.data; // Expected: TreatmentPlan shape
  },
  getHistory: async (): Promise<ScanResult[]> => {
    // Token is already attached by the global interceptor, but force-refresh here for reliability
    const token = await auth.currentUser?.getIdToken();
    const response = await api.get<RawScanResponse[]>('/scans', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    // Map snake_case backend response to camelCase ScanResult shape
    return response.data.map((scan: RawScanResponse) => ({
      id: scan.id,
      disease: scan.disease,
      confidence: scan.confidence,
      scannedAt: new Date(scan.scanned_at),
      // Prefer the full public URL returned by backend; fallback to raw key
      imageUri: scan.image_url || scan.image_uri || '',
      treatment: scan.treatment || null,   // Persisted treatment from PostgreSQL
      isSynced: true,
      modelVersion: 'server',
      secondaryDisease: scan.secondary_disease || undefined,
      secondaryConfidence: scan.secondary_confidence !== undefined && scan.secondary_confidence !== null ? Number(scan.secondary_confidence) : undefined,
    }));
  },
  saveScan: async (scan: ScanResult) => {
    // Map camelCase to snake_case
    const mappedScan = {
      id: scan.id,
      disease: scan.disease,
      confidence: scan.confidence,
      scanned_at: scan.scannedAt,
      image_uri: scan.imageUri,
      secondary_disease: scan.secondaryDisease || null,
      secondary_confidence: scan.secondaryConfidence !== undefined && scan.secondaryConfidence !== null ? scan.secondaryConfidence : null,
    };
    const response = await api.post('/scans/sync', [mappedScan]);
    return response.data;
  },
  uploadImageToR2: async (imageUri: string) => {
    // Step 1: Request presigned URL from Backend
    const response = await api.get('/images/upload-url');
    const { upload_url, file_key } = response.data;
    
    // Step 2: Upload file directly to Cloudflare R2 (or Mock Backend)
    try {
      const fileResponse = await fetch(imageUri);
      const blob = await fileResponse.blob();
      
      const uploadResult = await fetch(upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/jpeg' },
        body: blob
      });
      
      if (uploadResult.status === 200) {
        return file_key;
      } else {
        throw new Error(`R2 upload failed with status: ${uploadResult.status}`);
      }
    } catch (error) {
      console.error('Binary upload failed:', error);
      throw error;
    }
  },
  syncScans: async (scans: ScanResult[]) => {
    // Map camelCase to snake_case for backend compatibility
    const mappedScans = scans.map(scan => ({
      id: scan.id,
      disease: scan.disease,
      confidence: scan.confidence,
      scanned_at: scan.scannedAt instanceof Date ? scan.scannedAt.toISOString() : scan.scannedAt,
      image_uri: scan.imageUri,
      treatment: scan.treatment || null,   // Persist AI treatment to PostgreSQL
      secondary_disease: scan.secondaryDisease || null,
      secondary_confidence: scan.secondaryConfidence !== undefined && scan.secondaryConfidence !== null ? scan.secondaryConfidence : null,
    }));
    
    console.log('SYNC: Sending payload to backend:', JSON.stringify(mappedScans, null, 2));
    
    const token = await auth.currentUser?.getIdToken();
    const response = await api.post('/scans/sync', mappedScans, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },
  getDiseases: async (locale: string = 'en') => {
    const response = await api.get(`/api/v1/diseases/?locale=${locale}`);
    return response.data;
  },
  getDiseaseProducts: async (diseaseName: string) => {
    const response = await api.get(`/api/v1/products/${encodeURIComponent(diseaseName)}`);
    return response.data;
  }
};

export default api;
