import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Linking,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useScanStore } from '@/stores/scanStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { apiService } from '@/services/api';
import { scheduleTreatmentReminders, requestNotificationPermissions, scheduleTestNotification } from '@/services/notificationService';
import { useReminderStore } from '@/stores/reminderStore';
import { offlineQueue } from '@/services/offlineQueue';
import { resolveImageUri } from '@/utils/constants';

interface DiseaseProfile {
  disease_name: string;
  symptoms: string;
  symptoms_ms?: string | null;
  description: string;
  description_ms?: string | null;
  causes: string;
  causes_ms?: string | null;
  treatment: string;
  treatment_ms?: string | null;
  // UI Meta Fallbacks
  id?: string;
  icon?: string;
  riskColor?: string;
  iconBg?: string;
  riskTag?: string;
}

const MOCK_DISEASES: DiseaseProfile[] = [
  {
    disease_name: 'Anthracnose',
    description: 'A fungal disease caused by Colletotrichum gloeosporioides, attacking leaves, stems, and fruits, leaving dark sunken lesions.',
    description_ms: 'Penyakit kulat yang disebabkan oleh Colletotrichum gloeosporioides, menyerang daun, batang, dan buah, meninggalkan lesi gelap yang tenggelam.',
    symptoms: 'Dark, circular, sunken lesions on papaya fruits and leaves. Pinkish orange spore masses may appear under humid conditions.',
    symptoms_ms: 'Lesi gelap, bulat, dan tenggelam pada buah dan daun betik. Jisim spora berwarna jingga kemerahan mungkin muncul dalam keadaan lembap.',
    causes: 'High humidity, rain splashes, and warm temperatures. Spores persist in crop debris.',
    causes_ms: 'Kelembapan tinggi, percikan hujan, dan suhu panas. Spora bertahan dalam sisa tanaman.',
    treatment: 'Apply chlorothalonil, mancozeb or copper-based fungicides. Prune affected branches and maintain weed-free field hygiene.',
    treatment_ms: 'Sembur racun kulat jenis klorotalonil, mankozeb atau berasaskan kuprum. Cantas cawangan yang dijangkiti dan jaga kebersihan ladang.'
  },
  {
    disease_name: 'Bacterial Spot',
    description: 'A critical bacterial pathogen that rapidly spreads through rainy and windy conditions, causing leaf spotting and fruit decay.',
    description_ms: 'Patogen bakteria kritikal yang merebak dengan cepat melalui keadaan hujan dan berangin, menyebabkan bintik daun dan pereputan buah.',
    symptoms: 'Small, water-soaked spots on leaves with yellow halos. Spots can merge, causing leaf yellowing and premature leaf drop.',
    symptoms_ms: 'Bintik kecil berciri lecah air pada daun dengan halo kuning. Bintik boleh bercantum, menyebabkan daun menguning dan luruh sebelum matang.',
    causes: 'Bacterium Erwinia papayae or Pseudomonas species, favored by warm, humid rainy seasons.',
    causes_ms: 'Bakteria Erwinia papayae atau spesies Pseudomonas, disukai oleh musim hujan yang panas dan lembap.',
    treatment: 'Apply copper hydroxide or copper oxychloride bactericides. Avoid overhead irrigation and destroy infected plant materials.',
    treatment_ms: 'Gunakan bakterisida kuprum hidroksida atau kuprum oksiklorida. Elakkan penyiraman atas kepala dan musnahkan bahan tumbuhan yang dijangkiti.'
  },
  {
    disease_name: 'Mites',
    description: 'Microscopic arachnids that feed on the sap of young papaya leaves and fruits, leading to silvering or scarring.',
    description_ms: 'Araknid mikroskopik yang menghisap sap daun dan buah betik muda, menyebabkan kesan perak atau parut.',
    symptoms: 'Yellow stippling on leaf surfaces, webbing on leaf undersides, leaves curling downwards, and bronze/scarred fruit surfaces.',
    symptoms_ms: 'Bintik kuning pada permukaan daun, sarang lelabah di bawah daun, daun melentur ke bawah, dan permukaan buah gangsa/berparut.',
    causes: 'Dry and hot climatic conditions which accelerate their reproductive cycle.',
    causes_ms: 'Keadaan iklim kering dan panas yang mempercepatkan kitaran pembiakan mereka.',
    treatment: 'Apply miticides/acaricides or insecticidal soap. Encourage natural predators like ladybugs and predatory mites.',
    treatment_ms: 'Gunakan racun hama/akarisida atau sabun serangga. Galakkan pemangsa semula jadi seperti kumbang kura-kura dan hama pemangsa.'
  },
  {
    disease_name: 'Yellow Leaf Curl',
    description: 'A devastating viral infection transmitted by insect vectors like whiteflies, severely stunting papaya plant growth and yield.',
    description_ms: 'Jangkitan virus yang merosakkan yang disebarkan oleh vektor serangga seperti lalat putih, membantutkan pertumbuhan dan hasil betik secara teruk.',
    symptoms: 'Severe curling, puckering, and yellowing of young leaves. Infected plants become stunted and stop producing marketable fruits.',
    symptoms_ms: 'Kerinting teruk, kedutan, dan menguning pada daun muda. Tumbuhan yang dijangkiti menjadi bantut dan berhenti menghasilkan buah pasaran.',
    causes: 'Papaya Leaf Curl Virus (PaLCV), spread primarily by Bemisia tabaci (whiteflies).',
    causes_ms: 'Virus Keriting Daun Betik (PaLCV), disebarkan terutamanya oleh Bemisia tabaci (lalat putih).',
    treatment: 'Control whitefly vectors using imidacloprid or neem oil sprays. Immediately rogue and burn infected plants to prevent viral spread.',
    treatment_ms: 'Kawal vektor lalat putih menggunakan semburan imidakloprid atau minyak semambu. Cabut dan bakar tumbuhan yang dijangkiti dengan segera.'
  },
  {
    disease_name: 'Powdery Mildew',
    description: 'A common fungal infection that forms a white, powdery fungal growth on the surfaces of leaves, petioles, and young fruits.',
    description_ms: 'Jangkitan kulat biasa yang membentuk pertumbuhan kulat putih seperti serbuk pada permukaan daun, tangkai daun, dan buah muda.',
    symptoms: 'White powdery patches on leaf undersides and upper surfaces. Leaves may distort, turn yellow, and dry up.',
    symptoms_ms: 'Tompok serbuk putih pada permukaan bawah dan atas daun. Daun mungkin herot, menjadi kuning, dan kering.',
    causes: 'Oidium caricae fungus, favored by cool, shady, and moderately humid microclimates.',
    causes_ms: 'Kulat Oidium caricae, disukai oleh mikroiklim sejuk, teduh, dan sederhana lembap.',
    treatment: 'Apply sulfur-based fungicides or systemic options like triadimefon. Improve canopy airflow and sunlight penetration.',
    treatment_ms: 'Gunakan racun kulat berasaskan sulfur atau pilihan sistemik seperti triadimefon. Tingkatkan aliran udara kanopi dan penembusan cahaya matahari.'
  },
  {
    disease_name: 'Mealybug',
    description: 'Soft-bodied sap-sucking insects that secrete sticky honeydew, leading to black sooty mold growth and plant weakness.',
    description_ms: 'Serangga penghisap sap berbadan lembut yang mengeluarkan manisan melekit, menyebabkan pertumbuhan kulapuk jelaga hitam dan kelemahan tumbuhan.',
    symptoms: 'Clusters of white, cottony insects on stems, leaf undersides, and fruits. Presence of ants and black sooty mold.',
    symptoms_ms: 'Kelompok serangga putih seperti kapas pada batang, bahagian bawah daun, dan buah. Kehadiran semut dan kulapuk jelaga hitam.',
    causes: 'Paracoccus marginatus infestation, aided by symbiotic ants that protect them from predators.',
    causes_ms: 'Serangan Paracoccus marginatus, dibantu oleh semut simbiotik yang melindungi mereka daripada pemangsa.',
    treatment: 'Spray with white oil, horticultural mineral oil, or contact insecticides. Control ants to let natural predators eat mealybugs.',
    treatment_ms: 'Sembur dengan minyak putih, minyak mineral hortikultur, atau racun serangga sentuh. Kawal semut untuk membiarkan pemangsa semula jadi memakan koya.'
  },
  {
    disease_name: 'Phytophthora',
    description: 'A destructive oomycete water mold causing root rot, stem rot, and fruit drop in waterlogged soils.',
    description_ms: 'Kulat air oomycete pemusnah yang menyebabkan reput akar, reput batang, dan buah gugur dalam tanah bertakung air.',
    symptoms: 'Water-soaked stem lesions near ground level, root blackening, rapid wilting, and white fuzzy growth on rotting fallen fruits.',
    symptoms_ms: 'Lesi batang lecah air berhampiran paras tanah, kehitaman akar, layu cepat, dan pertumbuhan berbulu putih pada buah gugur yang reput.',
    causes: 'Phytophthora palmivora, highly active in poorly drained soils and during heavy rainfall seasons.',
    causes_ms: 'Phytophthora palmivora, sangat aktif dalam tanah bersaliran buruk dan semasa musim hujan lebat.',
    treatment: 'Improve field drainage, apply metalaxyl or phosphonate fungicides, and plant on raised beds.',
    treatment_ms: 'Tingkatkan saliran ladang, gunakan racun kulat metalaksil atau fosfonat, dan tanam di atas batas yang dinaikkan.'
  },
  {
    disease_name: 'Healthy',
    description: 'The plant shows optimal physiological vigor, with vibrant green foliage, strong root structures, and unblemished fruits.',
    description_ms: 'Tumbuhan menunjukkan kecergasan fisiologi yang optimum, dengan dedaunan hijau cerah, struktur akar yang kuat, dan buah yang bersih.',
    symptoms: 'Uniform dark green leaves, sturdy stem trunk, clean skin on fruits, and no signs of chlorosis, necrosis, or pest activity.',
    symptoms_ms: 'Daun hijau gelap yang seragam, batang yang tegap, kulit buah yang bersih, dan tiada tanda klorosis, nekrosis, atau aktiviti perosak.',
    causes: 'Proper crop nutrition, balanced irrigation, correct soil pH, and proactive pest prevention.',
    causes_ms: 'Pemakanan tanaman yang betul, penyiraman yang seimbang, pH tanah yang betul, dan pencegahan perosak yang proaktif.',
    treatment: 'Maintain balanced NPK fertilization, consistent water management, and regular bioweekly surveillance.',
    treatment_ms: 'Kekalkan pembajaan NPK yang seimbang, pengurusan air yang konsisten, dan pemantauan dwi-mingguan yang kerap.'
  }
];

