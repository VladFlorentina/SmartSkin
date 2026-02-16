import 'react-native-url-polyfill/auto';
import { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { supabase } from './src/lib/supabase';
import { NativeWindStyleSheet } from "nativewind";
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import Button from './src/components/Button';
import Layout from './src/components/Layout';

NativeWindStyleSheet.setOutput({
  default: "native",
});

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);

  useEffect(() => {
    // 1. Verifica sesiunea curenta
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. Asculta schimbari de auth (login, logout, auto-refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-brand-50">
        <ActivityIndicator size="large" color="#FB7185" />
      </View>
    );
  }

  // Daca avem sesiune -> Arata Home (Placeholder)
  if (session && session.user) {
    return (
      <Layout className="justify-center items-center">
        <View className="bg-white p-8 rounded-3xl shadow-sm w-full items-center">
          <Text className="text-3xl font-bold text-brand-900 mb-4">
            Hello, gorgeous! 🌸
          </Text>
          <Text className="text-brand-500 mb-8 text-center font-medium">
            You are signed in as:{'\n'}
            <Text className="text-brand-700">{session.user.email}</Text>
          </Text>

          <Button
            title="Sign Out"
            onPress={() => supabase.auth.signOut()}
            variant="outline"
          />
        </View>
      </Layout>
    );
  }

  // Daca NU avem sesiune -> Arata Login sau Register
  return showRegister ? (
    <RegisterScreen onLoginPress={() => setShowRegister(false)} />
  ) : (
    <LoginScreen onRegisterPress={() => setShowRegister(true)} />
  );
}
