import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { supabase } from '../lib/supabase';

const ACTION_CARDS = [
    {
        key: 'Scanner',
        icon: '📷',
        title: 'Scaneaza',
        subtitle: 'Citeste codul de bare',
        bg: 'bg-blush-100',
        border: 'border-blush-200',
        iconBg: 'bg-blush-200',
        text: 'text-brand-600',
    },
    {
        key: 'Search',
        icon: '🔍',
        title: 'Cauta',
        subtitle: 'Gaseste un produs',
        bg: 'bg-sky-50',
        border: 'border-sky-200',
        iconBg: 'bg-sky-100',
        text: 'text-sky-600',
    },
    {
        key: 'History',
        icon: '📋',
        title: 'Istoric',
        subtitle: 'Produsele tale',
        bg: 'bg-sage-50',
        border: 'border-sage-200',
        iconBg: 'bg-sage-100',
        text: 'text-sage-600',
    },
    {
        key: 'Profile',
        icon: '✨',
        title: 'Profilul Meu',
        subtitle: 'Ten si alergii',
        bg: 'bg-lilac-100',
        border: 'border-lilac-200',
        iconBg: 'bg-lilac-200',
        text: 'text-lilac-600',
    },
];

const INFO_ITEMS = [
    {
        icon: '🇪🇺',
        title: 'Baza de date CosIng UE',
        desc: '30.000+ ingrediente INCI verificate de Comisia Europeana.',
        bg: 'bg-sky-50',
        border: 'border-sky-100',
    },
    {
        icon: '🤖',
        title: 'AI Google Gemini',
        desc: 'Scaneaza etichete cu camera si extrage ingredientele automat prin OCR.',
        bg: 'bg-blush-50',
        border: 'border-blush-100',
    },
    {
        icon: '🎯',
        title: 'Analiza Personalizata',
        desc: 'Rezultatele se adapteaza la tipul tau de ten si alergiile declarate.',
        bg: 'bg-sage-50',
        border: 'border-sage-100',
    },
    {
        icon: '💬',
        title: 'CosmetiBot',
        desc: 'Intreaba AI-ul orice despre produse, ingrediente sau ingrijire.',
        bg: 'bg-lilac-100',
        border: 'border-lilac-200',
    },
];

export default function HomeScreen({ navigation }) {
    const [userName, setUserName] = useState('');

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';
            setUserName(name);
        });
    }, []);

    const greeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Buna dimineata';
        if (hour < 18) return 'Buna ziua';
        return 'Buna seara';
    };

    return (
        <ScrollView className="flex-1 bg-brand-50" contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

            {/* Header */}
            <View className="bg-white px-6 pt-14 pb-8 rounded-b-[40px] shadow-sm border-b border-brand-100">
                <View className="flex-row items-center justify-between mb-6">
                    <View>
                        <Text className="text-brand-300 text-sm font-medium">{greeting()},</Text>
                        <Text className="text-brand-900 text-2xl font-black mt-0.5">
                            {userName ? userName.split(' ')[0] : 'utilizatoare'} 🌸
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Profile')}
                        className="w-12 h-12 bg-blush-100 rounded-full items-center justify-center border border-blush-200"
                    >
                        <Text className="text-xl">👤</Text>
                    </TouchableOpacity>
                </View>

                {/* Banner tagline */}
                <View className="bg-brand-50 rounded-3xl p-5 border border-brand-100">
                    <Text className="text-brand-700 font-black text-lg leading-snug">
                        Stii ce pui{'\n'}pe pielea ta? 💄
                    </Text>
                    <Text className="text-brand-400 text-sm mt-2 leading-relaxed">
                        Analizeaza orice cosmetica in cateva secunde cu baza de date CosIng a Uniunii Europene.
                    </Text>
                </View>
            </View>

            {/* Actiuni rapide */}
            <View className="px-6 mt-8">
                <Text className="text-brand-900 font-black text-lg mb-4">Ce vrei sa faci?</Text>

                <View className="flex-row flex-wrap" style={{ gap: 12 }}>
                    {ACTION_CARDS.map((card) => (
                        <TouchableOpacity
                            key={card.key}
                            onPress={() => navigation.navigate(card.key)}
                            className={`rounded-3xl border p-5 ${card.bg} ${card.border}`}
                            style={{ width: '47.5%' }}
                            activeOpacity={0.75}
                        >
                            <View className={`w-12 h-12 rounded-2xl items-center justify-center mb-3 ${card.iconBg}`}>
                                <Text className="text-2xl">{card.icon}</Text>
                            </View>
                            <Text className={`font-black text-base ${card.text}`}>{card.title}</Text>
                            <Text className="text-brand-400 text-xs mt-0.5 font-medium">{card.subtitle}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Despre aplicatie */}
            <View className="px-6 mt-10">
                <Text className="text-brand-900 font-black text-lg mb-1">Cum functioneaza SmartSkin?</Text>
                <Text className="text-brand-400 text-xs font-medium mb-5">
                    Totul despre ingredientele din cosmeticele tale
                </Text>

                <View style={{ gap: 10 }}>
                    {INFO_ITEMS.map((item, i) => (
                        <View key={i} className={`rounded-3xl border p-5 flex-row items-start ${item.bg} ${item.border}`}>
                            <View className="w-11 h-11 bg-white rounded-2xl items-center justify-center mr-4 shadow-sm">
                                <Text className="text-xl">{item.icon}</Text>
                            </View>
                            <View className="flex-1">
                                <Text className="text-brand-800 font-bold text-sm">{item.title}</Text>
                                <Text className="text-brand-500 text-xs mt-1 leading-relaxed">{item.desc}</Text>
                            </View>
                        </View>
                    ))}
                </View>
            </View>

            {/* Footer info */}
            <View className="mx-6 mt-10 bg-white rounded-3xl p-5 border border-brand-100 items-center">
                <Text className="text-brand-300 text-xs text-center leading-relaxed">
                    SmartSkin foloseste datele oficiale CosIng ale Comisiei Europene{'\n'}
                    pentru a evalua ingredientele cosmetice.{'\n'}
                    Nu inlocuieste sfatul unui dermatolog.
                </Text>
            </View>

        </ScrollView>
    );
}
