import React, { useState } from 'react';
import { View, Text, Alert, TouchableOpacity } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../lib/supabase';
import Toast from 'react-native-toast-message';
import Layout from '../components/Layout';
import Input from '../components/Input';
import Button from '../components/Button';
import { useApp } from '../lib/AppContext';

export default function LoginScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const { t, colors, lang, setLanguage, setIsGuest } = useApp();

    function extractAuthParams(url) {
        const parsedUrl = new URL(url);
        const queryParams = new URLSearchParams(parsedUrl.search);
        const hashParams = new URLSearchParams(parsedUrl.hash.startsWith('#') ? parsedUrl.hash.slice(1) : '');

        return {
            code: queryParams.get('code') || hashParams.get('code'),
            access_token: queryParams.get('access_token') || hashParams.get('access_token'),
            refresh_token: queryParams.get('refresh_token') || hashParams.get('refresh_token'),
        };
    }

    async function handleGoogleLogin() {
        if (loading || googleLoading) return;

        setGoogleLoading(true);
        try {
            const redirectTo = Linking.createURL('auth/callback');
            console.log('[AUTH][GOOGLE] redirectTo =', redirectTo);

            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo,
                    skipBrowserRedirect: true,
                },
            });

            if (error) {
                console.log('[AUTH][GOOGLE] signInWithOAuth error =', error);
                throw error;
            }
            if (!data?.url) {
                console.log('[AUTH][GOOGLE] Missing auth URL from Supabase response:', data);
                throw new Error('Supabase nu a returnat URL-ul de autentificare.');
            }

            console.log('[AUTH][GOOGLE] auth url received');

            const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
            console.log('[AUTH][GOOGLE] openAuthSessionAsync result =', result);

            if (result.type !== 'success') {
                console.log('[AUTH][GOOGLE] auth session closed before redirect; type =', result.type);
                return;
            }

            const callbackUrl = result.url;

            console.log('[AUTH][GOOGLE] callback url =', callbackUrl);

            const authParams = extractAuthParams(callbackUrl);
            console.log('[AUTH][GOOGLE] parsed callback params =', authParams);

            if (authParams.code) {
                const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(authParams.code);
                if (exchangeError) {
                    console.log('[AUTH][GOOGLE] exchangeCodeForSession error =', exchangeError);
                    throw exchangeError;
                }
            } else if (authParams.access_token && authParams.refresh_token) {
                const { error: sessionError } = await supabase.auth.setSession({
                    access_token: authParams.access_token,
                    refresh_token: authParams.refresh_token,
                });
                if (sessionError) {
                    console.log('[AUTH][GOOGLE] setSession error =', sessionError);
                    throw sessionError;
                }
            } else {
                console.log('[AUTH][GOOGLE] Missing auth data in callback URL:', result.url);
                throw new Error('Nu a fost primit nici codul, nici token-ul de autentificare din callback.');
            }

            setIsGuest(false);
        } catch (err) {
            console.log('[AUTH][GOOGLE] final error =', err);
            Toast.show({ type: 'error', text1: t('loginErr'), text2: err?.message || t('loginGoogleErr') });
        } finally {
            setGoogleLoading(false);
        }
    }

    async function handleLogin() {
        const cleanEmail = email.trim();

        // Validari locale - evita request-uri inutile la Supabase
        if (!cleanEmail) {
            Toast.show({ type: 'error', text1: t('loginErr'), text2: t('loginErrNoEmail') });
            return;
        }
        if (!cleanEmail.includes('@')) {
            Toast.show({ type: 'error', text1: t('loginErr'), text2: t('loginErrInvalidEmail') });
            return;
        }
        if (!password) {
            Toast.show({ type: 'error', text1: t('loginErr'), text2: t('loginErrNoPassword') });
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
            if (error) { Toast.show({ type: 'error', text1: t('loginErr'), text2: error.message }); }
            else { setIsGuest(false); }
        } catch (err) {
            Toast.show({ type: 'error', text1: t('loginErr'), text2: t('loginErrNetwork') });
        } finally {
            setLoading(false);
        }
    }

    return (
        <Layout className="justify-center">
            <View className="p-6 rounded-3xl shadow-lg mb-6" style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
                <View className="mb-8 flex-row items-start justify-between">
                    <View className="flex-1 pr-3">
                        <Text className="text-3xl font-bold mb-2" style={{ color: colors.text }}>
                            {t('loginTitle')}
                        </Text>
                        <Text className="text-base font-medium" style={{ color: colors.textSub }}>
                            {t('loginSub')}
                        </Text>
                    </View>

                    <View className="flex-row items-center" style={{ gap: 6 }}>
                        <TouchableOpacity
                            onPress={() => setLanguage('ro')}
                            className="px-2.5 py-1.5 rounded-xl border"
                            style={{
                                backgroundColor: lang === 'ro' ? colors.primary : colors.bg,
                                borderColor: lang === 'ro' ? colors.primary : colors.border,
                            }}
                        >
                            <Text className="text-xs font-bold" style={{ color: lang === 'ro' ? colors.bg : colors.textSub }}>
                                RO
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setLanguage('en')}
                            className="px-2.5 py-1.5 rounded-xl border"
                            style={{
                                backgroundColor: lang === 'en' ? colors.primary : colors.bg,
                                borderColor: lang === 'en' ? colors.primary : colors.border,
                            }}
                        >
                            <Text className="text-xs font-bold" style={{ color: lang === 'en' ? colors.bg : colors.textSub }}>
                                EN
                            </Text>
                        </TouchableOpacity>
                    </View>
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
                    <View className="mt-3">
                        <Button
                            title={googleLoading ? t('loginGoogleLoading') : t('loginGoogleBtn')}
                            onPress={handleGoogleLogin}
                            loading={googleLoading}
                            variant="secondary"
                        />
                    </View>
                    <View className="mt-4">
                        <Button title={t('loginNoAccount')} onPress={() => navigation.navigate('Register')} variant="ghost" />
                    </View>
                    <View className="mt-2 border-t pt-4" style={{ borderColor: colors.border }}>
                        <Button 
                            title={t('loginGuest')} 
                            onPress={() => setIsGuest(true)} 
                            variant="secondary" 
                        />
                    </View>
                </View>

                <View className="mt-6 pt-4 border-t" style={{ borderColor: colors.border }}>
                </View>
            </View>
        </Layout>
    );
}
