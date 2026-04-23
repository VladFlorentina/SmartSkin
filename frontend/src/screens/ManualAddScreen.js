import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Layout from '../components/Layout';
import Button from '../components/Button';
import { API_BASE_URL } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useApp } from '../lib/AppContext';

// Detecteaza tipul MIME real al imaginii dupa extensia URI-ului
function detectMimeType(uri) {
    const ext = (uri || '').split('.').pop().toLowerCase().split('?')[0];
    if (ext === 'png') return 'image/png';
    if (ext === 'webp') return 'image/webp';
    if (ext === 'heic' || ext === 'heif') return 'image/jpeg'; // iOS HEIC -> trimis ca JPEG de Expo
    return 'image/jpeg'; // default sigur
}

export default function ManualAddScreen({ navigation, route }) {
    const { barcode: originalBarcode, prefillName, prefillBrand } = route.params || {};
    const [name, setName] = useState(prefillName || '');
    const [brand, setBrand] = useState(prefillBrand || '');
    const [imageUri, setImageUri] = useState(null);
    const [base64Image, setBase64Image] = useState(null);
    const [mimeType, setMimeType] = useState('image/jpeg');
    const [loading, setLoading] = useState(false);
    const [loadingStep, setLoadingStep] = useState(0);
    const { t, colors, lang } = useApp();

    React.useEffect(() => {
        let interval;
        if (loading) {
            setLoadingStep(0);
            interval = setInterval(() => {
                setLoadingStep(prev => (prev < 2 ? prev + 1 : prev));
            }, 4000);
        }
        return () => clearInterval(interval);
    }, [loading]);

    const pickImage = async () => {
        Alert.alert(
            t('scannerPickSource'),
            t('scannerPickSourceMsg'),
            [
                {
                    text: t('scannerCamera'),
                    onPress: () => launchSource('camera'),
                },
                {
                    text: t('scannerGallery'),
                    onPress: () => launchSource('gallery'),
                },
                { text: t('scannerCancel'), style: 'cancel' },
            ]
        );
    };

    const launchSource = async (source) => {
        try {
            if (source === 'camera') {
                const { status } = await ImagePicker.requestCameraPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert(t('errorTitle'), t('manualErrCamera'));
                    return;
                }
                const result = await ImagePicker.launchCameraAsync({
                    mediaTypes: ['images'],
                    allowsEditing: true,
                    quality: 0.8,
                    base64: true,
                });
                if (!result.canceled) {
                    const uri = result.assets[0].uri;
                    setImageUri(uri);
                    setBase64Image(result.assets[0].base64);
                    setMimeType(detectMimeType(uri));
                }
            } else {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert(t('errorTitle'), t('errGalleryPerm'));
                    return;
                }
                const result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ['images'],
                    allowsEditing: true,
                    quality: 0.8,
                    base64: true,
                });
                if (!result.canceled) {
                    const uri = result.assets[0].uri;
                    setImageUri(uri);
                    setBase64Image(result.assets[0].base64);
                    setMimeType(detectMimeType(uri));
                }
            }
        } catch (err) {
            console.error('ImagePicker error:', err);
            Alert.alert(t('errorTitle'), err.message || t('manualErrImagePick'));
        }
    };

    const handleSubmit = async () => {
        if (!name.trim()) {
            Alert.alert(t('errorTitle'), t('manualErrNoName'));
            return;
        }
        if (!base64Image) {
            Alert.alert(t('errorTitle'), t('manualErrNoPhoto'));
            return;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000);

        try {
            setLoading(true);

            // Obtine token-ul JWT al utilizatorului autentificat
            const { data: { session } } = await supabase.auth.getSession();
            const authHeader = session ? { 'Authorization': `Bearer ${session.access_token}` } : {};

            // Fetch to our new backend OCR endpoint
            const response = await fetch(`${API_BASE_URL}/products/manual`, {
                method: 'POST',
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                    ...authHeader,
                },
                body: JSON.stringify({
                    barcode: originalBarcode,
                    name: name.trim(),
                    brand: brand.trim(),
                    base64Image: base64Image,
                    mimeType: mimeType,
                    lang: lang,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || t('manualErrGeneric'));
            }

            Alert.alert(t('manualSuccessTitle'), t('manualSuccessMsg'));

            // Navigheaza la ProductScreen cu barcode-ul salvat
            if (data.barcode) {
                navigation.replace('Product', { barcode: data.barcode });
            }

        } catch (error) {
            if (error.name === 'AbortError') {
                Alert.alert(t('errorTitle'), t('manualErrTimeout'));
            } else {
                console.error('Eroare la adaugarea manuala:', error);
                Alert.alert(t('errorTitle'), error.message || t('manualErrGeneric'));
            }
        } finally {
            clearTimeout(timeoutId);
            setLoading(false);
        }
    };

    if (loading) {
        const loadingMessages = lang === 'en'
            ? ["Uploading image securely...", "Extracting text from label...", "Analyzing toxicity details..."]
            : ["Încărcăm imaginea securizat...", "Extragem textul de pe etichetă...", "Analizăm toxicitatea detaliat..."];

        return (
            <Layout className="justify-center items-center">
                <ActivityIndicator size="large" color={colors.primary} />
                <Text className="mt-4 font-medium text-center px-6" style={{ color: colors.textSub }}>
                    {loadingMessages[loadingStep]}
                </Text>
            </Layout>
        );
    }

    return (
        <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={0} style={{ flex: 1 }}>
            <ScrollView className="flex-1" style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: 24, paddingBottom: 60, paddingTop: 40 }}>

                <Text className="text-3xl font-bold mb-2" style={{ color: colors.text }}>{t('manualTitle')}</Text>
                <Text className="mb-8 leading-relaxed" style={{ color: colors.textSub }}>{t('manualSub')}</Text>

                <View className="p-6 rounded-3xl shadow-xl mb-6" style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>

                    <Text className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: colors.textSub }}>{t('manualStep1')}</Text>

                    <View className="mb-4">
                        <Text className="font-medium mb-1 ml-1" style={{ color: colors.textSub }}>{t('manualNameLabel')}</Text>
                        <TextInput
                            className="border rounded-2xl px-4 py-3"
                            style={{ backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.inputText }}
                            placeholder={t('manualNamePlaceholder')}
                            placeholderTextColor={colors.placeholder}
                            value={name}
                            onChangeText={setName}
                        />
                    </View>

                    <View className="mb-6">
                        <Text className="font-medium mb-1 ml-1" style={{ color: colors.textSub }}>{t('manualBrandLabel')}</Text>
                        <TextInput
                            className="border rounded-2xl px-4 py-3"
                            style={{ backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.inputText }}
                            placeholder={t('manualBrandPlaceholder')}
                            placeholderTextColor={colors.placeholder}
                            value={brand}
                            onChangeText={setBrand}
                        />
                    </View>

                    <Text className="text-sm font-bold uppercase tracking-wider mb-2 mt-4" style={{ color: colors.textSub }}>{t('manualStep2')}</Text>
                    <Text className="text-xs mb-4 ml-1" style={{ color: colors.textMuted }}>{t('manualIngredientsDesc')}</Text>

                    {imageUri ? (
                        <View className="items-center mb-6">
                            <Image source={{ uri: imageUri }} className="w-full h-48 rounded-2xl mb-3" style={{ borderWidth: 1, borderColor: colors.border }} />
                            <Button title={t('manualRetakePhoto')} onPress={pickImage} variant="outline" className="w-full" />
                        </View>
                    ) : (
                        <View className="mb-6">
                            <Button title={t('manualAddPhotoBtn')} onPress={pickImage} />
                        </View>
                    )}
                </View>

                <View className="gap-y-4">
                    <Button title={t('manualSubmitBtn')} onPress={handleSubmit} disabled={!name.trim() || !base64Image} />
                    <Button title={t('manualCancelBtn')} variant="ghost" onPress={() => navigation.goBack()} />
                </View>

            </ScrollView>
        </KeyboardAvoidingView>
    );
}
