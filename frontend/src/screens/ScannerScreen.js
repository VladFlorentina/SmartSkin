import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Button from '../components/Button';
import { supabase } from '../lib/supabase'; // for sign out

export default function ScannerScreen({ onSignOut, onScanned, onViewHistory }) {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);

    // If permissions are still loading
    if (!permission) {
        return <View className="flex-1 bg-brand-50" />;
    }

    // If permission not granted
    if (!permission.granted) {
        return (
            <View className="flex-1 items-center justify-center p-6 bg-brand-50">
                <Text className="text-xl font-bold text-brand-900 mb-4 text-center">
                    We need access to your camera to scan products.
                </Text>
                <Button
                    title="Grant Permission"
                    onPress={requestPermission}
                />
                <View className="mt-4">
                    <Button
                        title="Sign Out"
                        onPress={onSignOut}
                        variant="ghost"
                    />
                </View>
            </View>
        );
    }

    const handleBarcodeScanned = ({ type, data }) => {
        setScanned(true);
        // Trimite codul scanat direct la App.js pentru a deschide ProductScreen
        if (onScanned) {
            onScanned(data);
        }
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
                        onPress={onSignOut}
                    >
                        <Text className="text-white font-bold text-sm">Log Out</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        className="p-3 bg-brand-500 rounded-full px-6 flex-row items-center self-start"
                        onPress={onViewHistory}
                    >
                        <Text className="text-white font-bold text-sm mr-2">📚 Istoric</Text>
                    </TouchableOpacity>
                </View>
                <View className="absolute bottom-16 w-full items-center">
                    <View className="bg-white/80 px-6 py-3 rounded-2xl">
                        <Text className="text-brand-900 font-bold">
                            Point camera at a barcode
                        </Text>
                    </View>
                </View>
            </CameraView>
            {scanned && (
                <View className="absolute bottom-0 w-full p-6 bg-white rounded-t-3xl shadow-xl">
                    <Button title="Tap to Scan Again" onPress={() => setScanned(false)} />
                </View>
            )}
        </View>
    );
}
