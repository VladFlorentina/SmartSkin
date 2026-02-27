import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../lib/AppContext';

export default function Layout({ children, className = "" }) {
    const { colors, isDark } = useApp();

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: colors.bg }}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <View className={`flex-1 px-6 ${className}`}>
                {children}
            </View>
        </SafeAreaView>
    );
}
