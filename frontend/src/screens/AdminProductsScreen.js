import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { fetchAdminProducts, updateAdminProductIngredients, deleteAdminProduct } from '../lib/api';
import { useApp } from '../lib/AppContext';

export default function AdminProductsScreen({ navigation, route }) {
    const { type } = route.params || { type: 'api' }; // 'api' or 'manual'
    const { colors, t } = useApp();
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Edit state
    const [editingProduct, setEditingProduct] = useState(null);
    const [editIngredients, setEditIngredients] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, [type]);

    async function loadData() {
        try {
            setLoading(true);
            const data = await fetchAdminProducts(type);
            setProducts(data);
            setFilteredProducts(data);
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Eroare', text2: 'Nu am putut încărca produsele.' });
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    const handleSearch = (text) => {
        setSearchQuery(text);
        if (!text) {
            setFilteredProducts(products);
            return;
        }
        const lowerText = text.toLowerCase();
        const filtered = products.filter(p => 
            (p.name && p.name.toLowerCase().includes(lowerText)) || 
            (p.brand && p.brand.toLowerCase().includes(lowerText)) ||
            (p.barcode && p.barcode.includes(lowerText))
        );
        setFilteredProducts(filtered);
    };

    const handleDelete = (id, name) => {
        Alert.alert(
            'Confirmare Ștergere',
            `Ești sigur că vrei să ștergi definitiv produsul "${name}"? Toate scanările și rapoartele asociate vor fi șterse!`,
            [
                { text: 'Anulează', style: 'cancel' },
                { text: 'Șterge', style: 'destructive', onPress: async () => {
                    try {
                        await deleteAdminProduct(id);
                        const newProducts = products.filter(p => p.id !== id);
                        setProducts(newProducts);
                        setFilteredProducts(prev => prev.filter(p => p.id !== id));
                        Toast.show({ type: 'success', text1: 'Succes', text2: 'Produs șters.' });
                    } catch (error) {
                        Toast.show({ type: 'error', text1: 'Eroare', text2: 'Nu am putut șterge produsul.' });
                    }
                }}
            ]
        );
    };

    const handleSaveEdit = async () => {
        if (!editIngredients.trim()) {
            Toast.show({ type: 'error', text1: 'Eroare', text2: 'Ingredientele nu pot fi goale.' });
            return;
        }

        try {
            setSaving(true);
            const updated = await updateAdminProductIngredients(editingProduct.id, editIngredients);
            
            // Update in lists
            const updateList = (list) => list.map(p => {
                if (p.id === editingProduct.id) {
                    return { ...p, ingredients_list: editIngredients, last_updated: new Date().toISOString() };
                }
                return p;
            });
            
            setProducts(updateList(products));
            setFilteredProducts(updateList(filteredProducts));
            
            Toast.show({ type: 'success', text1: 'Succes', text2: 'Ingrediente actualizate și re-analizate!' });
            setEditingProduct(null);
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Eroare', text2: 'Nu am putut actualiza produsul.' });
        } finally {
            setSaving(false);
        }
    };

    const renderItem = ({ item }) => {
        const date = new Date(item.last_updated || item.created_at || new Date()).toLocaleString('ro-RO', { 
            day: '2-digit', month: 'short', year: 'numeric'
        });
        
        return (
            <View className="mb-4 p-5 rounded-2xl border shadow-sm" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                <View className="flex-row justify-between items-start mb-2">
                    <Text className="font-bold text-base flex-1 pr-2" style={{ color: colors.text }}>
                        {item.name || 'Produs fără nume'}
                    </Text>
                    <TouchableOpacity onPress={() => handleDelete(item.id, item.name)}>
                        <Ionicons name="trash-outline" size={20} color="#F56565" />
                    </TouchableOpacity>
                </View>

                <Text className="text-xs mb-3" style={{ color: colors.textSub }}>
                    {item.brand || 'Fără brand'} • {item.barcode || 'Fără cod'}
                </Text>

                <View className="flex-row items-center justify-between mb-3">
                    <Text className="text-xs font-medium" style={{ color: colors.textSub }}>
                        Scanări: <Text className="font-bold" style={{ color: colors.text }}>{item.scanCount || 0}</Text>
                    </Text>
                    <Text className="text-xs font-medium" style={{ color: colors.textSub }}>
                        Actualizat: <Text className="font-bold" style={{ color: colors.text }}>{date}</Text>
                    </Text>
                </View>

                <TouchableOpacity 
                    onPress={() => {
                        setEditingProduct(item);
                        setEditIngredients(item.ingredients_list || '');
                    }}
                    className="py-2.5 rounded-xl border items-center justify-center flex-row mt-2"
                    style={{ backgroundColor: colors.primaryLight, borderColor: colors.primary }}
                >
                    <Ionicons name="create-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                    <Text className="font-bold text-xs" style={{ color: colors.primary }}>Editează Ingrediente & Re-analizează</Text>
                </TouchableOpacity>
            </View>
        );
    };

    if (editingProduct) {
        return (
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1" style={{ backgroundColor: colors.bg }}>
                <View className="pt-12 pb-4 px-6 border-b shadow-sm z-10" style={{ backgroundColor: colors.header, borderColor: colors.border }}>
                    <View className="flex-row items-center justify-between">
                        <TouchableOpacity onPress={() => setEditingProduct(null)} className="p-2 -ml-2" disabled={saving}>
                            <Ionicons name="close" size={24} color={colors.text} />
                        </TouchableOpacity>
                        <Text className="text-base font-black tracking-wider flex-1 text-center" numberOfLines={1} style={{ color: colors.text }}>EDITARE INGREDIENTE</Text>
                        <View className="w-8" />
                    </View>
                </View>
                
                <ScrollView className="flex-1 px-6 pt-6">
                    <Text className="font-bold mb-1 text-lg" style={{ color: colors.text }}>{editingProduct.name}</Text>
                    <Text className="text-sm mb-6" style={{ color: colors.textSub }}>{editingProduct.brand} • {editingProduct.barcode}</Text>
                    
                    <Text className="font-bold mb-2" style={{ color: colors.text }}>Listă Ingrediente (INCI)</Text>
                    <View className="border rounded-2xl p-4" style={{ borderColor: colors.primary, backgroundColor: colors.inputBg }}>
                        <TextInput
                            multiline
                            className="text-sm"
                            style={{ color: colors.inputText, minHeight: 200, textAlignVertical: 'top' }}
                            value={editIngredients}
                            onChangeText={setEditIngredients}
                            placeholder="Adaugă lista de ingrediente separată prin virgulă..."
                            placeholderTextColor={colors.placeholder}
                        />
                    </View>
                    <Text className="text-xs mt-2" style={{ color: colors.textSub }}>
                        * Modificarea ingredientelor va declanșa automat re-analizarea produsului cu AI și actualizarea scorului.
                    </Text>
                    
                    <TouchableOpacity 
                        onPress={handleSaveEdit}
                        disabled={saving}
                        className="mt-8 py-4 rounded-full items-center justify-center flex-row shadow-sm"
                        style={{ backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }}
                    >
                        {saving ? (
                            <ActivityIndicator color={colors.bg} size="small" />
                        ) : (
                            <>
                                <Ionicons name="save-outline" size={20} color={colors.bg} style={{ marginRight: 8 }} />
                                <Text className="font-bold text-base" style={{ color: colors.bg }}>Salvează și Re-analizează</Text>
                            </>
                        )}
                    </TouchableOpacity>
                    
                    <View className="h-10" />
                </ScrollView>
            </KeyboardAvoidingView>
        );
    }

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
                    <Text className="text-xl font-black tracking-wider uppercase" style={{ color: colors.text }}>
                        PRODUSE {type === 'api' ? 'API' : 'MANUALE'}
                    </Text>
                    <View className="w-8" />
                </View>

                <View className="flex-row items-center px-4 py-3 rounded-2xl" style={{ backgroundColor: colors.inputBg }}>
                    <Ionicons name="search" size={20} color={colors.placeholder} />
                    <TextInput
                        className="flex-1 ml-3 text-base font-medium"
                        style={{ color: colors.inputText }}
                        placeholder="Caută după nume, brand sau cod..."
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
                    data={filteredProducts}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
                    ListEmptyComponent={
                        <View className="items-center justify-center pt-10">
                            <Ionicons name="flask-outline" size={64} color={colors.primary} />
                            <Text className="text-lg font-bold mt-4" style={{ color: colors.text }}>Niciun produs găsit</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}
