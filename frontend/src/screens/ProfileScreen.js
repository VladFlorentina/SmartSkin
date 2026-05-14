import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Switch } from 'react-native';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import Button from '../components/Button';
import { useApp } from '../lib/AppContext';

export default function ProfileScreen({ navigation }) {
    const { t, colors, lang, setLanguage, isDark, toggleDark, setIsGuest } = useApp();

    const SKIN_TYPES = [
        { key: 'normal', label: t('skinTypeNormal') },
        { key: 'dry', label: t('skinTypeDry') },
        { key: 'oily', label: t('skinTypeOily') },
        { key: 'combination', label: t('skinTypeCombination') },
        { key: 'sensitive', label: t('skinTypeSensitive') },
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

            // Tip ten din user_metadata (Supabase Auth)
            const metadata = user.user_metadata || {};
            setSkinType(metadata.skin_type || null);

            // Alergii din tabelul normalizat user_allergies
            const { data: allergyRows, error: allergyError } = await supabase
                .from('user_allergies')
                .select('allergy_label')
                .eq('user_id', user.id);

            if (allergyError) {
                console.error('Eroare la incarcarea alergiilor:', allergyError.message);
            }

            setAllergies(allergyRows?.map(r => r.allergy_label) || []);

        } catch (error) {
            console.error('Eroare la incarcarea profilului:', error);
        } finally {
            setLoading(false);
        }
    }

    async function saveProfile() {
        try {
            setSaving(true);

            // Ia ID-ul utilizatorului curent
            const { data: authData } = await supabase.auth.getUser();
            const userId = authData?.user?.id;
            if (!userId) throw new Error('Utilizatorul nu este autentificat');

            // 1. Salveaza skin_type in user_metadata (Supabase Auth)
            const { error: metaError } = await supabase.auth.updateUser({
                data: { skin_type: skinType }
            });
            if (metaError) throw metaError;

            // 2. Salveaza alergiile in tabelul normalizat user_allergies
            //    Strategie: sterge toate alergiile existente si reinserteaza cele selectate
            const { error: deleteError } = await supabase
                .from('user_allergies')
                .delete()
                .eq('user_id', userId);

            if (deleteError) throw deleteError;

            if (allergies.length > 0) {
                const { error: insertError } = await supabase
                    .from('user_allergies')
                    .insert(
                        allergies.map(label => ({
                            user_id: userId,
                            allergy_label: label
                        }))
                    );
                if (insertError) throw insertError;
            }

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
                <ActivityIndicator size="large" color={colors.primary} />
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
                    <Text className="font-bold text-lg" style={{ color: colors.primary }}>←</Text>
                </TouchableOpacity>
                <View>
                    <Text className="text-2xl font-black" style={{ color: colors.text }}>{t('profileTitle')}</Text>
                    <Text className="text-xs font-medium" style={{ color: colors.textSub }}>{t('profileSub')}</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 130 }}>
                {/* Info utilizator */}
                <View className="rounded-3xl p-6 shadow-md mb-6" style={{ backgroundColor: colors.card }}>
                    <View className="items-center mb-4">
                        <View className="w-20 h-20 rounded-full items-center justify-center mb-3" style={{ backgroundColor: colors.border }}>
                            <Ionicons name="person" size={40} color={colors.textSub} />
                        </View>
                        <Text className="text-xl font-bold" style={{ color: colors.text }}>{userName || t('profileDefaultUser')}</Text>
                        <Text className="text-sm" style={{ color: colors.textSub }}>{userEmail}</Text>
                    </View>
                </View>

                {/* ===== SETARI APLICATIE ===== */}
                <View className="rounded-3xl p-6 shadow-md mb-6" style={{ backgroundColor: colors.card }}>
                    <Text
                        className="text-sm font-bold uppercase tracking-wider mb-5"
                        style={{ color: colors.primary }}
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
                            {[{ code: 'ro', label: 'RO' }, { code: 'en', label: 'EN' }].map(({ code, label }) => (
                                <TouchableOpacity
                                    key={code}
                                    onPress={() => setLanguage(code)}
                                    className="px-3 py-2 rounded-2xl"
                                    style={{
                                        backgroundColor: lang === code ? colors.primary : colors.bg,
                                        borderWidth: 1,
                                        borderColor: lang === code ? colors.primary : colors.border
                                    }}
                                >
                                    <Text
                                        className="font-bold text-sm"
                                        style={{ color: lang === code ? '#FFF' : colors.textSub }}
                                    >
                                        {label}
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
                            trackColor={{ false: colors.switchTrack, true: colors.primary }}
                            thumbColor={colors.switchThumb}
                        />
                    </View>
                </View>

                {/* Tip ten */}
                <View className="rounded-3xl p-6 shadow-md mb-6" style={{ backgroundColor: colors.card }}>
                    <Text className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: colors.primary }}>
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
                                className="px-4 py-3 rounded-2xl border"
                                style={{
                                    backgroundColor: skinType === type.key ? colors.primary : colors.bg,
                                    borderColor: skinType === type.key ? colors.primary : colors.border
                                }}
                            >
                                <Text className="font-bold text-sm" style={{
                                    color: skinType === type.key ? '#FFF' : colors.text
                                }}>
                                    {type.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Alergii / Sensibilitati */}
                <View className="rounded-3xl p-6 shadow-md mb-6" style={{ backgroundColor: colors.card }}>
                    <Text className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: colors.primary }}>
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
                                    className="px-4 py-2 rounded-2xl border"
                                    style={{
                                        backgroundColor: isSelected ? colors.primary : colors.bg,
                                        borderColor: isSelected ? colors.primary : colors.border
                                    }}
                                >
                                    <Text className="text-sm font-medium" style={{
                                        color: isSelected ? '#FFF' : colors.text
                                    }}>
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
