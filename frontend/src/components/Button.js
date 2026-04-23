import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { useApp } from '../lib/AppContext';

export default function Button({ onPress, title, loading = false, variant = 'primary', disabled = false, style = {}, textStyle = {} }) {
    const { colors } = useApp();
    const isDisabled = loading || disabled;

    let bgStyle = {};
    let txtStyle = {};

    switch (variant) {
        case 'primary':
            bgStyle = { backgroundColor: colors.primary };
            txtStyle = { color: colors.bg, fontWeight: 'bold', fontSize: 18 };
            break;
        case 'secondary':
            bgStyle = { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border };
            txtStyle = { color: colors.text, fontWeight: 'bold', fontSize: 18 };
            break;
        case 'outline':
            bgStyle = { backgroundColor: 'transparent', borderWidth: 2, borderColor: colors.primary };
            txtStyle = { color: colors.primary, fontWeight: 'bold', fontSize: 18 };
            break;
        case 'ghost':
            bgStyle = { backgroundColor: 'transparent' };
            txtStyle = { color: colors.text, fontWeight: '500', fontSize: 16 };
            break;
    }

    return (
        <TouchableOpacity
            onPress={onPress}
            style={[{ padding: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, bgStyle, isDisabled ? { opacity: 0.5 } : {}, style]}
            disabled={isDisabled}
        >
            {loading ? (
                <ActivityIndicator color={variant === 'primary' ? colors.bg : colors.primary} />
            ) : (
                <Text style={[txtStyle, textStyle]}>
                    {title}
                </Text>
            )}
        </TouchableOpacity>
    );
}
