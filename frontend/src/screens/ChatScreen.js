import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { sendChatMessage } from '../lib/api';

export default function ChatScreen({ navigation, route }) {
    const { product } = route.params || {};
    const [messages, setMessages] = useState([
        {
            id: '1',
            text: `Salut! Sunt CosmetiBot 🤖\n\nAnalizez acum *${product?.name || 'acest produs'}*.\nAre un scor de siguranta de ${product?.analysis?.safetyScore || 'N/A'}/100.\n\nSimte-te liber sa imi pui intrebari despre ingrediente sau impactul lor asupra tenului tau!`,
            sender: 'ai'
        }
    ]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const flatListRef = useRef(null);

    const handleSend = async () => {
        if (!inputText.trim()) return;

        const userMsg = { id: Date.now().toString(), text: inputText.trim(), sender: 'user' };
        setMessages(prev => [...prev, userMsg]);
        setInputText('');
        setIsLoading(true);

        try {
            // Trimitem mesajul + istoricul conversatiei (fara primul mesaj de greeting al AI-ului)
            const conversationHistory = messages.slice(1); // sarim mesajul initial de bun venit
            const answer = await sendChatMessage(userMsg.text, product, conversationHistory);

            const aiMsg = { id: (Date.now() + 1).toString(), text: answer, sender: 'ai' };
            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            const errorMsg = { id: (Date.now() + 1).toString(), text: "Scuze, am intampinat o eroare de conexiune cu serverul meu AI. 😔", sender: 'ai' };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    const renderMessage = ({ item }) => {
        const isUser = item.sender === 'user';
        return (
            <View className={`mb-4 max-w-[85%] ${isUser ? 'self-end' : 'self-start'}`}>
                <View className={`p-4 rounded-3xl ${isUser ? 'bg-brand-400 rounded-tr-sm' : 'bg-white rounded-tl-sm shadow-sm border border-brand-50'}`}>
                    <Text className={isUser ? 'text-white' : 'text-brand-800'}>
                        {item.text}
                    </Text>
                </View>
                <Text className={`text-[10px] text-brand-300 mt-1 ${isUser ? 'text-right mr-2' : 'ml-2'}`}>
                    {isUser ? 'Tu' : 'CosmetiBot ✨'}
                </Text>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 bg-brand-50"
        >
            {/* Header */}
            <View className="bg-white pt-12 pb-4 px-6 flex-row items-center border-b border-brand-100 shadow-sm z-10">
                <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 bg-brand-50 rounded-full items-center justify-center mr-4">
                    <Text className="text-brand-500 font-bold text-lg">←</Text>
                </TouchableOpacity>
                <View>
                    <Text className="text-lg font-bold text-brand-900">CosmetiBot</Text>
                    <Text className="text-xs text-brand-400 font-medium">Asistent AI Dermatologic</Text>
                </View>
            </View>

            {/* Chat List */}
            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={item => item.id}
                renderItem={renderMessage}
                contentContainerStyle={{ padding: 24, paddingBottom: 10 }}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />

            {/* Input Area */}
            <View className="bg-white px-6 py-4 border-t border-brand-100 flex-row items-center">
                <TextInput
                    className="flex-1 bg-brand-50 border border-brand-100 rounded-3xl px-5 py-3 text-brand-900 mr-3"
                    placeholder="Intreaba ceva..."
                    placeholderTextColor="#A1A1AA"
                    value={inputText}
                    onChangeText={setInputText}
                    multiline
                    maxLength={500}
                />

                <TouchableOpacity
                    onPress={handleSend}
                    disabled={isLoading || !inputText.trim()}
                    className={`w-12 h-12 rounded-full items-center justify-center ${isLoading || !inputText.trim() ? 'bg-brand-200' : 'bg-brand-500 shadow-md shadow-brand-200'}`}
                >
                    {isLoading ? (
                        <ActivityIndicator color="white" size="small" />
                    ) : (
                        <Text className="text-white font-bold text-xl">➤</Text>
                    )}
                </TouchableOpacity>
            </View>

        </KeyboardAvoidingView>
    );
}
