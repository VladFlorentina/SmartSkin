import { View, SafeAreaView, Platform, StatusBar as RNStatusBar } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useApp } from '../lib/AppContext';

export default function Layout({ children, className = "" }) {
    const paddingTop = Platform.OS === "android" ? RNStatusBar.currentHeight : 0;
    const { colors, isDark } = useApp();

    return (
        <SafeAreaView className="flex-1" style={{ paddingTop, backgroundColor: colors.bg }}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <View className={`flex-1 px-6 ${className}`}>
                {children}
            </View>
        </SafeAreaView>
    );
}
