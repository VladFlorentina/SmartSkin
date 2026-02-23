import { View, TextInput, Text } from 'react-native';

export default function Input({
    label,
    value,
    onChangeText,
    placeholder,
    secureTextEntry = false,
    error,
    keyboardType = "default"
}) {
    return (
        <View className="mb-5">
            {label && (
                <Text className="text-brand-900 font-medium mb-2 ml-1">
                    {label}
                </Text>
            )}
            <TextInput
                className={`w-full bg-white border rounded-2xl p-4 text-gray-800 ${error ? 'border-red-400 bg-red-50' : 'border-brand-200'}`}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor="#E89BBF"
                secureTextEntry={secureTextEntry}
                autoCapitalize="none"
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