// ── Grounded AgTech Design Tokens ──
const AG = {
  bgMain:       '#F8F9FA',
  bgCard:       '#FFFFFF',
  textPrimary:  '#1C2B24',
  textSecondary:'#5A6B63',
  accentGreen:  '#2D5A43',
  healthy:      '#438964',
  healthyFill:  '#EAF5EE',
  disease:      '#C84B31',
  diseaseFill:  '#FDF2F0',
  warning:      '#B6862C',
  warningFill:  '#FEF9EC',
  muted:        '#8A9B91',
  border:       '#E8ECE9',
};

const SHADOW = {
  shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.04, shadowRadius: 12, elevation: 2,
};

const TRANSLATIONS = {
  en: {
    loading: 'AI is generating your treatment plan...',
    noPlan: 'No treatment plan found',
    goBack: 'Go Back',
    title: 'Treatment Plan',
    subtitle: 'Diagnostic & Recovery Guide',
    offlineMode: 'Offline Mode: Showing standard treatment guide.',
    risk: 'RISK',
    stepsTitle: 'Step-by-Step Actions',
    officialProfileTitle: 'Official Field Diagnostic Profile',
    symptomsLabel: 'Official Symptoms',
    causesLabel: 'Primary Causes',
    preventionLabel: 'Official Prevention Steps',
    dosageTitle: 'Dosage Schedule',
    duration: 'Duration:',
    preventionTitle: 'Prevention Strategy',
    officialProducts: 'Official Treatment Products',
    maintenanceProducts: 'Maintenance & Nutrition',
    viewStore: 'View Store',
    recommendedTitle: 'Recommended Treatments',
    applyLabel: 'Apply as per label',
    disclaimer: 'AI-generated advice. Please consult a local agricultural officer for severe infestations.',
    categories: {
      fungicide: 'Fungicide',
      bactericide: 'Bactericide',
      insecticide: 'Insecticide',
      organic: 'Organic Treatment',
      fertilizer: 'Fertilizer',
    },
    riskLevels: {
      critical: 'CRITICAL',
      high: 'HIGH',
      medium: 'MEDIUM',
      low: 'LOW',
    },
    diseaseNames: {
      'Anthracnose': 'Anthracnose',
      'Bacterial Spot': 'Bacterial Spot',
      'Mites': 'Mites',
      'Yellow Leaf Curl': 'Yellow Leaf Curl',
      'Powdery Mildew': 'Powdery Mildew',
      'Mealybug': 'Mealybug',
      'Phytophthora': 'Phytophthora',
      'Healthy': 'Healthy',
      'Non-Papaya': 'Non-Papaya',
    },
    setReminder: 'Set Spraying Reminder',
    reminderSet: 'Reminder Set!',
    reminderScheduled: 'A spraying reminder has been scheduled for tomorrow at this time.',
    reminderError: 'Could not set reminder',
    reminderPermission: 'Please enable notifications in settings to use this feature.',
    reminderExpoGo: 'Reminder feature requires a physical device build. (Skipped in Expo Go)',
    ok: 'OK',
    reminderConfigTitle: 'Reminder Setup',
    reminderTaskLabel: 'Task: Apply treatment for',
    remindIn1Day: '1 Day',
    remindIn3Days: '3 Days',
    remindIn7Days: '7 Days',
    confirm: 'Confirm',
    cancel: 'Cancel',
    dualDiseaseAlertTitle: "Dual-Disease Alert",
    dualDiseaseAlertSubtitle: "Secondary Infection Detected",
    dualDiseaseAlertBody: "The model detected a secondary infection of {pathogen} with a confidence score of {score}%. Please review the official field diagnostic profile below to adapt your recovery strategy.",
    dualDiseaseActionTitle: "Recommended Grower Actions:",
    dualDiseaseActions: [
      "Switch diagnostic tabs below to examine the secondary disease profile.",
      "Review the recommended organic recovery & biochemical treatments for both diseases.",
      "Thoroughly inspect surrounding crop rows for signs of overlapping pathogens."
    ],
    uncertainMatch: "Uncertain Match",
    alternativePossibility: "Alternative Possibility",
    lowImageResolution: "Low Image Resolution Detected",
    primaryMatch: "Primary Match",
    alternative: "Alternative",
    networkError: "Network error or timeout occurred. Please check your connection.",
    retry: "Retry",
  },
  bm: {
    loading: 'AI sedang menjana pelan rawatan anda...',
    noPlan: 'Tiada pelan rawatan dijumpai',
    goBack: 'Kembali',
    title: 'Pelan Rawatan',
    subtitle: 'Panduan Diagnostik & Pemulihan',
    offlineMode: 'Mod Luar Talian: Menunjukkan panduan rawatan standard.',
    risk: 'RISIKO',
    stepsTitle: 'Langkah Tindakan',
    officialProfileTitle: 'Profil Diagnostik Ladang Rasmi',
    symptomsLabel: 'Gejala Rasmi',
    causesLabel: 'Punca Utama',
    preventionLabel: 'Langkah Pencegahan Rasmi',
    dosageTitle: 'Jadual Dos',
    duration: 'Tempoh:',
    preventionTitle: 'Strategi Pencegahan',
    officialProducts: 'Produk Rawatan Rasmi',
    maintenanceProducts: 'Penyelenggaraan & Nutrisi',
    viewStore: 'Lihat Kedai',
    recommendedTitle: 'Rawatan Disyorkan',
    applyLabel: 'Gunakan mengikut label',
    disclaimer: 'Nasihat dijana AI. Sila rujuk pegawai pertanian tempatan untuk serangan yang teruk.',
    categories: {
      fungicide: 'Fungisida',
      bactericide: 'Bakterisida',
      insecticide: 'Insektisida',
      organic: 'Rawatan Organik',
      fertilizer: 'Baja',
    },
    riskLevels: {
      critical: 'KRITIKAL',
      high: 'TINGGI',
      medium: 'SEDERHANA',
      low: 'RENDAH',
    },
    diseaseNames: {
      'Anthracnose': 'Antraknos',
      'Bacterial Spot': 'Bintik Bakteria',
      'Mites': 'Hama',
      'Yellow Leaf Curl': 'Kerul Daun Kuning',
      'Powdery Mildew': 'Kulat Berdebu',
      'Mealybug': 'Koya',
      'Phytophthora': 'Phytophthora',
      'Healthy': 'Sihat',
      'Non-Papaya': 'Bukan Betik',
    },
    setReminder: 'Tetapkan Peringatan Semburan',
    reminderSet: 'Peringatan Ditetapkan!',
    reminderScheduled: 'Peringatan semburan telah dijadualkan untuk esok pada masa ini.',
    reminderError: 'Tidak dapat menetapkan peringatan',
    reminderPermission: 'Sila aktifkan pemberitahuan dalam tetapan untuk menggunakan ciri ini.',
    reminderExpoGo: 'Ciri peringatan memerlukan binaan peranti fizikal. (Dilangkau dalam Expo Go)',
    ok: 'OK',
    reminderConfigTitle: 'Tetapan Peringatan',
    reminderTaskLabel: 'Tugas: Gunakan rawatan untuk',
    remindIn1Day: '1 Hari',
    remindIn3Days: '3 Hari',
    remindIn7Days: '7 Hari',
    confirm: 'Sahkan',
    cancel: 'Batal',
    dualDiseaseAlertTitle: "Amaran Dwi-Penyakit",
    dualDiseaseAlertSubtitle: "Jangkitan Sekunder Dikesan",
    dualDiseaseAlertBody: "Model mengesan jangkitan sekunder bagi {pathogen} dengan tahap keyakinan {score}%. Sila semak profil diagnostik ladang rasmi di bawah untuk menyesuaikan strategi pemulihan anda.",
    dualDiseaseActionTitle: "Tindakan Pengusaha Yang Disyorkan:",
    dualDiseaseActions: [
      "Tukar tab diagnostik di bawah untuk memeriksa profil penyakit sekunder.",
      "Semak rawatan pemulihan organik & biokimia yang disyorkan untuk kedua-dua penyakit.",
      "Periksa barisan tanaman di sekeliling dengan teliti untuk mengesan tanda-tanda patogen bertindih."
    ],
    uncertainMatch: "Padanan Tidak Pasti",
    alternativePossibility: "Kemungkinan Alternatif",
    lowImageResolution: "Resolusi Imej Rendah Dikesan",
    primaryMatch: "Padanan Utama",
    alternative: "Alternatif",
    networkError: "Ralat rangkaian atau masa tamat berlaku. Sila periksa sambungan anda.",
    retry: "Cuba Semula",
  },
};

