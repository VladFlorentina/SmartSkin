import React, { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { fetchProductDetails, saveToUserHistory } from '../lib/api';
import Layout from '../components/Layout';
import Button from '../components/Button';
import ChatScreen from './ChatScreen';

export default function ProductScreen({ barcode, onBack, onAddManual }) {
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [showChat, setShowChat] = useState(false);

    useEffect(() => {
        loadProduct();
    }, [barcode]);

    async function loadProduct() {
        try {
            setLoading(true);
            setNotFound(false);
            const data = await fetchProductDetails(barcode);
            setProduct(data);

            // Background task: salveaza in istoricul utilizatorului autentificat
            if (data && !data.error) {
                saveToUserHistory(data.id, barcode, data.analysis?.safetyScore);
            }
        } catch (error) {
            console.log('Product not found or error:', error);
            setNotFound(true);
        } finally {
            setLoading(false);
        }
    }

    // Pale color logic based on score
    const getScoreColor = (score) => {
        if (score >= 80) return { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' };
        if (score >= 40) return { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' };
        return { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200' };
    };

    if (loading) {
        return (
            <Layout className="justify-center items-center">
                <ActivityIndicator size="large" color="#FDA4AF" />
                <Text className="text-brand-400 mt-4 font-medium">Cautam produsul in baza de date... 🌸</Text>
            </Layout>
        );
    }

    if (showChat && product) {
        return <ChatScreen product={product} onBack={() => setShowChat(false)} />;
    }

    if (notFound) {
        return (
            <View className="flex-1 bg-brand-50 pt-20 px-6">
                <View className="items-center justify-center flex-1">
                    <Text className="text-6xl mb-6">🕵️‍♀️</Text>
                    <Text className="text-2xl font-bold text-brand-900 text-center mb-2">
                        Produs Negasit
                    </Text>
                    <Text className="text-brand-600 text-center mb-8 px-4 leading-relaxed">
                        Acest produs nu exista in baza noastra de date publica. Ai vrea sa il adaugi tu manual pentru a ajuta si alti utilizatori?
                    </Text>

                    <View className="w-full gap-y-4">
                        <Button
                            title="Deschide Camera (OCR)"
                            onPress={onAddManual}
                        />
                        <Button
                            title="Scaneaza Altceva"
                            variant="outline"
                            onPress={onBack}
                        />
                    </View>
                </View>
            </View>
        );
    }

    if (!product) return null;

    const safetyScore = product.analysis?.safetyScore || 0;
    const scoreColors = getScoreColor(safetyScore);

    return (
        <View className="flex-1 bg-brand-50">
            <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Header - Image & Back Button */}
                <View className="relative bg-white rounded-b-[40px] shadow-brand-100 shadow-xl overflow-hidden pt-12 pb-8 px-6">
                    <TouchableOpacity
                        onPress={onBack}
                        className="absolute top-12 left-6 z-10 bg-brand-50 w-10 h-10 rounded-full items-center justify-center"
                    >
                        <Text className="text-brand-500 font-bold text-lg">←</Text>
                    </TouchableOpacity>

                    <View className="items-center mt-6">
                        {product.imageUrl ? (
                            <Image
                                source={{ uri: product.imageUrl }}
                                className="w-40 h-40 rounded-3xl"
                                resizeMode="contain"
                            />
                        ) : (
                            <View className="w-40 h-40 bg-brand-50 rounded-3xl items-center justify-center">
                                <Text className="text-brand-300">Fara poza</Text>
                            </View>
                        )}

                        <Text className="text-2xl font-bold text-brand-900 mt-6 text-center">
                            {product.name || 'Produs Necunoscut'}
                        </Text>
                        <Text className="text-brand-400 text-sm font-medium mt-1">
                            {product.brand || 'Brand Necunoscut'}
                        </Text>
                    </View>
                </View>

                <View className="px-6 mt-8">
                    {/* Safety Score Card */}
                    <View className={`p-6 rounded-3xl border ${scoreColors.border} ${scoreColors.bg} flex-row items-center justify-between mb-8 shadow-sm`}>
                        <View>
                            <Text className={`text-sm font-bold ${scoreColors.text} opacity-80 uppercase tracking-widest mb-1`}>
                                Scor Siguranta
                            </Text>
                            <Text className={`text-4xl font-extrabold ${scoreColors.text}`}>
                                {safetyScore}<Text className="text-xl">/100</Text>
                            </Text>
                        </View>
                        <View className={`w-16 h-16 rounded-full border-4 ${scoreColors.border} items-center justify-center bg-white opacity-80`}>
                            <Text className={`text-2xl ${scoreColors.text}`}>
                                {safetyScore >= 80 ? '🌱' : safetyScore >= 40 ? '⚠️' : '❌'}
                            </Text>
                        </View>
                    </View>

                    {/* AI Chat Prompt */}
                    <View className="bg-white p-6 rounded-3xl shadow-brand-100 shadow-md mb-8 items-center">
                        <Text className="text-brand-700 text-center font-medium mb-4 leading-relaxed">
                            Ai intrebari despre cum afecteaza acest produs tenul tau?
                        </Text>
                        <Button
                            title="Intreaba CosmetiBot ✨"
                            onPress={() => setShowChat(true)}
                            variant="outline"
                        />
                    </View>

                    {/* Ingredients Breakdown */}
                    <Text className="text-xl font-bold text-brand-900 mb-4 ml-2">Breakdown Ingrediente</Text>

                    <View className="bg-white rounded-3xl shadow-brand-100 shadow-md p-6">
                        {product.analysis?.ingredientsBreakdown && product.analysis.ingredientsBreakdown.length > 0 ? (
                            product.analysis.ingredientsBreakdown.map((item, index) => {
                                const itemColor = getScoreColor(100 - (item.riskLevel * 20)); // Map risk 0-5 to pale colors (0=emerald, 5=rose)

                                return (
                                    <View key={index} className="flex-row items-center justify-between py-3 border-b border-brand-50 last:border-0">
                                        <View className="flex-1 pr-4">
                                            <Text className="text-brand-800 font-medium" numberOfLines={1}>
                                                {item.name}
                                            </Text>
                                            {item.description && (
                                                <Text className="text-brand-400 text-xs mt-1" numberOfLines={2}>
                                                    {item.description}
                                                </Text>
                                            )}
                                        </View>
                                        <View className={`px-3 py-1 rounded-full ${itemColor.bg} border ${itemColor.border}`}>
                                            <Text className={`text-xs font-bold ${itemColor.text}`}>
                                                {item.riskLevel === 0 ? 'Sigur' : `Nivel ${item.riskLevel}`}
                                            </Text>
                                        </View>
                                    </View>
                                );
                            })
                        ) : (
                            <Text className="text-brand-400 italic text-center py-4">
                                Analiza detaliata nu este disponibila momentan.
                            </Text>
                        )}
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}
