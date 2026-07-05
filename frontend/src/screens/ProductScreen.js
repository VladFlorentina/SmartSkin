import React, { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, ActivityIndicator, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { fetchProductDetails, saveToUserHistory, reportProductIssue } from '../lib/api';
import { supabase } from '../lib/supabase';
import Button from '../components/Button';
import { Ionicons } from '@expo/vector-icons';
import AnimatedScoreRing from '../components/AnimatedScoreRing';
import IngredientInsightCharts from '../components/IngredientInsightCharts';
import { useApp } from '../lib/AppContext';
import Toast from 'react-native-toast-message';

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

    // State for Report Modal
    const [reportModalVisible, setReportModalVisible] = useState(false);
    const [issueCategory, setIssueCategory] = useState('');
    const [userComment, setUserComment] = useState('');
    const [reporting, setReporting] = useState(false);

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

    // Color logic based on score - using dynamic earthy theme
    const getScoreStyle = (score) => {
        if (score >= 80) return { bg: colors.primaryLight, text: colors.primary, border: colors.primary };
        if (score >= 40) return { bg: colors.bg, text: colors.textSub, border: colors.border };
        return { bg: colors.card, text: colors.text, border: colors.text };
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center" style={{ backgroundColor: colors.bg }}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text className="mt-4 font-medium" style={{ color: colors.textSub }}>{t('productLoading')}</Text>
            </View>
        );
    }

    if (isOffline) {
        return (
            <View className="flex-1 justify-center items-center px-6" style={{ backgroundColor: colors.bg }}>
                <Ionicons name={isOffline === 'timeout' ? 'time-outline' : 'wifi-outline'} size={64} color={colors.primary} style={{ marginBottom: 16 }} />
                <Text className="text-2xl font-bold text-center mb-3" style={{ color: colors.text }}>
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
            </View>
        );
    }

    if (notFound) {
        return (
            <View className="flex-1 pt-16 px-6" style={{ backgroundColor: colors.bg }}>
                <View className="items-center justify-center flex-1">
                    <Ionicons name="camera-outline" size={64} color={colors.primary} style={{ marginBottom: 16 }} />
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
                            {t('productNewHint')}
                        </Text>
                    </View>

                    <View className="w-full gap-y-4">
                        <Button
                            title={t('productScanLabelBtn')}
                            onPress={() => {
                                if (isGuest) {
                                    Alert.alert(
                                        'Cont necesar',
                                        'Pentru a adauga produse manual trebuie sa te autentifici.'
                                    );
                                    return;
                                }
                                navigation.replace('ManualAdd', {
                                    barcode: ocrMetadata?.barcode || barcode,
                                    prefillName: ocrMetadata?.name || '',
                                    prefillBrand: ocrMetadata?.brand || '',
                                });
                            }}
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
            <View className="flex-1 justify-center items-center px-6" style={{ backgroundColor: colors.bg }}>
                <Ionicons name="alert-circle-outline" size={64} color={colors.primary} style={{ marginBottom: 16 }} />
                <Text className="text-lg font-bold text-center mb-6" style={{ color: colors.text }}>
                    Nu am putut incarca produsul.
                </Text>
                <Button title="Inapoi" onPress={() => navigation.goBack()} />
            </View>
        );
    }

    const safetyScore = product.analysis?.safetyScore || 0;
    const scoreStyle = getScoreStyle(safetyScore);
    const scoreCapReason = product.analysis?.scoreCapReason;
    const scoreCap = product.analysis?.scoreCap;
    const scoreCapIngredient = product.analysis?.scoreCapIngredient;
    const greenwashingAlert = product.analysis?.greenwashingAlert;

    // Helper pt stergerea emoji-urilor trimise de backend
    const stripEmojis = (str) => {
        if (!str) return '';
        return str.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/gu, '')
                  .replace(/[🔴🚫⚠️]/g, '')
                  .trim();
    };

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
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>

                    <View className="items-center mt-6">
                        {product.imageUrl || product.image_url ? (
                            <Image
                                source={{ uri: product.imageUrl || product.image_url }}
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
                    <View className="p-6 rounded-3xl border items-center mb-8 shadow-sm" style={{ backgroundColor: scoreStyle.bg, borderColor: scoreStyle.border }}>
                        <Text className="text-xs font-bold opacity-70 uppercase tracking-widest mb-5" style={{ color: scoreStyle.text }}>
                            {t('productScoreLabel')}
                        </Text>
                        <AnimatedScoreRing score={safetyScore} />
                    </View>

                    {scoreCapReason && (
                        <View className="rounded-3xl p-5 mb-6 border" style={{ backgroundColor: colors.bg, borderColor: colors.border }}>
                            <Text className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: colors.primary }}>
                                {lang === 'en' ? 'Score explanation' : 'Explicarea scorului'}
                            </Text>
                            <Text className="text-sm leading-relaxed" style={{ color: colors.textSub }}>
                                {scoreCap <= 20 && scoreCapIngredient
                                    ? (lang === 'en'
                                        ? `Score limited to ${scoreCap} because of the banned ingredient: ${scoreCapIngredient}.`
                                        : `Scor limitat la ${scoreCap} din cauza ingredientului interzis: ${scoreCapIngredient}.`)
                                    : scoreCapReason}
                            </Text>
                        </View>
                    )}

                    {greenwashingAlert?.flagged && (
                        <View className="rounded-3xl p-5 mb-6 border" style={{ backgroundColor: colors.primaryLight, borderColor: colors.primary }}>
                            <Text className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: colors.primary }}>
                                {lang === 'en' ? 'Potential greenwashing' : 'Posibil greenwashing'}
                            </Text>
                            <Text className="text-sm leading-relaxed mb-2" style={{ color: colors.text }}>
                                {lang === 'en' ? greenwashingAlert.messageEn : greenwashingAlert.messageRo}
                            </Text>
                            <Text className="text-xs" style={{ color: colors.textSub }}>
                                {lang === 'en'
                                    ? `Risky ingredients: ${greenwashingAlert.triggerIngredients.join(', ')}`
                                    : `Ingrediente problematice: ${greenwashingAlert.triggerIngredients.join(', ')}`}
                            </Text>
                        </View>
                    )}

                    {/* Personal Warnings - afisate doar daca userul are cont */}
                    {!isGuest && product.analysis?.personalWarnings?.length > 0 && (
                        <View className="border rounded-3xl p-5 mb-6" style={{ backgroundColor: colors.bg, borderColor: colors.border }}>
                            <Text className="font-bold text-sm uppercase tracking-widest mb-3" style={{ color: colors.primary }}>
                                {t('productPersonalAlerts')}
                            </Text>
                            {product.analysis.personalWarnings.map((warning, index) => (
                                <View key={index} className="flex-row items-start mb-2 last:mb-0">
                                    <Ionicons name="alert-circle" size={16} color={colors.primary} style={{ marginTop: 2, marginRight: 8 }} />
                                    <Text className="text-sm flex-1 leading-relaxed" style={{ color: colors.text }}>
                                        {stripEmojis(warning)}
                                    </Text>
                                </View>
                            ))}
                            {product.analysis.isPersonalized && product.analysis.baseSafetyScore !== product.analysis.safetyScore && (
                                <Text className="text-xs mt-3 italic" style={{ color: colors.textSub }}>
                                    {t('productScoreAdjustedPre')}{product.analysis.baseSafetyScore}{t('productScoreAdjustedMid')}{product.analysis.safetyScore}{t('productScoreAdjustedPost')}
                                </Text>
                            )}
                        </View>
                    )}

                    {/* General Warnings */}
                    {product.analysis?.warnings?.length > 0 && (
                        <View className="border rounded-3xl p-5 mb-6" style={{ backgroundColor: colors.bg, borderColor: colors.border }}>
                            <Text className="font-bold text-sm uppercase tracking-widest mb-3" style={{ color: colors.text }}>
                                {t('productWarnings')}
                            </Text>
                            {product.analysis.warnings.map((warning, index) => (
                                <View key={index} className="flex-row items-start mb-2 last:mb-0">
                                    <Ionicons name="warning" size={16} color={colors.primary} style={{ marginTop: 2, marginRight: 8 }} />
                                    <Text className="text-sm flex-1 leading-relaxed" style={{ color: colors.text }}>
                                        {stripEmojis(warning)}
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
                        <View className="p-6 rounded-3xl shadow-md mb-8 items-center" style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
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

                            <View className="rounded-3xl shadow-md p-6 border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                                {product.analysis?.ingredientsBreakdown && product.analysis.ingredientsBreakdown.length > 0 ? (
                                    product.analysis.ingredientsBreakdown.map((item, index) => {
                                        return (
                                            <View key={index} className="flex-row items-center justify-between py-4 border-b last:border-0" style={{ borderColor: colors.border }}>
                                                <View className="flex-1 pr-4">
                                                    <Text className="font-bold" numberOfLines={1} style={{ color: colors.text }}>
                                                        {item.name}
                                                    </Text>
                                                    {item.description && (
                                                        <Text className="text-xs mt-1" numberOfLines={2} style={{ color: colors.textSub }}>
                                                            {item.description}
                                                        </Text>
                                                    )}
                                                </View>
                                                <View className="px-3 py-1.5 rounded-xl border" style={{ backgroundColor: item.riskLevel === 0 ? colors.bg : colors.primaryLight, borderColor: item.riskLevel === 0 ? colors.border : colors.primary }}>
                                                    <Text className="text-xs font-bold" style={{ color: item.riskLevel === 0 ? colors.textSub : colors.primary }}>
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

                    {/* Report Button (Bottom of screen) */}
                    {!isGuest && !route.params?.fromAdmin && (
                        <TouchableOpacity 
                            onPress={() => setReportModalVisible(true)}
                            className="mt-6 mb-4 flex-row justify-center items-center py-3 rounded-2xl"
                            style={{ backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}
                        >
                            <Ionicons name="warning-outline" size={18} color={colors.textSub} />
                            <Text className="ml-2 font-medium" style={{ color: colors.textSub }}>Raportează o problemă cu acest produs</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>

            {/* Report Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={reportModalVisible}
                onRequestClose={() => setReportModalVisible(false)}
            >
                <View className="flex-1 justify-center items-center px-6" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <View className="w-full p-6 rounded-3xl" style={{ backgroundColor: colors.card }}>
                        <Text className="text-xl font-bold mb-4" style={{ color: colors.text }}>Raportează o problemă</Text>
                        
                        <Text className="text-sm font-medium mb-2" style={{ color: colors.textSub }}>Categorie</Text>
                        <TextInput 
                            className="border rounded-xl p-3 mb-4"
                            style={{ borderColor: colors.border, color: colors.text, backgroundColor: colors.bg }}
                            placeholder="ex: Ingrediente Greșite, Scor Fals"
                            placeholderTextColor={colors.textMuted}
                            value={issueCategory}
                            onChangeText={setIssueCategory}
                        />

                        <Text className="text-sm font-medium mb-2" style={{ color: colors.textSub }}>Detalii</Text>
                        <TextInput 
                            className="border rounded-xl p-3 mb-6"
                            style={{ borderColor: colors.border, color: colors.text, backgroundColor: colors.bg, minHeight: 80 }}
                            placeholder="Descrie problema observată..."
                            placeholderTextColor={colors.textMuted}
                            multiline
                            textAlignVertical="top"
                            value={userComment}
                            onChangeText={setUserComment}
                        />

                        <View className="flex-row justify-end gap-x-3">
                            <TouchableOpacity 
                                onPress={() => setReportModalVisible(false)}
                                className="px-4 py-2 rounded-xl border"
                                style={{ borderColor: colors.border }}
                                disabled={reporting}
                            >
                                <Text style={{ color: colors.textSub }}>Anulează</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                onPress={async () => {
                                    if(!issueCategory.trim()) {
                                        Toast.show({ type: 'error', text1: 'Eroare', text2: 'Te rugăm să specifici categoria problemei.' });
                                        return;
                                    }
                                    try {
                                        setReporting(true);
                                        await reportProductIssue(product.id, issueCategory, userComment);
                                        setReportModalVisible(false);
                                        setIssueCategory('');
                                        setUserComment('');
                                        Toast.show({ type: 'success', text1: 'Succes', text2: 'Raportul a fost trimis! Mulțumim.' });
                                    } catch(e) {
                                        Toast.show({ type: 'error', text1: 'Eroare', text2: 'Nu am putut trimite raportul.' });
                                    } finally {
                                        setReporting(false);
                                    }
                                }}
                                className="px-4 py-2 rounded-xl justify-center items-center min-w-[80px]"
                                style={{ backgroundColor: colors.primary }}
                                disabled={reporting}
                            >
                                {reporting ? <ActivityIndicator color="#fff" size="small" /> : <Text className="font-bold text-white">Trimite</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
