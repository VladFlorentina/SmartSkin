import { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './src/lib/supabase';
import { NativeWindStyleSheet } from "nativewind";
import ErrorBoundary from './src/components/ErrorBoundary';
import { AppProvider, useApp } from './src/lib/AppContext';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';

WebBrowser.maybeCompleteAuthSession();

// Screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import ScannerScreen from './src/screens/ScannerScreen';
import SearchScreen from './src/screens/SearchScreen';
import ProductScreen from './src/screens/ProductScreen';
import ManualAddScreen from './src/screens/ManualAddScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import CompareScreen from './src/screens/CompareScreen';
import ChatScreen from './src/screens/ChatScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AdminPanelScreen from './src/screens/AdminPanelScreen';
import AdminReportsScreen from './src/screens/AdminReportsScreen';
import AdminUsersScreen from './src/screens/AdminUsersScreen';
import AdminProductsScreen from './src/screens/AdminProductsScreen';
NativeWindStyleSheet.setOutput({
  default: "native",
});

// Navigatoare separate pentru auth si app
const AuthStack = createNativeStackNavigator();
const AppStack = createNativeStackNavigator();
const GuestStack = createNativeStackNavigator();

import MainTabNavigator from './src/navigation/MainTabNavigator';

// Stack pentru utilizatori neautentificati (Login/Register)
function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

// Stack pentru utilizatori autentificati normali
function AppNavigator() {
  return (
    <AppStack.Navigator screenOptions={{ headerShown: false }}>
      <AppStack.Screen name="MainTabs" component={MainTabNavigator} />
      <AppStack.Screen name="Scanner" component={ScannerScreen} />
      <AppStack.Screen name="Product" component={ProductScreen} />
      <AppStack.Screen name="ManualAdd" component={ManualAddScreen} />
      <AppStack.Screen name="Compare" component={CompareScreen} />
      <AppStack.Screen name="Chat" component={ChatScreen} />
    </AppStack.Navigator>
  );
}

// Stack pentru Administratori (separat complet)
const AdminStack = createNativeStackNavigator();
function AdminNavigator() {
  return (
    <AdminStack.Navigator screenOptions={{ headerShown: false }}>
      <AdminStack.Screen name="AdminPanel" component={AdminPanelScreen} />
      <AdminStack.Screen name="AdminReports" component={AdminReportsScreen} />
      <AdminStack.Screen name="AdminUsers" component={AdminUsersScreen} />
      <AdminStack.Screen name="AdminProducts" component={AdminProductsScreen} />
      <AdminStack.Screen name="Product" component={ProductScreen} />
      <AdminStack.Screen name="Chat" component={ChatScreen} />
    </AdminStack.Navigator>
  );
}

function GuestNavigator() {
  return (
    <GuestStack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Scanner">
      <GuestStack.Screen name="Scanner" component={ScannerScreen} />
      <GuestStack.Screen name="Product" component={ProductScreen} />
    </GuestStack.Navigator>
  );
}

function RootNavigator({ session }) {
  const { isGuest, colors } = useApp();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);

  useEffect(() => {
    if (session && session.user) {
      setCheckingRole(true);
      checkAdminRole(session.user.id);
    } else {
      setIsAdmin(false);
      setCheckingRole(false);
    }
  }, [session]);

  const checkAdminRole = async (userId) => {
    try {
      console.log('[DEBUG] Checking role for user:', userId);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('[DEBUG] Supabase error fetching role:', error);
      }
      
      console.log('[DEBUG] Fetched role data:', data);
      
      if (data?.role === 'admin') {
        console.log('[DEBUG] User IS admin! Setting isAdmin to true.');
        setIsAdmin(true);
      } else {
        console.log('[DEBUG] User is NOT admin. Setting isAdmin to false.');
        setIsAdmin(false);
      }
    } catch (e) {
      console.error('[DEBUG] Exception in checkAdminRole:', e);
      setIsAdmin(false);
    } finally {
      setCheckingRole(false);
    }
  };

  const isAuthenticated = Boolean(session && session.user);

  if (checkingRole && isAuthenticated) {
    return (
      <View className="flex-1 justify-center items-center" style={{ backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated 
        ? (isAdmin ? <AdminNavigator /> : <AppNavigator />) 
        : isGuest ? <GuestNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

const globalToastConfig = {
  success: (props) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: '#8A5A44', backgroundColor: '#FFFFFF', borderRadius: 20, height: undefined, minHeight: 70, paddingVertical: 12, paddingHorizontal: 15, marginTop: 10, width: '90%', elevation: 5 }}
      text1Style={{ fontSize: 16, fontWeight: 'bold', color: '#2D3748', marginBottom: 4 }}
      text2Style={{ fontSize: 14, color: '#718096', lineHeight: 20 }}
    />
  ),
  error: (props) => (
    <ErrorToast
      {...props}
      style={{ borderLeftColor: '#F56565', backgroundColor: '#FFF5F5', borderRadius: 20, height: undefined, minHeight: 70, paddingVertical: 12, paddingHorizontal: 15, marginTop: 10, width: '90%', elevation: 5 }}
      text1Style={{ fontSize: 16, fontWeight: 'bold', color: '#C53030', marginBottom: 4 }}
      text2Style={{ fontSize: 14, color: '#C53030', lineHeight: 20 }}
    />
  ),
};

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
      <SafeAreaProvider>
        <View className="flex-1 justify-center items-center" style={{ backgroundColor: '#FDFBF7' }}>
          <ActivityIndicator size="large" color="#8A5A44" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <AppProvider>
        <ErrorBoundary>
          <RootNavigator session={session} />
          <Toast config={globalToastConfig} />
        </ErrorBoundary>
      </AppProvider>
    </SafeAreaProvider>
  );
}
