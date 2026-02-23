import React, { useState, useCallback } from 'react';
import {
    View, Text, TextInput, FlatList, TouchableOpacity,
    ActivityIndicator, Image
} from 'react-native';
import { searchProducts } from '../lib/api';

const SOURCE_BADGE = {
    cache: { label: 'Analizat', bg: 'bg-sage-100', text: 'text-sage-600', border: 'border-sage-200' },
    obf:   { label: 'Cosmetice', bg: 'bg-sky-100', text: 'text-sky-600', border: 'border-sky-200' },
    makeup: { label: 'Machiaj', bg: 'bg-blush-100', text: 'text-brand-500', border: 'border-blush-200' },
};

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

    const handleSearch = useCallback(async () => {
        const q = query.trim();
        if (q.length < 2) return;

        setLoading(true);
        setError(null);
        setSearched(true);

        try {
            const data = await searchProducts(q);
            setResults(data);
        } catch (err) {
            setError('Nu am putut efectua cautarea. Verifica conexiunea.');
        } finally {
            setLoading(false);
        }
    }, [query]);

    const handleItemPress = (item) => {
        if (item.barcode) {
            navigation.navigate('Product', { barcode: item.barcode });
        }
    };

    const renderItem = ({ item }) => {
        const badge = SOURCE_BADGE[item.source] || SOURCE_BADGE.obf;
        return (
            <TouchableOpacity
                onPress={() => handleItemPress(item)}
                activeOpacity={0.75}
                className="bg-white rounded-3xl p-4 mb-3 flex-row items-center border border-brand-50 shadow-sm"
            >
                {/* Imagine */}
                {item.imageUrl ? (
                    <Image
                        source={{ uri: item.imageUrl }}
                        className="w-14 h-14 rounded-2xl bg-brand-50"
                        resizeMode="contain"
                    />
                ) : (
                    <View className="w-14 h-14 bg-brand-50 rounded-2xl items-center justify-center">
                        <Text className="text-2xl">🧴</Text>
                    </View>
                )}

                {/* Info */}
                <View className="flex-1 ml-4">
                    <Text className="text-brand-900 font-bold text-sm" numberOfLines={1}>
                        {item.name}
                    </Text>
                    {item.brand ? (
                        <Text className="text-brand-400 text-xs mt-0.5 font-medium" numberOfLines={1}>
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
                    </View>
                </View>

                {/* Arrow sau Not analyzed */}
                <View className="ml-2">
                    {item.barcode ? (
                        <Text className="text-brand-300 text-lg">›</Text>
                    ) : (
                        <View className="bg-brand-50 rounded-xl px-2 py-1">
                            <Text className="text-brand-300 text-[10px] font-medium">Fara cod</Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View className="flex-1 bg-brand-50">

            {/* Header */}
            <View className="bg-white pt-12 pb-4 px-6 border-b border-brand-100 shadow-sm z-10">
                <View className="flex-row items-center mb-4">
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        className="w-10 h-10 bg-brand-50 rounded-full items-center justify-center mr-4"
                    >
                        <Text className="text-brand-500 font-bold text-lg">←</Text>
                    </TouchableOpacity>
                    <View>
                        <Text className="text-2xl font-black text-brand-900">Cauta Produs</Text>
                        <Text className="text-xs text-brand-400 font-medium">Cosmetice, creme, machiaj</Text>
                    </View>
                </View>

                {/* Search bar */}
                <View className="flex-row items-center bg-brand-50 border border-brand-200 rounded-2xl px-4">
                    <Text className="text-brand-300 mr-2">🔍</Text>
                    <TextInput
                        className="flex-1 py-3 text-brand-900 text-sm"
                        placeholder="ex: Cerave, Garnier, foundation..."
                        placeholderTextColor="#E89BBF"
                        value={query}
                        onChangeText={setQuery}
                        onSubmitEditing={handleSearch}
                        returnKeyType="search"
                        autoCapitalize="none"
                    />
                    {query.length > 0 && (
                        <TouchableOpacity onPress={() => { setQuery(''); setResults([]); setSearched(false); }}>
                            <Text className="text-brand-300 text-lg ml-2">✕</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Surse */}
                <View className="flex-row mt-3" style={{ gap: 6 }}>
                    {[
                        { label: 'Analizat', bg: 'bg-sage-100', text: 'text-sage-600' },
                        { label: 'Cosmetice', bg: 'bg-sky-100', text: 'text-sky-600' },
                        { label: 'Machiaj', bg: 'bg-blush-100', text: 'text-brand-500' },
                    ].map(b => (
                        <View key={b.label} className={`px-3 py-1 rounded-full ${b.bg}`}>
                            <Text className={`text-[10px] font-bold ${b.text}`}>{b.label}</Text>
                        </View>
                    ))}
                    <Text className="text-brand-300 text-[10px] self-center ml-1">= sursa rezultat</Text>
                </View>
            </View>

            {/* Rezultate */}
            {loading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#D97AAA" />
                    <Text className="text-brand-400 mt-4 font-medium text-sm">Cautam in toate bazele de date...</Text>
                </View>
            ) : error ? (
                <View className="flex-1 justify-center items-center px-6">
                    <Text className="text-3xl mb-3">😔</Text>
                    <Text className="text-brand-700 font-bold text-center">{error}</Text>
                </View>
            ) : !searched ? (
                <View className="flex-1 justify-center items-center px-8">
                    <Text className="text-5xl mb-4">🌸</Text>
                    <Text className="text-brand-700 font-bold text-center text-lg">
                        Cauta orice produs cosmetic
                    </Text>
                    <Text className="text-brand-400 text-sm text-center mt-2 leading-relaxed">
                        Cautam in produsele deja analizate de comunitate, in baza Open Beauty Facts si in Makeup API.
                    </Text>
                </View>
            ) : results.length === 0 ? (
                <View className="flex-1 justify-center items-center px-8">
                    <Text className="text-4xl mb-4">🔍</Text>
                    <Text className="text-brand-700 font-bold text-center">Niciun rezultat pentru "{query}"</Text>
                    <Text className="text-brand-400 text-sm text-center mt-2 leading-relaxed">
                        Incearca alt nume de produs sau brand.{'\n'}
                        Daca il ai la tine, scaneaza eticheta direct!
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
                            {results.length} rezultate gasite
                        </Text>
                    }
                />
            )}
        </View>
    );
}
