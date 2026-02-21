import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Layout from '../components/Layout';
import Button from '../components/Button';
import { API_BASE_URL } from '../lib/api';

export default function ManualAddScreen({ originalBarcode, onBack, onProductAdded }) {
    const [name, setName] = useState('');
    const [brand, setBrand] = useState('');
    const [imageUri, setImageUri] = useState(null);
    const [base64Image, setBase64Image] = useState(null);
    const [loading, setLoading] = useState(false);

    const pickImage = async () => {
        // Cere permisiuni
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Eroare', 'Avem nevoie de acces la camera pentru a citi ingredientele.');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true, // ii va permite userului sa taie doar lista
            quality: 0.8,
            base64: true, // FOARTE IMPORTANT pentru Gemini
        });

        if (!result.canceled) {
            setImageUri(result.assets[0].uri);
            setBase64Image(result.assets[0].base64);
        }
    };

    const handleSubmit = async () => {
        if (!name.trim()) {
            Alert.alert('Eroare', 'Te rog sa introduci numele produsului.');
            return;
        }
        if (!base64Image) {
            Alert.alert('Eroare', 'Te rog sa faci o poza la lista de ingrediente.');
            return;
        }

        try {
            setLoading(true);

            // Fetch to our new backend OCR endpoint
            const response = await fetch(`${API_BASE_URL}/products/manual`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    barcode: originalBarcode, // Salvam codul de bare real in DB
                    name: name.trim(),
                    brand: brand.trim(),
                    base64Image: base64Image,
                    mimeType: 'image/jpeg',
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'A aparut o eroare la salvarea produsului');
            }

            Alert.alert('Succes!', 'Produsul a fost citit de AI si salvat cu succes!');

            // Trimitem codul de bare fals inapoi ca sa deschida ProductScreen
            if (onProductAdded && data.barcode) {
                onProductAdded(data.barcode);
            }

        } catch (error) {
            console.error('Eroare la adaugarea manuala:', error);
            Alert.alert('Eroare', error.message || 'Nu am putut adauga produsul.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Layout className="justify-center items-center">
                <ActivityIndicator size="large" color="#FDA4AF" />
                <Text className="text-brand-400 mt-4 font-medium text-center px-6">
                    Inteligența Artificială Google Gemini extrage și analizează ingredientele din poză... 🤖📖
                </Text>
            </Layout>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
        >
            <ScrollView className="flex-1 bg-brand-50" contentContainerStyle={{ padding: 24, paddingBottom: 60, paddingTop: 40 }}>

                <Text className="text-3xl font-bold text-brand-900 mb-2">Adauga Produs</Text>
                <Text className="text-brand-500 mb-8 leading-relaxed">
                    Ajută comunitatea introducând acest produs. AI-ul nostru va citi pozele tale și va calcula scorul automat!
                </Text>

                <View className="bg-white p-6 rounded-3xl shadow-brand-100 shadow-xl mb-6">

                    <Text className="text-sm font-bold text-brand-700 uppercase tracking-wider mb-2">1. Detalii</Text>

                    <View className="mb-4">
                        <Text className="text-brand-500 font-medium mb-1 ml-1">Nume Produs *</Text>
                        <TextInput
                            className="bg-brand-50 border border-brand-100 rounded-2xl px-4 py-3 text-brand-900"
                            placeholder="ex: Aslavital Crema Lift"
                            value={name}
                            onChangeText={setName}
                        />
                    </View>

                    <View className="mb-6">
                        <Text className="text-brand-500 font-medium mb-1 ml-1">Brand (optional)</Text>
                        <TextInput
                            className="bg-brand-50 border border-brand-100 rounded-2xl px-4 py-3 text-brand-900"
                            placeholder="ex: Farmec"
                            value={brand}
                            onChangeText={setBrand}
                        />
                    </View>

                    <Text className="text-sm font-bold text-brand-700 uppercase tracking-wider mb-2 mt-4">2. Ingrediente *</Text>
                    <Text className="text-xs text-brand-400 mb-4 ml-1">
                        Pentru a analiza toxicitatea, avem nevoie de o poză clară exclusiv cu secțiunea "Ingredients" (INCI) de pe spatele ambalajului.
                    </Text>

                    {imageUri ? (
                        <View className="items-center mb-6">
                            <Image source={{ uri: imageUri }} className="w-full h-48 rounded-2xl mb-3 border border-brand-200" />
                            <Button title="Reface Poza" onPress={pickImage} variant="outline" className="w-full" />
                        </View>
                    ) : (
                        <View className="mb-6">
                            <Button
                                title="📸 Pozează Lista de Ingrediente"
                                onPress={pickImage}
                            />
                        </View>
                    )}
                </View>

                <View className="gap-y-4">
                    <Button
                        title="✨ Adauga in Baza de Date"
                        onPress={handleSubmit}
                        disabled={!name.trim() || !base64Image}
                    />
                    <Button
                        title="Anuleaza"
                        variant="ghost"
                        onPress={onBack}
                    />
                </View>

            </ScrollView>
        </KeyboardAvoidingView>
    );
}
