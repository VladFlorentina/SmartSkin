import React, { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import Input from '../components/Input';
import Button from '../components/Button';

export default function LoginScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleLogin() {
        setLoading(true);

        const cleanEmail = email.trim();

        const { error } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
        });

        if (error) {
            Alert.alert('Eroare de autentificare', error.message);
        }
        setLoading(false);
    }

    return (
        <Layout className="justify-center">
            <View className="bg-white p-6 rounded-3xl shadow-brand-100 shadow-lg mb-6">
                <View className="mb-8 items-center">
                    <Text className="text-3xl font-bold text-brand-900 mb-2">
                        Bine ai revenit!
                    </Text>
                    <Text className="text-brand-400 text-base font-medium">
                        Conecteaza-te la contul tau SmartSkin
                    </Text>
                </View>

                <Input
                    label="Email"
                    placeholder="exemplu@email.com"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                />

                <Input
                    label="Parola"
                    placeholder="******"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />

                <View className="mt-4">
                    <Button
                        title="Autentificare"
                        onPress={handleLogin}
                        loading={loading}
                    />

                    <View className="mt-4">
                        <Button
                            title="Nu ai cont? Inregistreaza-te"
                            onPress={() => navigation.navigate('Register')}
                            variant="ghost"
                        />
                    </View>
                </View>
            </View>
        </Layout>
    );
}