const formatId = (id: string) => id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const getRiskColor = (level: string) => {
  switch (level?.toLowerCase()) {
    case 'critical': return AG.disease;
    case 'high': return AG.disease;
    case 'medium': return AG.warning;
    case 'low': return AG.healthy;
    default: return AG.muted;
  }
};

const getLocalizedRisk = (level: string, t: any) => {
  const low = level?.toLowerCase();
  return t.riskLevels[low as keyof typeof t.riskLevels] || level?.toUpperCase();
};

const getProductMeta = (name: string, t: any) => {
  const lower = name.toLowerCase();
  if (lower.includes('antracol') || lower.includes('score') || lower.includes('amistar') || lower.includes('fungicide')) {
    return { icon: 'shield-checkmark-outline', category: t.categories.fungicide };
  }
  if (lower.includes('kocide') || lower.includes('kasumin') || lower.includes('bactericide')) {
    return { icon: 'bug-outline', category: t.categories.bactericide };
  }
  if (lower.includes('thiamethoxam') || lower.includes('insecticide') || lower.includes('malathion') || lower.includes('oshin') || lower.includes('mospilan')) {
    return { icon: 'flame-outline', category: t.categories.insecticide };
  }
  if (lower.includes('fertilizer') || lower.includes('foliar') || lower.includes('conditioner')) {
    return { icon: 'leaf-outline', category: t.categories.fertilizer };
  }
  return { icon: 'flask-outline', category: t.categories.organic };
};

