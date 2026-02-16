import { View, TextInput, Text } from 'react-native';

export default function Input({
    label,
    value,
    onChangeText,
    placeholder,
    secureTextEntry = false,
    error
}) {
    return (
        <View className="mb-5">
            {label && (
                <Text className="text-brand-900 font-medium mb-2 ml-1">
                    {label}
                </Text>
            )}
            <TextInput
                className={`w-full bg-white border-[1px] rounded-2xl p-4 text-gray-800 transition-all ${error ? 'border-red-400 bg-red-50' : 'border-brand-200 focus:border-brand-400 focus:bg-brand-50'}`}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor="#FDA4AF"
                secureTextEntry={secureTextEntry}
                autoCapitalize="none"
            />
            {error && (
                <Text className="text-red-500 text-sm mt-1 ml-1">
                    {error}
                </Text>
            )}
        </View>
    );
}
