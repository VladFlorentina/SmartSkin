import React, { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import Input from '../components/Input';
import Button from '../components/Button';

export default function LoginScreen({ onRegisterPress }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleLogin() {
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            Alert.alert('Authentication Error', error.message);
        }
        setLoading(false);
    }

    return (
        <Layout className="justify-center">
            <View className="bg-white p-6 rounded-3xl shadow-brand-100 shadow-lg mb-6">
                <View className="mb-8 items-center">
                    <Text className="text-3xl font-bold text-brand-900 mb-2">
                        Welcome Back!
                    </Text>
                    <Text className="text-brand-400 text-base font-medium">
                        Sign in to your SmartSkin account
                    </Text>
                </View>

                <Input
                    label="Email"
                    placeholder="example@email.com"
                    value={email}
                    onChangeText={setEmail}
                />

                <Input
                    label="Password"
                    placeholder="******"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />

                <View className="mt-4">
                    <Button
                        title="Sign In"
                        onPress={handleLogin}
                        loading={loading}
                    />

                    <View className="mt-4">
                        <Button
                            title="Don't have an account? Sign Up"
                            onPress={onRegisterPress}
                            variant="ghost"
                        />
                    </View>
                </View>
            </View>
        </Layout>
    );
}
