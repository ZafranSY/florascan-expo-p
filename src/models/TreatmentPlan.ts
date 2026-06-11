export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface DosageEntry {
  product: string;
  dosage: string;
  frequency: string;
  duration: string;
}

export interface RecommendedProduct {
  name: string;
  affiliate_url: string;
  price_range: string;
}

export interface TreatmentPlan {
  disease: string;
  confidence: string; // LLM returns confidence as a string (e.g. "tinggi") or "n/a"
  risk_level: RiskLevel;
  localized_context_malaysia: string;
  treatment_steps: string[];
  dosage_schedule: DosageEntry[];
  prevention: string[];
  recommended_products: RecommendedProduct[];
  secondary_disease?: string | null;
  fallback_used?: boolean;
}
