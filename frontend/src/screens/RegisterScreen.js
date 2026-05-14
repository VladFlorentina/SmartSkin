import React, { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import Toast from 'react-native-toast-message';
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
        if (!fullName.trim()) { Toast.show({ type: 'error', text1: t('registerErr'), text2: t('registerErrNoName') }); return; }
        if (!email.trim() || !email.includes('@')) { Toast.show({ type: 'error', text1: t('registerErr'), text2: t('registerErrInvalidEmail') }); return; }
        if (password.length < 6) { Toast.show({ type: 'error', text1: t('registerErr'), text2: t('registerErrPasswordShort') }); return; }
        setLoading(true);
        try {
            const { error } = await supabase.auth.signUp({
                email: email.trim(),
                password,
                options: { data: { full_name: fullName.trim() } },
            });
            if (error) { Toast.show({ type: 'error', text1: t('registerErr'), text2: error.message }); }
            else { Toast.show({ type: 'success', text1: t('registerSuccessTitle'), text2: t('registerSuccessMsg') }); }
        } catch (err) {
            Toast.show({ type: 'error', text1: t('registerErr'), text2: t('registerErrNetwork') });
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
