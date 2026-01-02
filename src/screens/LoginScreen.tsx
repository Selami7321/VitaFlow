import React, { useState } from 'react';
import { 
  View, Text, TextInput, ScrollView, Button, StyleSheet, Alert, ActivityIndicator, TouchableOpacity, ImageBackground
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { supabase } from '../lib/supabase';

export default function LoginScreen({ navigation }: any) {
  const [loading, setLoading] = useState(false);
  
  const { control, handleSubmit, formState: { errors } } = useForm();

  const onLogin = async (data: any) => {
    setLoading(true);

    // Supabase ile Giriş Yapma İşlemi
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      Alert.alert('Giriş Hatası', error.message);
    } else {
      Alert.alert('Başarılı', 'Giriş yapıldı!');
      navigation.replace('Dashboard');
    }
    setLoading(false);
  };

  return (
    // 1. KATMAN: Arka Plan Resmi
    <ImageBackground 
      source={require('../assets/images/bg-register.png')} 
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      {/* 2. KATMAN: Yarı Saydam Perde */}
      <View style={styles.overlay}>
        
        <ScrollView contentContainerStyle={styles.container}>
          
          <View style={styles.headerContainer}>
            <Text style={styles.title}>Hoşgeldin!</Text>
            <Text style={styles.subtitle}>VitaFlow hesabına giriş yap.</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>E-posta Adresi</Text>
            <Controller control={control} name="email" rules={{ required: true }}
              render={({ field: { onChange, value } }) => (
                <TextInput 
                  style={styles.input} 
                  placeholder="ornek@email.com" 
                  autoCapitalize="none" 
                  keyboardType="email-address" 
                  onChangeText={onChange} 
                  value={value} 
                />
              )}
            />

            <Text style={styles.label}>Şifre</Text>
            <Controller control={control} name="password" rules={{ required: true }}
              render={({ field: { onChange, value } }) => (
                <TextInput 
                  style={styles.input} 
                  placeholder="******" 
                  secureTextEntry 
                  onChangeText={onChange} 
                  value={value} 
                />
              )}
            />

            <View style={styles.buttonContainer}>
              {loading ? <ActivityIndicator size="large" color="#1a73e8" /> : <Button title="GİRİŞ YAP" onPress={handleSubmit(onLogin)} />}
            </View>
          </View>

          {/* KAYIT SAYFASINA YÖNLENDİRME */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Henüz hesabın yok mu?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.linkText}>Kayıt Ol</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: { 
    flex: 1, 
    width: '100%', 
    height: '100%' 
  },
  overlay: { 
    flex: 1, 
    backgroundColor: 'rgba(255, 255, 255, 0.45)', // %85 beyazlık, yazıları okutur
    justifyContent: 'center' 
  },
  container: { 
    padding: 20, 
    flexGrow: 1, 
    justifyContent: 'center' 
  },
  headerContainer: { 
    marginBottom: 30, 
    alignItems: 'center' 
  },
  title: { 
    fontSize: 36, 
    fontWeight: 'bold', 
    color: '#1a73e8', 
    marginBottom: 5 
  },
  subtitle: { 
    fontSize: 16, 
    color: '#666' 
  },
  section: { 
    backgroundColor: 'rgba(255,255,255,0.9)', 
    padding: 20, 
    borderRadius: 15, 
    borderWidth: 1, 
    borderColor: '#fff',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  label: { 
    fontWeight: 'bold', 
    marginBottom: 5, 
    color: '#333' 
  },
  input: { 
    backgroundColor: 'white', 
    padding: 12, 
    borderRadius: 8, 
    marginBottom: 15, 
    borderWidth: 1, 
    borderColor: '#ddd' 
  },
  buttonContainer: { 
    marginTop: 10 
  },
  footer: { 
    marginTop: 30, 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  footerText: { 
    fontSize: 16, 
    color: '#555' 
  },
  linkText: { 
    fontSize: 16, 
    color: '#1a73e8', 
    fontWeight: 'bold', 
    marginLeft: 5 
  }
});