import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { fetchUserHistory } from '../lib/api';
import { useApp } from '../lib/AppContext';

export default function HistoryScreen({ navigation }) {
    const { t, colors, lang, isGuest, setIsGuest } = useApp();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [compareMode, setCompareMode] = useState(false);
    const [selectedBarcodes, setSelectedBarcodes] = useState([]);

    // useFocusEffect re-incarca istoricul de fiecare data cand ecranul devine activ
    // (la mount initial, la revenire din ProductScreen dupa o scanare noua, etc.)
    useFocusEffect(
        useCallback(() => {
            if (!isGuest) loadHistory();
        }, [isGuest])
    );

    const loadHistory = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await fetchUserHistory();
            setHistory(data);
        } catch (err) {
            setError(err.message || t('historyErrLoad'));
        } finally {
            setLoading(false);
        }
    };

    if (isGuest) {
        return (
            <View className="flex-1 justify-center items-center p-8" style={{ backgroundColor: colors.bg }}>
                <View className="bg-brand-50 w-40 h-40 rounded-full items-center justify-center mb-6">
                    <Text className="text-6xl">🔒</Text>
                </View>
                <Text className="text-xl font-bold text-center mb-2" style={{ color: colors.text }}>
                    {lang === 'en' ? "Account Required" : "Cont Necesar"}
                </Text>
                <Text className="text-center font-medium mb-8 leading-relaxed" style={{ color: colors.textSub }}>
                    {lang === 'en' 
                        ? "To save your product history and get personalized insights, please register for a free account!" 
                        : "Pentru a salva istoricul și a primi recomandări personalizate, creează un cont gratuit!"}
                </Text>
                <TouchableOpacity 
                    className="bg-brand-500 py-4 px-8 rounded-full shadow-sm"
                    onPress={() => setIsGuest(false)}
                >
                    <Text className="text-white font-bold text-base">
                        {lang === 'en' ? "Create Account" : "Creează Cont"}
                    </Text>
                </TouchableOpacity>
            </View>
        );
    }

    const getScoreIndicator = (score) => {
        if (score >= 80) return { emoji: '🌱', color: 'text-emerald-500', bg: 'bg-emerald-50' };
        if (score >= 40) return { emoji: '⚠️', color: 'text-amber-500', bg: 'bg-amber-50' };
        return { emoji: '❌', color: 'text-rose-500', bg: 'bg-rose-50' };
    };

    const formatDate = (isoString) => {
        const date = new Date(isoString);
        const locale = lang === 'en' ? 'en-GB' : 'ro-RO';
        return date.toLocaleDateString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    };

    const renderItem = ({ item }) => {
        const scoreInfo = getScoreIndicator(item.safety_score);
        const productData = item.products || {};
        const scanCount = item.scan_count || 1;
        const barcode = productData.barcode || null;
        const isSelected = barcode ? selectedBarcodes.includes(barcode) : false;

        const handlePress = () => {
            if (!barcode) return;

            if (compareMode) {
                setSelectedBarcodes(prev => {
                    if (prev.includes(barcode)) {
                        return prev.filter(code => code !== barcode);
                    }

                    if (prev.length >= 2) {
                        return [prev[1], barcode];
                    }

                    return [...prev, barcode];
                });
                return;
            }

            navigation.navigate('Product', {
                barcode,
                cachedProduct: {
                    ...productData,
                    imageUrl: productData.image_url,
                    analysis: item.products?.analysis || { safetyScore: item.safety_score },
                }
            });
        };

        return (
            <TouchableOpacity
                onPress={handlePress}
                onLongPress={() => {
                    setCompareMode(true);
                    if (barcode) {
                        setSelectedBarcodes(prev => {
                            if (prev.includes(barcode)) return prev;
                            if (prev.length >= 2) return [prev[1], barcode];
                            return [...prev, barcode];
                        });
                    }
                }}
                className="rounded-3xl p-4 mb-4 flex-row items-center justify-between shadow-sm"
                style={{
                    backgroundColor: isSelected ? '#FFF1F2' : colors.card,
                    borderWidth: 1,
                    borderColor: isSelected ? '#FB7185' : colors.border,
                }}
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
                className="pt-12 pb-6 px-6 flex-row items-center justify-between border-b shadow-sm z-10"
                style={{ backgroundColor: colors.header, borderColor: colors.border }}
            >
                <View className="flex-row items-center flex-1 pr-3">
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        className="w-10 h-10 rounded-full items-center justify-center mr-4"
                        style={{ backgroundColor: colors.bg }}
                    >
                        <Text className="text-brand-500 font-bold text-lg">←</Text>
                    </TouchableOpacity>
                    <View className="flex-1">
                        <Text className="text-2xl font-black" style={{ color: colors.text }}>{t('historyTitle')}</Text>
                        <Text className="text-xs font-medium" style={{ color: colors.textSub }}>{t('historySub')}</Text>
                    </View>
                </View>

                <TouchableOpacity
                    onPress={() => {
                        setCompareMode(prev => !prev);
                        setSelectedBarcodes([]);
                    }}
                    className="px-3 py-2 rounded-2xl"
                    style={{ backgroundColor: compareMode ? '#FB7185' : colors.bg }}
                >
                    <Text className="text-xs font-bold" style={{ color: compareMode ? '#FFFFFF' : colors.text }}>
                        {compareMode ? (lang === 'en' ? 'Cancel' : 'Anulează') : (lang === 'en' ? 'Compare' : 'Compară')}
                    </Text>
                </TouchableOpacity>
            </View>

            {compareMode && (
                <View className="px-6 pt-4 pb-2" style={{ backgroundColor: colors.bg }}>
                    <View className="rounded-3xl p-4 border" style={{ backgroundColor: '#FFF1F2', borderColor: '#FDA4AF' }}>
                        <Text className="font-bold mb-1" style={{ color: '#9D174D' }}>
                            {lang === 'en' ? 'Comparison mode' : 'Mod comparație'}
                        </Text>
                        <Text className="text-sm leading-relaxed" style={{ color: '#BE185D' }}>
                            {lang === 'en'
                                ? 'Tap two products from history to compare their risk profiles.'
                                : 'Atinge două produse din istoric pentru a compara profilele lor de risc.'}
                        </Text>
                        <Text className="text-xs mt-2" style={{ color: '#9D174D' }}>
                            {selectedBarcodes.length}/2 {lang === 'en' ? 'selected' : 'selectate'}
                        </Text>
                    </View>

                    {selectedBarcodes.length === 2 && (
                        <TouchableOpacity
                            className="mt-3 rounded-2xl py-4 items-center"
                            style={{ backgroundColor: '#FB7185' }}
                            onPress={() => navigation.navigate('Compare', { barcodes: selectedBarcodes })}
                        >
                            <Text className="text-white font-bold text-base">
                                {lang === 'en' ? 'Compare selected products' : 'Compară produsele selectate'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

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
                <View className="flex-1 justify-center items-center p-8">
                    <View className="bg-brand-50 w-40 h-40 rounded-full items-center justify-center mb-6">
                        <Text className="text-6xl">✨🧴</Text>
                    </View>
                    <Text className="text-xl font-bold text-center mb-2" style={{ color: colors.text }}>
                        {lang === 'en' ? "Your history is empty" : "Istoricul tău este gol momentan"}
                    </Text>
                    <Text className="text-center font-medium mb-8 leading-relaxed" style={{ color: colors.textSub }}>
                        {lang === 'en' 
                            ? "Scan your first cosmetic product to start building your safety profile and get insights!" 
                            : "Scanează primul tău produs cosmetic pentru a începe să îți construiești profilul de siguranță!"}
                    </Text>
                    <TouchableOpacity 
                        className="bg-brand-500 py-4 px-8 rounded-full shadow-sm"
                        onPress={() => navigation.navigate('Scanner')}
                    >
                        <Text className="text-white font-bold text-base">
                            {lang === 'en' ? "📸 Scan a Product" : "📸 Scanează un Produs"}
                        </Text>
                    </TouchableOpacity>
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
