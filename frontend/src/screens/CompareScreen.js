import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { fetchProductDetails } from '../lib/api';
import { useApp } from '../lib/AppContext';

function summarizeProduct(product) {
    const ingredients = product?.analysis?.ingredientsBreakdown || [];
    const counts = ingredients.reduce(
        (acc, item) => {
            const category = item.riskCategory || 'unknown';
            if (category === 'safe') acc.safe += 1;
            else if (category === 'restricted') acc.restricted += 1;
            else if (category === 'banned') acc.banned += 1;
            else acc.unknown += 1;
            return acc;
        },
        { safe: 0, restricted: 0, banned: 0, unknown: 0 }
    );

    const riskyIngredients = ingredients
        .filter(item => item.riskLevel >= 3)
        .slice(0, 3)
        .map(item => item.name);

    return {
        score: product?.analysis?.safetyScore ?? 0,
        baseScore: product?.analysis?.baseSafetyScore ?? product?.analysis?.safetyScore ?? 0,
        ingredientsCount: ingredients.length,
        warningsCount: product?.analysis?.warnings?.length || 0,
        personalWarningsCount: product?.analysis?.personalWarnings?.length || 0,
        scoreCap: product?.analysis?.scoreCap ?? null,
        scoreCapReason: product?.analysis?.scoreCapReason || null,
        greenwashingAlert: product?.analysis?.greenwashingAlert || null,
        counts,
        riskyIngredients,
    };
}

function MetricPill({ label, value, color, colors }) {
    return (
        <View className="rounded-2xl px-3 py-2 mr-2 mb-2" style={{ backgroundColor: color }}>
            <Text className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: colors.card }}>
                {label}
            </Text>
            <Text className="text-sm font-black" style={{ color: colors.card }}>
                {value}
            </Text>
        </View>
    );
}

function ProductCard({ product, summary, colors, lang, title }) {
    return (
        <View className="rounded-3xl p-5 shadow-sm mb-4" style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
            <Text className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: colors.textSub }}>
                {title}
            </Text>
            <Text className="text-xl font-black" style={{ color: colors.text }} numberOfLines={2}>
                {product?.name || (lang === 'en' ? 'Unknown product' : 'Produs necunoscut')}
            </Text>
            <Text className="text-sm mt-1 mb-4" style={{ color: colors.textSub }}>
                {product?.brand || (lang === 'en' ? 'Unknown brand' : 'Brand necunoscut')}
            </Text>

            <View className="flex-row flex-wrap">
                <MetricPill label={lang === 'en' ? 'Safety' : 'Siguranță'} value={`${summary.score}/100`} color="#FB7185" colors={colors} />
                <MetricPill label={lang === 'en' ? 'Ingredients' : 'Ingrediente'} value={summary.ingredientsCount} color="#60A5FA" colors={colors} />
                <MetricPill label={lang === 'en' ? 'Warnings' : 'Avertizări'} value={summary.warningsCount} color="#F59E0B" colors={colors} />
                <MetricPill label={lang === 'en' ? 'Banned' : 'Interzise'} value={summary.counts.banned} color="#EF4444" colors={colors} />
                <MetricPill label={lang === 'en' ? 'Restricted' : 'Restricționate'} value={summary.counts.restricted} color="#F97316" colors={colors} />
                <MetricPill label={lang === 'en' ? 'Unknown' : 'Necunoscute'} value={summary.counts.unknown} color="#94A3B8" colors={colors} />
            </View>

            {!!summary.scoreCapReason && (
                <View className="mt-3 rounded-2xl p-3" style={{ backgroundColor: '#FFF7ED' }}>
                    <Text className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#C2410C' }}>
                        {lang === 'en' ? 'Score cap' : 'Limită scor'}
                    </Text>
                    <Text className="text-sm" style={{ color: '#9A3412' }}>
                        {summary.scoreCapReason}
                    </Text>
                </View>
            )}

            {!!summary.greenwashingAlert?.flagged && (
                <View className="mt-3 rounded-2xl p-3" style={{ backgroundColor: '#FFF1F2' }}>
                    <Text className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#BE185D' }}>
                        {lang === 'en' ? 'Greenwashing alert' : 'Alertă greenwashing'}
                    </Text>
                    <Text className="text-sm" style={{ color: '#9D174D' }}>
                        {lang === 'en' ? summary.greenwashingAlert.messageEn : summary.greenwashingAlert.messageRo}
                    </Text>
                </View>
            )}

            {summary.riskyIngredients.length > 0 && (
                <View className="mt-3">
                    <Text className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: colors.textSub }}>
                        {lang === 'en' ? 'Top risky ingredients' : 'Ingrediente cu risc'}
                    </Text>
                    <Text className="text-sm leading-relaxed" style={{ color: colors.text }}>
                        {summary.riskyIngredients.join(', ')}
                    </Text>
                </View>
            )}
        </View>
    );
}

