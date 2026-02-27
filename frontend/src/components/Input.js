import { View, TextInput, Text } from 'react-native';
import { useApp } from '../lib/AppContext';

export default function Input({
    label,
    value,
    onChangeText,
    placeholder,
    secureTextEntry = false,
    error,
    keyboardType = "default",
    autoCapitalize = "none"
}) {
    const { colors } = useApp();
    return (
        <View className="mb-5">
            {label && (
                <Text className="font-medium mb-2 ml-1" style={{ color: colors.text }}>
                    {label}
                </Text>
            )}
            <TextInput
                className={`w-full rounded-2xl p-4 ${error ? 'border-red-400' : ''}`}
                style={{
                    backgroundColor: error ? '#FEF2F2' : colors.inputBg,
                    borderWidth: 1,
                    borderColor: error ? '#F87171' : colors.border,
                    color: colors.inputText,
                }}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={colors.placeholder}
                secureTextEntry={secureTextEntry}
                autoCapitalize={autoCapitalize}
                keyboardType={keyboardType}
            />
            {error && (
                <Text className="text-red-500 text-sm mt-1 ml-1">
                    {error}
                </Text>
            )}
        </View>
    );
}
