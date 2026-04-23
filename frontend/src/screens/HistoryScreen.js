import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { fetchUserHistory } from '../lib/api';
import { useApp } from '../lib/AppContext';
import { Ionicons } from '@expo/vector-icons';

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
                <View className="w-40 h-40 rounded-full items-center justify-center mb-6" style={{ backgroundColor: colors.primaryLight }}>
                    <Ionicons name="lock-closed" size={64} color={colors.primary} />
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
                    className="py-4 px-8 rounded-full shadow-sm"
                    style={{ backgroundColor: colors.primary }}
                    onPress={() => setIsGuest(false)}
                >
                    <Text className="font-bold text-base" style={{ color: colors.bg }}>
                        {lang === 'en' ? "Create Account" : "Creează Cont"}
                    </Text>
                </TouchableOpacity>
            </View>
        );
    }

    const getScoreIndicator = (score) => {
        if (score >= 80) return { color: colors.primary, bg: colors.primaryLight };
        if (score >= 40) return { color: colors.textSub, bg: colors.border };
        return { color: colors.bg, bg: colors.text };
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
                    backgroundColor: isSelected ? colors.primaryLight : colors.card,
                    borderWidth: 1,
                    borderColor: isSelected ? colors.primary : colors.border,
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
                            <View className="mt-1.5 self-start rounded-full px-2 py-0.5 border flex-row items-center" style={{ backgroundColor: colors.bg, borderColor: colors.border }}>
                                <Ionicons name="time" size={10} color={colors.textSub} style={{ marginRight: 4 }} />
                                <Text className="text-[10px] font-bold" style={{ color: colors.textSub }}>
                                    {scanCount} {scanCount === 1 ? t('historyScanCount1') : t('historyScanCountN')}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                <View className="items-center justify-center rounded-2xl ml-4 px-3 py-2" style={{ backgroundColor: scoreInfo.bg }}>
                    <Text className="font-black text-lg" style={{ color: scoreInfo.color }}>
                        {item.safety_score}
                    </Text>
                    <Text className="text-[10px] opacity-70 mt-1 uppercase tracking-widest font-bold" style={{ color: scoreInfo.color }}>
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
                        <Ionicons name="arrow-back" size={20} color={colors.text} />
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
                    className="px-3 py-2 rounded-2xl border"
                    style={{ backgroundColor: compareMode ? colors.primary : colors.bg, borderColor: colors.primary }}
                >
                    <Text className="text-xs font-bold" style={{ color: compareMode ? colors.bg : colors.primary }}>
                        {compareMode ? (lang === 'en' ? 'Cancel' : 'Anulează') : (lang === 'en' ? 'Compare' : 'Compară')}
                    </Text>
                </TouchableOpacity>
            </View>

            {compareMode && (
                <View className="px-6 pt-4 pb-2" style={{ backgroundColor: colors.bg }}>
                    <View className="rounded-3xl p-4 border" style={{ backgroundColor: colors.primaryLight, borderColor: colors.primary }}>
                        <Text className="font-bold mb-1" style={{ color: colors.primary }}>
                            {lang === 'en' ? 'Comparison mode' : 'Mod comparație'}
                        </Text>
                        <Text className="text-sm leading-relaxed" style={{ color: colors.textSub }}>
                            {lang === 'en'
                                ? 'Tap two products from history to compare their risk profiles.'
                                : 'Atinge două produse din istoric pentru a compara profilele lor de risc.'}
                        </Text>
                        <Text className="text-xs mt-2" style={{ color: colors.text }}>
                            {selectedBarcodes.length}/2 {lang === 'en' ? 'selected' : 'selectate'}
                        </Text>
                    </View>

                    {selectedBarcodes.length === 2 && (
                        <TouchableOpacity
                            className="mt-3 rounded-2xl py-4 items-center"
                            style={{ backgroundColor: colors.primary }}
                            onPress={() => navigation.navigate('Compare', { barcodes: selectedBarcodes })}
                        >
                            <Text className="font-bold text-base" style={{ color: colors.bg }}>
                                {lang === 'en' ? 'Compare selected products' : 'Compară produsele selectate'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {loading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text className="mt-4 font-medium" style={{ color: colors.textSub }}>{t('historyLoadingText')}</Text>
                </View>
            ) : error ? (
                <View className="flex-1 items-center justify-center px-6">
                    <Ionicons name="alert-circle-outline" size={64} color={colors.primary} style={{ marginBottom: 16 }} />
                    <Text className="font-bold text-center mb-2" style={{ color: colors.text }}>{error}</Text>
                    <TouchableOpacity onPress={loadHistory} className="mt-4 px-6 py-3 rounded-2xl" style={{ backgroundColor: colors.primaryLight }}>
                        <Text className="font-bold text-center" style={{ color: colors.primary }}>{t('historyRetry')}</Text>
                    </TouchableOpacity>
                </View>
            ) : history.length === 0 ? (
                <View className="flex-1 justify-center items-center p-8">
                    <View className="w-40 h-40 rounded-full items-center justify-center mb-6" style={{ backgroundColor: colors.primaryLight }}>
                        <Ionicons name="sparkles-outline" size={64} color={colors.primary} />
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
                        className="py-4 px-8 rounded-full shadow-sm flex-row items-center"
                        style={{ backgroundColor: colors.primary }}
                        onPress={() => navigation.navigate('Scanner')}
                    >
                        <Ionicons name="camera" size={20} color={colors.bg} style={{ marginRight: 8 }} />
                        <Text className="font-bold text-base" style={{ color: colors.bg }}>
                            {lang === 'en' ? "Scan a Product" : "Scanează un Produs"}
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
