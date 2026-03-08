import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { sendChatMessage } from '../lib/api';
import { useApp } from '../lib/AppContext';

export default function ChatScreen({ navigation, route }) {
    const { product } = route.params || {};
    const { t, colors, lang } = useApp();
    const [messages, setMessages] = useState([
        {
            id: '1',
            text: lang === 'en'
                ? `Hi! I am CosmetiBot 🤖\n\nI am now analyzing **${product?.name || 'this product'}**.\nIt has a safety score of **${product?.analysis?.safetyScore || 'N/A'}/100**.\n\nFeel free to ask me anything about the ingredients or their impact on your skin!`
                : `Salut! Sunt CosmetiBot 🤖\n\nAnalizez acum **${product?.name || 'acest produs'}**.\nAre un scor de siguranta de **${product?.analysis?.safetyScore || 'N/A'}/100**.\n\nPui-mi orice intrebare despre ingrediente sau impactul lor asupra tenului tau!`,
            sender: 'ai'
        }
    ]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const flatListRef = useRef(null);
    const msgIdRef = useRef(1); // contor atomic pentru ID-uri unice (mesajul de greeting are id '1')

    const handleSend = async () => {
        if (!inputText.trim()) return;

        const userMsg = { id: String(++msgIdRef.current), text: inputText.trim(), sender: 'user' };
        setMessages(prev => [...prev, userMsg]);
        setInputText('');
        setIsLoading(true);

        try {
            // Trimitem mesajul + istoricul conversatiei (fara primul mesaj de greeting, max 20 mesaje)
            const conversationHistory = messages.slice(Math.max(1, messages.length - 20));
            const answer = await sendChatMessage(userMsg.text, product, conversationHistory, lang);

            const aiMsg = { id: String(++msgIdRef.current), text: answer, sender: 'ai' };
            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            const errorMsg = { id: String(++msgIdRef.current), text: t('chatError'), sender: 'ai' };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    const renderMessage = ({ item }) => {
        const isUser = item.sender === 'user';
        // Markdown style for AI bubble - adapts text color to dark/light mode
        const mdStyles = {
            body: { color: colors.aiText, fontSize: 14, lineHeight: 22 },
            strong: { color: colors.aiText, fontWeight: 'bold' },
            em: { color: colors.aiText, fontStyle: 'italic' },
            paragraph: { marginTop: 0, marginBottom: 6 },
            list_item: { color: colors.aiText, fontSize: 14 },
            bullet_list: { marginTop: 2 },
        };
        return (
            <View className={`mb-4 max-w-[85%] ${isUser ? 'self-end' : 'self-start'}`}>
                <View
                    className={`p-4 rounded-3xl ${isUser ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
                    style={{
                        backgroundColor: isUser ? colors.userBubble : colors.aiBubble,
                        borderWidth: isUser ? 0 : 1,
                        borderColor: colors.border,
                        // Subtle shadow for AI bubble
                        shadowColor: '#000',
                        shadowOpacity: isUser ? 0 : 0.05,
                        shadowRadius: 4,
                        elevation: isUser ? 0 : 2,
                    }}
                >
                    {isUser ? (
                        // User messages: plain white text
                        <Text style={{ color: '#FFFFFF', fontSize: 14, lineHeight: 22 }}>
                            {item.text}
                        </Text>
                    ) : (
                        // AI messages: render markdown - fixes **bold** and *italic* showing as asterisks
                        <Markdown style={mdStyles}>{item.text}</Markdown>
                    )}
                </View>
                <Text className={`text-[10px] text-brand-300 mt-1 ${isUser ? 'text-right mr-2' : 'ml-2'}`}>
                    {isUser ? t('chatYou') : 'CosmetiBot ✨'}
                </Text>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            className="flex-1"
            style={{ backgroundColor: colors.bg }}
        >
            {/* Header */}
            <View
                className="pt-12 pb-4 px-6 flex-row items-center border-b shadow-sm z-10"
                style={{ backgroundColor: colors.header, borderColor: colors.border }}
            >
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    className="w-10 h-10 rounded-full items-center justify-center mr-4"
                    style={{ backgroundColor: colors.bg }}
                >
                    <Text className="text-brand-500 font-bold text-lg">←</Text>
                </TouchableOpacity>
                <View>
                    <Text className="text-lg font-bold" style={{ color: colors.text }}>CosmetiBot</Text>
                    <Text className="text-xs font-medium" style={{ color: colors.textSub }}>{t('chatSubtitle')}</Text>
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
                style={{ backgroundColor: colors.bg }}
            />

            {/* Input Area */}
            <View
                className="px-6 py-4 border-t flex-row items-center"
                style={{ backgroundColor: colors.header, borderColor: colors.border }}
            >
                <TextInput
                    style={{
                        flex: 1,
                        borderRadius: 24,
                        paddingHorizontal: 20,
                        paddingVertical: 12,
                        marginRight: 12,
                        backgroundColor: colors.inputBg,
                        color: colors.inputText,
                        borderWidth: 1,
                        borderColor: colors.border,
                        fontSize: 14,
                        maxHeight: 120,
                    }}
                    placeholder={t('chatPlaceholder')}
                    placeholderTextColor={colors.placeholder}
                    value={inputText}
                    onChangeText={setInputText}
                    multiline
                    maxLength={500}
                />

                <TouchableOpacity
                    onPress={handleSend}
                    disabled={isLoading || !inputText.trim()}
                    className="w-12 h-12 rounded-full items-center justify-center"
                    style={{ backgroundColor: isLoading || !inputText.trim() ? '#F0D9E0' : '#FB7185' }}
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
