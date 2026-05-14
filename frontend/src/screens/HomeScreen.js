import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useApp } from '../lib/AppContext';
import { Ionicons } from '@expo/vector-icons';
import { UserCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function HomeScreen({ navigation }) {
    const [userName, setUserName] = useState('');
    const { colors, t, isDark, lang } = useApp();

    useEffect(() => {
        supabase.auth.getUser()
            .then(({ data, error }) => {
                if (error || !data?.user) return;
                const user = data.user;
                const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';
                setUserName(name);
            })
            .catch(() => {}); 
    }, []);

    const greeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return t('homeGreetingMorning');
        if (hour < 18) return t('homeGreetingAfternoon');
        return t('homeGreetingEvening');
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.bg} />
            
            <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
                
                {/* Top Section */}
                <View className="px-6 pt-8 pb-6">
                    <View className="flex-row items-center justify-between mb-8">
                        <View>
                            <Text className="text-sm font-semibold tracking-widest uppercase" style={{ color: colors.textSub }}>
                                {greeting()}
                            </Text>
                            <Text className="text-3xl font-bold mt-1" style={{ color: colors.text }}>
                                {userName ? userName.split(' ')[0] : t('homeUserDefault')}.
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('ProfileTab')}
                            className="w-12 h-12 items-center justify-center"
                        >
                            <UserCircle size={36} color={colors.text} strokeWidth={1.2} />
                        </TouchableOpacity>
                    </View>

                    {/* The Minimalist Hero Scanner */}
                    <TouchableOpacity 
                        onPress={() => navigation.navigate('Scanner')}
                        activeOpacity={0.7}
                        className="rounded-[32px] p-6 border mt-2"
                        style={{ 
                            backgroundColor: colors.card, 
                            borderColor: colors.border, 
                            minHeight: 180,
                            shadowColor: colors.text, 
                            shadowOpacity: 0.04, 
                            shadowRadius: 12, 
                            elevation: 2 
                        }}
                    >
                        <View className="flex-row items-start justify-between mb-6">
                            <View className="w-14 h-14 rounded-2xl items-center justify-center" style={{ backgroundColor: colors.primaryLight }}>
                                <Ionicons name="scan" size={26} color={colors.primary} />
                            </View>
                            
                            <View className="px-3 py-1.5 rounded-full" style={{ backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}>
                                <Text className="text-xs font-bold tracking-widest uppercase" style={{ color: colors.primary }}>
                                    AI SCAN
                                </Text>
                            </View>
                        </View>
                        
                        <View>
                            <Text className="text-2xl font-bold mb-2 tracking-wide" style={{ color: colors.text }}>
                                {lang === 'en' ? 'Scan Product' : 'Scanează Produsul'}
                            </Text>
                            <Text className="text-sm leading-relaxed" style={{ color: colors.textSub }}>
                                {lang === 'en'
                                    ? 'Analyze ingredients instantly using our AI and the European CosIng database.'
                                    : 'Analizează instantaneu ingredientele folosind inteligența artificială și baza de date europeană CosIng.'}
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Horizontal Quick Actions Pill Menu */}
                <View className="px-6 mt-2 mb-8">
                    <View className="flex-row justify-between" style={{ gap: 12 }}>
                        <TouchableOpacity 
                            onPress={() => navigation.navigate('SearchTab')}
                            className="flex-1 rounded-2xl p-4 items-center justify-center flex-row"
                            style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}
                        >
                            <Ionicons name="search" size={20} color={colors.text} style={{ marginRight: 8 }} />
                            <Text className="font-semibold" style={{ color: colors.text }}>
                                {lang === 'en' ? 'Search' : 'Caută'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            onPress={() => navigation.navigate('HistoryTab')}
                            className="flex-1 rounded-2xl p-4 items-center justify-center flex-row"
                            style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}
                        >
                            <Ionicons name="time" size={20} color={colors.text} style={{ marginRight: 8 }} />
                            <Text className="font-semibold" style={{ color: colors.text }}>
                                {lang === 'en' ? 'History' : 'Istoric'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Horizontal Carousel */}
                <View className="mt-2">
                    <Text className="px-6 text-sm font-bold uppercase tracking-widest mb-4" style={{ color: colors.textSub }}>
                        {lang === 'en' ? 'Discover' : 'Descoperă'}
                    </Text>
                    
                    <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false} 
                        contentContainerStyle={{ paddingHorizontal: 24, gap: 16 }}
                    >
                        {/* Carousel Card 1 */}
                        <View 
                            className="rounded-3xl p-5 w-64 shadow-sm"
                            style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}
                        >
                            <View className="w-12 h-12 rounded-full items-center justify-center mb-4" style={{ backgroundColor: colors.bg }}>
                                <Ionicons name="leaf" size={24} color={colors.primary} />
                            </View>
                            <Text className="text-lg font-bold mb-2" style={{ color: colors.text }}>
                                {lang === 'en' ? 'Clean Ingredients' : 'Ingrediente Sigure'}
                            </Text>
                            <Text className="text-sm leading-relaxed" style={{ color: colors.textSub }}>
                                {lang === 'en'
                                    ? 'We verify every INCI component against EU safety standards.'
                                    : 'Verificăm fiecare componentă INCI conform standardelor de siguranță ale UE.'}
                            </Text>
                        </View>

                        {/* Carousel Card 2 */}
                        <View 
                            className="rounded-3xl p-5 w-64 shadow-sm"
                            style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}
                        >
                            <View className="w-12 h-12 rounded-full items-center justify-center mb-4" style={{ backgroundColor: colors.bg }}>
                                <Ionicons name="sparkles" size={24} color={colors.primary} />
                            </View>
                            <Text className="text-lg font-bold mb-2" style={{ color: colors.text }}>
                                {lang === 'en' ? 'AI Analysis' : 'Analiză IA'}
                            </Text>
                            <Text className="text-sm leading-relaxed" style={{ color: colors.textSub }}>
                                {lang === 'en'
                                    ? 'Smart text recognition reads the label and builds your profile.'
                                    : 'Recunoașterea inteligentă a textului citește eticheta și îți creează profilul.'}
                            </Text>
                        </View>
                        
                        {/* Carousel Card 3 */}
                        <View 
                            className="rounded-3xl p-5 w-64 shadow-sm"
                            style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}
                        >
                            <View className="w-12 h-12 rounded-full items-center justify-center mb-4" style={{ backgroundColor: colors.bg }}>
                                <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
                            </View>
                            <Text className="text-lg font-bold mb-2" style={{ color: colors.text }}>
                                {lang === 'en' ? 'Allergy Alerts' : 'Alerte Alergii'}
                            </Text>
                            <Text className="text-sm leading-relaxed" style={{ color: colors.textSub }}>
                                {lang === 'en'
                                    ? 'Get instant warnings about ingredients you are sensitive to.'
                                    : 'Primești avertismente instantanee despre ingredientele la care ești sensibil.'}
                            </Text>
                        </View>

                    </ScrollView>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}
