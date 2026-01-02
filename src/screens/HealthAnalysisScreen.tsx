import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ImageBackground,
  Animated,
  Easing,
  PermissionsAndroid,
  Platform,
} from "react-native";
import Geolocation from "react-native-geolocation-service";

export default function HealthAnalysisScreen() {
  const [weather, setWeather] = useState<any>(null);
  const [advice, setAdvice] = useState("");
  const [loading, setLoading] = useState(true);
  const fadeAnim = new Animated.Value(0);

  const API_KEY = "451a16649e92c88bbbaecfac52cf7e89";

  const backgrounds: any = {
    Clear: require("../assets/images/bg-sunny.png"),
    Clouds: require("../assets/images/bg-cloudly.png"),
    Rain: require("../assets/images/bg-rain.png"),
    Snow: require("../assets/images/bg-snow.png"),
    Default: require("../assets/images/bg-default.png"),
  };

  const startFade = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const requestPermission = async () => {
    if (Platform.OS === "android") {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  };

  const getWeather = async () => {
    const hasPermission = await requestPermission();
    if (!hasPermission) {
      setAdvice("Konum izni verilmedi.");
      setLoading(false);
      return;
    }

    Geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;

        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&lang=tr&appid=${API_KEY}`;

        const res = await fetch(url);
        const data = await res.json();

        const w = {
          temp: data.main.temp,
          feels: data.main.feels_like,
          humidity: data.main.humidity,
          wind: data.wind.speed,
          condition: data.weather[0].main,
          desc: data.weather[0].description,
        };

        setWeather(w);
        analyzeWeather(w.temp, w.condition);
        setLoading(false);
        startFade();
      },
      (err) => {
        console.log("Geo Error:", err);
        setAdvice("Konum alınamadı.");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  const analyzeWeather = (temp: number, cond: string) => {
    if (cond === "Rain") setAdvice("🌧️ Yağmur var! Kayma riski yüksek.");
    else if (cond === "Snow") setAdvice("❄️ Kar yağışı! Dikkatli ol.");
    else if (temp > 30) setAdvice("🔥 Çok sıcak! Akşam serinliğinde koş.");
    else if (temp < 5) setAdvice("🥶 Çok soğuk! Kısa yürüyüş yeter.");
    else setAdvice("🏃‍♂️ Harika hava! Koşu için ideal.");
  };

  useEffect(() => {
    getWeather();
  }, []);

  if (loading)
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>Hava durumu alınıyor...</Text>
      </View>
    );

  const bgImage = backgrounds[weather?.condition] || backgrounds["Default"];

  return (
    <ImageBackground source={bgImage} style={styles.bg} blurRadius={1}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <View style={styles.card}>
          <Text style={styles.title}>🌦️ Hava Durumu</Text>
          <Text style={styles.info}>Sıcaklık: {weather.temp}°C</Text>
          <Text style={styles.info}>Hissedilen: {weather.feels}°C</Text>
          <Text style={styles.info}>Nem: %{weather.humidity}</Text>
          <Text style={styles.info}>Rüzgar: {weather.wind} m/s</Text>
          <Text style={styles.info}>Durum: {weather.desc}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>🏃‍♂️ Koşu Analizi</Text>
          <Text style={styles.advice}>{advice}</Text>
        </View>
      </Animated.View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, width: "100%", height: "100%" },
  overlay: { flex: 1, padding: 20, backgroundColor: "rgba(0,0,0,0.35)" },
  loadingScreen: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: { color: "white", marginTop: 10, fontSize: 16 },
  card: {
    backgroundColor: "rgba(255,255,255,0.15)",
    padding: 18,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  title: { fontSize: 22, fontWeight: "700", color: "#fff", marginBottom: 10 },
  info: { fontSize: 18, color: "#fff", marginBottom: 4 },
  advice: { fontSize: 20, color: "#fff", fontWeight: "600", marginTop: 8 },
});
