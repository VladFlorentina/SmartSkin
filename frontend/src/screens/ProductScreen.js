import React, { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { fetchProductDetails, saveToUserHistory } from '../lib/api';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import Button from '../components/Button';
import AnimatedScoreRing from '../components/AnimatedScoreRing';
import IngredientInsightCharts from '../components/IngredientInsightCharts';
import { useApp } from '../lib/AppContext';

export default function ProductScreen({ navigation, route }) {
    const { barcode, cachedProduct } = route.params;
    const { t, colors, lang, isGuest } = useApp();
    // Daca avem date din cache (din Istoric), le folosim imediat
    const [product, setProduct] = useState(
        cachedProduct?.analysis?.ingredientsBreakdown ? cachedProduct : null
    );
    const [loading, setLoading] = useState(
        !cachedProduct?.analysis?.ingredientsBreakdown
    );
    const [notFound, setNotFound] = useState(false);
    const [isOffline, setIsOffline] = useState(false);
    const [ocrMetadata, setOcrMetadata] = useState(null); // Metadata de la OBF pentru pre-fill
    const [userProfile, setUserProfile] = useState({ skinType: null, allergies: [] });

    useEffect(() => {
        // Daca avem deja date complete din cache, nu mai facem fetch
        if (cachedProduct?.analysis?.ingredientsBreakdown) return;
        loadProduct();
    }, [barcode]);

    useEffect(() => {
        if (isGuest) {
            setUserProfile({ skinType: null, allergies: [] });
            return;
        }

        let active = true;

        async function loadProfile() {
            try {
                const { data } = await supabase.auth.getUser();
                const metadata = data?.user?.user_metadata || {};

                if (active) {
                    setUserProfile({
                        skinType: metadata.skin_type || null,
                        allergies: Array.isArray(metadata.allergies) ? metadata.allergies : [],
                    });
                }
            } catch (error) {
                console.log('Could not load profile metadata for charts:', error);
            }
        }

        loadProfile();

        return () => {
            active = false;
        };
    }, [isGuest]);

    async function loadProduct() {
        try {
            setLoading(true);
            setNotFound(false);
            setIsOffline(false);
            setOcrMetadata(null);
            const data = await fetchProductDetails(barcode, lang);

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
            if (!isGuest && data && !data.error) {
                saveToUserHistory(data.id, barcode, data.analysis?.safetyScore);
            }
        } catch (error) {
            if (error.isNetworkError) {
                setIsOffline(error.isTimeoutError ? 'timeout' : 'network');
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
                <Text className="mt-4 font-medium" style={{ color: colors.textSub }}>{t('productLoading')}</Text>
            </Layout>
        );
    }

    if (isOffline) {
        return (
            <Layout className="justify-center items-center px-6">
                <Text className="text-6xl mb-4">{isOffline === 'timeout' ? '⏳' : '📡'}</Text>
                <Text className="text-2xl font-bold text-brand-900 text-center mb-3">
                    {isOffline === 'timeout' ? t('productTimeoutTitle') : t('productOfflineTitle')}
                </Text>
                <Text className="text-brand-500 text-center leading-relaxed mb-8 px-4">
                    {isOffline === 'timeout' ? t('productTimeoutMsg') : t('productOfflineMsg')}
                </Text>
                <View className="bg-brand-50 border border-brand-100 rounded-2xl p-4 w-full mb-8">
                    <Text className="text-brand-400 text-xs text-center font-mono">
                        {t('productOfflineBarcodeLabel')} {barcode}
                    </Text>
                </View>
                <Button
                    title={t('productOfflineRetry')}
                    onPress={loadProduct}
                />
                <Button
                    title={t('productOfflineBack')}
                    variant="outline"
                    onPress={() => navigation.goBack()}
                />
            </Layout>
        );
    }

    if (notFound) {
        return (
            <View className="flex-1 pt-16 px-6" style={{ backgroundColor: colors.bg }}>
                <View className="items-center justify-center flex-1">
                    <Text className="text-6xl mb-4">📸</Text>
                    <Text className="text-2xl font-bold text-center mb-2" style={{ color: colors.text }}>
                        {t('productNewTitle')}
                    </Text>

                    {/* Arata metadata de la OBF daca exista */}
                    {ocrMetadata?.name && (
                        <View className="rounded-2xl p-4 mb-4 w-full items-center shadow-sm" style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
                            <Text className="font-bold text-lg text-center" style={{ color: colors.text }}>{ocrMetadata.name}</Text>
                            {ocrMetadata.brand && (
                                <Text className="text-sm mt-1" style={{ color: colors.textSub }}>{ocrMetadata.brand}</Text>
                            )}
                        </View>
                    )}

                    <Text className="text-center mb-6 px-4 leading-relaxed" style={{ color: colors.textSub }}>
                        {t('productNewDesc')}
                    </Text>

                    <View className="rounded-2xl p-4 mb-8 w-full" style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
                        <Text className="text-center text-sm leading-relaxed" style={{ color: colors.textMuted }}>
                            💡 {t('productNewHint')}
                        </Text>
                    </View>

                    <View className="w-full gap-y-4">
                        <Button
                            title={t('productScanLabelBtn')}
                            onPress={() => navigation.replace('ManualAdd', {
                                barcode: ocrMetadata?.barcode || barcode,
                                prefillName: ocrMetadata?.name || '',
                                prefillBrand: ocrMetadata?.brand || '',
                            })}
                        />
                        <Button
                            title={t('productBackToScanner')}
                            variant="outline"
                            onPress={() => navigation.goBack()}
                        />
                    </View>
                </View>
            </View>
        );
    }

    if (!product) {
        return (
            <Layout className="justify-center items-center px-6">
                <Text className="text-4xl mb-4">😕</Text>
                <Text className="text-lg font-bold text-center mb-6" style={{ color: colors.text }}>
                    Nu am putut incarca produsul.
                </Text>
                <Button title="Inapoi" onPress={() => navigation.goBack()} />
            </Layout>
        );
    }

    const safetyScore = product.analysis?.safetyScore || 0;
    const scoreColors = getScoreColor(safetyScore);
    const scoreCapReason = product.analysis?.scoreCapReason;
    const scoreCap = product.analysis?.scoreCap;
    const scoreCapIngredient = product.analysis?.scoreCapIngredient;
    const greenwashingAlert = product.analysis?.greenwashingAlert;

    return (
        <View className="flex-1" style={{ backgroundColor: colors.bg }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Header - Image & Back Button */}
                <View className="relative rounded-b-[40px] shadow-xl overflow-hidden pt-12 pb-8 px-6" style={{ backgroundColor: colors.card }}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        className="absolute top-12 left-6 z-10 w-10 h-10 rounded-full items-center justify-center"
                        style={{ backgroundColor: colors.bg }}
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
                            <View className="w-40 h-40 rounded-3xl items-center justify-center" style={{ backgroundColor: colors.bg }}>
                                <Text style={{ color: colors.textMuted }}>{t('productNoPhoto')}</Text>
                            </View>
                        )}

                        <Text className="text-2xl font-bold mt-6 text-center" style={{ color: colors.text }}>
                            {product.name || t('productUnknownName')}
                        </Text>
                        <Text className="text-sm font-medium mt-1" style={{ color: colors.textSub }}>
                            {product.brand || t('productUnknownBrand')}
                        </Text>
                    </View>
                </View>

                <View className="px-6 mt-8">
                    {/* Safety Score Card - animated ring */}
                    <View className={`p-6 rounded-3xl border ${scoreColors.border} ${scoreColors.bg} items-center mb-8 shadow-sm`}>
                        <Text className={`text-xs font-bold ${scoreColors.text} opacity-70 uppercase tracking-widest mb-5`}>
                            {t('productScoreLabel')}
                        </Text>
                        <AnimatedScoreRing score={safetyScore} />
                    </View>

                    {scoreCapReason && (
                        <View className="rounded-3xl p-4 mb-6 border" style={{ backgroundColor: '#FFF7ED', borderColor: '#FDBA74' }}>
                            <Text className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#C2410C' }}>
                                {lang === 'en' ? 'Score explanation' : 'Explicarea scorului'}
                            </Text>
                            <Text className="text-sm leading-relaxed" style={{ color: '#9A3412' }}>
                                {scoreCap <= 20 && scoreCapIngredient
                                    ? (lang === 'en'
                                        ? `Score limited to ${scoreCap} because of the banned ingredient: ${scoreCapIngredient}.`
                                        : `Scor limitat la ${scoreCap} din cauza ingredientului interzis: ${scoreCapIngredient}.`)
                                    : scoreCapReason}
                            </Text>
                        </View>
                    )}

                    {greenwashingAlert?.flagged && (
                        <View className="rounded-3xl p-4 mb-6 border" style={{ backgroundColor: '#FFF1F2', borderColor: '#FDA4AF' }}>
                            <Text className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#BE185D' }}>
                                {lang === 'en' ? 'Potential greenwashing' : 'Posibil greenwashing'}
                            </Text>
                            <Text className="text-sm leading-relaxed mb-2" style={{ color: '#9D174D' }}>
                                {lang === 'en' ? greenwashingAlert.messageEn : greenwashingAlert.messageRo}
                            </Text>
                            <Text className="text-xs" style={{ color: '#BE185D' }}>
                                {lang === 'en'
                                    ? `Risky ingredients: ${greenwashingAlert.triggerIngredients.join(', ')}`
                                    : `Ingrediente problematice: ${greenwashingAlert.triggerIngredients.join(', ')}`}
                            </Text>
                        </View>
                    )}

                    {/* Personal Warnings - afisate doar daca userul are cont */}
                    {!isGuest && product.analysis?.personalWarnings?.length > 0 && (
                        <View className="bg-rose-50 border border-rose-200 rounded-3xl p-5 mb-6">
                            <Text className="text-rose-700 font-bold text-sm uppercase tracking-widest mb-3">
                                {t('productPersonalAlerts')}
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
                                    {t('productScoreAdjustedPre')}{product.analysis.baseSafetyScore}{t('productScoreAdjustedMid')}{product.analysis.safetyScore}{t('productScoreAdjustedPost')}
                                </Text>
                            )}
                        </View>
                    )}

                    {/* General Warnings */}
                    {product.analysis?.warnings?.length > 0 && (
                        <View className="bg-amber-50 border border-amber-200 rounded-3xl p-5 mb-6">
                            <Text className="text-amber-700 font-bold text-sm uppercase tracking-widest mb-3">
                                {t('productWarnings')}
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

                    {/* Ingredient analytics - only for logged in users */}
                    {!isGuest && product.analysis?.ingredientsBreakdown?.length > 0 && (
                        <IngredientInsightCharts
                            ingredients={product.analysis.ingredientsBreakdown}
                            colors={colors}
                            lang={lang}
                            productScore={safetyScore}
                            skinType={userProfile.skinType}
                        />
                    )}

                    {/* AI Chat Prompt - only for logged in users */}
                    {!isGuest && (
                        <View className="p-6 rounded-3xl shadow-md mb-8 items-center" style={{ backgroundColor: colors.card }}>
                            <Text className="text-center font-medium mb-4 leading-relaxed" style={{ color: colors.textSub }}>
                                {t('productChatPrompt')}
                            </Text>
                            <Button
                                title={t('productChatBtn')}
                                onPress={() => navigation.navigate('Chat', { product })}
                                variant="outline"
                            />
                        </View>
                    )}

                    {/* Ingredients Breakdown - only for logged in users */}
                    {!isGuest && (
                        <>
                            <Text className="text-xl font-bold mb-4 ml-2" style={{ color: colors.text }}>{t('productIngredientsTitle')}</Text>

                            <View className="rounded-3xl shadow-md p-6" style={{ backgroundColor: colors.card }}>
                                {product.analysis?.ingredientsBreakdown && product.analysis.ingredientsBreakdown.length > 0 ? (
                                    product.analysis.ingredientsBreakdown.map((item, index) => {
                                        const itemColor = getScoreColor(100 - (item.riskLevel * 20));

                                        return (
                                            <View key={index} className="flex-row items-center justify-between py-3 border-b border-brand-50 last:border-0">
                                                <View className="flex-1 pr-4">
                                                    <Text className="font-medium" numberOfLines={1} style={{ color: colors.text }}>
                                                        {item.name}
                                                    </Text>
                                                    {item.description && (
                                                        <Text className="text-xs mt-1" numberOfLines={2} style={{ color: colors.textSub }}>
                                                            {item.description}
                                                        </Text>
                                                    )}
                                                </View>
                                                <View className={`px-3 py-1 rounded-full ${itemColor.bg} border ${itemColor.border}`}>
                                                    <Text className={`text-xs font-bold ${itemColor.text}`}>
                                                        {item.riskLevel === 0 ? t('productIngredientSafe') : `${t('productIngredientLevel')} ${item.riskLevel}`}
                                                    </Text>
                                                </View>
                                            </View>
                                        );
                                    })
                                ) : (
                                    <Text className="italic text-center py-4" style={{ color: colors.textMuted }}>
                                        {t('productNoAnalysis')}
                                    </Text>
                                )}
                            </View>
                        </>
                    )}

                    {isGuest && (
                        <View className="rounded-3xl p-5 mb-6" style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
                            <Text className="text-center font-medium" style={{ color: colors.textSub }}>
                                {lang === 'en'
                                    ? 'Guest mode shows only the safety score. Create an account to see detailed analysis, history and personalized warnings.'
                                    : 'Modul vizitator afișează doar scorul de siguranță. Creează un cont pentru analiză detaliată, istoric și avertismente personalizate.'}
                            </Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
