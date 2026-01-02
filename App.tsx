import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Ekranlarımızı import ediyoruz
import RegisterScreen from './src/screens/RegisterScreen';  // Kayıt Olma Ekranı 
import LoginScreen from './src/screens/LoginScreen';  // Login Giriş Ekranı
import DashboardScreen from './src/screens/DashboardScreen'; // Ana Menü
import ProfileScreen from './src/screens/ProfileScreen';     // Profile Ekranı
import HealthAnalysisScreen from './src/screens/HealthAnalysisScreen';  // Sağlık Analizi Ekranı

const Stack = createNativeStackNavigator();

function App(): React.JSX.Element {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login"> 
        {/* Uygulama Giriş ekranıyla başlar */}
        
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ headerShown: false }} // Giriş sayfasında üst bar olmasın
        />
        
        <Stack.Screen 
          name="Register" 
          component={RegisterScreen} 
          options={{ title: 'Kayıt Ol' }} 
        />

        {/* --- YENİ EKLENEN ANA SAYFA VE PROFİL --- */}
        
        <Stack.Screen 
          name="Dashboard" 
          component={DashboardScreen}
          // Dashboard'un başlığı ve sol üstteki ikonu 
          // kendi dosyası (DashboardScreen.tsx) içinden yönetiliyor.
        />

        <Stack.Screen 
          name="Profile" 
          component={ProfileScreen} 
          options={{ title: 'Profilim' }} 
        />

       
          <Stack.Screen 
            name="HealthAnalysis" 
            component={HealthAnalysisScreen} 
            options={{ title: 'Sağlık Analizi & Hava' }} 
          />
        
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;