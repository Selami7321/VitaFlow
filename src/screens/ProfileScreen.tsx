import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image, TouchableOpacity, ScrollView, Modal, TextInput, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- AVATAR HARİTASI ---
const AVATAR_MAP: any = {
  'manicon1': require('../assets/images/manicon1.png'),
  'manicon2': require('../assets/images/manicon2.jpg'),
  'womanicon1': require('../assets/images/womanicon1.jpg'),
  'womanicon2': require('../assets/images/womanicon2.png'),
};

const AVATAR_OPTIONS = Object.keys(AVATAR_MAP);

export default function ProfileScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  
  // Modallar
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);

  // Form State (Ad ve Soyad eklendi)
  const [editForm, setEditForm] = useState({ 
    first_name: '', 
    last_name: '', 
    age: '', 
    height: '', 
    weight: '', 
    gender: '' 
  });
  
  const [stats, setStats] = useState({ avgSteps: 0, avgWater: 0, totalDays: 0 });

  useEffect(() => {
    fetchProfile();
    fetchStats();
  }, []);

  // --- İSTATİSTİKLER ---
  const fetchStats = async () => {
    try {
      const totalSteps = parseInt(await AsyncStorage.getItem('LIFETIME_STEPS') || '0');
      const totalWater = parseInt(await AsyncStorage.getItem('LIFETIME_WATER') || '0');
      const totalDays = parseInt(await AsyncStorage.getItem('TOTAL_ACTIVE_DAYS') || '1');

      const avgSteps = Math.round(totalSteps / totalDays);
      const avgWaterLiters = ((totalWater * 0.25) / totalDays).toFixed(2);

      setStats({ avgSteps, avgWater: parseFloat(avgWaterLiters), totalDays });
    } catch (e) {
      console.log("İstatistik hatası", e);
    }
  };

  // --- PROFİL VERİLERİNİ ÇEK ---
  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Kullanıcı yok');

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (data) {
        setProfile(data);
        // Formu doldururken Ad ve Soyad verisini de alıyoruz
        setEditForm({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          age: data.age?.toString() || '',
          height: data.height?.toString() || '',
          weight: data.weight?.toString() || '',
          gender: data.gender || ''
        });
      }
    } catch (error: any) {
      console.log(error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- AVATAR GÜNCELLEME ---
  const updateAvatar = async (iconName: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updates = {
        id: user.id,
        avatar_icon: iconName,
        updated_at: new Date(),
      };

      const { error } = await supabase.from('profiles').upsert(updates);
      if (error) throw error;

      setProfile({ ...profile, avatar_icon: iconName });
      setAvatarModalVisible(false);
      Alert.alert("Harika!", "Profil resmin güncellendi.");

    } catch (error: any) {
      Alert.alert("Hata", "Avatar güncellenemedi: " + error.message);
    }
  };

  // --- PROFİL BİLGİ GÜNCELLEME (AD SOYAD DAHİL) ---
  const updateProfileInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updates = {
        id: user.id,
        first_name: editForm.first_name, // Adı kaydet
        last_name: editForm.last_name,   // Soyadı kaydet
        age: parseInt(editForm.age) || null,
        height: parseFloat(editForm.height) || null,
        weight: parseFloat(editForm.weight) || null,
        gender: editForm.gender,
        updated_at: new Date(),
      };

      const { error } = await supabase.from('profiles').upsert(updates);

      if (error) throw error;

      Alert.alert("Başarılı", "Profilin güncellendi!");
      setEditModalVisible(false);
      fetchProfile(); // Ekranı yenile ki isim hemen değişsin
    } catch (error: any) {
      Alert.alert("Hata", error.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#1a73e8" /></View>;

  // Ekranda gösterilecek isim mantığı
  const displayName = (profile?.first_name && profile?.last_name)
    ? `${profile.first_name} ${profile.last_name}` 
    : (profile?.first_name ? profile.first_name : "Misafir Kullanıcı");

  const currentAvatarSource = profile?.avatar_icon ? AVATAR_MAP[profile.avatar_icon] : null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      
      {/* HEADER & AVATAR */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => setAvatarModalVisible(true)} 
          style={[styles.avatarContainer, { backgroundColor: profile?.gender === 'Kadın' ? '#e91e63' : '#1a73e8' }]}
        >
          {currentAvatarSource ? (
            <Image source={currentAvatarSource} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>
              {displayName.charAt(0)}
            </Text>
          )}
          <View style={styles.editIconBadge}>
             <Text style={{color:'white', fontSize:12}}>✏️</Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.name}>{displayName}</Text>
        <TouchableOpacity onPress={() => setEditModalVisible(true)} style={styles.editButton}>
          <Text style={styles.editButtonText}>Bilgileri Düzenle</Text>
        </TouchableOpacity>
      </View>

      {/* İSTATİSTİK KARTI */}
      <View style={styles.statsCard}>
        <Text style={styles.sectionTitle}>📊 Genel Performans ({stats.totalDays} Gün)</Text>
        <View style={styles.row}>
          <InfoBox label="Ort. Adım" value={stats.avgSteps} color="#1a73e8" />
          <View style={styles.divider} />
          <InfoBox label="Ort. Su (L)" value={stats.avgWater} color="#34A853" />
        </View>
      </View>

      {/* FİZİKSEL BİLGİLER */}
      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Fiziksel Bilgiler</Text>
        <View style={styles.row}>
          <InfoBox label="Yaş" value={profile?.age || '-'} />
          <InfoBox label="Boy" value={profile?.height ? `${profile.height} cm` : '-'} />
          <InfoBox label="Kilo" value={profile?.weight ? `${profile.weight} kg` : '-'} />
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>ÇIKIŞ YAP</Text>
      </TouchableOpacity>

      {/* --- MODAL 1: BİLGİ DÜZENLEME (GÜNCELLENDİ: AD SOYAD EKLENDİ) --- */}
      <Modal visible={editModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Bilgilerini Güncelle</Text>
            
            {/* AD VE SOYAD GİRİŞLERİ EKLENDİ */}
            <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom:10}}>
                <TextInput 
                    placeholder="Ad" 
                    style={[styles.input, {width: '48%', marginBottom: 0}]} 
                    value={editForm.first_name} 
                    onChangeText={(t) => setEditForm({...editForm, first_name: t})} 
                />
                <TextInput 
                    placeholder="Soyad" 
                    style={[styles.input, {width: '48%', marginBottom: 0}]} 
                    value={editForm.last_name} 
                    onChangeText={(t) => setEditForm({...editForm, last_name: t})} 
                />
            </View>

            <TextInput placeholder="Yaş" keyboardType="numeric" style={styles.input} value={editForm.age} onChangeText={(t) => setEditForm({...editForm, age: t})} />
            <TextInput placeholder="Boy (cm)" keyboardType="numeric" style={styles.input} value={editForm.height} onChangeText={(t) => setEditForm({...editForm, height: t})} />
            <TextInput placeholder="Kilo (kg)" keyboardType="numeric" style={styles.input} value={editForm.weight} onChangeText={(t) => setEditForm({...editForm, weight: t})} />
             <TextInput placeholder="Cinsiyet (Erkek/Kadın)" style={styles.input} value={editForm.gender} onChangeText={(t) => setEditForm({...editForm, gender: t})} />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setEditModalVisible(false)} style={[styles.modalBtn, {backgroundColor: '#ccc'}]}><Text>İptal</Text></TouchableOpacity>
              <TouchableOpacity onPress={updateProfileInfo} style={[styles.modalBtn, {backgroundColor: '#1a73e8'}]}><Text style={{color:'white'}}>Kaydet</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- MODAL 2: AVATAR SEÇİMİ --- */}
      <Modal visible={avatarModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Bir Avatar Seç</Text>
            <Text style={{textAlign:'center', marginBottom:15, color:'#666'}}>Seni en iyi yansıtan karakter hangisi?</Text>
            
            <View style={styles.avatarGrid}>
              {AVATAR_OPTIONS.map((iconKey) => (
                <TouchableOpacity 
                  key={iconKey} 
                  onPress={() => updateAvatar(iconKey)}
                  style={[styles.avatarOption, profile?.avatar_icon === iconKey && styles.selectedAvatar]}
                >
                  <Image source={AVATAR_MAP[iconKey]} style={styles.avatarOptionImage} />
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity onPress={() => setAvatarModalVisible(false)} style={styles.closeButton}>
              <Text style={{color:'#555'}}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const InfoBox = ({ label, value, color = '#333' }: any) => (
  <View style={styles.infoBox}>
    <Text style={[styles.infoValue, { color }]}>{value}</Text>
    <Text style={styles.infoLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#f5f5f5', flexGrow: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { alignItems: 'center', marginBottom: 20 },
  
  avatarContainer: { 
    width: 110, height: 110, borderRadius: 55, 
    justifyContent: 'center', alignItems: 'center', marginBottom: 10, 
    borderWidth: 4, borderColor: 'white', elevation: 5, position: 'relative'
  },
  avatarImage: { width: '100%', height: '100%', borderRadius: 55 },
  avatarText: { color: 'white', fontSize: 40, fontWeight: 'bold' },
  editIconBadge: {
    position: 'absolute', bottom: 0, right: 0, backgroundColor:'#333', 
    width: 30, height: 30, borderRadius: 15, justifyContent:'center', alignItems:'center'
  },

  name: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  editButton: { marginTop: 10, paddingVertical: 6, paddingHorizontal: 15, backgroundColor: '#e8f0fe', borderRadius: 20 },
  editButtonText: { color: '#1a73e8', fontWeight: 'bold', fontSize:12 },
  
  statsCard: { backgroundColor: 'white', padding: 20, borderRadius: 15, marginBottom: 15, elevation: 3 },
  infoCard: { backgroundColor: 'white', padding: 20, borderRadius: 15, marginBottom: 20, elevation: 3 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15, color: '#555', borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingBottom: 5 },
  row: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  infoBox: { alignItems: 'center' },
  infoValue: { fontSize: 20, fontWeight: 'bold' },
  infoLabel: { color: '#888', fontSize: 13 },
  divider: { width: 1, height: 30, backgroundColor: '#ddd' },
  logoutButton: { backgroundColor: '#ff4444', padding: 15, borderRadius: 10, alignItems: 'center' },
  logoutText: { color: 'white', fontWeight: 'bold' },

  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { width: '85%', backgroundColor: 'white', padding: 20, borderRadius: 15, elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color:'#333' },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 8, marginBottom: 10 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  modalBtn: { padding: 10, borderRadius: 8, width: '45%', alignItems: 'center' },

  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 15 },
  avatarOption: { padding: 5, borderRadius: 10, borderWidth: 2, borderColor: 'transparent' },
  selectedAvatar: { borderColor: '#1a73e8', backgroundColor: '#e8f0fe' },
  avatarOptionImage: { width: 60, height: 60, borderRadius: 30 },
  closeButton: { marginTop: 20, alignItems:'center', padding: 10 }
});