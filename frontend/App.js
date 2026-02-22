import 'react-native-url-polyfill/auto';
import { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { supabase } from './src/lib/supabase';
import { NativeWindStyleSheet } from "nativewind";
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ScannerScreen from './src/screens/ScannerScreen';
import ProductScreen from './src/screens/ProductScreen';
import ManualAddScreen from './src/screens/ManualAddScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import Layout from './src/components/Layout';

NativeWindStyleSheet.setOutput({
  default: "native",
});

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState(null);

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

  // Daca avem sesiune -> Arata ecranele principale
  if (session && session.user) {
    if (showManualAdd) {
      return (
        <ManualAddScreen
          originalBarcode={scannedBarcode}
          onBack={() => setShowManualAdd(false)}
          onProductAdded={(barcode) => {
            setShowManualAdd(false);
            setScannedBarcode(barcode); // Afiseaza produsul nou adaugat imediat
          }}
        />
      );
    }

    if (scannedBarcode) {
      return (
        <ProductScreen
          barcode={scannedBarcode}
          onBack={() => setScannedBarcode(null)}
          onAddManual={() => setShowManualAdd(true)}
        />
      );
    }

    if (showHistory) {
      return (
        <HistoryScreen
          onBack={() => setShowHistory(false)}
          onProductSelect={(barcode) => {
            setShowHistory(false);
            setScannedBarcode(barcode);
          }}
        />
      );
    }

    return (
      <ScannerScreen
        onSignOut={() => supabase.auth.signOut()}
        onScanned={(barcode) => setScannedBarcode(barcode)}
        onViewHistory={() => setShowHistory(true)}
      />
    );
  }

  // Daca NU avem sesiune -> Arata Login sau Register
  return showRegister ? (
    <RegisterScreen onLoginPress={() => setShowRegister(false)} />
  ) : (
    <LoginScreen onRegisterPress={() => setShowRegister(true)} />
  );
}
