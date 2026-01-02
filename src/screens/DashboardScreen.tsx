import React, { useLayoutEffect, useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Image, Animated, AppState, Alert, TextInput, Keyboard, Modal, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

// Grafik Kütüphaneleri
import { LineChart, BarChart } from 'react-native-chart-kit';

// Sensörler & RxJS
import { accelerometer, setUpdateIntervalForType, SensorTypes } from "react-native-sensors";
import { map, filter } from "rxjs/operators";

// Veri Kaydı & Supabase
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

const { width: screenWidth } = Dimensions.get('window');

// --- RENK PALETİ (GÜNCEL) ---
const COLORS = {
  primary: '#4F46E5', // İndigo Mavi (Ana Tema)
  secondary: '#10B981', // Zümrüt Yeşili
  waterColor: '#0EA5E9', // Okyanus Mavisi (Su için özel)
  bg: '#F8FAFC', // Çok açık gri/mavi arka plan
  cardBg: '#FFFFFF',
  textMain: '#1E293B', // Koyu arduvaz
  textSub: '#64748B', // Orta gri
  accent: '#F59E0B',
  danger: '#EF4444',
};

// --- DİYET PLANLARI ---
const DIET_PLANS: any = {
  "Zayıf": {
    title: "Kilo Alma & Güçlenme 💪", description: "Sağlıklı karbonhidrat ve protein ağırlıklı beslenme.", color: '#3B82F6',
    days: [{ day: 1, breakfast: "3 Yumurtalı omlet, tam buğday ekmek, bal.", lunch: "Kıymalı makarna, yoğurt.", dinner: "Izgara tavuk, pilav, avokado." }, { day: 2, breakfast: "Yulaf lapası (süt, muz, fıstık ezmesi).", lunch: "Kuru fasulye, pilav.", dinner: "Fırın somon, patates püresi." }, { day: 3, breakfast: "Kaşarlı tost, tahin-pekmez.", lunch: "Döner dürüm, ayran.", dinner: "Köfte, fırın patates." }]
  },
  "Normal": {
    title: "Denge & Koruma ⚖️", description: "Formunu korumak için dengeli beslenme.", color: '#10B981',
    days: [{ day: 1, breakfast: "Yulaf ezmesi, meyve.", lunch: "Izgara tavuk, bulgur, ayran.", dinner: "Zeytinyağlı fasulye, cacık." }, { day: 2, breakfast: "Menemen, 1 dilim ekmek.", lunch: "Ton balıklı salata.", dinner: "Mercimek çorbası, köfte." }, { day: 3, breakfast: "Haşlanmış yumurta, peynir.", lunch: "Sebzeli makarna.", dinner: "Izgara balık, roka." }]
  },
  "Fazla Kilolu": {
    title: "Yağ Yakım Paketi 🔥", description: "Kalori açığı ile yağ yakımını destekle.", color: '#F59E0B',
    days: [{ day: 1, breakfast: "2 Haşlanmış yumurta, bol yeşillik.", lunch: "Izgara kabak, yoğurt.", dinner: "Tavuk suyu çorba (ekmeksiz)." }, { day: 2, breakfast: "Avokadolu lor peynirli tost (esmer).", lunch: "Izgara köfte, biber.", dinner: "Kabak spagetti." }, { day: 3, breakfast: "Mantarlı omlet, salatalık.", lunch: "Yeşil mercimek.", dinner: "Fırın somon, kuşkonmaz." }]
  },
  "Obez": {
    title: "Metabolizma Canlandır ⚡", description: "Düşük karbonhidrat, yüksek lif.", color: '#EF4444',
    days: [{ day: 1, breakfast: "Yeşil smoothie (Sebze ağırlıklı).", lunch: "Haşlama sebze, limonlu su.", dinner: "Izgara hindi, yağsız salata." }, { day: 2, breakfast: "1 Haşlanmış yumurta, maydanoz.", lunch: "Semizotu salatası.", dinner: "Sebze çorbası." }, { day: 3, breakfast: "Chialı yoğurt.", lunch: "Izgara mantar, lor.", dinner: "Buharda balık." }]
  }
};

// --- ÖRNEK VERİLER ---
const MOCK_DATA = {
  weekly: { labels: ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"], steps: [6500, 8200, 10500, 4500, 9200, 11000, 0], water: [6, 8, 10, 5, 9, 12, 0] },
  monthly: { labels: ["1.Hft", "2.Hft", "3.Hft", "4.Hft"], steps: [45000, 52000, 48000, 56000], water: [50, 65, 55, 70] },
  yearly: { labels: ["Oca", "Şub", "Mar", "Nis", "May", "Haz"], steps: [150000, 180000, 210000, 230000, 250000, 280000], water: [180, 200, 220, 250, 270, 300] }
};

const AVATAR_MAP: any = { 'manicon1': require('../assets/images/manicon1.png'), 'manicon2': require('../assets/images/manicon2.jpg'), 'womanicon1': require('../assets/images/womanicon1.jpg'), 'womanicon2': require('../assets/images/womanicon2.png') };

export default function DashboardScreen({ navigation }: any) {
  // State'ler
  const [waterCount, setWaterCount] = useState(0);
  const [stepCount, setStepCount] = useState(0);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [userAvatar, setUserAvatar] = useState<any>(null);
  const [currentDate, setCurrentDate] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState<'gunluk' | 'haftalik' | 'aylik' | 'yillik'>('gunluk');

  // Menü ve Modallar
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuAnimation] = useState(new Animated.Value(-300));
  const [showSleepModal, setShowSleepModal] = useState(false);
  const [showDietModal, setShowDietModal] = useState(false);
  
  // Diğer State'ler
  const [bmiStatus, setBmiStatus] = useState<string>("Normal");
  const [selectedDietDay, setSelectedDietDay] = useState(0);
  const [sleepInput, setSleepInput] = useState("");
  const [sleepResult, setSleepResult] = useState<any>(null);

  // --- INITIALIZE ---
  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
  }, []);

  useEffect(() => {
    setUpdateIntervalForType(SensorTypes.accelerometer, 100);
    const sub = accelerometer.pipe(map(({ x, y, z }) => Math.sqrt(x * x + y * y + z * z)), filter(m => m > 12)).subscribe(() => {
        if (isDataLoaded) setStepCount(prev => prev + 1);
    });
    return () => sub.unsubscribe();
  }, [isDataLoaded]);

  useFocusEffect(useCallback(() => {
      const loadData = async () => {
          const today = new Date().toISOString().split('T')[0];
          const savedDate = await AsyncStorage.getItem('LAST_DATE');
          if (savedDate === today) {
              const s = await AsyncStorage.getItem('STEP_COUNT'); const w = await AsyncStorage.getItem('WATER_COUNT');
              if (s) setStepCount(parseInt(s)); if (w) setWaterCount(parseInt(w));
          } else { setStepCount(0); setWaterCount(0); await AsyncStorage.setItem('LAST_DATE', today); }
          setIsDataLoaded(true);

          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
            if (data) {
                if (data.avatar_icon && AVATAR_MAP[data.avatar_icon]) setUserAvatar(AVATAR_MAP[data.avatar_icon]);
                if (data.weight && data.height) {
                    const bmi = data.weight / ((data.height / 100) * (data.height / 100));
                    if (bmi < 18.5) setBmiStatus("Zayıf"); else if (bmi < 25) setBmiStatus("Normal"); else if (bmi < 30) setBmiStatus("Fazla Kilolu"); else setBmiStatus("Obez");
                }
            }
          }
      };
      loadData();
  }, []));

  useEffect(() => { if (isDataLoaded) { AsyncStorage.setItem('STEP_COUNT', stepCount.toString()); AsyncStorage.setItem('WATER_COUNT', waterCount.toString()); } }, [stepCount, waterCount, isDataLoaded]);

  // --- GRAFİK VERİSİ HAZIRLAMA (DÜZELTİLDİ) ---
  const getChartData = () => {
    if (selectedPeriod === 'haftalik') {
        let data = {...MOCK_DATA.weekly};
        data.steps[6] = stepCount; data.water[6] = waterCount;
        return data;
    } else if (selectedPeriod === 'aylik') return MOCK_DATA.monthly;
    else if (selectedPeriod === 'yillik') return MOCK_DATA.yearly;
    return null;
  };

  const chartDataRaw = getChartData();
  // Adım Verisi
  const stepChartData = chartDataRaw ? { labels: chartDataRaw.labels, datasets: [{ data: chartDataRaw.steps }] } : null;
  // Su Verisi (Eksikti, eklendi)
  const waterChartData = chartDataRaw ? { labels: chartDataRaw.labels, datasets: [{ data: chartDataRaw.water, color: (opacity = 1) => `rgba(14, 165, 233, ${opacity})` }] } : null;


  // --- MODAL İÇERİKLERİ ---
  const renderDietContent = () => {
    const currentPlan = DIET_PLANS[bmiStatus] || DIET_PLANS["Normal"];
    const dayPlan = currentPlan.days[selectedDietDay];
    return (
        <View style={styles.dietContainer}>
            <View style={[styles.dietHeader, { backgroundColor: currentPlan.color }]}>
                <Text style={styles.dietTitle}>{currentPlan.title}</Text>
                <Text style={styles.dietDesc}>{currentPlan.description}</Text>
            </View>
            <View style={styles.dietTabs}>
                {[0, 1, 2].map((i) => (<TouchableOpacity key={i} style={[styles.dietTab, selectedDietDay === i && { backgroundColor: currentPlan.color, borderColor: currentPlan.color }]} onPress={() => setSelectedDietDay(i)}><Text style={[styles.dietTabText, selectedDietDay === i && { color: 'white' }]}>{i + 1}. Gün</Text></TouchableOpacity>))}
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{marginTop: 10}}>
                <View style={styles.mealCard}><View style={styles.mealHeader}><Text style={styles.mealIcon}>🍳</Text><Text style={styles.mealTitle}>Kahvaltı</Text></View><Text style={styles.mealText}>{dayPlan.breakfast}</Text></View>
                <View style={styles.mealCard}><View style={styles.mealHeader}><Text style={styles.mealIcon}>🍗</Text><Text style={styles.mealTitle}>Öğle Yemeği</Text></View><Text style={styles.mealText}>{dayPlan.lunch}</Text></View>
                <View style={styles.mealCard}><View style={styles.mealHeader}><Text style={styles.mealIcon}>🥗</Text><Text style={styles.mealTitle}>Akşam Yemeği</Text></View><Text style={styles.mealText}>{dayPlan.dinner}</Text></View>
            </ScrollView>
            <TouchableOpacity style={styles.closeDietBtn} onPress={() => setShowDietModal(false)}><Text style={{color: COLORS.textSub, fontWeight:'bold'}}>Kapat</Text></TouchableOpacity>
        </View>
    );
  };

  const handleSleepAnalysis = () => {
    const hours = parseFloat(sleepInput);
    if (isNaN(hours)) { Alert.alert("Hata", "Geçerli sayı giriniz."); return; }
    let res = { mood: "", emoji: "", advice: "" };
    if (hours < 5) res = { mood: "Yorgun", emoji: "😫", advice: "Bugün ağır işlerden kaçın." }; else if (hours < 7) res = { mood: "İdare Eder", emoji: "😐", advice: "Kısa bir uyku iyi gelebilir." }; else if (hours <= 9) res = { mood: "Harika", emoji: "🤩", advice: "Tam şarj oldun!" }; else res = { mood: "Uyuşuk", emoji: "🐨", advice: "Hareket etme zamanı!" };
    setSleepResult(res); Keyboard.dismiss();
  };

  // --- NAVİGASYON & ANİMASYON ---
  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'VitaFlow', headerStyle: { backgroundColor: COLORS.primary, shadowColor: 'transparent', elevation: 0 }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: '800', fontSize: 22 },
      headerLeft: () => <TouchableOpacity onPress={() => setIsMenuOpen(true)} style={{ marginLeft: 15 }}><Text style={{ fontSize: 28, color: 'white' }}>☰</Text></TouchableOpacity>,
      headerRight: () => <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={{ marginRight: 15 }}><View style={styles.headerAvatarContainer}>{userAvatar ? <Image source={userAvatar} style={styles.headerAvatarImg} /> : <Text style={{color:COLORS.primary, fontWeight:'bold'}}>P</Text>}</View></TouchableOpacity>, headerBackVisible: false,
    });
  }, [navigation, userAvatar]);
  useEffect(() => { Animated.timing(menuAnimation, { toValue: isMenuOpen ? 0 : -300, duration: 300, useNativeDriver: true }).start(); }, [isMenuOpen]);

  // --- RENDER ---
  return (
    <View style={{flex: 1, backgroundColor: COLORS.bg}}>
      <View style={styles.topBackground} />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 50}}>
        <View style={styles.headerSection}>
            <Text style={styles.dateText}>{currentDate}</Text>
            <Text style={styles.welcomeText}>Hoş Geldin! 👋</Text>
        </View>

        <View style={styles.periodContainer}>
            {['gunluk', 'haftalik', 'aylik', 'yillik'].map((p) => (<TouchableOpacity key={p} style={[styles.periodBtn, selectedPeriod === p && styles.periodBtnActive]} onPress={() => setSelectedPeriod(p as any)}><Text style={[styles.periodText, selectedPeriod === p && styles.periodTextActive]}>{p.charAt(0).toUpperCase() + p.slice(1)}</Text></TouchableOpacity>))}
        </View>

        {selectedPeriod === 'gunluk' ? (
            <View>
                <View style={styles.statsRow}>
                    <View style={styles.card}>
                        <View style={[styles.iconContainer, {backgroundColor: '#E0F2FE'}]}><Text style={{fontSize: 26}}>💧</Text></View>
                        <Text style={styles.cardLabel}>Su Tüketimi</Text>
                        <Text style={styles.cardValue}>{waterCount} <Text style={styles.unit}>Br</Text></Text>
                        <TouchableOpacity style={styles.addBtn} onPress={() => setWaterCount(waterCount + 1)}><Text style={styles.addBtnText}>+ Ekle</Text></TouchableOpacity>
                    </View>
                    <View style={styles.card}>
                        <View style={[styles.iconContainer, {backgroundColor: '#DCFCE7'}]}><Text style={{fontSize: 26}}>👟</Text></View>
                        <Text style={styles.cardLabel}>Adım Sayısı</Text>
                        <Text style={styles.cardValue}>{stepCount}</Text>
                        <View style={styles.statusBadge}><Text style={{fontSize: 10, color: '#fff', fontWeight:'bold'}}>CANLI TAKİP</Text></View>
                    </View>
                </View>
                <View style={[styles.card, styles.distanceCard]}>
                     <View><Text style={styles.cardLabel}>Toplam Mesafe</Text><Text style={[styles.cardValue, {fontSize: 32}]}>{(stepCount * 0.00076).toFixed(2)} <Text style={styles.unit}>km</Text></Text></View>
                     <View style={styles.progressCircle}><Text style={styles.progressText}>%{Math.min(100, Math.round(((stepCount * 0.00076)/5)*100))}</Text></View>
                </View>
            </View>
        ) : (
            // --- GRAFİKLER (HAFTALIK/AYLIK/YILLIK) ---
            <View>
                {/* ADIM GRAFİĞİ */}
                <View style={styles.chartCard}>
                    <Text style={styles.chartTitle}>Adım Analizi</Text>
                    {stepChartData && <BarChart data={stepChartData} width={screenWidth - 60} height={220} yAxisLabel="" chartConfig={{ backgroundColor: "#fff", backgroundGradientFrom: "#fff", backgroundGradientTo: "#fff", decimalPlaces: 0, color: (opacity = 1) => `${COLORS.primary}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`, labelColor: (opacity = 1) => COLORS.textSub, barPercentage: 0.7, barRadius: 6 }} style={{ borderRadius: 16 }} showValuesOnTopOfBars={true} />}
                </View>

                 {/* SU GRAFİĞİ (GERİ GELDİ VE GÜZELLEŞTİ) */}
                <View style={[styles.chartCard, {marginTop: 20}]}>
                    <Text style={styles.chartTitle}>Su Tüketim Analizi</Text>
                    {waterChartData && (
                         <LineChart
                            data={waterChartData}
                            width={screenWidth - 60}
                            height={220}
                            chartConfig={{
                                backgroundColor: "#fff", backgroundGradientFrom: "#fff", backgroundGradientTo: "#fff",
                                decimalPlaces: 0,
                                color: (opacity = 1) => COLORS.waterColor, // Özel Su Rengi
                                labelColor: (opacity = 1) => COLORS.textSub,
                                propsForDots: { r: "5", strokeWidth: "2", stroke: COLORS.waterColor },
                                propsForBackgroundLines: { strokeDasharray: "" } // Düz çizgiler
                            }}
                            bezier // Eğrisel çizgiler
                            style={{ borderRadius: 16 }}
                         />
                    )}
                </View>
            </View>
        )}
      </ScrollView>

      {/* --- YAN MENÜ --- */}
      {isMenuOpen && (
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setIsMenuOpen(false)}>
          <Animated.View style={[styles.sideMenu, { transform: [{ translateX: menuAnimation }] }]}>
            <Text style={styles.menuTitle}>Menü</Text>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setIsMenuOpen(false); navigation.navigate('Profile'); }}><Text style={styles.menuItemText}>👤 Profilim</Text></TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setIsMenuOpen(false); setShowSleepModal(true); }}><Text style={styles.menuItemText}>🌙 Uyku Analizi</Text></TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setIsMenuOpen(false); setShowDietModal(true); }}><Text style={styles.menuItemText}>🥗 Diyet Listem (VKİ)</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.menuItem, {marginTop: 'auto', borderBottomWidth: 0}]} onPress={() => navigation.navigate('Login')}><Text style={[styles.menuItemText, {color: COLORS.danger}]}>🚪 Çıkış Yap</Text></TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      )}

      {/* MODALLAR (Aynı kaldı) */}
      <Modal animationType="fade" transparent={true} visible={showDietModal} onRequestClose={() => setShowDietModal(false)}><View style={styles.modalFullBackdrop}><View style={styles.dietModalView}>{renderDietContent()}</View></View></Modal>
      <Modal animationType="slide" transparent={true} visible={showSleepModal} onRequestClose={() => setShowSleepModal(false)}><View style={styles.modalCenteredView}><View style={styles.modalView}><Text style={styles.modalTitle}>🌙 Uyku Analizi</Text><TextInput style={styles.sleepInput} placeholder="Saat girin" keyboardType="numeric" value={sleepInput} onChangeText={setSleepInput} /><TouchableOpacity style={styles.analyzeBtn} onPress={handleSleepAnalysis}><Text style={{color:'white', fontWeight:'bold'}}>Analiz Et</Text></TouchableOpacity>{sleepResult && <View style={styles.resultBox}><Text style={{fontSize: 40}}>{sleepResult.emoji}</Text><Text style={styles.resultMood}>{sleepResult.mood}</Text><Text style={styles.resultAdvice}>{sleepResult.advice}</Text></View>}<TouchableOpacity style={styles.closeModalBtn} onPress={() => { setShowSleepModal(false); setSleepResult(null); setSleepInput(""); }}><Text style={{color: COLORS.textSub}}>Kapat</Text></TouchableOpacity></View></View></Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  topBackground: { position: 'absolute', top: 0, left: 0, right: 0, height: 160, backgroundColor: COLORS.primary, borderBottomLeftRadius: 35, borderBottomRightRadius: 35 },
  headerSection: { marginTop: 15, marginBottom: 25 },
  dateText: { color: 'rgba(255,255,255,0.85)', fontSize: 14, textTransform: 'uppercase', fontWeight: '600', letterSpacing: 0.5 },
  welcomeText: { color: '#fff', fontSize: 26, fontWeight: '800', marginTop: 5 },
  headerAvatarContainer: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#fff', justifyContent:'center', alignItems:'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' },
  headerAvatarImg: { width: 34, height: 34, borderRadius: 17 },
  
  periodContainer: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 6, marginBottom: 25, justifyContent: 'space-between', elevation: 3, shadowColor: COLORS.primary, shadowOpacity: 0.15, shadowOffset: {width:0, height:4} },
  periodBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  periodBtnActive: { backgroundColor: COLORS.primary },
  periodText: { color: COLORS.textSub, fontWeight: '600', fontSize: 13 },
  periodTextActive: { color: '#fff' },

  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 22, width: '48%', elevation: 6, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: {width:0, height:6} },
  iconContainer: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  cardLabel: { fontSize: 14, color: COLORS.textSub, fontWeight: '600', marginBottom: 6 },
  cardValue: { fontSize: 28, fontWeight: '800', color: COLORS.textMain },
  unit: { fontSize: 16, color: COLORS.textSub, fontWeight: '600' },
  addBtn: { marginTop: 18, backgroundColor: COLORS.primary, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: COLORS.secondary, alignSelf: 'flex-start', marginTop: 12 },
  distanceCard: { marginTop: 20, width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent:'space-between', paddingVertical: 25 },
  progressCircle: { height: 68, width: 68, borderRadius: 34, borderWidth: 5, borderColor: COLORS.primary, alignItems:'center', justifyContent:'center', backgroundColor: '#EEF2FF' },
  progressText: { fontSize: 20, fontWeight:'800', color: COLORS.primary },
  
  chartCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, elevation: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8 },
  chartTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textMain, marginBottom: 18, textAlign: 'center' },

  menuOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000 },
  sideMenu: { width: '75%', height: '100%', backgroundColor: '#fff', padding: 30, paddingTop: 60 },
  menuTitle: { fontSize: 28, fontWeight: 'bold', color: COLORS.primary, marginBottom: 30 },
  menuItem: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  menuItemText: { fontSize: 18, color: COLORS.textMain, fontWeight: '500' },

  // Modallar (Aynı)
  modalFullBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }, dietModalView: { width: '90%', height: '85%', backgroundColor: '#fff', borderRadius: 24, overflow: 'hidden' }, dietContainer: { flex: 1, padding: 20 }, dietHeader: { padding: 24, borderRadius: 20, marginBottom: 20, elevation: 4 }, dietTitle: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 8 }, dietDesc: { color: 'rgba(255,255,255,0.95)', fontSize: 15, lineHeight: 22 }, dietTabs: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }, dietTab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderWidth: 1, borderColor: '#E2E8F0', marginHorizontal: 4, borderRadius: 12, backgroundColor: '#F8FAFC' }, dietTabText: { fontWeight: '700', color: COLORS.textSub }, mealCard: { backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0', elevation: 2 }, mealHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 }, mealIcon: { fontSize: 22, marginRight: 12 }, mealTitle: { fontWeight: '700', fontSize: 17, color: COLORS.textMain }, mealText: { color: COLORS.textSub, fontSize: 15, lineHeight: 24 }, closeDietBtn: { alignSelf: 'center', marginTop: 15, padding: 12 },
  modalCenteredView: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: 'rgba(0,0,0,0.6)' }, modalView: { width: '85%', backgroundColor: "white", borderRadius: 24, padding: 30, alignItems: "center", elevation: 8 }, modalTitle: { fontSize: 24, fontWeight: '800', marginBottom: 20, color: COLORS.primary }, sleepInput: { width: '100%', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 14, fontSize: 20, textAlign: 'center', marginBottom: 20, backgroundColor: '#F8FAFC' }, analyzeBtn: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 14, width: '100%', alignItems: 'center', marginBottom: 20, elevation: 2 }, resultBox: { alignItems: 'center', padding: 20, backgroundColor: '#FEF3C7', borderRadius: 16, width: '100%', marginBottom: 15, borderWidth: 1, borderColor: '#FDE68A' }, resultMood: { fontSize: 22, fontWeight: '800', color: COLORS.textMain, marginVertical: 8 }, resultAdvice: { fontSize: 15, color: COLORS.textMain, textAlign: 'center', lineHeight: 22 }, closeModalBtn: { padding: 12 },
});