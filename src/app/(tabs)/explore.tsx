import React, { useState, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  View,
  Text,
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '@/services/api';
import { useSettingsStore } from '@/stores/settingsStore';

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

const TRANSLATIONS = {
  en: {
    title: 'Encyclopedia',
    subtitle: 'Papaya Pathology Reference',
    searchPlaceholder: 'Search disease, symptom, or pest...',
    noProfile: 'No pathology profile found.',
    description: 'Description',
    symptoms: 'Visual Symptoms',
    causes: 'Primary Causes',
    management: 'Eradication & Management',
    disclaimer: 'For agricultural reference only. Consult a certified agronomist for severe or persistent infestations.',
    optimal: '✅ Optimal Condition',
    pathology: '🛑 Pathology Detected',
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
    faqTitle: '🔍 Quick Troubleshooting Guide & FAQ',
    faqItems: [
      { 
        q: 'Dark, sunken spots on fruits or leaves', 
        a: 'Likely Anthracnose. Use protective fungicides like Bayer Antracol 70WP.' 
      },
      { 
        q: 'Water-soaked lesions with yellow halos', 
        a: 'Signs of Bacterial Spot. Apply contact copper bactericides like Kenso Kocide 2000.' 
      },
      { 
        q: 'White powdery coating on upper leaf surface', 
        a: 'Powdery Mildew outbreak. Treat with systemic fungicides like Syngenta Anvil.' 
      }
    ]
  },
  bm: {
    title: 'Ensiklopedia',
    subtitle: 'Rujukan Patologi Betik',
    searchPlaceholder: 'Cari penyakit, simptom, atau perosak...',
    noProfile: 'Profil patologi tidak dijumpai.',
    description: 'Deskripsi',
    symptoms: 'Simptom Visual',
    causes: 'Punca Utama',
    management: 'Pembasmian & Pengurusan',
    disclaimer: 'Untuk rujukan pertanian sahaja. Rujuk pakar agronom bertauliah untuk serangan yang teruk atau berterusan.',
    optimal: '✅ Keadaan Optimum',
    pathology: '🛑 Patologi Dikesan',
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
    faqTitle: '🔍 Panduan Penyelesaian Masalah Pantas & FAQ',
    faqItems: [
      { 
        q: 'Bintik gelap dan tenggelam pada buah atau daun', 
        a: 'Kemungkinan Antraknos. Gunakan racun kulat pelindung seperti Bayer Antracol 70WP.' 
      },
      { 
        q: 'Lesi lecah air dengan halo kuning', 
        a: 'Tanda Bintik Bakteria. Gunakan bakterisida kuprum seperti Kenso Kocide 2000.' 
      },
      { 
        q: 'Lapisan serbuk putih pada permukaan atas daun', 
        a: 'Serangan Kulapuk Berdebu. Rawat dengan racun kulat sistemik seperti Syngenta Anvil.' 
      }
    ]
  }
};

const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.03,
  shadowRadius: 16,
  elevation: 2,
};

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

