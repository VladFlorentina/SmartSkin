import React, { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { fetchProductDetails, saveToUserHistory } from '../lib/api';
import Layout from '../components/Layout';
import Button from '../components/Button';
import AnimatedScoreRing from '../components/AnimatedScoreRing';

export default function ProductScreen({ navigation, route }) {
    const { barcode } = route.params;
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [isOffline, setIsOffline] = useState(false);
    const [ocrMetadata, setOcrMetadata] = useState(null); // Metadata de la OBF pentru pre-fill

    useEffect(() => {
        loadProduct();
    }, [barcode]);

    async function loadProduct() {
        try {
            setLoading(true);
            setNotFound(false);
            setIsOffline(false);
            setOcrMetadata(null);
            const data = await fetchProductDetails(barcode);

            // Backend-ul returneaza needsOcr=true daca produsul nu a fost analizat inca
            if (data.needsOcr) {
                setOcrMetadata({
                    barcode: data.barcode,
                    name: data.name,
                    brand: data.brand,
                    imageUrl: data.imageUrl,
                });
                setNotFound(true);
                return;
            }

            setProduct(data);

            // Background task: salveaza in istoricul utilizatorului autentificat
            if (data && !data.error) {
                saveToUserHistory(data.id, barcode, data.analysis?.safetyScore);
            }
        } catch (error) {
            if (error.isNetworkError) {
                setIsOffline(true);
            } else {
                console.log('Product not found or error:', error);
                setNotFound(true);
            }
        } finally {
            setLoading(false);
        }
    }

    // Color logic based on score - noua paleta pale
    const getScoreColor = (score) => {
        if (score >= 80) return { bg: 'bg-mint-50', text: 'text-mint-600', border: 'border-mint-200' };
        if (score >= 40) return { bg: 'bg-peach-50', text: 'text-peach-600', border: 'border-peach-200' };
        return { bg: 'bg-brand-50', text: 'text-brand-600', border: 'border-brand-200' };
    };

    if (loading) {
        return (
            <Layout className="justify-center items-center">
                <ActivityIndicator size="large" color="#D97AAA" />
                <Text className="text-brand-400 mt-4 font-medium">Cautam produsul in baza de date... 🌸</Text>
            </Layout>
        );
    }

    if (isOffline) {
        return (
            <Layout className="justify-center items-center px-6">
                <Text className="text-6xl mb-4">📡</Text>
                <Text className="text-2xl font-bold text-brand-900 text-center mb-3">
                    Fara Conexiune
                </Text>
                <Text className="text-brand-500 text-center leading-relaxed mb-8 px-4">
                    Nu am putut contacta serverul.{"\n"}
                    Asigura-te ca esti conectata la aceeasi retea Wi-Fi ca serverul si incearca din nou.
                </Text>
                <View className="bg-brand-50 border border-brand-100 rounded-2xl p-4 w-full mb-8">
                    <Text className="text-brand-400 text-xs text-center font-mono">
                        Cod produs: {barcode}
                    </Text>
                </View>
                <Button
                    title="Incearca din nou"
                    onPress={loadProduct}
                />
                <Button
                    title="Inapoi"
                    variant="outline"
                    onPress={() => navigation.goBack()}
                />
            </Layout>
        );
    }

    if (notFound) {
        return (
            <View className="flex-1 bg-brand-50 pt-16 px-6">
                <View className="items-center justify-center flex-1">
                    <Text className="text-6xl mb-4">📸</Text>
                    <Text className="text-2xl font-bold text-brand-900 text-center mb-2">
                        Produs Nou Detectat!
                    </Text>

                    {/* Arata metadata de la OBF daca exista */}
                    {ocrMetadata?.name && (
                        <View className="bg-white rounded-2xl p-4 mb-4 w-full items-center shadow-sm border border-brand-100">
                            <Text className="text-brand-800 font-bold text-lg text-center">{ocrMetadata.name}</Text>
                            {ocrMetadata.brand && (
                                <Text className="text-brand-400 text-sm mt-1">{ocrMetadata.brand}</Text>
                            )}
                        </View>
                    )}

                    <Text className="text-brand-600 text-center mb-6 px-4 leading-relaxed">
                        Acest produs nu a fost analizat inca. Fotografiaza eticheta cu ingredientele si AI-ul nostru il va analiza instant!
                    </Text>

                    <View className="bg-brand-100/50 rounded-2xl p-4 mb-8 w-full">
                        <Text className="text-brand-500 text-center text-sm leading-relaxed">
                            💡 Rezultatul va fi salvat automat si va fi disponibil instant pentru toti utilizatorii SmartSkin care vor scana acelasi produs.
                        </Text>
                    </View>

                    <View className="w-full gap-y-4">
                        <Button
                            title="📸 Scaneaza Eticheta Ingredientelor"
                            onPress={() => navigation.replace('ManualAdd', {
                                barcode: ocrMetadata?.barcode || barcode,
                                prefillName: ocrMetadata?.name || '',
                                prefillBrand: ocrMetadata?.brand || '',
                            })}
                        />
                        <Button
                            title="Inapoi la Scanner"
                            variant="outline"
                            onPress={() => navigation.goBack()}
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
                        onPress={() => navigation.goBack()}
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
                    {/* Safety Score Card - animated ring */}
                    <View className={`p-6 rounded-3xl border ${scoreColors.border} ${scoreColors.bg} items-center mb-8 shadow-sm`}>
                        <Text className={`text-xs font-bold ${scoreColors.text} opacity-70 uppercase tracking-widest mb-5`}>
                            Scor Siguranta
                        </Text>
                        <AnimatedScoreRing score={safetyScore} />
                    </View>

                    {/* Personal Warnings - afisate doar daca userul are profil completat */}
                    {product.analysis?.personalWarnings?.length > 0 && (
                        <View className="bg-rose-50 border border-rose-200 rounded-3xl p-5 mb-6">
                            <Text className="text-rose-700 font-bold text-sm uppercase tracking-widest mb-3">
                                ⚠️ Alerte Personale
                            </Text>
                            {product.analysis.personalWarnings.map((warning, index) => (
                                <View key={index} className="flex-row items-start mb-2 last:mb-0">
                                    <Text className="text-rose-500 mr-2 mt-0.5">•</Text>
                                    <Text className="text-rose-700 text-sm flex-1 leading-relaxed">
                                        {warning}
                                    </Text>
                                </View>
                            ))}
                            {product.analysis.isPersonalized && product.analysis.baseSafetyScore !== product.analysis.safetyScore && (
                                <Text className="text-rose-400 text-xs mt-3 italic">
                                    Scorul a fost ajustat de la {product.analysis.baseSafetyScore} la {product.analysis.safetyScore} pe baza profilului tau.
                                </Text>
                            )}
                        </View>
                    )}

                    {/* General Warnings */}
                    {product.analysis?.warnings?.length > 0 && (
                        <View className="bg-amber-50 border border-amber-200 rounded-3xl p-5 mb-6">
                            <Text className="text-amber-700 font-bold text-sm uppercase tracking-widest mb-3">
                                Avertismente
                            </Text>
                            {product.analysis.warnings.map((warning, index) => (
                                <View key={index} className="flex-row items-start mb-2 last:mb-0">
                                    <Text className="text-amber-500 mr-2 mt-0.5">•</Text>
                                    <Text className="text-amber-700 text-sm flex-1 leading-relaxed">
                                        {warning}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* AI Chat Prompt */}
                    <View className="bg-white p-6 rounded-3xl shadow-brand-100 shadow-md mb-8 items-center">
                        <Text className="text-brand-700 text-center font-medium mb-4 leading-relaxed">
                            Ai intrebari despre cum afecteaza acest produs tenul tau?
                        </Text>
                        <Button
                            title="Intreaba CosmetiBot ✨"
                            onPress={() => navigation.navigate('Chat', { product })}
                            variant="outline"
                        />
                    </View>

                    {/* Ingredients Breakdown */}
                    <Text className="text-xl font-bold text-brand-900 mb-4 ml-2">Analiza Ingredientelor</Text>

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
