import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';

export default function Button({ onPress, title, loading = false, variant = 'primary', disabled = false, className = '' }) {
    
    const baseStyle = "p-4 rounded-2xl items-center justify-center shadow-sm active:opacity-80";

    const variants = {
        primary: "bg-brand-500 shadow-brand-200",
        secondary: "bg-white/90 border border-brand-200 shadow-none",
        outline: "border-2 border-brand-300 bg-white/70 shadow-none",
        ghost: "bg-transparent shadow-none"
    };

    const textStyles = {
        primary: "text-white font-bold text-lg",
        secondary: "text-brand-900 font-bold text-lg",
        outline: "text-brand-800 font-bold text-lg",
        ghost: "text-brand-700 font-medium text-base"
    };

    const isDisabled = loading || disabled;

    return (
        <TouchableOpacity
            onPress={onPress}
            className={`${baseStyle} ${variants[variant] || variants.primary} ${isDisabled ? 'opacity-50' : ''} ${className}`}
            disabled={isDisabled}
        >
            {loading ? (
                <ActivityIndicator color={variant === 'primary' ? '#FFFFFF' : '#BE185D'} />
            ) : (
                <Text className={textStyles[variant] || textStyles.primary}>
                    {title}
                </Text>
            )}
        </TouchableOpacity>
    );
}
