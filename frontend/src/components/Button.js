import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';

export default function Button({ onPress, title, loading = false, variant = 'primary' }) {
    // Stiluri de baza: rotunjit mai mult (rounded-2xl) pentru aspect "soft"
    const baseStyle = "p-4 rounded-2xl items-center justify-center shadow-sm active:opacity-80";

    const variants = {
        primary: "bg-brand-400 shadow-brand-200", // Roz principal
        secondary: "bg-brand-100", // Roz pal secundar
        outline: "border-2 border-brand-400 bg-transparent",
        ghost: "bg-transparent shadow-none"
    };

    const textStyles = {
        primary: "text-white font-bold text-lg",
        secondary: "text-brand-900 font-bold text-lg",
        outline: "text-brand-500 font-bold text-lg",
        ghost: "text-brand-500 font-medium text-base"
    };

    return (
        <TouchableOpacity
            onPress={onPress}
            className={`${baseStyle} ${variants[variant] || variants.primary} ${loading ? 'opacity-70' : ''}`}
            disabled={loading}
        >
            {loading ? (
                <ActivityIndicator color={variant === 'outline' || variant === 'ghost' ? '#FB7185' : '#FFFFFF'} />
            ) : (
                <Text className={textStyles[variant] || textStyles.primary}>
                    {title}
                </Text>
            )}
        </TouchableOpacity>
    );
}