export default function CompareScreen({ navigation, route }) {
    const { barcodes = [] } = route.params || {};
    const { colors, lang } = useApp();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [products, setProducts] = useState([]);

    useEffect(() => {
        let active = true;

        async function load() {
            try {
                setLoading(true);
                setError(null);

                const results = await Promise.all(barcodes.slice(0, 2).map((barcode) => fetchProductDetails(barcode, lang)));
                if (active) setProducts(results);
            } catch (err) {
                if (active) setError(err.message || (lang === 'en' ? 'Could not load comparison' : 'Nu am putut încărca comparația'));
            } finally {
                if (active) setLoading(false);
            }
        }

        if (barcodes.length >= 2) {
            load();
        } else {
            setError(lang === 'en' ? 'Select two products to compare.' : 'Selectează două produse pentru comparație.');
            setLoading(false);
        }

        return () => {
            active = false;
        };
    }, [barcodes, lang]);

    const left = products[0];
    const right = products[1];
    const leftSummary = left ? summarizeProduct(left) : null;
    const rightSummary = right ? summarizeProduct(right) : null;

    const saferSide = leftSummary && rightSummary
        ? leftSummary.score > rightSummary.score
            ? 0
            : leftSummary.score < rightSummary.score
                ? 1
                : null
        : null;

    return (
        <View className="flex-1" style={{ backgroundColor: colors.bg }}>
            <View className="pt-12 pb-5 px-6 flex-row items-center border-b" style={{ backgroundColor: colors.header, borderColor: colors.border }}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    className="w-10 h-10 rounded-full items-center justify-center mr-4"
                    style={{ backgroundColor: colors.bg }}
                >
                    <Text className="text-brand-500 font-bold text-lg">←</Text>
                </TouchableOpacity>
                <View>
                    <Text className="text-2xl font-black" style={{ color: colors.text }}>
                        {lang === 'en' ? 'Risk Comparison' : 'Comparație de risc'}
                    </Text>
                    <Text className="text-xs font-medium" style={{ color: colors.textSub }}>
                        {lang === 'en' ? 'Direct product-to-product analysis' : 'Analiză directă între produse'}
                    </Text>
                </View>
            </View>

            {loading ? (
                <View className="flex-1 items-center justify-center px-6">
                    <ActivityIndicator size="large" color="#FB7185" />
                    <Text className="mt-4 font-medium" style={{ color: colors.textSub }}>
                        {lang === 'en' ? 'Loading comparison...' : 'Încărcăm comparația...'}
                    </Text>
                </View>
            ) : error ? (
                <View className="flex-1 items-center justify-center px-6">
                    <Text className="text-3xl mb-3">😔</Text>
                    <Text className="text-center font-bold" style={{ color: colors.text }}>
                        {error}
                    </Text>
                </View>
            ) : (
                <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
                    <View className="rounded-3xl p-4 mb-4 border" style={{ backgroundColor: '#FFF7ED', borderColor: '#FDBA74' }}>
                        <Text className="font-bold mb-1" style={{ color: '#9A3412' }}>
                            {lang === 'en' ? 'Who is safer?' : 'Care este mai sigur?'}
                        </Text>
                        <Text className="text-sm leading-relaxed" style={{ color: '#B45309' }}>
                            {saferSide === null
                                ? (lang === 'en' ? 'The products have the same safety score.' : 'Produsele au același scor de siguranță.')
                                : (lang === 'en'
                                    ? `${saferSide === 0 ? left?.name : right?.name} looks safer based on the current analysis.`
                                    : `${saferSide === 0 ? left?.name : right?.name} pare mai sigur pe baza analizei curente.`)}
                        </Text>
                    </View>

                    <ProductCard
                        title={lang === 'en' ? 'Product A' : 'Produsul A'}
                        product={left}
                        summary={leftSummary}
                        colors={colors}
                        lang={lang}
                    />
                    <ProductCard
                        title={lang === 'en' ? 'Product B' : 'Produsul B'}
                        product={right}
                        summary={rightSummary}
                        colors={colors}
                        lang={lang}
                    />
                </ScrollView>
            )}
        </View>
    );
}
