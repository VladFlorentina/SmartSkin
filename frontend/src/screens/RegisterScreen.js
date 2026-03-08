import React, { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import Input from '../components/Input';
import Button from '../components/Button';
import { useApp } from '../lib/AppContext';

export default function RegisterScreen({ navigation }) {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { t, colors } = useApp();

    async function handleRegister() {
        if (!fullName.trim()) { Alert.alert(t('registerErr'), t('registerErrNoName')); return; }
        if (!email.trim() || !email.includes('@')) { Alert.alert(t('registerErr'), t('registerErrInvalidEmail')); return; }
        if (password.length < 6) { Alert.alert(t('registerErr'), t('registerErrPasswordShort')); return; }
        setLoading(true);
        try {
            const { error } = await supabase.auth.signUp({
                email: email.trim(),
                password,
                options: { data: { full_name: fullName.trim() } },
            });
            if (error) { Alert.alert(t('registerErr'), error.message); }
            else { Alert.alert(t('registerSuccessTitle'), t('registerSuccessMsg')); }
        } catch (err) {
            Alert.alert(t('registerErr'), t('registerErrNetwork'));
        } finally {
            setLoading(false);
        }
    }

    return (
        <Layout className="justify-center">
            <View className="p-6 rounded-3xl shadow-lg mb-6" style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
                <View className="mb-8 items-center">
                    <Text className="text-3xl font-bold mb-2" style={{ color: colors.text }}>
                        {t('registerTitle')}
                    </Text>
                    <Text className="text-base font-medium" style={{ color: colors.textSub }}>
                        {t('registerSub')}
                    </Text>
                </View>

                <Input label={t('registerNameLabel')} placeholder={t('registerNamePlaceholder')} value={fullName} onChangeText={setFullName} autoCapitalize="words" />
                <Input label={t('registerEmailLabel')} placeholder="exemplu@email.com" value={email} onChangeText={setEmail} keyboardType="email-address" />
                <Input label={t('registerPasswordLabel')} placeholder="******" value={password} onChangeText={setPassword} secureTextEntry />

                <View className="mt-4">
                    <Button title={t('registerBtn')} onPress={handleRegister} loading={loading} />
                    <View className="mt-4">
                        <Button title={t('registerHasAccount')} onPress={() => navigation.navigate('Login')} variant="ghost" />
                    </View>
                </View>
            </View>
        </Layout>
    );
}
