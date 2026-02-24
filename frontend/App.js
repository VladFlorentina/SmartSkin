import 'react-native-url-polyfill/auto';
import { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { supabase } from './src/lib/supabase';
import { NativeWindStyleSheet } from "nativewind";
import ErrorBoundary from './src/components/ErrorBoundary';
import { AppProvider } from './src/lib/AppContext';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import ScannerScreen from './src/screens/ScannerScreen';
import SearchScreen from './src/screens/SearchScreen';
import ProductScreen from './src/screens/ProductScreen';
import ManualAddScreen from './src/screens/ManualAddScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import ChatScreen from './src/screens/ChatScreen';
import ProfileScreen from './src/screens/ProfileScreen';

NativeWindStyleSheet.setOutput({
  default: "native",
});

// Navigatoare separate pentru auth si app
const AuthStack = createNativeStackNavigator();
const AppStack = createNativeStackNavigator();

// Stack pentru utilizatori neautentificati (Login/Register)
function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

// Stack pentru utilizatori autentificati
function AppNavigator() {
  return (
    <AppStack.Navigator screenOptions={{ headerShown: false }}>
      <AppStack.Screen name="Home" component={HomeScreen} />
      <AppStack.Screen name="Scanner" component={ScannerScreen} />
      <AppStack.Screen name="Search" component={SearchScreen} />
      <AppStack.Screen name="Product" component={ProductScreen} />
      <AppStack.Screen name="ManualAdd" component={ManualAddScreen} />
      <AppStack.Screen name="History" component={HistoryScreen} />
      <AppStack.Screen name="Chat" component={ChatScreen} />
      <AppStack.Screen name="Profile" component={ProfileScreen} />
    </AppStack.Navigator>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <AppProvider>
      <ErrorBoundary>
        <NavigationContainer>
          {session && session.user ? <AppNavigator /> : <AuthNavigator />}
        </NavigationContainer>
      </ErrorBoundary>
    </AppProvider>
  );
}
