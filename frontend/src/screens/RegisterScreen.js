import React, { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import Input from '../components/Input';
import Button from '../components/Button';

export default function RegisterScreen({ onLoginPress }) {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleRegister() {
        if (!fullName) {
            Alert.alert('Error', 'Please enter your full name.');
            return;
        }

        setLoading(true);

        // Trimitem full_name in metadata pentru a fi preluat de trigger-ul din backend
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                },
            },
        });

        if (error) {
            Alert.alert('Registration Error', error.message);
        } else {
            Alert.alert('Success!', 'Account created successfully. Please check your email for confirmation.');
        }
        setLoading(false);
    }

    return (
        <Layout className="justify-center">
            <View className="bg-white p-6 rounded-3xl shadow-brand-100 shadow-lg mb-6">
                <View className="mb-8 items-center">
                    <Text className="text-3xl font-bold text-brand-900 mb-2">
                        Create Account
                    </Text>
                    <Text className="text-brand-400 text-base font-medium">
                        Start your beauty journey
                    </Text>
                </View>

                <Input
                    label="Full Name"
                    placeholder="Maria Popescu"
                    value={fullName}
                    onChangeText={setFullName}
                />

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
                        title="Sign Up"
                        onPress={handleRegister}
                        loading={loading}
                    />

                    <View className="mt-4">
                        <Button
                            title="Already have an account? Sign In"
                            onPress={onLoginPress}
                            variant="ghost"
                        />
                    </View>
                </View>
            </View>
        </Layout>
    );
}
