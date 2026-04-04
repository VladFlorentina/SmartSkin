import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Switch } from 'react-native';
import { supabase } from '../lib/supabase';
import Button from '../components/Button';
import { useApp } from '../lib/AppContext';

export default function ProfileScreen({ navigation }) {
    const { t, colors, lang, setLanguage, isDark, toggleDark, setIsGuest } = useApp();

    const SKIN_TYPES = [
        { key: 'normal', label: t('skinTypeNormal'), emoji: '🌿' },
        { key: 'dry', label: t('skinTypeDry'), emoji: '🏜️' },
        { key: 'oily', label: t('skinTypeOily'), emoji: '💧' },
        { key: 'combination', label: t('skinTypeCombination'), emoji: '🔄' },
        { key: 'sensitive', label: t('skinTypeSensitive'), emoji: '🌸' },
    ];

    const COMMON_ALLERGIES = [
        { key: 'Parfum / Fragrance', label: t('allergyParfum') },
        { key: 'Parabeni', label: t('allergyParabens') },
        { key: 'Sulfati (SLS/SLES)', label: t('allergySulfates') },
        { key: 'Alcool (Alcohol Denat.)', label: t('allergyAlcohol') },
        { key: 'Coloranti sintetici', label: t('allergyDyes') },
        { key: 'Uleiuri esentiale', label: t('allergyEssentialOils') },
        { key: 'Lanolina', label: t('allergyLanolin') },
        { key: 'Formaldehida', label: t('allergyFormaldehyde') },
        { key: 'Nichel', label: t('allergyNickel') },
        { key: 'Latex', label: t('allergyLatex') },
    ];
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
            const { data, error } = await supabase.auth.getUser();
            if (error || !data?.user) return;
            const user = data.user;

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

            Alert.alert(t('profileSaved'), t('profileSavedMsg'));
        } catch (error) {
            console.error('Eroare la salvarea profilului:', error);
            Alert.alert(t('profileErr'), t('profileSaveErr'));
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
            <View className="flex-1 justify-center items-center" style={{ backgroundColor: colors.bg }}>
                <ActivityIndicator size="large" color="#FB7185" />
                <Text className="mt-4 font-medium" style={{ color: colors.textSub }}>{t('profileLoadingText')}</Text>
            </View>
        );
    }

    return (
        <View className="flex-1" style={{ backgroundColor: colors.bg }}>
            {/* Header */}
            <View
                className="pt-12 pb-6 px-6 flex-row items-center border-b shadow-sm z-10"
                style={{ backgroundColor: colors.header, borderColor: colors.border }}
            >
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    className="w-10 h-10 rounded-full items-center justify-center mr-4"
                    style={{ backgroundColor: colors.bg }}
                >
                    <Text className="text-brand-500 font-bold text-lg">←</Text>
                </TouchableOpacity>
                <View>
                    <Text className="text-2xl font-black" style={{ color: colors.text }}>{t('profileTitle')}</Text>
                    <Text className="text-xs font-medium" style={{ color: colors.textSub }}>{t('profileSub')}</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 60 }}>
                {/* Info utilizator */}
                <View className="rounded-3xl p-6 shadow-md mb-6" style={{ backgroundColor: colors.card }}>
                    <View className="items-center mb-4">
                        <View className="w-20 h-20 rounded-full items-center justify-center mb-3" style={{ backgroundColor: colors.border }}>
                            <Text className="text-3xl">👤</Text>
                        </View>
                        <Text className="text-xl font-bold" style={{ color: colors.text }}>{userName || t('profileDefaultUser')}</Text>
                        <Text className="text-sm" style={{ color: colors.textSub }}>{userEmail}</Text>
                    </View>
                </View>

                {/* ===== SETARI APLICATIE ===== */}
                <View className="rounded-3xl p-6 shadow-md mb-6" style={{ backgroundColor: colors.card }}>
                    <Text
                        className="text-sm font-bold uppercase tracking-wider mb-5"
                        style={{ color: '#FB7185' }}
                    >
                        {t('profileSettings')}
                    </Text>

                    {/* Limba */}
                    <View
                        className="flex-row items-center justify-between pb-4 mb-4"
                        style={{ borderBottomWidth: 1, borderColor: colors.border }}
                    >
                        <Text className="font-semibold text-sm" style={{ color: colors.text }}>
                            {t('profileLangLabel')}
                        </Text>
                        <View className="flex-row" style={{ gap: 8 }}>
                            {[{ code: 'ro', flag: '🇷🇴', label: 'RO' }, { code: 'en', flag: '🇬🇧', label: 'EN' }].map(({ code, flag, label }) => (
                                <TouchableOpacity
                                    key={code}
                                    onPress={() => setLanguage(code)}
                                    className="px-3 py-2 rounded-2xl"
                                    style={{
                                        backgroundColor: lang === code ? '#FB7185' : colors.border,
                                    }}
                                >
                                    <Text
                                        className="font-bold text-sm"
                                        style={{ color: lang === code ? '#FFF' : colors.textSub }}
                                    >
                                        {flag} {label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Dark Mode */}
                    <View className="flex-row items-center justify-between">
                        <View>
                            <Text className="font-semibold text-sm" style={{ color: colors.text }}>
                                {t('profileDarkMode')}
                            </Text>
                            <Text className="text-xs mt-0.5" style={{ color: colors.textSub }}>
                                {isDark ? t('profileDarkOn') : t('profileDarkOff')}
                            </Text>
                        </View>
                        <Switch
                            value={isDark}
                            onValueChange={toggleDark}
                            trackColor={{ false: colors.switchTrack, true: '#FB7185' }}
                            thumbColor={colors.switchThumb}
                        />
                    </View>
                </View>

                {/* Tip ten */}
                <View className="rounded-3xl p-6 shadow-md mb-6" style={{ backgroundColor: colors.card }}>
                    <Text className="text-sm font-bold text-brand-700 uppercase tracking-wider mb-4">
                        {t('profileSkinType')}
                    </Text>
                    <Text className="text-xs mb-4" style={{ color: colors.textSub }}>
                        {t('profileSkinTypeSub')}
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
                <View className="rounded-3xl p-6 shadow-md mb-6" style={{ backgroundColor: colors.card }}>
                    <Text className="text-sm font-bold text-brand-700 uppercase tracking-wider mb-4">
                        {t('profileAllergies')}
                    </Text>
                    <Text className="text-xs mb-4" style={{ color: colors.textSub }}>
                        {t('profileAllergiesSub')}
                    </Text>

                    <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                        {COMMON_ALLERGIES.map((allergy) => {
                            const isSelected = allergies.includes(allergy.key);
                            return (
                                <TouchableOpacity
                                    key={allergy.key}
                                    onPress={() => toggleAllergy(allergy.key)}
                                    className={`px-4 py-2 rounded-2xl border ${
                                        isSelected
                                            ? 'bg-rose-500 border-rose-500'
                                            : 'bg-brand-50 border-brand-100'
                                    }`}
                                >
                                    <Text className={`text-sm font-medium ${
                                        isSelected ? 'text-white' : 'text-brand-700'
                                    }`}>
                                        {isSelected ? '✓ ' : ''}{allergy.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* Salvare */}
                <Button
                    title={t('profileSaveBtn')}
                    onPress={saveProfile}
                    loading={saving}
                />

                {/* Deconectare */}
                <View className="mt-4">
                    <Button
                        title={t('profileLogoutBtn')}
                        variant="ghost"
                        onPress={() => {
                            Alert.alert(
                                t('profileLogoutTitle'),
                                t('profileLogoutMsg'),
                                [
                                    { text: t('profileCancel'), style: 'cancel' },
                                    { text: t('profileYes'), onPress: async () => {
                                        await supabase.auth.signOut();
                                        setIsGuest(false);
                                    } },
                                ]
                            );
                        }}
                    />
                </View>
            </ScrollView>
        </View>
    );
}
