import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Button from '../components/Button';
import { useApp } from '../lib/AppContext';

export default function ScannerScreen({ navigation }) {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const isFocused = useIsFocused();
    const { t, colors, lang, isGuest, setIsGuest } = useApp();

    // Reseteaza scanner-ul cand user-ul revine pe acest ecran
    useFocusEffect(
        useCallback(() => {
            setScanned(false);
        }, [])
    );

    // If permissions are still loading
    if (!permission) {
        return (
            <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.bg }}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text className="mt-4 font-medium" style={{ color: colors.textSub }}>
                    {lang === 'en' ? 'Loading camera permissions...' : 'Se incarca permisiunile camerei...'}
                </Text>
            </View>
        );
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
                        onPress={() => setIsGuest(false)}
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
            {isFocused && (
                <CameraView
                    style={StyleSheet.absoluteFillObject}
                    facing="back"
                    onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                    barcodeScannerSettings={{
                        barcodeTypes: ["ean13", "ean8", "qr", "upc_a", "upc_e"],
                    }}
                />
            )}
            {/* Overlay - separat de CameraView pentru a evita warning-ul */}
            {!isGuest ? (
                <View style={StyleSheet.absoluteFillObject} className="flex-row justify-between p-12 z-10" pointerEvents="box-none">
                    <TouchableOpacity
                        className="p-3 bg-white/20 rounded-full w-24 items-center justify-center flex-row self-start"
                        onPress={() => navigation.navigate('MainTabs', { screen: 'HomeTab' })}
                    >
                        <Ionicons name="home" size={16} color="white" style={{ marginRight: 6 }} />
                        <Text className="text-white font-bold text-sm">{t('scannerHome')}</Text>
                    </TouchableOpacity>
                    <View className="flex-row self-start" style={{ gap: 8 }}>
                        <TouchableOpacity
                            className="p-3 rounded-full px-5 flex-row items-center justify-center"
                            style={{ backgroundColor: colors.primary + 'CC' }} // 80% opacity
                            onPress={() => navigation.navigate('MainTabs', { screen: 'ProfileTab' })}
                        >
                            <Ionicons name="person" size={16} color="white" style={{ marginRight: 6 }} />
                            <Text className="text-white font-bold text-sm">{t('scannerProfile')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className="p-3 rounded-full px-5 flex-row items-center justify-center"
                            style={{ backgroundColor: colors.primary }}
                            onPress={() => navigation.navigate('MainTabs', { screen: 'HistoryTab' })}
                        >
                            <Ionicons name="time" size={16} color="white" style={{ marginRight: 6 }} />
                            <Text className="text-white font-bold text-sm">{t('scannerHistory')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                <View style={StyleSheet.absoluteFillObject} className="flex-row justify-between p-6 z-10" pointerEvents="box-none">
                    <TouchableOpacity
                        className="w-11 h-11 items-center justify-center rounded-full border border-white/25 bg-white/15 self-start"
                        onPress={() => setIsGuest(false)}
                    >
                        <Ionicons name="arrow-back" size={24} color="white" />
                    </TouchableOpacity>
                </View>
            )}
            {/* Scanner Overlay Frame */}
            <View style={StyleSheet.absoluteFillObject} className="items-center justify-center z-0" pointerEvents="none">
                <View className="w-72 h-48 border border-white/20 rounded-3xl items-center justify-center">
                    {/* Bounding box corners */}
                    <View className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-3xl" />
                    <View className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-3xl" />
                    <View className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-3xl" />
                    <View className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-3xl" />
                    
                    {/* Center guide line */}
                    <View className="w-full h-[1px] bg-rose-400/50 absolute" style={{ backgroundColor: colors.primary + '80' }} />
                </View>

                {/* Hint Text */}
                <View className="mt-10 px-6 py-3 rounded-full" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
                    <Text className="text-white font-medium tracking-wide">
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
