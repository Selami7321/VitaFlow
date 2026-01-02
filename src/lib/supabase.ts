// src/lib/supabase.ts
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// BURAYA KENDİ SUPABASE BİLGİLERİNİ GİRECEKSİN
const supabaseUrl = 'https://bzflalxmsovlmnjumlbr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6ZmxhbHhtc292bG1uanVtbGJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMTMyMjUsImV4cCI6MjA4MDc4OTIyNX0.Ds8LWmGPYdaguz-_4T_fGdqp81mzXghhq4KU18trQ8Q';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});