import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { supabase } from '../lib/supabase';
import { useApp } from '../lib/AppContext';

export default function HomeScreen({ navigation }) {
    const [userName, setUserName] = useState('');
    const { colors, t } = useApp();

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';
            setUserName(name);
        });
    }, []);

    const greeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return t('homeGreetingMorning');
        if (hour < 18) return t('homeGreetingAfternoon');
        return t('homeGreetingEvening');
    };

    const ACTION_CARDS = [
        { key: 'Scanner', icon: '📷', title: t('homeActionScanTitle'), subtitle: t('homeActionScanSub'), bg: 'bg-blush-100', border: 'border-blush-200', iconBg: 'bg-blush-200', text: 'text-brand-600' },
        { key: 'Search', icon: '🔍', title: t('homeActionSearchTitle'), subtitle: t('homeActionSearchSub'), bg: 'bg-sky-50', border: 'border-sky-200', iconBg: 'bg-sky-100', text: 'text-sky-600' },
        { key: 'History', icon: '📋', title: t('homeActionHistoryTitle'), subtitle: t('homeActionHistorySub'), bg: 'bg-sage-50', border: 'border-sage-200', iconBg: 'bg-sage-100', text: 'text-sage-600' },
        { key: 'Profile', icon: '✨', title: t('homeActionProfileTitle'), subtitle: t('homeActionProfileSub'), bg: 'bg-lilac-100', border: 'border-lilac-200', iconBg: 'bg-lilac-200', text: 'text-lilac-600' },
    ];

    const INFO_ITEMS = [
        { icon: '🇪🇺', title: t('homeInfoItem1Title'), desc: t('homeInfoItem1Desc'), bg: 'bg-sky-50', border: 'border-sky-100' },
        { icon: '🤖', title: t('homeInfoItem2Title'), desc: t('homeInfoItem2Desc'), bg: 'bg-blush-50', border: 'border-blush-100' },
        { icon: '🎯', title: t('homeInfoItem3Title'), desc: t('homeInfoItem3Desc'), bg: 'bg-sage-50', border: 'border-sage-100' },
        { icon: '💬', title: t('homeInfoItem4Title'), desc: t('homeInfoItem4Desc'), bg: 'bg-lilac-100', border: 'border-lilac-200' },
    ];

    return (
        <ScrollView className="flex-1" style={{ backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

            {/* Header */}
            <View className="px-6 pt-14 pb-8 rounded-b-[40px] shadow-sm" style={{ backgroundColor: colors.card, borderBottomWidth: 1, borderColor: colors.border }}>
                <View className="flex-row items-center justify-between mb-6">
                    <View>
                        <Text className="text-sm font-medium" style={{ color: colors.textSub }}>{greeting()},</Text>
                        <Text className="text-2xl font-black mt-0.5" style={{ color: colors.text }}>
                            {userName ? userName.split(' ')[0] : t('homeUserDefault')} 🌸
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
                <View className="rounded-3xl p-5" style={{ backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}>
                    <Text className="font-black text-lg leading-snug" style={{ color: colors.text }}>
                        {t('homeBannerTitle')}
                    </Text>
                    <Text className="text-sm mt-2 leading-relaxed" style={{ color: colors.textSub }}>
                        {t('homeBannerSub')}
                    </Text>
                </View>
            </View>

            {/* Actiuni rapide */}
            <View className="px-6 mt-8">
                <Text className="font-black text-lg mb-4" style={{ color: colors.text }}>{t('homeActionsTitle')}</Text>

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
                            <Text className="text-xs mt-0.5 font-medium" style={{ color: colors.textMuted }}>{card.subtitle}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Despre aplicatie */}
            <View className="px-6 mt-10">
                <Text className="font-black text-lg mb-1" style={{ color: colors.text }}>{t('homeInfoTitle')}</Text>
                <Text className="text-xs font-medium mb-5" style={{ color: colors.textSub }}>
                    {t('homeInfoSub')}
                </Text>

                <View style={{ gap: 10 }}>
                    {INFO_ITEMS.map((item, i) => (
                        <View key={i} className={`rounded-3xl border p-5 flex-row items-start ${item.bg} ${item.border}`}>
                            <View className="w-11 h-11 bg-white rounded-2xl items-center justify-center mr-4 shadow-sm">
                                <Text className="text-xl">{item.icon}</Text>
                            </View>
                            <View className="flex-1">
                                <Text className="font-bold text-sm" style={{ color: colors.text }}>{item.title}</Text>
                                <Text className="text-xs mt-1 leading-relaxed" style={{ color: colors.textSub }}>{item.desc}</Text>
                            </View>
                        </View>
                    ))}
                </View>
            </View>

            {/* Footer info */}
            <View className="mx-6 mt-10 rounded-3xl p-5 items-center" style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
                <Text className="text-xs text-center leading-relaxed" style={{ color: colors.textMuted }}>
                    {t('homeFooter')}
                </Text>
            </View>

        </ScrollView>
    );
}
