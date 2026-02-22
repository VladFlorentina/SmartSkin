import React, { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import Input from '../components/Input';
import Button from '../components/Button';

export default function RegisterScreen({ navigation }) {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleRegister() {
        if (!fullName) {
            Alert.alert('Eroare', 'Te rugam sa introduci numele complet.');
            return;
        }

        setLoading(true);

        const cleanEmail = email.trim();
        const cleanFullName = fullName.trim();

        // Trimitem full_name in metadata pentru a fi preluat de trigger-ul din backend
        const { error } = await supabase.auth.signUp({
            email: cleanEmail,
            password,
            options: {
                data: {
                    full_name: fullName,
                },
            },
        });

        if (error) {
            Alert.alert('Eroare la inregistrare', error.message);
        } else {
            Alert.alert('Succes!', 'Contul a fost creat cu succes. Verifica-ti email-ul pentru confirmare.');
        }
        setLoading(false);
    }

    return (
        <Layout className="justify-center">
            <View className="bg-white p-6 rounded-3xl shadow-brand-100 shadow-lg mb-6">
                <View className="mb-8 items-center">
                    <Text className="text-3xl font-bold text-brand-900 mb-2">
                        Creeaza Cont
                    </Text>
                    <Text className="text-brand-400 text-base font-medium">
                        Incepe-ti calatoria spre ingrijire sigura
                    </Text>
                </View>

                <Input
                    label="Nume complet"
                    placeholder="Maria Popescu"
                    value={fullName}
                    onChangeText={setFullName}
                />

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
                        title="Inregistrare"
                        onPress={handleRegister}
                        loading={loading}
                    />

                    <View className="mt-4">
                        <Button
                            title="Ai deja cont? Autentifica-te"
                            onPress={() => navigation.navigate('Login')}
                            variant="ghost"
                        />
                    </View>
                </View>
            </View>
        </Layout>
    );
}
