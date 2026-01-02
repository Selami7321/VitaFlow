import React, { useState, useRef, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, Switch, Alert, 
  ActivityIndicator, Modal, ImageBackground, KeyboardAvoidingView, Platform, Animated, Dimensions
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { supabase } from '../lib/supabase';

const { width } = Dimensions.get('window');

// Soru/Adım Listesi (Tek tek ilerlemek için)
const FORM_STEPS = [
  { 
    name: 'firstName', 
    label: 'Adınız nedir?', 
    placeholder: 'Örn: Ahmet', 
    type: 'text', 
    icon: '👤',
    rules: { required: 'İsim alanı boş bırakılamaz.' }
  },
  { 
    name: 'lastName', 
    label: 'Soyadınız nedir?', 
    placeholder: 'Örn: Yılmaz', 
    type: 'text', 
    icon: '📝',
    rules: { required: 'Soyisim alanı boş bırakılamaz.' }
  },
  { 
    name: 'gender', 
    label: 'Cinsiyetiniz?', 
    placeholder: 'Erkek / Kadın', 
    type: 'text', 
    icon: '🚻',
    rules: { required: 'Cinsiyet belirtmelisiniz.' }
  },
  { 
    name: 'age', 
    label: 'Yaşınız kaç?', 
    placeholder: 'Örn: 25', 
    type: 'number', 
    icon: '🎂',
    // SADECE RAKAM KONTROLÜ (Regex)
    rules: { 
      required: 'Yaş zorunludur.', 
      pattern: { value: /^[0-9]+$/, message: 'Lütfen sadece sayı giriniz.' },
      min: { value: 10, message: 'Yaşınız çok küçük.' },
      max: { value: 100, message: 'Geçersiz yaş.' }
    }
  },
  { 
    name: 'height', 
    label: 'Boyunuz kaç cm?', 
    placeholder: 'Örn: 175', 
    type: 'number', 
    icon: '📏',
    rules: { 
      required: 'Boy zorunludur.', 
      pattern: { value: /^[0-9]+$/, message: 'Sadece sayı giriniz.' } 
    }
  },
  { 
    name: 'weight', 
    label: 'Kilonuz kaç kg?', 
    placeholder: 'Örn: 70', 
    type: 'number', 
    icon: '⚖️',
    rules: { 
      required: 'Kilo zorunludur.', 
      pattern: { value: /^[0-9]+$/, message: 'Sadece sayı giriniz.' } 
    }
  },
  { 
    name: 'chronicConditions', 
    label: 'Kronik bir rahatsızlığınız var mı?', 
    placeholder: 'Yoksa boş bırakın', 
    type: 'text', 
    icon: '❤️‍🩹',
    rules: {} // Opsiyonel
  },
  { 
    name: 'exerciseFreq', 
    label: 'Haftada kaç gün spor yapıyorsunuz?', 
    placeholder: '0 - 7 arası', 
    type: 'number', 
    icon: '🏃',
    rules: { 
      required: 'Lütfen bir değer girin (0-7).',
      pattern: { value: /^[0-7]$/, message: '0 ile 7 arasında bir sayı girin.' }
    }
  },
  // Özel Adımlar (Switch ve Auth) aşağıda manuel kontrol edilecek
];

export default function RegisterScreen({ navigation }: any) {
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  
  // Adım 0'dan başlar. FORM_STEPS uzunluğu + Ekstra Adımlar (Switchler, Email/Pass, Onay)
  const [currentStep, setCurrentStep] = useState(0);

  // Animasyon
  const slideAnim = useRef(new Animated.Value(width)).current; // Ekranın sağından gelir
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const { control, handleSubmit, watch, trigger, formState: { errors } } = useForm({ mode: 'onChange' });
  
  // Şifre kontrolü için
  const pwd = watch('password'); 

  // Her adım değişiminde animasyon çalışsın
  useEffect(() => {
    slideAnim.setValue(width); // Sağ tarafa resetle
    fadeAnim.setValue(0); // Görünmez yap
    
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true })
    ]).start();
  }, [currentStep]);

  // TOPLAM ADIM SAYISI: Form Soruları + Sigara/Alkol + Email/Pass + Sözleşme
  const TOTAL_STEPS = FORM_STEPS.length + 3; 

  const handleNext = async () => {
    let isValid = false;

    // 1. Dinamik Soruların Kontrolü
    if (currentStep < FORM_STEPS.length) {
      const fieldName = FORM_STEPS[currentStep].name;
      isValid = await trigger(fieldName); // Sadece o anki inputu kontrol et
    } 
    // 2. Email/Şifre Ekranı (Form Steps bittikten sonraki 2. adım)
    else if (currentStep === FORM_STEPS.length + 1) {
      isValid = await trigger(['email', 'password', 'confirmPassword']);
    }
    // Diğer adımlar (Switch ve Onay) manuel geçişe izin verir
    else {
      isValid = true;
    }

    if (isValid) {
      if (currentStep < TOTAL_STEPS - 1) {
        setCurrentStep(prev => prev + 1);
      } else {
        handleSubmit(onRegister)();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(prev => prev - 1);
  };

  const onRegister = async (data: any) => {
    if (!data.privacyPolicy) {
      Alert.alert('Uyarı', 'Devam etmek için sözleşmeyi onaylamalısınız.');
      return;
    }

    setLoading(true);
    // Supabase işlemleri
    const { email, password, ...profileData } = data;
    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });

    if (authError) {
      Alert.alert('Kayıt Hatası', authError.message);
      setLoading(false);
      return;
    }

    if (authData.user) {
      const { error: profileError } = await supabase.from('profiles').insert([{
        id: authData.user.id,
        first_name: profileData.firstName,
        last_name: profileData.lastName,
        age: parseInt(profileData.age),
        height: parseFloat(profileData.height),
        weight: parseFloat(profileData.weight),
        gender: profileData.gender,
        chronic_conditions: profileData.chronicConditions,
        exercise_freq: parseInt(profileData.exerciseFreq),
        smoking: profileData.smoking || false,
        alcohol: profileData.alcohol || false,
      }]);

      if (profileError) {
        Alert.alert('Profil Hatası', profileError.message);
      } else {
        Alert.alert('Başarılı', 'Hesabınız oluşturuldu!');
        // navigation.navigate('Login');
      }
    }
    setLoading(false);
  };

  // İÇERİK RENDER FONKSİYONU
  const renderContent = () => {
    // A) Standart Sorular (Ad, Soyad, Yaş vs.)
    if (currentStep < FORM_STEPS.length) {
      const step = FORM_STEPS[currentStep];
      return (
        <View style={styles.stepContainer}>
          <Text style={styles.iconLarge}>{step.icon}</Text>
          <Text style={styles.questionLabel}>{step.label}</Text>
          
          <Controller
            control={control}
            name={step.name}
            rules={step.rules}
            defaultValue=""
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={[styles.mainInput, errors[step.name] && styles.inputError]}
                placeholder={step.placeholder}
                placeholderTextColor="#aaa"
                value={value}
                onChangeText={onChange}
                keyboardType={step.type === 'number' ? 'numeric' : 'default'}
                autoCapitalize="words"
              />
            )}
          />
          {errors[step.name] && <Text style={styles.errorText}>{errors[step.name]?.message as string}</Text>}
        </View>
      );
    }

    // B) Sigara / Alkol Sorusu (Form bittikten hemen sonra)
    if (currentStep === FORM_STEPS.length) {
      return (
        <View style={styles.stepContainer}>
          <Text style={styles.iconLarge}>🍷🚬</Text>
          <Text style={styles.questionLabel}>Alışkanlıklarınız</Text>
          
          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Sigara Kullanımı</Text>
            <Controller control={control} name="smoking" defaultValue={false}
              render={({ field: { onChange, value } }) => (
                <Switch value={value} onValueChange={onChange} trackColor={{false: "#ddd", true: "#ff6b6b"}} />
              )}
            />
          </View>
          
          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Alkol Kullanımı</Text>
            <Controller control={control} name="alcohol" defaultValue={false}
              render={({ field: { onChange, value } }) => (
                <Switch value={value} onValueChange={onChange} trackColor={{false: "#ddd", true: "#ff6b6b"}} />
              )}
            />
          </View>
        </View>
      );
    }

    // C) Hesap Bilgileri (Email/Pass)
    if (currentStep === FORM_STEPS.length + 1) {
      return (
        <View style={styles.stepContainer}>
          <Text style={styles.iconLarge}>🔐</Text>
          <Text style={styles.questionLabel}>Hesap Oluştur</Text>

          <Controller control={control} name="email" rules={{ required: "Email gerekli", pattern: { value: /^\S+@\S+$/i, message: "Geçersiz email" } }}
            render={({ field: { onChange, value } }) => (
              <TextInput style={styles.input} placeholder="E-posta Adresi" keyboardType="email-address" autoCapitalize="none" onChangeText={onChange} value={value} />
            )}
          />
          {errors.email && <Text style={styles.errorText}>{errors.email.message as string}</Text>}

          <Controller control={control} name="password" rules={{ required: "Şifre gerekli", minLength: { value: 6, message: "En az 6 karakter" } }}
            render={({ field: { onChange, value } }) => (
              <TextInput style={styles.input} placeholder="Şifre" secureTextEntry onChangeText={onChange} value={value} />
            )}
          />
          {errors.password && <Text style={styles.errorText}>{errors.password.message as string}</Text>}

          <Controller control={control} name="confirmPassword" rules={{ validate: v => v === pwd || "Şifreler uyuşmuyor" }}
            render={({ field: { onChange, value } }) => (
              <TextInput style={styles.input} placeholder="Şifre Tekrar" secureTextEntry onChangeText={onChange} value={value} />
            )}
          />
          {errors.confirmPassword && <Text style={styles.errorText}>Şifreler uyuşmuyor</Text>}
        </View>
      );
    }

    // D) Son Adım: Sözleşme
    if (currentStep === FORM_STEPS.length + 2) {
      return (
        <View style={styles.stepContainer}>
          <Text style={styles.iconLarge}>✅</Text>
          <Text style={styles.questionLabel}>Son olarak...</Text>
          
          <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.linkButton}>
            <Text style={styles.linkText}>📄 Gizlilik Sözleşmesini Oku</Text>
          </TouchableOpacity>

          <View style={styles.checkboxContainer}>
            <Controller control={control} name="privacyPolicy" defaultValue={false} rules={{ required: true }}
              render={({ field: { onChange, value } }) => (
                <Switch value={value} onValueChange={onChange} />
              )}
            />
            <Text style={{marginLeft: 10, fontSize: 16}}>Okudum, onaylıyorum.</Text>
          </View>
          {errors.privacyPolicy && <Text style={styles.errorText}>Kayıt olmak için onaylamalısınız.</Text>}
        </View>
      );
    }
  };

  // İlerleme Çubuğu Hesaplama
  const progressPercent = ((currentStep + 1) / TOTAL_STEPS) * 100;

  return (
    <ImageBackground source={require('../assets/images/bg-register.png')} style={styles.bg} resizeMode="cover">
      <View style={styles.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{flex:1}}>
          
          {/* ÜST BAR (Progress) */}
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>

          <View style={styles.header}>
             <Text style={styles.stepCounter}>Adım {currentStep + 1} / {TOTAL_STEPS}</Text>
          </View>

          {/* ORTA ALAN - ANİMASYONLU KART */}
          <View style={styles.centerContent}>
            <Animated.View style={[ styles.animContainer, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] } ]}>
              {renderContent()}
            </Animated.View>
          </View>

          {/* BUTONLAR */}
          <View style={styles.footer}>
            {currentStep > 0 && (
              <TouchableOpacity style={styles.btnBack} onPress={handleBack}>
                <Text style={styles.btnTextSecondary}>Geri</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.btnNext} onPress={handleNext}>
              {loading ? <ActivityIndicator color="#fff" /> : (
                <Text style={styles.btnTextPrimary}>
                  {currentStep === TOTAL_STEPS - 1 ? "KAYIT OL" : "İLERİ"}
                </Text>
              )}
            </TouchableOpacity>
          </View>

        </KeyboardAvoidingView>

        {/* SÖZLEŞME MODAL */}
        <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Gizlilik Politikası</Text>
              <Text style={styles.modalText}>Verileriniz güvende ve sadece sağlık analizi için kullanılacaktır.</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalBtn}>
                <Text style={{color:'#fff', fontWeight:'bold'}}>Kapat</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(255,255,255,0.9)' },
  
  // Progress Bar
  progressBarContainer: { height: 6, width: '100%', backgroundColor: '#e0e0e0', marginTop: 0 },
  progressBarFill: { height: '100%', backgroundColor: '#1a73e8' },
  
  header: { padding: 20, alignItems: 'flex-end', marginTop: 20 },
  stepCounter: { fontSize: 14, color: '#888', fontWeight: '600' },

  // Orta Alan
  centerContent: { flex: 1, justifyContent: 'center', paddingHorizontal: 30 },
  animContainer: { width: '100%' },
  stepContainer: { alignItems: 'center', width: '100%' },
  
  iconLarge: { fontSize: 50, marginBottom: 20 },
  questionLabel: { fontSize: 24, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 30 },
  
  // Input Stilleri
  mainInput: { 
    width: '100%', fontSize: 22, borderBottomWidth: 2, borderBottomColor: '#1a73e8', 
    paddingVertical: 10, textAlign: 'center', color: '#333', marginBottom: 10 
  },
  input: {
    width: '100%', backgroundColor: '#f1f1f1', borderRadius: 10, padding: 15, fontSize: 16, marginBottom: 15
  },
  inputError: { borderBottomColor: '#ff4757', color: '#ff4757' },
  errorText: { color: '#ff4757', marginTop: 5, fontSize: 14 },

  // Switch Row
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  switchText: { fontSize: 18, color: '#444' },

  // Footer Buttons
  footer: { flexDirection: 'row', padding: 20, marginBottom: 20, justifyContent: 'space-between' },
  btnBack: { padding: 15, borderRadius: 10, backgroundColor: '#e0e0e0', width: '30%', alignItems: 'center' },
  btnNext: { padding: 15, borderRadius: 10, backgroundColor: '#1a73e8', flex: 1, marginLeft: 15, alignItems: 'center', elevation: 5 },
  btnTextPrimary: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  btnTextSecondary: { color: '#555', fontSize: 18, fontWeight: 'bold' },

  // Sözleşme
  linkButton: { padding: 15, backgroundColor: '#e3f2fd', borderRadius: 8, marginBottom: 20, width: '100%', alignItems: 'center' },
  linkText: { color: '#1a73e8', fontWeight: '600' },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { width: '80%', backgroundColor: '#fff', padding: 25, borderRadius: 15, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  modalText: { marginBottom: 20, textAlign: 'center' },
  modalBtn: { backgroundColor: '#1a73e8', padding: 10, borderRadius: 8, width: 100, alignItems: 'center' }
});