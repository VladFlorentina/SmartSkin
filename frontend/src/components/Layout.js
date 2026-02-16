import { View, SafeAreaView, Platform, StatusBar as RNStatusBar } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function Layout({ children, className = "" }) {
    const paddingTop = Platform.OS === "android" ? RNStatusBar.currentHeight : 0;

    return (
        // Fundal roz pal (brand-50) pentru toata aplicatia
        <SafeAreaView className="flex-1 bg-brand-50" style={{ paddingTop }}>
            <StatusBar style="dark" />
            <View className={`flex-1 px-6 ${className}`}>
                {children}
            </View>
        </SafeAreaView>
    );
}
