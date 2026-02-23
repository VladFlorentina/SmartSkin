import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect } from '@react-navigation/native';
import Button from '../components/Button';

export default function ScannerScreen({ navigation }) {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);

    // Reseteaza scanner-ul cand user-ul revine pe acest ecran
    useFocusEffect(
        useCallback(() => {
            setScanned(false);
        }, [])
    );

    // If permissions are still loading
    if (!permission) {
        return <View className="flex-1 bg-brand-50" />;
    }

    // If permission not granted
    if (!permission.granted) {
        return (
            <View className="flex-1 items-center justify-center p-6 bg-brand-50">
                <Text className="text-xl font-bold text-brand-900 mb-4 text-center">
                    Avem nevoie de acces la camera pentru a scana produse.
                </Text>
                <Button
                    title="Permite Accesul"
                    onPress={requestPermission}
                />
                <View className="mt-4">
                    <Button
                        title="Inapoi"
                        onPress={() => navigation.navigate('Home')}
                        variant="ghost"
                    />
                </View>
            </View>
        );
    }

    const handleBarcodeScanned = ({ type, data }) => {
        setScanned(true);
        navigation.navigate('Product', { barcode: data });
    };

    return (
        <View className="flex-1 bg-black">
            <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                barcodeScannerSettings={{
                    barcodeTypes: ["ean13", "ean8", "qr", "upc_a", "upc_e"],
                }}
            >
                <View className="flex-1 bg-transparent flex-row justify-between p-12">
                    {/* Overlay top items */}
                    <TouchableOpacity
                        className="p-3 bg-white/20 rounded-full w-24 items-center self-start"
                        onPress={() => navigation.navigate('Home')}
                    >
                        <Text className="text-white font-bold text-sm">Acasa</Text>
                    </TouchableOpacity>
                    <View className="flex-row self-start" style={{ gap: 8 }}>
                        <TouchableOpacity
                            className="p-3 bg-brand-500/80 rounded-full px-5 flex-row items-center"
                            onPress={() => navigation.navigate('Profile')}
                        >
                            <Text className="text-white font-bold text-sm">👤 Profil</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className="p-3 bg-brand-500 rounded-full px-5 flex-row items-center"
                            onPress={() => navigation.navigate('History')}
                        >
                            <Text className="text-white font-bold text-sm">📚 Istoric</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                <View className="absolute bottom-16 w-full items-center">
                    <View className="bg-white/80 px-6 py-3 rounded-2xl">
                        <Text className="text-brand-900 font-bold">
                            Indreapta camera spre codul de bare
                        </Text>
                    </View>
                </View>
            </CameraView>
            {scanned && (
                <View className="absolute bottom-0 w-full p-6 bg-white rounded-t-3xl shadow-xl">
                    <Button title="Scaneaza din nou" onPress={() => setScanned(false)} />
                </View>
            )}
        </View>
    );
}
