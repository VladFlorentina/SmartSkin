import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    View, Text, TextInput, FlatList, TouchableOpacity,
    ActivityIndicator, Image, Alert
} from 'react-native';
import { searchProducts } from '../lib/api';
import { useApp } from '../lib/AppContext';
import { Ionicons } from '@expo/vector-icons';

function ScoreBadge({ score, colors }) {
    if (score === null || score === undefined) return null;
    return (
        <View className="px-3 py-1 rounded-full border ml-2" style={{ backgroundColor: colors.bg, borderColor: colors.primary }}>
            <Text className="text-xs font-black" style={{ color: colors.primary }}>{score}/100</Text>
        </View>
    );
}

import Toast from 'react-native-toast-message';

export default function SearchScreen({ navigation }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [error, setError] = useState(null);
    const { colors, t } = useApp();
    const searchIdRef = useRef(0); // pentru a evita race conditions intre cautari rapide
    const searchTimeoutRef = useRef(null);

    useEffect(() => {
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, []);

    const SOURCE_BADGE = {
        cache:  { label: t('searchBadgeAnalyzed'), bg: colors.bg, text: colors.primary, border: colors.border },
        obf:    { label: t('searchBadgeCosmetics'), bg: colors.bg, text: colors.textSub, border: colors.border },
        makeup: { label: t('searchBadgeMakeup'), bg: colors.bg, text: colors.textSub, border: colors.border },
    };

    const handleSearchChange = (text) => {
        setQuery(text);
        
        // Clear orice timer anterior pentru autocomplete
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        
        // Seteaza noul timer (debounce de 400ms)
        if (text.trim().length >= 2) {
            searchTimeoutRef.current = setTimeout(() => {
                handleSearch(text);
            }, 400);
        } else {
            setResults([]);
            setSearched(false);
        }
    };

    const handleSearch = useCallback(async (textToSearch) => {
        const q = (textToSearch || query).trim();
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
            Toast.show({
                type: 'error',
                text1: t('searchNoBarcodeTitle'),
                text2: t('searchNoBarcodeMsg')
            });
            return;
        }
        navigation.navigate('Product', { barcode: item.barcode });
    };

    const renderItem = ({ item }) => {
        const badge = SOURCE_BADGE[item.source] || SOURCE_BADGE.obf;
        return (
            <TouchableOpacity
                onPress={() => handleItemPress(item)}
                activeOpacity={0.75}
                className="rounded-3xl p-4 mb-3 flex-row items-center shadow-sm"
                style={{
                    backgroundColor: colors.card,
                    borderWidth: 1,
                    borderColor: colors.border,
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
                        <Ionicons name="beaker-outline" size={24} color={colors.textMuted} />
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
                        <View className="px-2 py-0.5 rounded-full border" style={{ backgroundColor: badge.bg, borderColor: badge.border }}>
                            <Text className="text-[10px] font-bold" style={{ color: badge.text }}>{badge.label}</Text>
                        </View>
                        {/* Scor daca exista */}
                        <ScoreBadge score={item.safetyScore} colors={colors} />
                    </View>
                </View>

                {/* Arrow sau Not analyzed */}
                <View className="ml-2">
                    {item.barcode ? (
                        <Ionicons name="chevron-forward" size={20} color={colors.primary} />
                    ) : (
                        <View className="rounded-xl px-2 py-1" style={{ backgroundColor: colors.bg }}>
                            <Text className="text-[10px] font-medium" style={{ color: colors.textSub }}>{t('searchNoBarcode')}</Text>
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
                        <Ionicons name="arrow-back" size={20} color={colors.primary} />
                    </TouchableOpacity>
                    <View>
                        <Text className="text-2xl font-black" style={{ color: colors.text }}>{t('searchTitle')}</Text>
                        <Text className="text-xs font-medium" style={{ color: colors.textSub }}>{t('searchSubtitle')}</Text>
                    </View>
                </View>

                {/* Search bar */}
                <View className="flex-row items-center border rounded-2xl px-4" style={{ backgroundColor: colors.inputBg, borderColor: colors.border }}>
                    <Ionicons name="search" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
                    <TextInput
                        className="flex-1 py-3 text-sm"
                        style={{ color: colors.inputText }}
                        placeholder={t('searchPlaceholder')}
                        placeholderTextColor={colors.placeholder}
                        value={query}
                        onChangeText={handleSearchChange}
                        onSubmitEditing={() => handleSearch(query)}
                        returnKeyType="search"
                        autoCapitalize="none"
                    />
                    {query.length > 0 && (
                        <TouchableOpacity onPress={() => { setQuery(''); setResults([]); setSearched(false); }} className="ml-2">
                            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Surse */}
                <View className="flex-row mt-3" style={{ gap: 6 }}>
                    {[
                        { label: t('searchBadgeAnalyzed'), bg: colors.bg, text: colors.primary },
                        { label: t('searchBadgeCosmetics'), bg: colors.bg, text: colors.textSub },
                        { label: t('searchBadgeMakeup'), bg: colors.bg, text: colors.textSub },
                    ].map(b => (
                        <View key={b.label} className="px-3 py-1 rounded-full" style={{ backgroundColor: b.bg, borderWidth: 1, borderColor: colors.border }}>
                            <Text className="text-[10px] font-bold" style={{ color: b.text }}>{b.label}</Text>
                        </View>
                    ))}
                    <Text className="text-[10px] self-center ml-1" style={{ color: colors.textSub }}>{t('searchBadgeLegend')}</Text>
                </View>
            </View>

            {/* Rezultate */}
            {loading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text className="mt-4 font-medium text-sm" style={{ color: colors.textSub }}>{t('searchLoading')}</Text>
                </View>
            ) : error ? (
                <View className="flex-1 justify-center items-center px-6">
                    <Ionicons name="alert-circle-outline" size={64} color={colors.primary} style={{ marginBottom: 12 }} />
                    <Text className="font-bold text-center" style={{ color: colors.text }}>{error}</Text>
                </View>
            ) : !searched ? (
                <View className="flex-1 justify-center items-center px-8">
                    <Ionicons name="search-outline" size={64} color={colors.primary} style={{ marginBottom: 16 }} />
                    <Text className="font-bold text-center text-lg" style={{ color: colors.text }}>
                        {t('searchEmptyTitle')}
                    </Text>
                    <Text className="text-sm text-center mt-2 leading-relaxed" style={{ color: colors.textSub }}>
                        {t('searchEmptySub')}
                    </Text>
                </View>
            ) : results.length === 0 ? (
                <View className="flex-1 justify-center items-center px-8">
                    <Ionicons name="search" size={64} color={colors.primary} style={{ marginBottom: 16 }} />
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
                        <Text className="text-xs font-medium mb-3" style={{ color: colors.textSub }}>
                            {results.length} {t('searchResultsFound')}
                        </Text>
                    }
                />
            )}
        </View>
    );
}
