import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import Button from '../components/Button';

const SKIN_TYPES = [
    { key: 'normal', label: 'Normala', emoji: '🌿' },
    { key: 'dry', label: 'Uscata', emoji: '🏜️' },
    { key: 'oily', label: 'Grasa', emoji: '💧' },
    { key: 'combination', label: 'Mixta', emoji: '🔄' },
    { key: 'sensitive', label: 'Sensibila', emoji: '🌸' },
];

const COMMON_ALLERGIES = [
    'Parfum / Fragrance',
    'Parabeni',
    'Sulfati (SLS/SLES)',
    'Alcool (Alcohol Denat.)',
    'Coloranti sintetici',
    'Uleiuri esentiale',
    'Lanolina',
    'Formaldehida',
    'Nichel',
    'Latex',
];

export default function ProfileScreen({ navigation }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [userName, setUserName] = useState('');
    const [userEmail, setUserEmail] = useState('');
    const [skinType, setSkinType] = useState(null);
    const [allergies, setAllergies] = useState([]);

    useEffect(() => {
        loadProfile();
    }, []);

    async function loadProfile() {
        try {
            setLoading(true);

            // Ia datele utilizatorului din sesiunea Supabase
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            setUserEmail(user.email || '');
            setUserName(user.user_metadata?.full_name || '');

            // Ia preferintele din user_metadata (salvate in Supabase Auth)
            const metadata = user.user_metadata || {};
            setSkinType(metadata.skin_type || null);
            setAllergies(metadata.allergies || []);

        } catch (error) {
            console.error('Eroare la incarcarea profilului:', error);
        } finally {
            setLoading(false);
        }
    }

    async function saveProfile() {
        try {
            setSaving(true);

            // Salveaza in user_metadata (Supabase Auth)
            const { error } = await supabase.auth.updateUser({
                data: {
                    skin_type: skinType,
                    allergies: allergies,
                }
            });

            if (error) throw error;

            Alert.alert('Salvat!', 'Profilul tau a fost actualizat cu succes.');
        } catch (error) {
            console.error('Eroare la salvarea profilului:', error);
            Alert.alert('Eroare', 'Nu am putut salva profilul. Incearca din nou.');
        } finally {
            setSaving(false);
        }
    }

    function toggleAllergy(allergy) {
        setAllergies(prev =>
            prev.includes(allergy)
                ? prev.filter(a => a !== allergy)
                : [...prev, allergy]
        );
    }

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-brand-50">
                <ActivityIndicator size="large" color="#FB7185" />
                <Text className="text-brand-400 mt-4 font-medium">Se incarca profilul...</Text>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-brand-50">
            {/* Header */}
            <View className="bg-white pt-12 pb-6 px-6 flex-row items-center border-b border-brand-100 shadow-sm z-10">
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    className="w-10 h-10 bg-brand-50 rounded-full items-center justify-center mr-4"
                >
                    <Text className="text-brand-500 font-bold text-lg">←</Text>
                </TouchableOpacity>
                <View>
                    <Text className="text-2xl font-black text-brand-900">Profilul Meu</Text>
                    <Text className="text-xs text-brand-400 font-medium">Personalizeaza recomandarile AI</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 60 }}>
                {/* Info utilizator */}
                <View className="bg-white rounded-3xl p-6 shadow-brand-100 shadow-md mb-6">
                    <View className="items-center mb-4">
                        <View className="w-20 h-20 bg-brand-100 rounded-full items-center justify-center mb-3">
                            <Text className="text-3xl">👤</Text>
                        </View>
                        <Text className="text-xl font-bold text-brand-900">{userName || 'Utilizator'}</Text>
                        <Text className="text-brand-400 text-sm">{userEmail}</Text>
                    </View>
                </View>

                {/* Tip ten */}
                <View className="bg-white rounded-3xl p-6 shadow-brand-100 shadow-md mb-6">
                    <Text className="text-sm font-bold text-brand-700 uppercase tracking-wider mb-4">
                        Tipul de ten
                    </Text>
                    <Text className="text-xs text-brand-400 mb-4">
                        Selecteaza tipul tau de ten pentru recomandari personalizate de la CosmetiBot.
                    </Text>

                    <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                        {SKIN_TYPES.map((type) => (
                            <TouchableOpacity
                                key={type.key}
                                onPress={() => setSkinType(type.key)}
                                className={`px-4 py-3 rounded-2xl border ${
                                    skinType === type.key
                                        ? 'bg-brand-500 border-brand-500'
                                        : 'bg-brand-50 border-brand-100'
                                }`}
                            >
                                <Text className={`font-bold text-sm ${
                                    skinType === type.key ? 'text-white' : 'text-brand-700'
                                }`}>
                                    {type.emoji} {type.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Alergii / Sensibilitati */}
                <View className="bg-white rounded-3xl p-6 shadow-brand-100 shadow-md mb-6">
                    <Text className="text-sm font-bold text-brand-700 uppercase tracking-wider mb-4">
                        Alergii si Sensibilitati
                    </Text>
                    <Text className="text-xs text-brand-400 mb-4">
                        Selecteaza ingredientele la care esti sensibila. AI-ul va tine cont de ele in analiza.
                    </Text>

                    <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                        {COMMON_ALLERGIES.map((allergy) => {
                            const isSelected = allergies.includes(allergy);
                            return (
                                <TouchableOpacity
                                    key={allergy}
                                    onPress={() => toggleAllergy(allergy)}
                                    className={`px-4 py-2 rounded-2xl border ${
                                        isSelected
                                            ? 'bg-rose-500 border-rose-500'
                                            : 'bg-brand-50 border-brand-100'
                                    }`}
                                >
                                    <Text className={`text-sm font-medium ${
                                        isSelected ? 'text-white' : 'text-brand-700'
                                    }`}>
                                        {isSelected ? '✓ ' : ''}{allergy}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* Salvare */}
                <Button
                    title="Salveaza Profilul"
                    onPress={saveProfile}
                    loading={saving}
                />

                {/* Deconectare */}
                <View className="mt-4">
                    <Button
                        title="Deconectare"
                        variant="ghost"
                        onPress={() => {
                            Alert.alert(
                                'Deconectare',
                                'Esti sigura ca vrei sa te deconectezi?',
                                [
                                    { text: 'Anuleaza', style: 'cancel' },
                                    { text: 'Da', onPress: () => supabase.auth.signOut() },
                                ]
                            );
                        }}
                    />
                </View>
            </ScrollView>
        </View>
    );
}