export default function ExploreScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [diseases, setDiseases] = useState<DiseaseProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDisease, setSelectedDisease] = useState<DiseaseProfile | null>(null);
  const [isFaqExpanded, setIsFaqExpanded] = useState(false);
  const { locale } = useSettingsStore();

  const t = TRANSLATIONS[locale as keyof typeof TRANSLATIONS] || TRANSLATIONS.en;

  const getLocalizedField = (item: DiseaseProfile | null, field: 'description' | 'symptoms' | 'causes' | 'treatment') => {
    if (!item) return '';
    if (locale === 'bm') {
      const msField = `${field}_ms` as keyof DiseaseProfile;
      return item[msField] || item[field] || '';
    }
    return item[field] || '';
  };

  useEffect(() => {
    loadDiseases();
  }, [locale]);

  const toggleFaq = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsFaqExpanded(!isFaqExpanded);
  };

  const loadDiseases = async () => {
    try {
      setIsLoading(true);
      const data = await apiService.getDiseases(locale);
      if (Array.isArray(data) && data.length > 0) {
        const mappedData = data.filter(Boolean).map((item: any) => ({
          disease_name: item.disease_name || 'Healthy',
          description: item.description || '',
          description_ms: item.description_ms || null,
          symptoms: item.symptoms || '',
          symptoms_ms: item.symptoms_ms || null,
          causes: item.causes || '',
          causes_ms: item.causes_ms || null,
          treatment: item.treatment || '',
          treatment_ms: item.treatment_ms || null,
        }));
        setDiseases(mappedData);
      } else {
        console.warn('API returned empty or invalid data, loading fallback mockup...');
        setDiseases(MOCK_DISEASES);
      }
    } catch (error) {
      console.error('Failed to load diseases, falling back to mock data:', error);
      setDiseases(MOCK_DISEASES);
    } finally {
      setIsLoading(false);
    }
  };

  const getUIMeta = (name: string) => {
    const isHealthy = name.toLowerCase() === 'healthy';
    return {
      icon: isHealthy ? 'checkmark-circle' : 'leaf',
      riskColor: isHealthy ? AG.healthy : AG.disease,
      iconBg: isHealthy ? AG.healthyFill : AG.diseaseFill,
      riskTag: isHealthy ? t.optimal : t.pathology,
    };
  };

  const filteredDiseases = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return diseases.filter(item => {
      const nameLower = (item.disease_name || '').toLowerCase();
      if (nameLower === 'non-papaya') return false;
      if (nameLower === 'healthy') return false;
      
      const localizedName = (t.diseaseNames[item.disease_name as keyof typeof t.diseaseNames] || item.disease_name || '').toLowerCase();
      const descLower = (item.description || '').toLowerCase();
      const descMsLower = (item.description_ms || '').toLowerCase();
      const symptomsLower = (item.symptoms || '').toLowerCase();
      const symptomsMsLower = (item.symptoms_ms || '').toLowerCase();
      
      return (
        nameLower.includes(query) ||
        localizedName.includes(query) ||
        descLower.includes(query) ||
        descMsLower.includes(query) ||
        symptomsLower.includes(query) ||
        symptomsMsLower.includes(query)
      );
    });
  }, [searchQuery, diseases, locale]);

  const renderItem = ({ item }: { item: DiseaseProfile }) => {
    const meta = getUIMeta(item.disease_name);
    return (
      <TouchableOpacity
        style={[styles.card, CARD_SHADOW]}
        onPress={() => setSelectedDisease(item)}
        activeOpacity={0.8}
      >
        <View style={[styles.cardIconWrap, { backgroundColor: meta.iconBg }]}>
          <Ionicons name={meta.icon as any} size={24} color={meta.riskColor} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>
            {t.diseaseNames[item.disease_name as keyof typeof t.diseaseNames] || item.disease_name}
          </Text>
          <Text style={styles.cardRiskTag}>{meta.riskTag}</Text>
          <Text numberOfLines={2} style={styles.cardSnippet}>
            {getLocalizedField(item, 'description')}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={AG.accentGreen} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t.title}</Text>
        <View style={styles.subtitleBadge}>
          <Text style={styles.headerSub}>
            {t.subtitle} — {filteredDiseases.length} Classes
          </Text>
        </View>
      </View>

      <View style={[styles.searchBar, CARD_SHADOW]}>
        <Ionicons name="search" size={18} color={AG.muted} />
        <TextInput
          placeholder={t.searchPlaceholder}
          placeholderTextColor={AG.muted}
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery !== '' && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={AG.muted} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredDiseases}
        renderItem={renderItem}
        keyExtractor={item => item.disease_name}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.faqSection}>
            <TouchableOpacity 
              style={[styles.faqHeader, isFaqExpanded && styles.faqHeaderActive]} 
              onPress={toggleFaq}
              activeOpacity={0.9}
            >
              <View style={styles.faqHeaderIcon}>
                <Ionicons 
                  name={isFaqExpanded ? "help-circle-outline" : "help-circle"} 
                  size={20} 
                  color={AG.bgCard} 
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.faqTitle}>{t.faqTitle}</Text>
                {!isFaqExpanded && <View style={styles.faqSubtitleLine} />}
              </View>
              <Ionicons 
                name={isFaqExpanded ? "chevron-up" : "chevron-down"} 
                size={20} 
                color={AG.accentGreen} 
              />
            </TouchableOpacity>

            {isFaqExpanded && (
              <View style={styles.faqContent}>
                {t.faqItems.map((item, idx) => (
                  <View key={idx} style={[styles.faqCard, CARD_SHADOW]}>
                    <View style={styles.faqQuestionRow}>
                      <Ionicons name="alert-circle" size={18} color={AG.warning} />
                      <Text style={styles.faqQuestion}>{item.q}</Text>
                    </View>
                    <View style={styles.faqDivider} />
                    <Text style={styles.faqAnswer}>{item.a}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.emptyWrap}>
              <ActivityIndicator size="large" color={AG.accentGreen} style={{ marginBottom: 16 }} />
              <Text style={styles.emptyText}>
                {locale === 'bm' ? 'Mengemas Kini Katalog Patologi...' : 'Updating Pathology Catalog...'}
              </Text>
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIcon}>
                <Ionicons name="search-outline" size={40} color={AG.muted} />
              </View>
              <Text style={styles.emptyText}>
                {t.noProfile}
              </Text>
            </View>
          )
        }
        ListFooterComponent={<View style={{ height: 100 }} />}
      />

      {/* ── Premium Detail Modal ── */}
      <Modal visible={!!selectedDisease} animationType="slide" transparent onRequestClose={() => setSelectedDisease(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* Close */}
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelectedDisease(null)}>
                <Ionicons name="close" size={20} color={AG.textPrimary} />
              </TouchableOpacity>

              {/* Title & Risk Tag */}
              <Text style={styles.modalTitle}>
                {selectedDisease ? (t.diseaseNames[selectedDisease.disease_name as keyof typeof t.diseaseNames] || selectedDisease.disease_name) : ''}
              </Text>
              {selectedDisease && (
                <View style={[styles.modalRiskPill, { backgroundColor: getUIMeta(selectedDisease.disease_name).iconBg }]}>
                  <Text style={[styles.modalRiskText, { color: getUIMeta(selectedDisease.disease_name).riskColor }]}>
                    {getUIMeta(selectedDisease.disease_name).riskTag}
                  </Text>
                </View>
              )}

              {/* ── Description Card ── */}
              <View style={[styles.detailCard, CARD_SHADOW]}>
                <View style={[styles.detailAccentStrip, { backgroundColor: AG.accentGreen }]} />
                <View style={styles.detailCardInner}>
                  <View style={styles.detailLabelRow}>
                    <Ionicons name="information-circle-outline" size={16} color={AG.accentGreen} />
                    <Text style={styles.detailLabelText}>{t.description}</Text>
                  </View>
                  <Text style={styles.detailBody}>{getLocalizedField(selectedDisease, 'description')}</Text>
                </View>
              </View>

              {/* ── Symptoms Card (amber accent strip) ── */}
              <View style={[styles.detailCard, CARD_SHADOW]}>
                <View style={[styles.detailAccentStrip, { backgroundColor: AG.warning }]} />
                <View style={styles.detailCardInner}>
                  <View style={styles.detailLabelRow}>
                    <Ionicons name="eye-outline" size={16} color={AG.warning} />
                    <Text style={styles.detailLabelText}>{t.symptoms}</Text>
                  </View>
                  <Text style={styles.detailBody}>{getLocalizedField(selectedDisease, 'symptoms')}</Text>
                </View>
              </View>

              {/* ── Causes Card (charcoal accent) ── */}
              <View style={[styles.detailCard, CARD_SHADOW]}>
                <View style={[styles.detailAccentStrip, { backgroundColor: AG.textPrimary }]} />
                <View style={styles.detailCardInner}>
                  <View style={styles.detailLabelRow}>
                    <Ionicons name="help-circle-outline" size={16} color={AG.textPrimary} />
                    <Text style={styles.detailLabelText}>{t.causes}</Text>
                  </View>
                  <Text style={styles.detailBody}>{getLocalizedField(selectedDisease, 'causes')}</Text>
                </View>
              </View>

              {/* ── Organic Treatment Card (sage accent) ── */}
              <View style={[styles.treatmentCard, CARD_SHADOW]}>
                <View style={styles.detailLabelRow}>
                  <Ionicons name="leaf-outline" size={16} color={AG.healthy} />
                  <Text style={[styles.detailLabelText, { color: AG.healthy }]}>
                    {t.management}
                  </Text>
                </View>
                <Text style={styles.treatmentStepText}>{getLocalizedField(selectedDisease, 'treatment')}</Text>
              </View>

              {/* Disclaimer */}
              <View style={styles.disclaimerWrap}>
                <Text style={styles.disclaimerText}>
                  {t.disclaimer}
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AG.bgMain, paddingTop: 60 },
  header: { paddingHorizontal: 20, marginBottom: 16 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: AG.textPrimary, marginBottom: 6 },
  subtitleBadge: {
    backgroundColor: AG.healthyFill,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  headerSub: { 
    fontSize: 12, 
    fontWeight: '700',
    color: AG.accentGreen, 
    textTransform: 'uppercase',
    letterSpacing: 0.5 
  },

  /* Search */
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: AG.bgCard,
    marginHorizontal: 20, paddingHorizontal: 16, height: 48, borderRadius: 16, marginBottom: 18,
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15, color: AG.textPrimary },

  listContent: { paddingHorizontal: 20, paddingBottom: 100 },

  /* Card */
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: AG.bgCard,
    padding: 16, borderRadius: 20, marginBottom: 12,
    borderWidth: 1, borderColor: AG.border,
  },
  cardIconWrap: {
    width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: AG.textPrimary },
  cardRiskTag: { fontSize: 10, fontWeight: '700', color: AG.muted, marginTop: 1, marginBottom: 4 },
  cardSnippet: { fontSize: 12, lineHeight: 17, color: AG.textSecondary },

  /* Empty */
  emptyWrap: { alignItems: 'center', marginTop: 80 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: AG.bgCard,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16, ...CARD_SHADOW,
  },
  emptyText: { fontSize: 15, color: AG.muted },

  /* ── Modal ── */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(28,43,36,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    height: '88%', backgroundColor: AG.bgMain,
    borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingTop: 12,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: AG.border, alignSelf: 'center', marginBottom: 8,
  },
  modalScroll: { paddingHorizontal: 24, paddingBottom: 50 },
  modalCloseBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: AG.bgCard,
    justifyContent: 'center', alignItems: 'center', alignSelf: 'flex-end', marginBottom: 8,
    ...CARD_SHADOW,
  },
  modalTitle: { fontSize: 28, fontWeight: '900', color: AG.textPrimary, marginBottom: 8 },
  modalRiskPill: {
    alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10, marginBottom: 24,
  },
  modalRiskText: { fontSize: 12, fontWeight: '800' },

  /* Detail cards */
  detailCard: {
    flexDirection: 'row', backgroundColor: AG.bgCard, borderRadius: 18,
    marginBottom: 14, overflow: 'hidden',
  },
  detailAccentStrip: { width: 5 },
  detailCardInner: { flex: 1, padding: 18 },
  detailLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  detailLabelText: { fontSize: 13, fontWeight: '800', color: AG.textPrimary, textTransform: 'uppercase', letterSpacing: 0.5 },
  detailBody: { fontSize: 15, lineHeight: 23, color: AG.textSecondary },

  /* Treatment card (sage) */
  treatmentCard: {
    backgroundColor: AG.healthyFill, borderRadius: 18, padding: 20,
    borderWidth: 1, borderColor: '#C6E2D0', marginBottom: 14,
  },
  treatmentStep: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 10 },
  treatmentDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: AG.accentGreen, marginTop: 7, marginRight: 12,
  },
  treatmentStepText: { flex: 1, fontSize: 14, lineHeight: 21, color: AG.accentGreen, fontWeight: '600' },

  disclaimerWrap: {
    marginTop: 12, padding: 16, backgroundColor: AG.bgCard, borderRadius: 14, ...CARD_SHADOW,
  },
  disclaimerText: { fontSize: 11, textAlign: 'center', color: AG.muted, fontStyle: 'italic', lineHeight: 16 },

  /* FAQ Section (UC013) */
  faqSection: { 
    marginBottom: 20,
    backgroundColor: 'transparent',
  },
  faqHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12, 
    backgroundColor: AG.bgCard,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: AG.border,
    ...CARD_SHADOW,
  },
  faqHeaderActive: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 0,
    marginBottom: 0,
  },
  faqHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: AG.accentGreen,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faqTitle: { fontSize: 16, fontWeight: '800', color: AG.textPrimary, letterSpacing: -0.3 },
  faqSubtitleLine: { width: 30, height: 3, backgroundColor: AG.healthy, borderRadius: 2, marginTop: 4 },
  faqContent: {
    backgroundColor: AG.bgCard,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: AG.border,
    ...CARD_SHADOW,
  },
  faqCard: {
    backgroundColor: AG.bgCard,
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  faqQuestionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  faqQuestion: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: AG.textPrimary,
  },
  faqDivider: {
    height: 1,
    backgroundColor: AG.border,
    marginBottom: 12,
    opacity: 0.5,
  },
  faqAnswer: {
    fontSize: 13,
    lineHeight: 20,
    color: AG.textSecondary,
    fontWeight: '500',
  },
});
