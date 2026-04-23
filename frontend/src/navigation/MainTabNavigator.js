import React from 'react';
import { View, TouchableOpacity, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../lib/AppContext';

import HomeScreen from '../screens/HomeScreen';
import HistoryScreen from '../screens/HistoryScreen';
import SearchScreen from '../screens/SearchScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

const CustomScanButton = ({ children, onPress, colors }) => (
    <TouchableOpacity
        style={{
            top: -20,
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: colors.primary,
            shadowOpacity: 0.3,
            shadowOffset: { width: 0, height: 4 },
            shadowRadius: 5,
            elevation: 5,
        }}
        onPress={onPress}
        activeOpacity={0.8}
    >
        <View style={{
            width: 65,
            height: 65,
            borderRadius: 35,
            backgroundColor: colors.primary,
            justifyContent: 'center',
            alignItems: 'center'
        }}>
            <Ionicons name="scan" size={32} color={colors.bg} />
        </View>
    </TouchableOpacity>
);

export default function MainTabNavigator({ navigation }) {
    const { colors, t } = useApp();

    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarShowLabel: true,
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textMuted,
                tabBarStyle: {
                    position: 'absolute',
                    bottom: 0,
                    elevation: 0,
                    backgroundColor: colors.card,
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                    height: Platform.OS === 'ios' ? 95 : 85,
                    paddingBottom: Platform.OS === 'ios' ? 25 : 20,
                    paddingTop: 10,
                },
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontWeight: '600',
                    marginTop: 4,
                }
            }}
        >
            <Tab.Screen 
                name="HomeTab" 
                component={HomeScreen} 
                options={{
                    tabBarLabel: t('scannerHome') || 'Acasă',
                    tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} />,
                    tabBarStyle: { display: 'none' }
                }} 
            />
            <Tab.Screen 
                name="HistoryTab" 
                component={HistoryScreen} 
                options={{
                    tabBarLabel: t('scannerHistory') || 'Istoric',
                    tabBarIcon: ({ color }) => <Ionicons name="book" size={24} color={color} />
                }} 
            />
            
            {/* The Floating Center Scan Button */}
            <Tab.Screen 
                name="ScannerTabDummy" 
                component={View} 
                options={{
                    tabBarLabel: '',
                    tabBarIcon: () => null,
                    tabBarButton: (props) => (
                        <CustomScanButton 
                            {...props} 
                            colors={colors} 
                            onPress={() => navigation.navigate('Scanner')} 
                        />
                    )
                }} 
            />

            <Tab.Screen 
                name="SearchTab" 
                component={SearchScreen} 
                options={{
                    tabBarLabel: t('homeActionSearchTitle') || 'Caută',
                    tabBarIcon: ({ color }) => <Ionicons name="search" size={24} color={color} />
                }} 
            />
            <Tab.Screen 
                name="ProfileTab" 
                component={ProfileScreen} 
                options={{
                    tabBarLabel: t('scannerProfile') || 'Profil',
                    tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color} />
                }} 
            />
        </Tab.Navigator>
    );
}
