import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { fetchAdminReports, deleteAdminReport } from '../lib/api';
import { useApp } from '../lib/AppContext';

export default function AdminReportsScreen({ navigation }) {
    const { colors, t } = useApp();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            setLoading(true);
            const data = await fetchAdminReports();
            setReports(data);
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Eroare', text2: 'Nu am putut încărca tichetele.' });
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(reportId) {
        Alert.alert(
            'Confirmare',
            'Ești sigur că vrei să marchezi acest tichet ca rezolvat (șterge)?',
            [
                { text: 'Anulează', style: 'cancel' },
                { text: 'Rezolvat', style: 'destructive', onPress: async () => {
                    try {
                        await deleteAdminReport(reportId);
                        setReports(prev => prev.filter(r => r.id !== reportId));
                        Toast.show({ type: 'success', text1: 'Succes', text2: 'Tichet marcat ca rezolvat.' });
                    } catch (error) {
                        Toast.show({ type: 'error', text1: 'Eroare', text2: 'Nu am putut actualiza tichetul.' });
                    }
                }}
            ]
        );
    }

    const renderItem = ({ item }) => {
        const date = new Date(item.created_at).toLocaleString('ro-RO', { 
            day: '2-digit', month: 'short', year: 'numeric', 
            hour: '2-digit', minute: '2-digit' 
        });
        
        return (
            <View className="mb-4 p-5 rounded-2xl border shadow-sm" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                <View className="flex-row justify-between items-start mb-2">
                    <Text className="font-bold text-base flex-1 pr-2" style={{ color: colors.primary }}>
                        {item.issue_category}
                    </Text>
                    <Text className="text-xs" style={{ color: colors.textSub }}>{date}</Text>
                </View>

                {item.products && (
                    <TouchableOpacity 
                        className="mb-3 p-3 rounded-xl flex-row justify-between items-center" 
                        style={{ backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}
                        onPress={() => {
                            if (item.products.barcode) {
                                navigation.navigate('Product', { barcode: item.products.barcode, fromAdmin: true });
                            } else {
                                Toast.show({ type: 'info', text1: 'Info', text2: 'Acest produs nu are cod de bare pentru vizualizare.' });
                            }
                        }}
                    >
                        <View className="flex-1">
                            <Text className="text-sm font-bold" style={{ color: colors.text }}>{item.products.name}</Text>
                            <Text className="text-xs mt-1" style={{ color: colors.textSub }}>{item.products.brand} • {item.products.barcode || 'Fără cod'}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.textSub} />
                    </TouchableOpacity>
                )}

                {item.user_comment ? (
                    <Text className="text-sm italic mb-4 leading-relaxed" style={{ color: colors.text }}>
                        "{item.user_comment}"
                    </Text>
                ) : (
                    <Text className="text-sm italic mb-4" style={{ color: colors.textMuted }}>Fără comentariu suplimentar</Text>
                )}

                <View className="flex-row items-center justify-between mt-2 pt-4 border-t" style={{ borderColor: colors.border }}>
                    <Text className="text-xs font-medium" style={{ color: colors.textSub }}>
                        De la: <Text className="font-bold">{item.user_profiles?.full_name || item.user_profiles?.email || 'Anonim'}</Text>
                    </Text>
                    <TouchableOpacity 
                        onPress={() => handleDelete(item.id)}
                        className="px-4 py-2 rounded-xl flex-row items-center"
                        style={{ backgroundColor: colors.primary }}
                    >
                        <Ionicons name="checkmark-circle" size={16} color={colors.bg} style={{ marginRight: 6 }} />
                        <Text className="font-bold text-xs" style={{ color: colors.bg }}>Rezolvat</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View className="flex-1" style={{ backgroundColor: colors.bg }}>
            <View
                className="pt-12 pb-4 px-6 border-b shadow-sm z-10"
                style={{ backgroundColor: colors.header, borderColor: colors.border }}
            >
                <View className="flex-row items-center justify-between">
                    <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2">
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text className="text-xl font-black tracking-wider" style={{ color: colors.text }}>TICHETE SUPORT</Text>
                    <View className="w-8" />
                </View>
            </View>

            {loading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={reports}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
                    ListEmptyComponent={
                        <View className="items-center justify-center pt-10">
                            <Ionicons name="shield-checkmark-outline" size={64} color={colors.primary} />
                            <Text className="text-lg font-bold mt-4" style={{ color: colors.text }}>Niciun tichet activ</Text>
                            <Text className="text-center mt-2" style={{ color: colors.textSub }}>Sistemul funcționează perfect!</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}
