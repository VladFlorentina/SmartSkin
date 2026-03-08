import React, { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import Input from '../components/Input';
import Button from '../components/Button';
import { useApp } from '../lib/AppContext';

export default function LoginScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { t, colors } = useApp();

    async function handleLogin() {
        const cleanEmail = email.trim();

        // Validari locale - evita request-uri inutile la Supabase
        if (!cleanEmail) {
            Alert.alert(t('loginErr'), t('loginErrNoEmail'));
            return;
        }
        if (!cleanEmail.includes('@')) {
            Alert.alert(t('loginErr'), t('loginErrInvalidEmail'));
            return;
        }
        if (!password) {
            Alert.alert(t('loginErr'), t('loginErrNoPassword'));
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
            if (error) { Alert.alert(t('loginErr'), error.message); }
        } catch (err) {
            Alert.alert(t('loginErr'), t('loginErrNetwork'));
        } finally {
            setLoading(false);
        }
    }

    return (
        <Layout className="justify-center">
            <View className="p-6 rounded-3xl shadow-lg mb-6" style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
                <View className="mb-8 items-center">
                    <Text className="text-3xl font-bold mb-2" style={{ color: colors.text }}>
                        {t('loginTitle')}
                    </Text>
                    <Text className="text-base font-medium" style={{ color: colors.textSub }}>
                        {t('loginSub')}
                    </Text>
                </View>

                <Input
                    label={t('loginEmailLabel')}
                    placeholder="exemplu@email.com"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                />

                <Input
                    label={t('loginPasswordLabel')}
                    placeholder="******"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />

                <View className="mt-4">
                    <Button title={t('loginBtn')} onPress={handleLogin} loading={loading} />
                    <View className="mt-4">
                        <Button title={t('loginNoAccount')} onPress={() => navigation.navigate('Register')} variant="ghost" />
                    </View>
                </View>
            </View>
        </Layout>
    );
}
