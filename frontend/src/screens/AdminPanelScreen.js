import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchAdminReports, deleteAdminReport, fetchAdminStats } from '../lib/api';
import { useApp } from '../lib/AppContext';
import { supabase } from '../lib/supabase';

export default function AdminPanelScreen({ navigation }) {
    const { colors, t } = useApp();
    const [reports, setReports] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            setLoading(true);
            const [reportsData, statsData] = await Promise.all([
                fetchAdminReports(),
                fetchAdminStats()
            ]);
            setReports(reportsData);
            setStats(statsData);
        } catch (error) {
            Alert.alert('Eroare', 'Nu am putut încărca rapoartele. Ești sigur că ai rol de admin?');
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(reportId) {
        Alert.alert(
            'Confirmare',
            'Ești sigur că vrei să marchezi acest raport ca rezolvat (șterge)?',
            [
                { text: 'Anulează', style: 'cancel' },
                { text: 'Șterge', style: 'destructive', onPress: async () => {
                    try {
                        await deleteAdminReport(reportId);
                        setReports(prev => prev.filter(r => r.id !== reportId));
                        Alert.alert('Succes', 'Raport șters.');
                    } catch (error) {
                        Alert.alert('Eroare', 'Nu am putut șterge raportul.');
                    }
                }}
            ]
        );
    }

    const renderReport = ({ item }) => {
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
                    <View className="mb-3 p-3 rounded-xl" style={{ backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}>
                        <Text className="text-sm font-bold" style={{ color: colors.text }}>{item.products.name}</Text>
                        <Text className="text-xs" style={{ color: colors.textSub }}>{item.products.brand} • {item.products.barcode}</Text>
                    </View>
                )}

                {item.user_comment ? (
                    <Text className="text-sm italic mb-4 leading-relaxed" style={{ color: colors.text }}>
                        "{item.user_comment}"
                    </Text>
                ) : (
                    <Text className="text-sm italic mb-4" style={{ color: colors.textMuted }}>Fără comentariu</Text>
                )}

                <View className="flex-row items-center justify-between mt-2 pt-4 border-t" style={{ borderColor: colors.border }}>
                    <Text className="text-xs font-medium" style={{ color: colors.textSub }}>
                        De la: {item.user_profiles?.full_name || item.user_profiles?.email || 'Anonim'}
                    </Text>
                    <TouchableOpacity 
                        onPress={() => handleDelete(item.id)}
                        className="px-4 py-2 rounded-xl"
                        style={{ backgroundColor: colors.primary }}
                    >
                        <Text className="text-white font-bold text-xs">Rezolvat (Șterge)</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View className="flex-1" style={{ backgroundColor: colors.bg }}>
            {/* Header */}
            <View
                className="pt-12 pb-6 px-6 flex-row items-center justify-between border-b shadow-sm z-10"
                style={{ backgroundColor: colors.header, borderColor: colors.border }}
            >
                <View>
                    <Text className="text-2xl font-black tracking-wider" style={{ color: colors.text }}>ADMIN PANEL</Text>
                    <Text className="text-xs font-medium" style={{ color: colors.textSub }}>Centru de Comandă Platformă</Text>
                </View>
                <TouchableOpacity
                    onPress={async () => {
                        Alert.alert('Deconectare', 'Ieși din contul de admin?', [
                            { text: 'Anulează', style: 'cancel' },
                            { text: 'Ieși', style: 'destructive', onPress: async () => {
                                await supabase.auth.signOut();
                            }}
                        ]);
                    }}
                    className="px-4 py-2 rounded-xl"
                    style={{ backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}
                >
                    <Text className="font-bold text-xs" style={{ color: colors.text }}>Ieșire</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={reports}
                    keyExtractor={item => item.id}
                    renderItem={renderReport}
                    contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
                    ListHeaderComponent={
                        <>
                            {/* STATS DASHBOARD */}
                            {stats && (
                                <View className="mb-8">
                                    <Text className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: colors.primary }}>Sumar Platformă</Text>
                                    
                                    <View className="flex-row flex-wrap justify-between" style={{ gap: 12 }}>
                                        <View className="w-[48%] p-4 rounded-2xl shadow-sm items-center" style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
                                            <Ionicons name="people-outline" size={28} color={colors.primary} />
                                            <Text className="text-3xl font-black mt-2" style={{ color: colors.text }}>{stats.totalUsers}</Text>
                                            <Text className="text-xs text-center mt-1" style={{ color: colors.textSub }}>Utilizatori Totali</Text>
                                        </View>
                                        
                                        <View className="w-[48%] p-4 rounded-2xl shadow-sm items-center" style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
                                            <Ionicons name="warning-outline" size={28} color={colors.primary} />
                                            <Text className="text-3xl font-black mt-2" style={{ color: colors.text }}>{stats.activeReports}</Text>
                                            <Text className="text-xs text-center mt-1" style={{ color: colors.textSub }}>Tichete Active</Text>
                                        </View>

                                        <View className="w-[48%] p-4 rounded-2xl shadow-sm items-center" style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
                                            <Ionicons name="scan-outline" size={28} color={colors.primary} />
                                            <Text className="text-3xl font-black mt-2" style={{ color: colors.text }}>{stats.apiProducts}</Text>
                                            <Text className="text-xs text-center mt-1" style={{ color: colors.textSub }}>Scanări API Externe</Text>
                                        </View>

                                        <View className="w-[48%] p-4 rounded-2xl shadow-sm items-center" style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
                                            <Ionicons name="camera-outline" size={28} color={colors.primary} />
                                            <Text className="text-3xl font-black mt-2" style={{ color: colors.text }}>{stats.manualProducts}</Text>
                                            <Text className="text-xs text-center mt-1" style={{ color: colors.textSub }}>Introduse Manual</Text>
                                        </View>
                                    </View>
                                </View>
                            )}

                            <Text className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: colors.primary }}>Tichete Necesită Acțiune</Text>
                        </>
                    }
                    ListEmptyComponent={
                        <View className="items-center justify-center pt-10">
                            <Ionicons name="shield-checkmark-outline" size={64} color={colors.primary} />
                            <Text className="text-lg font-bold mt-4" style={{ color: colors.text }}>Niciun raport activ</Text>
                            <Text className="text-center mt-2" style={{ color: colors.textSub }}>Sistemul funcționează perfect!</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}
