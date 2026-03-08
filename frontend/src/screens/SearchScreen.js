import React, { useState, useCallback, useRef } from 'react';
import {
    View, Text, TextInput, FlatList, TouchableOpacity,
    ActivityIndicator, Image, Alert
} from 'react-native';
import { searchProducts } from '../lib/api';
import { useApp } from '../lib/AppContext';

function ScoreBadge({ score }) {
    if (score === null || score === undefined) return null;
    const color = score >= 80 ? 'text-sage-600' : score >= 40 ? 'text-peach-600' : 'text-brand-600';
    const bg    = score >= 80 ? 'bg-sage-50 border-sage-200' : score >= 40 ? 'bg-peach-50 border-peach-200' : 'bg-blush-50 border-blush-200';
    return (
        <View className={`px-3 py-1 rounded-full border ${bg} ml-2`}>
            <Text className={`text-xs font-black ${color}`}>{score}/100</Text>
        </View>
    );
}

export default function SearchScreen({ navigation }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [error, setError] = useState(null);
    const { colors, t } = useApp();
    const searchIdRef = useRef(0); // pentru a evita race conditions intre cautari rapide

    const SOURCE_BADGE = {
        cache:  { label: t('searchBadgeAnalyzed'), bg: 'bg-sage-100', text: 'text-sage-600', border: 'border-sage-200' },
        obf:    { label: t('searchBadgeCosmetics'), bg: 'bg-sky-100', text: 'text-sky-600', border: 'border-sky-200' },
        makeup: { label: t('searchBadgeMakeup'), bg: 'bg-blush-100', text: 'text-brand-500', border: 'border-blush-200' },
    };

    const handleSearch = useCallback(async () => {
        const q = query.trim();
        if (q.length < 2) return;

        const currentId = ++searchIdRef.current; // ID unic pentru acest search

        setLoading(true);
        setError(null);
        setSearched(true);

        try {
            const data = await searchProducts(q);
            // Ignoram rezultatul daca intre timp a aparut un search mai nou
            if (currentId !== searchIdRef.current) return;
            setResults(data);
        } catch (err) {
            if (currentId !== searchIdRef.current) return;
            setError(t('searchError'));
        } finally {
            if (currentId === searchIdRef.current) setLoading(false);
        }
    }, [query]);

    const handleItemPress = (item) => {
        if (!item.barcode) {
            // Produsul nu are barcode (ex: din Makeup API) - nu pot naviga la analiza
            Alert.alert(
                t('searchNoBarcodeTitle'),
                t('searchNoBarcodeMsg'),
                [{ text: 'OK' }]
            );
            return;
        }
        navigation.navigate('Product', { barcode: item.barcode });
    };

    const renderItem = ({ item }) => {
        const badge = SOURCE_BADGE[item.source] || SOURCE_BADGE.obf;
        const needsOcr = item.source === 'obf' && item.barcode && (item.safetyScore === null || item.safetyScore === undefined);
        return (
            <TouchableOpacity
                onPress={() => handleItemPress(item)}
                activeOpacity={0.75}
                className="rounded-3xl p-4 mb-3 flex-row items-center shadow-sm"
                style={{
                    backgroundColor: colors.card,
                    borderWidth: needsOcr ? 1.5 : 1,
                    borderColor: needsOcr ? '#FCA5A5' : colors.border,
                    opacity: needsOcr ? 0.92 : 1,
                }}
            >
                {/* Imagine */}
                {item.imageUrl ? (
                    <Image
                        source={{ uri: item.imageUrl }}
                        className="w-14 h-14 rounded-2xl"
                        style={{ backgroundColor: colors.bg }}
                        resizeMode="contain"
                    />
                ) : (
                    <View className="w-14 h-14 rounded-2xl items-center justify-center" style={{ backgroundColor: colors.bg }}>
                        <Text className="text-2xl">🧴</Text>
                    </View>
                )}

                {/* Info */}
                <View className="flex-1 ml-4">
                    <Text className="font-bold text-sm" numberOfLines={1} style={{ color: colors.text }}>
                        {item.name}
                    </Text>
                    {item.brand ? (
                        <Text className="text-xs mt-0.5 font-medium" numberOfLines={1} style={{ color: colors.textSub }}>
                            {item.brand}
                        </Text>
                    ) : null}

                    <View className="flex-row items-center mt-2">
                        {/* Badge sursa */}
                        <View className={`px-2 py-0.5 rounded-full border ${badge.bg} ${badge.border}`}>
                            <Text className={`text-[10px] font-bold ${badge.text}`}>{badge.label}</Text>
                        </View>
                        {/* Scor daca exista */}
                        <ScoreBadge score={item.safetyScore} />
                        {/* Badge OCR necesar */}
                        {needsOcr && (
                            <View className="ml-2 bg-rose-50 border border-rose-200 rounded-full px-2 py-0.5 flex-row items-center">
                                <Text className="text-[10px] font-bold text-rose-400">📸 {t('searchNeedsOcr')}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Arrow sau Not analyzed */}
                <View className="ml-2">
                    {item.barcode ? (
                        needsOcr ? (
                            <View className="bg-rose-50 rounded-xl px-2 py-1">
                                <Text className="text-rose-300 text-[10px] font-medium">📷</Text>
                            </View>
                        ) : (
                            <Text className="text-brand-300 text-lg">›</Text>
                        )
                    ) : (
                        <View className="bg-brand-50 rounded-xl px-2 py-1">
                            <Text className="text-brand-300 text-[10px] font-medium">{t('searchNoBarcode')}</Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View className="flex-1" style={{ backgroundColor: colors.bg }}>

            {/* Header */}
            <View className="pt-12 pb-4 px-6 shadow-sm z-10" style={{ backgroundColor: colors.card, borderBottomWidth: 1, borderColor: colors.border }}>
                <View className="flex-row items-center mb-4">
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        className="w-10 h-10 rounded-full items-center justify-center mr-4"
                        style={{ backgroundColor: colors.bg }}
                    >
                        <Text className="text-brand-500 font-bold text-lg">←</Text>
                    </TouchableOpacity>
                    <View>
                        <Text className="text-2xl font-black" style={{ color: colors.text }}>{t('searchTitle')}</Text>
                        <Text className="text-xs font-medium" style={{ color: colors.textSub }}>{t('searchSubtitle')}</Text>
                    </View>
                </View>

                {/* Search bar */}
                <View className="flex-row items-center border rounded-2xl px-4" style={{ backgroundColor: colors.inputBg, borderColor: colors.border }}>
                    <Text className="mr-2" style={{ color: colors.textMuted }}>🔍</Text>
                    <TextInput
                        className="flex-1 py-3 text-sm"
                        style={{ color: colors.inputText }}
                        placeholder={t('searchPlaceholder')}
                        placeholderTextColor={colors.placeholder}
                        value={query}
                        onChangeText={setQuery}
                        onSubmitEditing={handleSearch}
                        returnKeyType="search"
                        autoCapitalize="none"
                    />
                    {query.length > 0 && (
                        <TouchableOpacity onPress={() => { setQuery(''); setResults([]); setSearched(false); }}>
                            <Text className="text-lg ml-2" style={{ color: colors.textMuted }}>✕</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Surse */}
                <View className="flex-row mt-3" style={{ gap: 6 }}>
                    {[
                        { label: t('searchBadgeAnalyzed'), bg: 'bg-sage-100', text: 'text-sage-600' },
                        { label: t('searchBadgeCosmetics'), bg: 'bg-sky-100', text: 'text-sky-600' },
                        { label: t('searchBadgeMakeup'), bg: 'bg-blush-100', text: 'text-brand-500' },
                    ].map(b => (
                        <View key={b.label} className={`px-3 py-1 rounded-full ${b.bg}`}>
                            <Text className={`text-[10px] font-bold ${b.text}`}>{b.label}</Text>
                        </View>
                    ))}
                    <Text className="text-brand-300 text-[10px] self-center ml-1">{t('searchBadgeLegend')}</Text>
                </View>
            </View>

            {/* Rezultate */}
            {loading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#D97AAA" />
                    <Text className="mt-4 font-medium text-sm" style={{ color: colors.textSub }}>{t('searchLoading')}</Text>
                </View>
            ) : error ? (
                <View className="flex-1 justify-center items-center px-6">
                    <Text className="text-3xl mb-3">😔</Text>
                    <Text className="font-bold text-center" style={{ color: colors.text }}>{error}</Text>
                </View>
            ) : !searched ? (
                <View className="flex-1 justify-center items-center px-8">
                    <Text className="text-5xl mb-4">🌸</Text>
                    <Text className="font-bold text-center text-lg" style={{ color: colors.text }}>
                        {t('searchEmptyTitle')}
                    </Text>
                    <Text className="text-sm text-center mt-2 leading-relaxed" style={{ color: colors.textSub }}>
                        {t('searchEmptySub')}
                    </Text>
                </View>
            ) : results.length === 0 ? (
                <View className="flex-1 justify-center items-center px-8">
                    <Text className="text-4xl mb-4">🔍</Text>
                    <Text className="font-bold text-center" style={{ color: colors.text }}>{t('searchNoResultsFor')} "{query}"</Text>
                    <Text className="text-sm text-center mt-2 leading-relaxed" style={{ color: colors.textSub }}>
                        {t('searchNoResultsSub')}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={results}
                    keyExtractor={(item, index) => `${item.source}-${item.barcode || index}`}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                    ListHeaderComponent={
                        <Text className="text-brand-400 text-xs font-medium mb-3">
                            {results.length} {t('searchResultsFound')}
                        </Text>
                    }
                />
            )}
        </View>
    );
}
