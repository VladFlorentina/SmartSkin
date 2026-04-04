import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { AppContext } from '../lib/AppContext';

/**
 * ErrorBoundary - prinde erori neasteptate in componentele React
 * si afiseaza un ecran de fallback in loc sa crape toata aplicatia.
 */
export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        
        console.error('[ErrorBoundary] Eroare prinsa:', error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <AppContext.Consumer>
                    {(ctx) => {
                        const t = ctx?.t ?? ((k) => k);
                        return (
                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#FFF1F2' }}>
                                <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#881337', textAlign: 'center', marginBottom: 8 }}>
                                    {t('errorBoundaryTitle')}
                                </Text>
                                <Text style={{ fontSize: 14, color: '#9F1239', textAlign: 'center', marginBottom: 24, lineHeight: 20 }}>
                                    {t('errorBoundaryMsg')}
                                </Text>
                                <TouchableOpacity
                                    onPress={this.handleReset}
                                    style={{
                                        backgroundColor: '#FB7185',
                                        paddingHorizontal: 32,
                                        paddingVertical: 14,
                                        borderRadius: 16,
                                    }}
                                >
                                    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>
                                        {t('errorBoundaryBtn')}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        );
                    }}
                </AppContext.Consumer>
            );
        }

        return this.props.children;
    }
}
