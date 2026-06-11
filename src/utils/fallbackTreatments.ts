import { TreatmentPlan } from '../models/TreatmentPlan';

export function loadStaticTreatment(diseaseLabel: string): TreatmentPlan {
  return {
    disease: diseaseLabel,
    confidence: "n/a",
    risk_level: "low",
    localized_context_malaysia: `Offline data mode active. Showing generic treatment.`,
    treatment_steps: [
      "Ensure proper irrigation and drainage.",
      "Remove heavily infected plant parts.",
      "Monitor plant daily for improvements."
    ],
    dosage_schedule: [],
    prevention: [
      "To prevent future occurrences, maintain balanced plant nutrition.",
      "Avoid overhead watering and ensure good airflow around the plants."
    ],
    recommended_products: [],
    fallback_used: true
  };
}
