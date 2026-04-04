import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect } from '@react-navigation/native';
import Button from '../components/Button';
import { useApp } from '../lib/AppContext';

export default function ScannerScreen({ navigation }) {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const { t, colors } = useApp();

    // Reseteaza scanner-ul cand user-ul revine pe acest ecran
    useFocusEffect(
        useCallback(() => {
            setScanned(false);
        }, [])
    );

    // If permissions are still loading
    if (!permission) {
        return <View className="flex-1" style={{ backgroundColor: colors.bg }} />;
    }

    // If permission not granted
    if (!permission.granted) {
        return (
            <View className="flex-1 items-center justify-center p-6" style={{ backgroundColor: colors.bg }}>
                <Text className="text-xl font-bold mb-4 text-center" style={{ color: colors.text }}>
                    {t('scannerPermissionText')}
                </Text>
                <View className="w-full mb-4 px-4">
                    <Button
                        title={lang === 'en' ? "Open Settings" : "Deschide Setările"}
                        onPress={() => Linking.openSettings()}
                    />
                </View>
                <View className="mb-4 w-full px-4">
                    <Button
                        title={t('scannerAllow') || (lang === 'en' ? "Request again" : "Cere din nou")}
                        onPress={requestPermission}
                        variant="outline"
                    />
                </View>
                <View className="mt-4">
                    <Button
                        title={t('scannerBack')}
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
            />
            {/* Overlay - separat de CameraView pentru a evita warning-ul */}
            <View style={StyleSheet.absoluteFillObject} className="flex-row justify-between p-12">
                <TouchableOpacity
                    className="p-3 bg-white/20 rounded-full w-24 items-center self-start"
                    onPress={() => navigation.navigate('Home')}
                >
                    <Text className="text-white font-bold text-sm">{t('scannerHome')}</Text>
                </TouchableOpacity>
                <View className="flex-row self-start" style={{ gap: 8 }}>
                    <TouchableOpacity
                        className="p-3 bg-brand-500/80 rounded-full px-5 flex-row items-center"
                        onPress={() => navigation.navigate('Profile')}
                    >
                        <Text className="text-white font-bold text-sm">👤 {t('scannerProfile')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        className="p-3 bg-brand-500 rounded-full px-5 flex-row items-center"
                        onPress={() => navigation.navigate('History')}
                    >
                        <Text className="text-white font-bold text-sm">📚 {t('scannerHistory')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
            <View className="absolute bottom-16 w-full items-center">
                <View className="bg-white/80 px-6 py-3 rounded-2xl">
                    <Text className="text-brand-900 font-bold">
                        {t('scannerHint')}
                    </Text>
                </View>
            </View>
            {scanned && (
                <View className="absolute bottom-0 w-full p-6 bg-white rounded-t-3xl shadow-xl">
                    <Button title={t('scannerRescan')} onPress={() => setScanned(false)} />
                </View>
            )}
        </View>
    );
}
