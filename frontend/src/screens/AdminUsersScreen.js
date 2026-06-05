import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { fetchAdminUsers } from '../lib/api';
import { useApp } from '../lib/AppContext';

export default function AdminUsersScreen({ navigation }) {
    const { colors, t } = useApp();
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            setLoading(true);
            const data = await fetchAdminUsers();
            setUsers(data);
            setFilteredUsers(data);
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Eroare', text2: 'Nu am putut încărca utilizatorii.' });
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    const handleSearch = (text) => {
        setSearchQuery(text);
        if (!text) {
            setFilteredUsers(users);
            return;
        }
        const lowerText = text.toLowerCase();
        const filtered = users.filter(u => 
            (u.full_name && u.full_name.toLowerCase().includes(lowerText)) || 
            (u.email && u.email.toLowerCase().includes(lowerText))
        );
        setFilteredUsers(filtered);
    };

    const renderItem = ({ item }) => {
        const date = new Date(item.created_at).toLocaleString('ro-RO', { 
            day: '2-digit', month: 'short', year: 'numeric'
        });
        
        return (
            <View className="mb-4 p-5 rounded-2xl border shadow-sm" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                <View className="flex-row justify-between items-start mb-2">
                    <Text className="font-bold text-base flex-1 pr-2" style={{ color: colors.text }}>
                        {item.full_name || 'Utilizator anonim'}
                    </Text>
                    <Text className="text-xs font-bold px-2 py-1 rounded-md" style={{ backgroundColor: item.role === 'admin' ? colors.primary : colors.bg, color: item.role === 'admin' ? colors.bg : colors.textSub }}>
                        {item.role === 'admin' ? 'ADMIN' : 'USER'}
                    </Text>
                </View>

                <Text className="text-sm mb-3" style={{ color: colors.textSub }}>
                    {item.email}
                </Text>

                <View className="flex-row items-center justify-between mt-2 pt-4 border-t" style={{ borderColor: colors.border }}>
                    <Text className="text-xs font-medium" style={{ color: colors.textSub }}>
                        Scanări: <Text className="font-bold" style={{ color: colors.text }}>{item.scanCount}</Text>
                    </Text>
                    <Text className="text-xs font-medium" style={{ color: colors.textSub }}>
                        Alergii: <Text className="font-bold" style={{ color: colors.text }}>{item.allergyCount}</Text>
                    </Text>
                    <Text className="text-xs font-medium" style={{ color: colors.textSub }}>
                        Din: <Text className="font-bold" style={{ color: colors.text }}>{date}</Text>
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <View className="flex-1" style={{ backgroundColor: colors.bg }}>
            {/* Header */}
            <View
                className="pt-12 pb-4 px-6 border-b shadow-sm z-10"
                style={{ backgroundColor: colors.header, borderColor: colors.border }}
            >
                <View className="flex-row items-center justify-between mb-4">
                    <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2">
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text className="text-xl font-black tracking-wider" style={{ color: colors.text }}>UTILIZATORI</Text>
                    <View className="w-8" />
                </View>

                <View className="flex-row items-center px-4 py-3 rounded-2xl" style={{ backgroundColor: colors.inputBg }}>
                    <Ionicons name="search" size={20} color={colors.placeholder} />
                    <TextInput
                        className="flex-1 ml-3 text-base font-medium"
                        style={{ color: colors.inputText }}
                        placeholder="Caută după nume sau email..."
                        placeholderTextColor={colors.placeholder}
                        value={searchQuery}
                        onChangeText={handleSearch}
                    />
                    {searchQuery.length > 0 ? (
                        <TouchableOpacity onPress={() => handleSearch('')}>
                            <Ionicons name="close-circle" size={20} color={colors.placeholder} />
                        </TouchableOpacity>
                    ) : null}
                </View>
            </View>

            {loading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={filteredUsers}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
                    ListEmptyComponent={
                        <View className="items-center justify-center pt-10">
                            <Ionicons name="people-outline" size={64} color={colors.primary} />
                            <Text className="text-lg font-bold mt-4" style={{ color: colors.text }}>Niciun utilizator găsit</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}