export default function TreatmentScreen() {
  const { currentScan: storeScan, setCurrentScan, currentTreatment: storeTreatment, setCurrentTreatment } = useScanStore();
  const { locale } = useSettingsStore();
  const [isReminderModalVisible, setIsReminderModalVisible] = useState(false);
  const [selectedDays, setSelectedDays] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [diseaseProfile, setDiseaseProfile] = useState<DiseaseProfile | null>(null);
  const [secondaryDiseaseProfile, setSecondaryDiseaseProfile] = useState<DiseaseProfile | null>(null);
  const [activeProfileTab, setActiveProfileTab] = useState<'primary' | 'secondary'>('primary');
  const [fetchError, setFetchError] = useState<string | null>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const ENABLE_SIMULATOR = false; // Set to true to force simulated low-confidence co-infection

  const currentScan = ENABLE_SIMULATOR ? {
    id: "simulated_scan_id",
    disease: "Anthracnose",
    confidence: 0.53,
    secondaryDisease: "Bacterial Spot",
    secondaryConfidence: 0.44,
    imageUri: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=200",
    scannedAt: new Date().toISOString(),
    isSynced: true,
    modelVersion: "v1.2.0-specialist",
  } : storeScan;

  const treatment = ENABLE_SIMULATOR ? {
    disease: "Anthracnose",
    fallback_used: false,
    risk_level: "High",
    localized_context_malaysia: "Detected Anthracnose with signs of Bacterial Spot co-infection in tropical conditions.",
    treatment_steps: [
      "Remove infected leaves immediately to stop spores from spreading.",
      "Apply specialized organic copper-based fungicide to block fungal cell growth.",
      "Prune surrounding canopy to increase aeration and sunlight penetration.",
      "Sanitize pruning tools with 70% isopropyl alcohol to avoid cross-infection."
    ],
    dosage_schedule: [
      { treatment: "Copper Soap Spray", dosage: "2 tsp per gallon of water", frequency: "Every 7 days in the morning" },
      { treatment: "Neem Oil Solution", dosage: "2 tbsp per gallon of water", frequency: "Every 14 days in the evening" }
    ],
    prevention: [
      "Use clean drip irrigation to avoid splashing fungal spores onto leaves.",
      "Space plants properly to maximize sunlight and ventilation."
    ],
    recommended_products: [
      { name: "Antracol 70 WG Fungicide", brand: "Bayer", description: "Broad-spectrum protection against Anthracnose.", category: "Fungicide" },
      { name: "Copper Soap Fungicide", brand: "Bonide", description: "Organic copper fungicide suitable for vegetable and fruit crops.", category: "Organic" }
    ]
  } : storeTreatment;

  const t = TRANSLATIONS[locale as keyof typeof TRANSLATIONS] || TRANSLATIONS.en;

  const getLocalizedDiseaseField = (field: 'symptoms' | 'causes' | 'treatment') => {
    const activeProfile = activeProfileTab === 'primary' ? diseaseProfile : secondaryDiseaseProfile;
    if (!activeProfile) return '';
    if (locale === 'bm') {
      const msField = `${field}_ms` as keyof DiseaseProfile;
      return activeProfile[msField] || activeProfile[field] || '';
    }
    return activeProfile[field] || '';
  };

  const loadDiseaseProfile = async () => {
    if (!currentScan?.disease) return;
    try {
      const data = await apiService.getDiseases(locale);
      const isArrayData = Array.isArray(data) && data.length > 0;
      
      // Load primary profile
      let primProfile: DiseaseProfile | null = null;
      if (isArrayData) {
        const match = data.find(
          (item: any) =>
            item.disease_name?.toLowerCase() === currentScan.disease.toLowerCase()
        );
        if (match) {
          primProfile = {
            disease_name: match.disease_name || currentScan.disease,
            description: match.description || '',
            description_ms: match.description_ms || null,
            symptoms: match.symptoms || '',
            symptoms_ms: match.symptoms_ms || null,
            causes: match.causes || '',
            causes_ms: match.causes_ms || null,
            treatment: match.treatment || '',
            treatment_ms: match.treatment_ms || null,
          };
        }
      }
      if (!primProfile) {
        const localMatch = MOCK_DISEASES.find(
          (d) => d.disease_name.toLowerCase() === currentScan.disease.toLowerCase()
        );
        if (localMatch) {
          primProfile = localMatch;
        }
      }
      setDiseaseProfile(primProfile);

      // Load secondary profile
      if (currentScan.secondaryDisease) {
        let secProfile: DiseaseProfile | null = null;
        if (isArrayData) {
          const match = data.find(
            (item: any) =>
              item.disease_name?.toLowerCase() === currentScan.secondaryDisease!.toLowerCase()
          );
          if (match) {
            secProfile = {
              disease_name: match.disease_name || currentScan.secondaryDisease!,
              description: match.description || '',
              description_ms: match.description_ms || null,
              symptoms: match.symptoms || '',
              symptoms_ms: match.symptoms_ms || null,
              causes: match.causes || '',
              causes_ms: match.causes_ms || null,
              treatment: match.treatment || '',
              treatment_ms: match.treatment_ms || null,
            };
          }
        }
        if (!secProfile) {
          const localMatch = MOCK_DISEASES.find(
            (d) => d.disease_name.toLowerCase() === currentScan.secondaryDisease!.toLowerCase()
          );
          if (localMatch) {
            secProfile = localMatch;
          }
        }
        setSecondaryDiseaseProfile(secProfile);
      } else {
        setSecondaryDiseaseProfile(null);
      }
    } catch (error) {
      console.warn('Failed to fetch official disease profiles, using local mock fallbacks:', error);
      
      const localMatch = MOCK_DISEASES.find(
        (d) => d.disease_name.toLowerCase() === currentScan.disease.toLowerCase()
      );
      setDiseaseProfile(localMatch || null);

      if (currentScan.secondaryDisease) {
        const localSecMatch = MOCK_DISEASES.find(
          (d) => d.disease_name.toLowerCase() === currentScan.secondaryDisease!.toLowerCase()
        );
        setSecondaryDiseaseProfile(localSecMatch || null);
      } else {
        setSecondaryDiseaseProfile(null);
      }
    }
  };

  useEffect(() => {
    loadDiseaseProfile();
  }, [currentScan?.disease, currentScan?.secondaryDisease, locale]);

  const fetchProductsBackground = async () => {
    if (!currentScan) return;
    try {
      const normalizedDisease = currentScan.disease.toLowerCase().replace(/-/g, ' ');
      const isNonTarget = ['non papaya', 'non_papaya', 'non-papaya'].includes(normalizedDisease);
      
      if (!isNonTarget) {
        const prodData = await apiService.getDiseaseProducts(currentScan.disease);
        setProducts(prodData);
      }
    } catch (error) {
      console.error('Failed to fetch background products:', error);
    }
  };

  // Reset fetch error state when the active scan ID changes
  useEffect(() => {
    setFetchError(null);
  }, [currentScan?.id]);

  // Fetch treatment on-demand if missing
  useEffect(() => {
    if (currentScan) {
      if (fetchError === currentScan.id) return;

      // 1. Check if we already have a valid treatment in the store for this disease
      if (treatment && treatment.disease === currentScan.disease) {
        if (products.length === 0) {
          fetchProductsBackground();
        }
        return;
      }

      // 2. Check if the current scan has a cached treatment plan locally
      if (currentScan.treatment) {
        try {
          const parsed = typeof currentScan.treatment === 'string'
            ? JSON.parse(currentScan.treatment)
            : currentScan.treatment;
          if (parsed) {
            // Check if it is a bilingual JSON blob containing locale keys
            if (parsed.en || parsed.ms) {
              const localizedPlan = parsed[locale] || parsed.en;
              if (localizedPlan && localizedPlan.disease === currentScan.disease) {
                setCurrentTreatment(localizedPlan);
                fetchProductsBackground();
                return;
              }
            } else if (parsed.disease === currentScan.disease) {
              // Single language legacy or fresh scan.
              // Only reuse if it matches the active locale or doesn't have a locale specified.
              if (!parsed.locale || parsed.locale === locale) {
                setCurrentTreatment(parsed);
                fetchProductsBackground();
                return;
              }
            }
          }
        } catch (err) {
          console.warn('Failed to parse local scan treatment in TreatmentScreen:', err);
        }
      }

      // 3. Otherwise, fetch from the API on-demand with full screen spinner
      fetchTreatment();
    }
  }, [currentScan?.id, currentScan?.disease, locale, treatment, fetchError]);

  const fetchTreatment = async () => {
    if (!currentScan) return;
    setIsLoading(true);
    setFetchError(null);
    try {
      // 1. Fetch AI-generated treatment plan
      const plan = await apiService.getTreatment(currentScan.disease, locale, currentScan.id, currentScan.secondaryDisease);
      setCurrentTreatment(plan);

      // Save the newly generated plan back to SQLite and update the store's current scan instance
      if (plan) {
        const planStr = JSON.stringify(plan);
        const updatedScan = {
          ...currentScan,
          treatment: planStr,
        };
        setCurrentScan(updatedScan);
        offlineQueue.saveScanLocally(updatedScan);
      }

      // 2. Fetch official product recommendations from PostgreSQL
      const normalizedDisease = currentScan.disease.toLowerCase().replace(/-/g, ' ');
      const isNonTarget = ['non papaya', 'non_papaya', 'non-papaya'].includes(normalizedDisease);
      
      if (!isNonTarget) {
        const prodData = await apiService.getDiseaseProducts(currentScan.disease);
        setProducts(prodData);
      }
    } catch (error) {
      console.error('Failed to fetch treatment data:', error);
      if (currentScan?.id) {
        setFetchError(currentScan.id);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.centeredScreen, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={AG.accentGreen} />
        <Text style={styles.loadingText}>{t.loading}</Text>
      </View>
    );
  }

  // Empty state
  if (!treatment) {
    const isNetworkError = fetchError === currentScan?.id;
    return (
      <View style={[styles.centeredScreen, { paddingTop: insets.top }]}>
        <View style={[styles.emptyIcon, isNetworkError && { backgroundColor: AG.diseaseFill }]}>
          <Ionicons 
            name={isNetworkError ? "cloud-offline-outline" : "wifi-outline"} 
            size={48} 
            color={isNetworkError ? AG.disease : AG.muted} 
          />
        </View>
        <Text style={[styles.emptyText, isNetworkError && { textAlign: 'center', color: AG.textPrimary, fontWeight: '600' }]}>
          {isNetworkError ? t.networkError : t.noPlan}
        </Text>
        {isNetworkError ? (
          <TouchableOpacity style={styles.backBtn} onPress={() => {
            setFetchError(null);
            fetchTreatment();
          }}>
            <Text style={styles.backBtnText}>{t.retry}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>{t.goBack}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBackBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={AG.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>{t.title}</Text>
            <View style={styles.subtitleBadge}>
              <Text style={styles.headerSub}>{t.subtitle}</Text>
            </View>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* ── Fallback Banner ── */}
        {treatment.fallback_used && (
          <View style={styles.fallbackBanner}>
            <Ionicons name="cloud-offline-outline" size={16} color={AG.warning} />
            <Text style={styles.fallbackText}>{t.offlineMode}</Text>
          </View>
        )}

        {/* ── Disease Overview Card ── */}
        <View style={[styles.card, SHADOW, treatment.disease === 'Healthy' && { backgroundColor: AG.healthyFill, borderColor: AG.healthy + '30', borderWidth: 1 }]}>
          <View style={styles.diseaseRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.diseaseName}>
                {t.diseaseNames[treatment.disease as keyof typeof t.diseaseNames] || formatId(treatment.disease)}
              </Text>
              {currentScan?.secondaryDisease && (
                <View style={styles.secondarySubRow}>
                  <Ionicons name="add-circle-outline" size={14} color={AG.warning} style={{ marginRight: 4 }} />
                  <Text style={styles.secondarySubText}>
                    + {t.diseaseNames[currentScan.secondaryDisease as keyof typeof t.diseaseNames] || formatId(currentScan.secondaryDisease)}
                  </Text>
                </View>
              )}
              <View style={[styles.riskBadge, { backgroundColor: getRiskColor(treatment.risk_level) + '18', marginTop: currentScan?.secondaryDisease ? 8 : 4 }]}>
                <Text style={[styles.riskText, { color: getRiskColor(treatment.risk_level) }]}>
                  {getLocalizedRisk(treatment.risk_level, t)} {t.risk}
                </Text>
              </View>
            </View>
            {currentScan?.imageUri && (
              <Image source={{ uri: resolveImageUri(currentScan.imageUri) || undefined }} style={styles.thumbImage} />
            )}
          </View>
        </View>

        {/* ── Dual-Disease Alert Card ── */}
        {currentScan?.secondaryDisease && (
          <View style={[styles.warningCard, SHADOW]}>
            <View style={styles.warningHeaderRow}>
              <Ionicons name="warning" size={20} color={AG.warning} />
              <Text style={styles.warningTitleText}>{t.dualDiseaseAlertTitle}</Text>
            </View>
            <View style={styles.resolutionNoticeRow}>
              <Ionicons name="image-outline" size={16} color="#8A5E0B" style={{ marginRight: 6 }} />
              <Text style={styles.resolutionNoticeText}>{t.lowImageResolution}</Text>
            </View>

            <View style={styles.comparisonBadgeContainer}>
              <View style={styles.primaryBadge}>
                <Text style={styles.primaryBadgeText} numberOfLines={1}>
                  {t.primaryMatch}: {t.diseaseNames[currentScan.disease as keyof typeof t.diseaseNames] || formatId(currentScan.disease)} - {Math.round(currentScan.confidence * 100)}%
                </Text>
              </View>
              <View style={styles.alternativeBadge}>
                <Text style={styles.alternativeBadgeText} numberOfLines={1}>
                  {t.alternative}: {t.diseaseNames[currentScan.secondaryDisease as keyof typeof t.diseaseNames] || formatId(currentScan.secondaryDisease)} - {Math.round((currentScan.secondaryConfidence || 0) * 100)}%
                </Text>
              </View>
            </View>
            
            <Text style={styles.warningActionsTitle}>{t.dualDiseaseActionTitle}</Text>
            {t.dualDiseaseActions.map((action: string, index: number) => (
              <View key={index} style={styles.warningActionRow}>
                <View style={styles.warningActionBullet} />
                <Text style={styles.warningActionText}>{action}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Context Card ── */}
        <View style={[styles.card, SHADOW, { backgroundColor: AG.healthyFill }]}>
          <Text style={styles.contextText}>{treatment.localized_context_malaysia}</Text>
        </View>

        {/* ── Official Field Diagnostic Profile Card (Task 2) ── */}
        {diseaseProfile && (
          <View style={[
            styles.diagnosticCard,
            SHADOW,
            {
              borderLeftColor: (activeProfileTab === 'primary' ? diseaseProfile : secondaryDiseaseProfile)?.disease_name.toLowerCase() === 'healthy' ? AG.healthy : AG.disease,
            }
          ]}>
            {/* Header */}
            <View style={styles.diagnosticHeader}>
              <Ionicons 
                name={(activeProfileTab === 'primary' ? diseaseProfile : secondaryDiseaseProfile)?.disease_name.toLowerCase() === 'healthy' ? "checkmark-circle-outline" : "analytics-outline"} 
                size={20} 
                color={(activeProfileTab === 'primary' ? diseaseProfile : secondaryDiseaseProfile)?.disease_name.toLowerCase() === 'healthy' ? AG.healthy : AG.disease} 
              />
              <Text style={styles.diagnosticTitle}>{t.officialProfileTitle}</Text>
            </View>

            {/* Segmented Tab Switcher if secondary profile exists */}
            {secondaryDiseaseProfile && (
              <View style={styles.tabContainer}>
                <TouchableOpacity
                  style={[
                    styles.tabButton,
                    activeProfileTab === 'primary' && styles.tabButtonActive,
                  ]}
                  onPress={() => setActiveProfileTab('primary')}
                >
                  <Text
                    style={[
                      styles.tabButtonText,
                      activeProfileTab === 'primary' && styles.tabButtonTextActive,
                    ]}
                  >
                    {t.diseaseNames[diseaseProfile.disease_name as keyof typeof t.diseaseNames] || formatId(diseaseProfile.disease_name)}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.tabButton,
                    activeProfileTab === 'secondary' && styles.tabButtonActive,
                  ]}
                  onPress={() => setActiveProfileTab('secondary')}
                >
                  <Text
                    style={[
                      styles.tabButtonText,
                      activeProfileTab === 'secondary' && styles.tabButtonTextActive,
                    ]}
                  >
                    {t.diseaseNames[secondaryDiseaseProfile.disease_name as keyof typeof t.diseaseNames] || formatId(secondaryDiseaseProfile.disease_name)}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Divider */}
            <View style={styles.diagnosticDivider} />

            {/* Symptoms Section */}
            <View style={styles.diagnosticSection}>
              <View style={styles.sectionHeaderRow}>
                <View style={[styles.sectionBadgeWrap, { backgroundColor: (activeProfileTab === 'primary' ? diseaseProfile : secondaryDiseaseProfile)?.disease_name.toLowerCase() === 'healthy' ? AG.healthyFill : AG.diseaseFill }]}>
                  <Ionicons name="eye-outline" size={14} color={(activeProfileTab === 'primary' ? diseaseProfile : secondaryDiseaseProfile)?.disease_name.toLowerCase() === 'healthy' ? AG.healthy : AG.disease} />
                </View>
                <Text style={styles.sectionBadgeText}>{t.symptomsLabel}</Text>
              </View>
              <Text style={styles.diagnosticSecContent}>
                {getLocalizedDiseaseField('symptoms')}
              </Text>
            </View>

            {/* Causes Section */}
            <View style={styles.diagnosticSection}>
              <View style={styles.sectionHeaderRow}>
                <View style={[styles.sectionBadgeWrap, { backgroundColor: AG.warningFill }]}>
                  <Ionicons name="warning-outline" size={14} color={AG.warning} />
                </View>
                <Text style={styles.sectionBadgeText}>{t.causesLabel}</Text>
              </View>
              <Text style={styles.diagnosticSecContent}>
                {getLocalizedDiseaseField('causes')}
              </Text>
            </View>

            {/* Prevention/Treatment Section */}
            <View style={styles.diagnosticSection}>
              <View style={styles.sectionHeaderRow}>
                <View style={[styles.sectionBadgeWrap, { backgroundColor: AG.healthyFill }]}>
                  <Ionicons name="shield-checkmark-outline" size={14} color={AG.healthy} />
                </View>
                <Text style={styles.sectionBadgeText}>{t.preventionLabel}</Text>
              </View>
              <Text style={styles.diagnosticSecContent}>
                {getLocalizedDiseaseField('treatment')}
              </Text>
            </View>
          </View>
        )}

        {/* ── Treatment Steps ── */}
        <Text style={styles.sectionTitle}>{t.stepsTitle}</Text>
        {treatment.treatment_steps.map((step: string, i: number) => (
          <View key={i} style={[styles.card, SHADOW, styles.stepRow]}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>{i + 1}</Text>
            </View>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}

        {/* ── Dosage Schedule ── */}
        {treatment.dosage_schedule?.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{t.dosageTitle}</Text>
            {treatment.dosage_schedule.map((item: any, i: number) => (
              <View key={i} style={[styles.card, SHADOW]}>
                <Text style={styles.dosageProduct}>{item.product}</Text>
                <View style={styles.dosageRow}>
                  <Ionicons name="water-outline" size={14} color={AG.muted} />
                  <Text style={styles.dosageDetail}>{item.dosage} • {item.frequency}</Text>
                </View>
                <View style={styles.dosageRow}>
                  <Ionicons name="calendar-outline" size={14} color={AG.muted} />
                  <Text style={styles.dosageDetail}>{t.duration} {item.duration}</Text>
                </View>
              </View>
            ))}
          </>
        )}

        {/* ── Prevention ── */}
        <Text style={styles.sectionTitle}>{t.preventionTitle}</Text>
        {treatment.prevention.map((tip: string, i: number) => (
          <View key={i} style={styles.bulletRow}>
            <View style={styles.bullet} />
            <Text style={styles.bulletText}>{tip}</Text>
          </View>
        ))}

        {/* ── Recommended Products (Dynamic from PostgreSQL) ── */}
        {(products.length > 0 && !['non papaya', 'non_papaya', 'non-papaya'].includes(treatment.disease.toLowerCase().replace(/-/g, ' '))) && (
          <>
            <Text style={styles.sectionTitle}>
              {treatment.disease === 'Healthy' ? t.maintenanceProducts : t.officialProducts}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.productsScroll}>
              {products.map((p: any, i: number) => {
                const meta = getProductMeta(p.product_name, t);
                return (
                  <TouchableOpacity 
                    key={p.id || i} 
                    style={[styles.productCard, SHADOW]}
                    onPress={() => p.link_url && Linking.openURL(p.link_url)}
                  >
                    <View style={styles.productIconWrap}>
                      <Ionicons name={meta.icon as any} size={22} color={AG.accentGreen} />
                    </View>
                    <Text style={styles.productName} numberOfLines={2}>{p.product_name}</Text>
                    <View style={styles.productTag}>
                      <Text style={styles.productTagText}>{meta.category}</Text>
                    </View>
                    <View style={styles.buyBtn}>
                      <Text style={styles.buyBtnText}>{t.viewStore}</Text>
                      <Ionicons name="arrow-forward" size={12} color={AG.accentGreen} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </>
        )}

        {/* ── Fallback AI Recommendations ── */}
        {(products.length === 0 && treatment.recommended_products?.length > 0 && !['non papaya', 'non_papaya', 'non-papaya'].includes(treatment.disease.toLowerCase().replace(/-/g, ' '))) && (
          <>
            <Text style={styles.sectionTitle}>{t.recommendedTitle}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.productsScroll}>
              {treatment.recommended_products.map((p: any, i: number) => {
                const meta = getProductMeta(p.name, t);
                return (
                  <View key={i} style={[styles.productCard, SHADOW]}>
                    <View style={styles.productIconWrap}>
                      <Ionicons name={meta.icon as any} size={22} color={AG.accentGreen} />
                    </View>
                    <Text style={styles.productName}>{p.name}</Text>
                    <View style={styles.productTag}>
                      <Text style={styles.productTagText}>{p.price_range || meta.category}</Text>
                    </View>
                    <Text style={styles.productFreq}>{t.applyLabel}</Text>
                  </View>
                );
              })}
            </ScrollView>
          </>
        )}

        {/* ── Task Reminder Button (US012) ── */}
        <TouchableOpacity 
          style={[styles.reminderBtn, SHADOW]} 
          onPress={async () => {
            const hasPermission = await requestNotificationPermissions();
            if (!hasPermission && !['expo_go'].includes('')) { // Mocking the expo_go check here for now, but service handles it
              // Alert is handled inside or we can add one here
            }
            setIsReminderModalVisible(true);
          }}
        >
          <View style={styles.reminderBtnIcon}>
            <Ionicons name="notifications-outline" size={20} color="#FFF" />
          </View>
          <Text style={styles.reminderBtnText}>{t.setReminder}</Text>
          <Ionicons name="chevron-forward" size={16} color="#FFF" />
        </TouchableOpacity>

        {/* ── ⚡ 5-Second Viva Demo Trigger ── */}
        <TouchableOpacity 
          style={[styles.testNotifBtn, SHADOW]} 
          onPress={async () => {
            const success = await scheduleTestNotification(locale);
            if (success) {
              Alert.alert(
                '⚡ Demo Triggered',
                locale === 'bm'
                  ? 'Tutup aplikasi sekarang! Pemberitahuan akan tiba dalam 5 saat.'
                  : 'Close the app now! Notification will arrive in 5 seconds.',
                [{ text: 'OK' }]
              );
            } else {
              Alert.alert(
                locale === 'bm' ? 'Tidak Dapat Dihantar' : 'Cannot Send',
                locale === 'bm'
                  ? 'Pemberitahuan memerlukan kebenaran peranti.'
                  : 'Notifications require device permission.',
                [{ text: 'OK' }]
              );
            }
          }}
        >
          <Ionicons name="flash-outline" size={18} color={AG.accentGreen} />
          <Text style={styles.testNotifBtnText}>⚡ Test Notification (5s)</Text>
        </TouchableOpacity>

        {/* ── Reminder Config Modal (US012 Task 2) ── */}
        <Modal
          visible={isReminderModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setIsReminderModalVisible(false)}
        >
          <Pressable 
            style={styles.modalOverlay} 
            onPress={() => setIsReminderModalVisible(false)}
          >
            <Pressable style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
              <View style={styles.modalHandle} />
              
              <Text style={styles.modalTitle}>{t.reminderConfigTitle}</Text>
              
              <View style={styles.taskPreview}>
                <Ionicons name="leaf" size={20} color={AG.accentGreen} />
                <Text style={styles.taskPreviewText}>
                  {t.reminderTaskLabel} {t.diseaseNames[treatment.disease as keyof typeof t.diseaseNames] || formatId(treatment.disease)}
                </Text>
              </View>

              <View style={styles.optionsGroup}>
                {[1, 3, 7].map((days) => (
                  <TouchableOpacity
                    key={days}
                    style={[
                      styles.optionBtn,
                      selectedDays === days && styles.optionBtnActive
                    ]}
                    onPress={() => setSelectedDays(days)}
                  >
                    <Ionicons 
                      name={selectedDays === days ? "radio-button-on" : "radio-button-off"} 
                      size={20} 
                      color={selectedDays === days ? AG.accentGreen : AG.muted} 
                    />
                    <Text style={[
                      styles.optionText,
                      selectedDays === days && styles.optionTextActive
                    ]}>
                      {days === 1 ? t.remindIn1Day : days === 3 ? t.remindIn3Days : t.remindIn7Days}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={styles.cancelBtn} 
                  onPress={() => setIsReminderModalVisible(false)}
                >
                  <Text style={styles.cancelBtnText}>{t.cancel}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.confirmBtn} 
                  onPress={async () => {
                    const result = await scheduleTreatmentReminders(
                      treatment.disease, 
                      [], 
                      locale, 
                      selectedDays
                    );

                    setIsReminderModalVisible(false);

                    if (result.success && result.id) {
                      // Save to local store
                      const targetDate = new Date();
                      targetDate.setDate(targetDate.getDate() + selectedDays);
                      
                      useReminderStore.getState().addReminder({
                        id: result.id,
                        diseaseName: treatment.disease,
                        days: selectedDays,
                        scheduledAt: new Date().toISOString(),
                        targetDate: targetDate.toISOString(),
                      });

                      if ('isSimulation' in result && (result as any).isSimulation) {
                        Alert.alert(
                          "Reminder Scheduled",
                          `[Simulation Mode] Reminder scheduled for ${selectedDays} days.\n\nNotification set successfully (Expo Go Simulation Mode).`,
                          [{ text: 'OK' }]
                        );
                      } else {
                        Alert.alert(
                          locale === 'bm' ? 'Peringatan Berjaya Ditetapkan!' : 'Reminder Set Successfully!',
                          locale === 'bm' 
                            ? `Peringatan semburan untuk ${t.diseaseNames[treatment.disease as keyof typeof t.diseaseNames] || treatment.disease} ditetapkan dalam ${selectedDays} hari.` 
                            : `Spraying reminder for ${t.diseaseNames[treatment.disease as keyof typeof t.diseaseNames] || treatment.disease} set for ${selectedDays} days from now.`,
                          [{ text: 'OK' }]
                        );
                      }
                    } else if (result.reason === 'expo_go') {
                      Alert.alert(
                        locale === 'bm' ? 'Notis Expo Go' : 'Expo Go Notice',
                        locale === 'bm'
                          ? 'Pemberitahuan asli hanya tersedia dalam "Development Build". Kami telah merekodkan pilihan anda dalam log.'
                          : 'Native notifications are only available in a Development Build. We have logged your selection in the console.',
                        [{ text: 'OK' }]
                      );
                    } else if (result.reason === 'no_permission') {
                      Alert.alert(
                        locale === 'bm' ? 'Tiada Kebenaran' : 'Permission Denied',
                        locale === 'bm'
                          ? 'Sila benarkan pemberitahuan dalam tetapan sistem untuk menggunakan ciri ini.'
                          : 'Please enable notifications in system settings to use this feature.',
                        [{ text: 'OK' }]
                      );
                    }
                  }}
                >
                  <Text style={styles.confirmBtnText}>{t.confirm}</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* ── Disclaimer ── */}
        <View style={styles.disclaimerWrap}>
          <Text style={styles.disclaimerText}>
            {t.disclaimer}
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AG.bgMain },
  scrollContent: { padding: 20 },
  centeredScreen: {
    flex: 1, backgroundColor: AG.bgMain, justifyContent: 'center', alignItems: 'center', padding: 32,
  },
  loadingText: { marginTop: 16, fontSize: 15, color: AG.textSecondary, textAlign: 'center' },
  emptyIcon: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: AG.healthyFill,
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  emptyText: { fontSize: 17, color: AG.textSecondary, marginBottom: 20 },
  backBtn: {
    backgroundColor: AG.accentGreen, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 28,
  },
  backBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },

  /* Header */
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20,
  },
  headerBackBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: AG.bgCard,
    justifyContent: 'center', alignItems: 'center', ...{
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
    },
  },
  headerTitle: { fontSize: 20, fontWeight: '900', color: AG.textPrimary },
  headerTitleWrap: { alignItems: 'center' },
  subtitleBadge: {
    backgroundColor: AG.healthyFill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    marginTop: 2,
  },
  headerSub: { 
    fontSize: 10, 
    fontWeight: '800',
    color: AG.accentGreen, 
    textTransform: 'uppercase',
    letterSpacing: 0.8 
  },

  /* Fallback */
  fallbackBanner: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: AG.warningFill,
    padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#F0DCA0', marginBottom: 16, gap: 8,
  },
  fallbackText: { fontSize: 13, fontWeight: '600', color: AG.warning, flex: 1 },

  /* Card */
  card: {
    backgroundColor: AG.bgCard, borderRadius: 18, padding: 18, marginBottom: 14,
  },

  /* Disease overview */
  diseaseRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  diseaseName: { fontSize: 22, fontWeight: '800', color: AG.textPrimary, marginBottom: 6 },
  riskBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  riskText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.4 },
  thumbImage: { width: 60, height: 60, borderRadius: 14, marginLeft: 12 },

  /* Context */
  contextText: { fontSize: 14, lineHeight: 21, fontStyle: 'italic', color: AG.textSecondary },

  /* Steps */
  sectionTitle: { fontSize: 16, fontWeight: '700', color: AG.textPrimary, marginBottom: 12, marginTop: 8 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  stepBadge: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: AG.accentGreen,
    justifyContent: 'center', alignItems: 'center',
  },
  stepBadgeText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  stepText: { flex: 1, fontSize: 15, lineHeight: 23, color: AG.textPrimary },

  /* Dosage */
  dosageProduct: { fontSize: 15, fontWeight: '700', color: AG.healthy, marginBottom: 8 },
  dosageRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  dosageDetail: { fontSize: 13, color: AG.textSecondary },

  /* Prevention */
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, paddingLeft: 4 },
  bullet: {
    width: 7, height: 7, borderRadius: 4, backgroundColor: AG.healthy, marginTop: 7, marginRight: 12,
  },
  bulletText: { flex: 1, fontSize: 15, lineHeight: 22, color: AG.textPrimary },

  /* Products horizontal scroll */
  productsScroll: { marginBottom: 16 },
  productCard: {
    width: 190, backgroundColor: AG.bgCard, borderRadius: 24, padding: 20, marginRight: 14,
    borderWidth: 1, borderColor: AG.border + '50',
  },
  productIconWrap: {
    width: 48, height: 48, borderRadius: 16, backgroundColor: AG.healthyFill,
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
  },
  productName: { fontSize: 14, fontWeight: '700', color: AG.textPrimary, marginBottom: 8 },
  productTag: {
    alignSelf: 'flex-start', backgroundColor: AG.healthyFill,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 8,
  },
  productTagText: { fontSize: 11, fontWeight: '700', color: AG.healthy },
  productFreq: { fontSize: 11, color: AG.muted },
  buyBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    gap: 6, 
    marginTop: 12,
    paddingVertical: 10,
    backgroundColor: AG.healthyFill,
    borderRadius: 12,
  },
  buyBtnText: { fontSize: 12, fontWeight: '800', color: AG.accentGreen },

  /* Disclaimer */
  disclaimerWrap: { marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: AG.border },
  disclaimerText: { fontSize: 11, textAlign: 'center', color: AG.muted, lineHeight: 17 },

  /* US012 Reminder Button */
  reminderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AG.accentGreen,
    padding: 18,
    borderRadius: 20,
    marginTop: 10,
    marginBottom: 20,
    gap: 12,
  },
  reminderBtnIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reminderBtnText: {
    flex: 1,
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },

  /* 5-Second Demo Trigger */
  testNotifBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AG.bgCard,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 8,
    borderWidth: 1.5,
    borderColor: AG.accentGreen + '40',
    borderStyle: 'dashed',
  },
  testNotifBtnText: {
    color: AG.accentGreen,
    fontSize: 14,
    fontWeight: '700',
  },

  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    minHeight: 350,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: AG.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: AG.textPrimary,
    marginBottom: 20,
    textAlign: 'center',
  },
  taskPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AG.bgMain,
    padding: 16,
    borderRadius: 16,
    gap: 12,
    marginBottom: 24,
  },
  taskPreviewText: {
    flex: 1,
    fontSize: 14,
    color: AG.textSecondary,
    fontWeight: '600',
  },
  optionsGroup: {
    gap: 12,
    marginBottom: 32,
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AG.border,
    gap: 12,
  },
  optionBtnActive: {
    borderColor: AG.accentGreen,
    backgroundColor: AG.healthyFill,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
    color: AG.textSecondary,
  },
  optionTextActive: {
    color: AG.accentGreen,
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: AG.bgMain,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: AG.textSecondary,
  },
  confirmBtn: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: AG.accentGreen,
    alignItems: 'center',
    ...SHADOW,
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  diagnosticCard: {
    backgroundColor: AG.bgCard,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: AG.border,
    borderLeftWidth: 4,
    padding: 18,
    marginBottom: 20,
    marginTop: 8,
  },
  diagnosticHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  diagnosticTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: AG.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  diagnosticDivider: {
    height: 1,
    backgroundColor: AG.border,
    marginBottom: 14,
  },
  diagnosticSection: {
    marginBottom: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  sectionBadgeWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: AG.textPrimary,
  },
  diagnosticSecContent: {
    fontSize: 14,
    lineHeight: 20,
    color: AG.textSecondary,
    paddingLeft: 32,
  },
  secondarySubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  secondarySubText: {
    fontSize: 14,
    fontWeight: '600',
    color: AG.warning,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: AG.bgMain,
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: AG.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: AG.bgCard,
    ...SHADOW,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: AG.textSecondary,
  },
  tabButtonTextActive: {
    color: AG.accentGreen,
    fontWeight: '700',
  },
  warningCard: {
    backgroundColor: AG.warningFill,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F0DCA0',
    padding: 16,
    marginBottom: 14,
  },
  warningHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  warningTitleText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#8A5E0B',
  },
  warningSubtitleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8A5E0B',
    marginTop: -4,
    marginBottom: 8,
  },
  warningBodyText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#6E4904',
    marginBottom: 12,
  },
  warningActionsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8A5E0B',
    marginBottom: 6,
  },
  warningActionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    paddingLeft: 4,
  },
  warningActionBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#B6862C',
    marginTop: 7,
    marginRight: 10,
  },
  warningActionText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: '#6E4904',
  },
  comparisonBadgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 12,
  },
  primaryBadge: {
    flex: 1,
    minWidth: 140,
    backgroundColor: AG.accentGreen,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  alternativeBadge: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#F0DCA0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alternativeBadgeText: {
    color: '#8A5E0B',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  resolutionNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(230, 92, 0, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(230, 92, 0, 0.1)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: 4,
    marginBottom: 8,
    gap: 6,
  },
  resolutionNoticeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8A5E0B',
    flex: 1,
  },
});

