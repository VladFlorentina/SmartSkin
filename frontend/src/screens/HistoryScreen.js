import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { fetchUserHistory } from '../lib/api';
import { useApp } from '../lib/AppContext';

export default function HistoryScreen({ navigation }) {
    const { t, colors } = useApp();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await fetchUserHistory();
            setHistory(data);
        } catch (err) {
            setError(err.message || 'Nu am putut incarca istoricul');
        } finally {
            setLoading(false);
        }
    };

    const getScoreIndicator = (score) => {
        if (score >= 80) return { emoji: '🌱', color: 'text-emerald-500', bg: 'bg-emerald-50' };
        if (score >= 40) return { emoji: '⚠️', color: 'text-amber-500', bg: 'bg-amber-50' };
        return { emoji: '❌', color: 'text-rose-500', bg: 'bg-rose-50' };
    };

    const formatDate = (isoString) => {
        const date = new Date(isoString);
        return date.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    };

    const renderItem = ({ item }) => {
        const scoreInfo = getScoreIndicator(item.safety_score);
        const productData = item.products || {};
        // scan_count badge: only shown when product was accessed more than once
        const scanCount = item.scan_count || 1;

        return (
            <TouchableOpacity
                onPress={() => navigation.navigate('Product', { barcode: productData.barcode })}
                className="rounded-3xl p-4 mb-4 flex-row items-center justify-between shadow-sm"
                style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}
            >
                <View className="flex-row items-center flex-1">
                    {productData.image_url ? (
                        <Image source={{ uri: productData.image_url }} className="w-14 h-14 rounded-2xl" style={{ backgroundColor: colors.bg }} resizeMode="contain" />
                    ) : (
                        <View className="w-14 h-14 rounded-2xl items-center justify-center" style={{ backgroundColor: colors.bg }}>
                            <Text className="text-xs" style={{ color: colors.textMuted }}>{t('historyNoPhoto')}</Text>
                        </View>
                    )}

                    <View className="ml-4 flex-1">
                        <Text className="font-bold text-base" numberOfLines={1} style={{ color: colors.text }}>
                            {productData.name || t('historyUnknownProduct')}
                        </Text>
                        <Text className="font-medium text-xs mt-0.5" style={{ color: colors.textSub }}>
                            {productData.brand || t('historyUnknownBrand')}
                        </Text>
                        <Text className="text-[10px] mt-1" style={{ color: colors.textMuted }}>
                            {t('historyScannedAt')}: {formatDate(item.scanned_at)}
                        </Text>
                        {scanCount > 1 && (
                            <View className="mt-1.5 self-start bg-rose-100 border border-rose-200 rounded-full px-2 py-0.5">
                                <Text className="text-[10px] font-bold text-rose-500">
                                    🕒 {scanCount} {scanCount === 1 ? t('historyScanCount1') : t('historyScanCountN')}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                <View className={`items-center justify-center rounded-2xl ml-4 px-3 py-2 ${scoreInfo.bg}`}>
                    <Text className={`font-black text-lg ${scoreInfo.color}`}>
                        {item.safety_score}
                    </Text>
                    <Text className="text-[10px] opacity-70 mt-1 uppercase tracking-widest text-brand-500 font-bold">
                        {t('historyScore')}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View className="flex-1" style={{ backgroundColor: colors.bg }}>
            <View
                className="pt-12 pb-6 px-6 flex-row items-center border-b shadow-sm z-10"
                style={{ backgroundColor: colors.header, borderColor: colors.border }}
            >
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    className="w-10 h-10 rounded-full items-center justify-center mr-4"
                    style={{ backgroundColor: colors.bg }}
                >
                    <Text className="text-brand-500 font-bold text-lg">←</Text>
                </TouchableOpacity>
                <View>
                    <Text className="text-2xl font-black" style={{ color: colors.text }}>{t('historyTitle')}</Text>
                    <Text className="text-xs font-medium" style={{ color: colors.textSub }}>{t('historySub')}</Text>
                </View>
            </View>

            {loading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#FB7185" />
                    <Text className="mt-4 font-medium" style={{ color: colors.textSub }}>{t('historyLoadingText')}</Text>
                </View>
            ) : error ? (
                <View className="flex-1 items-center justify-center px-6">
                    <Text className="text-2xl mb-4">😔</Text>
                    <Text className="font-bold text-center mb-2" style={{ color: colors.text }}>{error}</Text>
                    <TouchableOpacity onPress={loadHistory} className="mt-4 bg-brand-100 px-6 py-3 rounded-2xl">
                        <Text className="text-brand-600 font-bold text-center">{t('historyRetry')}</Text>
                    </TouchableOpacity>
                </View>
            ) : history.length === 0 ? (
                <View className="flex-1 justify-center items-center px-6">
                    <Text className="text-5xl mb-4">📸</Text>
                    <Text className="font-medium text-center text-lg" style={{ color: colors.text }}>
                        {t('historyEmpty')}
                    </Text>
                    <Text className="text-center mt-2" style={{ color: colors.textSub }}>
                        {t('historyEmptySub')}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={history}
                    keyExtractor={item => item.id?.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
}
