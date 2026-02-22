import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { fetchUserHistory } from '../lib/api';

export default function HistoryScreen({ navigation }) {
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

        return (
            <TouchableOpacity
                onPress={() => navigation.navigate('Product', { barcode: productData.barcode })}
                className="bg-white rounded-3xl p-4 mb-4 flex-row items-center justify-between shadow-brand-100 shadow-sm border border-brand-50"
            >
                <View className="flex-row items-center flex-1">
                    {productData.image_url ? (
                        <Image source={{ uri: productData.image_url }} className="w-14 h-14 rounded-2xl bg-brand-50" resizeMode="contain" />
                    ) : (
                        <View className="w-14 h-14 bg-brand-50 rounded-2xl items-center justify-center">
                            <Text className="text-brand-300 text-xs">Fara Poza</Text>
                        </View>
                    )}

                    <View className="ml-4 flex-1">
                        <Text className="text-brand-900 font-bold text-base" numberOfLines={1}>
                            {productData.name || 'Produs Necunoscut'}
                        </Text>
                        <Text className="text-brand-400 font-medium text-xs mt-0.5">
                            {productData.brand || 'Brand Necunoscut'}
                        </Text>
                        <Text className="text-brand-300 text-[10px] mt-1">
                            Scanat: {formatDate(item.scanned_at)}
                        </Text>
                    </View>
                </View>

                <View className={`items-center justify-center rounded-2xl ml-4 px-3 py-2 ${scoreInfo.bg}`}>
                    <Text className={`font-black text-lg ${scoreInfo.color}`}>
                        {item.safety_score}
                    </Text>
                    <Text className="text-[10px] opacity-70 mt-1 uppercase tracking-widest text-brand-500 font-bold">
                        Scor
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View className="flex-1 bg-brand-50">
            <View className="bg-white pt-12 pb-6 px-6 flex-row items-center border-b border-brand-100 shadow-sm z-10">
                <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 bg-brand-50 rounded-full items-center justify-center mr-4">
                    <Text className="text-brand-500 font-bold text-lg">←</Text>
                </TouchableOpacity>
                <View>
                    <Text className="text-2xl font-black text-brand-900">Istoric Scanari</Text>
                    <Text className="text-xs text-brand-400 font-medium">Dulapiorul meu cu cosmetice</Text>
                </View>
            </View>

            {loading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#FB7185" />
                    <Text className="text-brand-400 mt-4 font-medium">Incarcam istoricul tau...</Text>
                </View>
            ) : error ? (
                <View className="flex-1 items-center justify-center px-6">
                    <Text className="text-2xl mb-4">😔</Text>
                    <Text className="text-brand-900 font-bold text-center mb-2">{error}</Text>
                    <TouchableOpacity onPress={loadHistory} className="mt-4 bg-brand-100 px-6 py-3 rounded-2xl">
                        <Text className="text-brand-600 font-bold text-center">Incearca din nou</Text>
                    </TouchableOpacity>
                </View>
            ) : history.length === 0 ? (
                <View className="flex-1 justify-center items-center px-6">
                    <Text className="text-5xl mb-4">📸</Text>
                    <Text className="text-brand-600 font-medium text-center text-lg">
                        Inca nu ai scanat niciun produs.
                    </Text>
                    <Text className="text-brand-400 text-center mt-2">
                        Scaneaza o eticheta ca sa apara in istoricul tau!
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={history}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
}
