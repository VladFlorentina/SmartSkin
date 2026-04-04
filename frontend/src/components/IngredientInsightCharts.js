import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle, Line, Path, Polygon, Text as SvgText } from 'react-native-svg';

const CATEGORY_META = {
    safe: { color: '#4ADE80' },
    restricted: { color: '#F59E0B' },
    banned: { color: '#FB7185' },
    unknown: { color: '#CBD5E1' },
};

const FUNCTION_GROUPS = [
    {
        key: 'emollient',
        color: '#FB7185',
        labelRo: 'Emolienți',
        labelEn: 'Emollients',
        patterns: ['EMOLLIENT', 'SKIN CONDITIONING', 'OCCLUSIVE', 'SOFTENING'],
    },
    {
        key: 'humectant',
        color: '#60A5FA',
        labelRo: 'Hidratanti',
        labelEn: 'Humectants',
        patterns: ['HUMECTANT', 'MOISTURIZING', 'MOISTURISING', 'HYDRATING', 'WATER BINDING'],
    },
    {
        key: 'preservative',
        color: '#F97316',
        labelRo: 'Conservanți',
        labelEn: 'Preservatives',
        patterns: ['PRESERVATIVE', 'ANTIMICROBIAL', 'ANTISEPTIC', 'PARABEN', 'ISOTHIAZOLINONE', 'FORMALDEHYDE'],
    },
    {
        key: 'surfactant',
        color: '#A78BFA',
        labelRo: 'Surfactanți',
        labelEn: 'Surfactants',
        patterns: ['SURFACTANT', 'CLEANSING', 'CLEANING', 'FOAMING', 'DETERGENT'],
    },
    {
        key: 'fragrance',
        color: '#EC4899',
        labelRo: 'Parfumuri',
        labelEn: 'Fragrance',
        patterns: ['FRAGRANCE', 'PERFUMING', 'PARFUM', 'AROMA'],
    },
    {
        key: 'active',
        color: '#10B981',
        labelRo: 'Activi',
        labelEn: 'Actives',
        patterns: ['PEPTIDE', 'RETIN', 'ACID', 'VITAMIN', 'ANTIOXIDANT', 'UV FILTER', 'BRIGHTENING', 'EXFOLIANT'],
    },
    {
        key: 'solvent',
        color: '#94A3B8',
        labelRo: 'Solvenți',
        labelEn: 'Solvents',
        patterns: ['SOLVENT', 'DISSOLVING', 'ALCOHOL'],
    },
    {
        key: 'thickener',
        color: '#F59E0B',
        labelRo: 'Texturizanți',
        labelEn: 'Thickeners',
        patterns: ['THICKEN', 'VISCOSITY', 'GELLING', 'STABILIZ', 'FILM FORMING'],
    },
    {
        key: 'other',
        color: '#CBD5E1',
        labelRo: 'Altele',
        labelEn: 'Other',
        patterns: [],
    },
];

const RADAR_META = [
    {
        key: 'safety',
        labelRo: 'Siguranță generală',
        labelEn: 'General safety',
        color: '#4ADE80',
    },
    {
        key: 'allergy',
        labelRo: 'Protecție alergii',
        labelEn: 'Allergy protection',
        color: '#F97316',
    },
    {
        key: 'eco',
        labelRo: 'Impact eco',
        labelEn: 'Eco impact',
        color: '#10B981',
    },
    {
        key: 'skin',
        labelRo: 'Compatibilitate ten',
        labelEn: 'Skin fit',
        color: '#FB7185',
    },
];

function clamp(value, min = 0, max = 100) {
    return Math.max(min, Math.min(max, value));
}

function normalizeText(value) {
    return String(value || '').toUpperCase();
}

function includesAny(text, patterns) {
    return patterns.some((pattern) => text.includes(pattern));
}

function getLocalizedLabel(lang, labelRo, labelEn) {
    return lang === 'en' ? labelEn : labelRo;
}

function getRiskBucket(item) {
    if (item.riskCategory === 'unknown') return 'unknown';
    if (item.riskCategory === 'banned' || item.riskLevel === 5) return 'banned';
    if (item.riskCategory === 'safe' || item.riskCategory === 'uv_filter' || item.riskLevel === 0) return 'safe';
    return 'restricted';
}

function getPrimaryFunctionGroup(item) {
    const combined = normalizeText([item.function, item.name, item.description].filter(Boolean).join(' | '));

    for (const group of FUNCTION_GROUPS) {
        if (group.key === 'other') continue;
        if (includesAny(combined, group.patterns)) return group.key;
    }

    return 'other';
}

function polarToCartesian(cx, cy, radius, angleInDegrees) {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
        x: cx + radius * Math.cos(angleInRadians),
        y: cy + radius * Math.sin(angleInRadians),
    };
}

function describeDonutSlice(cx, cy, outerRadius, innerRadius, startAngle, endAngle) {
    const startOuter = polarToCartesian(cx, cy, outerRadius, startAngle);
    const endOuter = polarToCartesian(cx, cy, outerRadius, endAngle);
    const startInner = polarToCartesian(cx, cy, innerRadius, startAngle);
    const endInner = polarToCartesian(cx, cy, innerRadius, endAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

    return [
        `M ${startOuter.x} ${startOuter.y}`,
        `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${endOuter.x} ${endOuter.y}`,
        `L ${endInner.x} ${endInner.y}`,
        `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${startInner.x} ${startInner.y}`,
        'Z',
    ].join(' ');
}

function buildPieData(ingredients) {
    const counts = ingredients.reduce(
        (acc, item) => {
            const bucket = getRiskBucket(item);
            acc[bucket] += 1;
            return acc;
        },
        { safe: 0, restricted: 0, banned: 0, unknown: 0 }
    );

    return [
        { key: 'safe', value: counts.safe, color: CATEGORY_META.safe.color },
        { key: 'restricted', value: counts.restricted, color: CATEGORY_META.restricted.color },
        { key: 'banned', value: counts.banned, color: CATEGORY_META.banned.color },
        { key: 'unknown', value: counts.unknown, color: CATEGORY_META.unknown.color },
    ];
}

function buildFunctionData(ingredients, lang) {
    const counts = FUNCTION_GROUPS.reduce((acc, group) => {
        acc[group.key] = 0;
        return acc;
    }, {});

    ingredients.forEach((item) => {
        counts[getPrimaryFunctionGroup(item)] += 1;
    });

    return FUNCTION_GROUPS
        .map((group) => ({
            key: group.key,
            label: getLocalizedLabel(lang, group.labelRo, group.labelEn),
            color: group.color,
            value: counts[group.key] || 0,
        }))
        .filter((entry) => entry.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);
}

function hasPattern(item, patterns) {
    const combined = normalizeText([item.name, item.description, item.function].filter(Boolean).join(' | '));
    return includesAny(combined, patterns);
}

function computeRadarData(ingredients, productScore, skinType) {
    const total = Math.max(ingredients.length, 1);

    const highRiskCount = ingredients.filter((item) => item.riskLevel >= 3).length;
    const bannedCount = ingredients.filter((item) => item.riskCategory === 'banned' || item.riskLevel === 5).length;

    const allergyPatterns = [
        'FRAGRANCE', 'PARFUM', 'LIMONENE', 'LINALOOL', 'CITRAL', 'GERANIOL', 'EUGENOL', 'COUMARIN',
        'CINNAMYL ALCOHOL', 'BENZYL ALCOHOL', 'BENZYL SALICYLATE', 'CINNAMAL', 'FARNESOL',
        'HEXYL CINNAMAL', 'HYDROXYCITRONELLAL', 'ISOEUGENOL', 'CITRONELLOL', 'BENZYL BENZOATE',
        'BENZYL CINNAMATE', 'AMYL CINNAMAL', 'FORMALDEHYDE', 'ALCOHOL DENAT', 'ESSENTIAL OIL',
        'METHYLISOTHIAZOLINONE', 'METHYLCHLOROISOTHIAZOLINONE'
    ];

    const ecoPatterns = [
        'SILOXANE', 'CYCLOMETHICONE', 'EDTA', 'PEG-', 'PARAFFINUM LIQUIDUM', 'MINERAL OIL',
        'PETROLATUM', 'PARAFFIN', 'ALUMINUM', 'ALUMINIUM', 'BHT', 'BHA'
    ];

    const occlusivePatterns = [
        'MINERAL OIL', 'PETROLATUM', 'PARAFFINUM LIQUIDUM', 'PARAFFIN', 'CYCLOMETHICONE', 'SILOXANE',
        'ISOPROPYL MYRISTATE', 'ISOPROPYL PALMITATE'
    ];

    const drynessPatterns = ['ALCOHOL DENAT', 'SD ALCOHOL', 'SULFATE', 'SULPHATE', 'SURFACTANT'];

    const allergyRisk = clamp(
        (ingredients.filter((item) => hasPattern(item, allergyPatterns) || item.riskLevel >= 3).length / total) * 100,
        0,
        100
    );

    const ecoRisk = clamp(
        ((ingredients.filter((item) => hasPattern(item, ecoPatterns)).length + bannedCount) / total) * 100,
        0,
        100
    );

    let skinRisk = 0;
    if (skinType === 'sensitive') {
        skinRisk = (ingredients.filter((item) => hasPattern(item, allergyPatterns) || item.riskLevel >= 3).length / total) * 100;
    } else if (skinType === 'dry') {
        skinRisk = (ingredients.filter((item) => hasPattern(item, drynessPatterns)).length / total) * 100;
    } else if (skinType === 'oily') {
        skinRisk = (ingredients.filter((item) => hasPattern(item, occlusivePatterns)).length / total) * 100;
    } else {
        skinRisk = ((highRiskCount + bannedCount) / total) * 55;
    }

    skinRisk = clamp(skinRisk + (highRiskCount / total) * 25, 0, 100);

    return {
        safety: clamp(productScore, 0, 100),
        allergy: clamp(100 - allergyRisk, 0, 100),
        eco: clamp(100 - ecoRisk, 0, 100),
        skin: clamp(100 - skinRisk, 0, 100),
    };
}

function PieChart({ data, colors, lang }) {
    const size = 168;
    const outerRadius = 74;
    const innerRadius = 48;
    const total = data.reduce((sum, item) => sum + item.value, 0);
    const validSegments = total > 0 ? data.filter((item) => item.value > 0) : [];

    let currentAngle = -90;

    return (
        <View className="items-center">
            <Svg width={size} height={size}>
                <Circle cx={size / 2} cy={size / 2} r={outerRadius} fill={colors.bg} opacity={0.5} />
                {total > 0 ? (
                    validSegments.map((segment) => {
                        const angle = (segment.value / total) * 360;
                        const path = describeDonutSlice(
                            size / 2,
                            size / 2,
                            outerRadius,
                            innerRadius,
                            currentAngle,
                            currentAngle + angle
                        );

                        const element = (
                            <Path
                                key={segment.key}
                                d={path}
                                fill={segment.color}
                                stroke={colors.card}
                                strokeWidth={2}
                            />
                        );

                        currentAngle += angle;
                        return element;
                    })
                ) : (
                    <Circle cx={size / 2} cy={size / 2} r={outerRadius} fill={colors.border} opacity={0.35} />
                )}
                <Circle cx={size / 2} cy={size / 2} r={innerRadius} fill={colors.card} />
            </Svg>

            <Text className="mt-2 text-sm font-bold" style={{ color: colors.text }}>
                {lang === 'en' ? 'Ingredient categories' : 'Categorii de ingrediente'}
            </Text>
            <Text className="text-xs mt-1 text-center" style={{ color: colors.textSub }}>
                {lang === 'en'
                    ? 'Safe / Restricted / Banned / Unknown'
                    : 'Sigur / Restricționat / Interzis / Necunoscut'}
            </Text>
        </View>
    );
}

function BarChart({ data, colors, lang }) {
    const maxValue = Math.max(...data.map((item) => item.value), 1);

    return (
        <View>
            {data.map((item) => {
                const percent = Math.round((item.value / maxValue) * 100);
                return (
                    <View key={item.key} className="mb-3">
                        <View className="flex-row justify-between mb-1">
                            <Text className="text-sm font-semibold" style={{ color: colors.text }}>
                                {item.label}
                            </Text>
                            <Text className="text-xs font-bold" style={{ color: colors.textSub }}>
                                {item.value} ({Math.round((item.value / Math.max(data.reduce((sum, entry) => sum + entry.value, 0), 1)) * 100)}%)
                            </Text>
                        </View>
                        <View style={{ height: 12, backgroundColor: colors.border, borderRadius: 999, overflow: 'hidden' }}>
                            <View style={{ width: `${percent}%`, height: '100%', backgroundColor: item.color, borderRadius: 999 }} />
                        </View>
                    </View>
                );
            })}

            <Text className="text-xs mt-1" style={{ color: colors.textSub }}>
                {lang === 'en'
                    ? 'Top function roles in the current product'
                    : 'Rolurile funcționale dominante din produsul curent'}
            </Text>
        </View>
    );
}

function RadarChart({ values, colors, lang }) {
    const size = 240;
    const center = size / 2;
    const radius = 78;
    const ringLevels = [0.25, 0.5, 0.75, 1];
    const points = RADAR_META.map((_, index) => {
        const angle = -90 + (index * 360) / RADAR_META.length;
        return polarToCartesian(center, center, radius, angle);
    });

    const polygonPoints = RADAR_META.map((meta, index) => {
        const angle = -90 + (index * 360) / RADAR_META.length;
        return polarToCartesian(center, center, (values[meta.key] / 100) * radius, angle);
    });

    return (
        <View className="items-center">
            <View style={{ width: size, height: size }}>
                <Svg width={size} height={size}>
                    {ringLevels.map((level) => {
                        const ringRadius = radius * level;
                        const ringPoints = RADAR_META.map((_, index) => {
                            const angle = -90 + (index * 360) / RADAR_META.length;
                            return polarToCartesian(center, center, ringRadius, angle);
                        });

                        return (
                            <Polygon
                                key={level}
                                points={ringPoints.map((point) => `${point.x},${point.y}`).join(' ')}
                                fill="transparent"
                                stroke={colors.border}
                                strokeWidth={1}
                            />
                        );
                    })}

                    {points.map((point, index) => (
                        <Line
                            key={index}
                            x1={center}
                            y1={center}
                            x2={point.x}
                            y2={point.y}
                            stroke={colors.border}
                            strokeWidth={1}
                        />
                    ))}

                    <Polygon
                        points={polygonPoints.map((point) => `${point.x},${point.y}`).join(' ')}
                        fill="#FB718533"
                        stroke="#FB7185"
                        strokeWidth={2}
                    />

                    {polygonPoints.map((point, index) => (
                        <Circle key={index} cx={point.x} cy={point.y} r={4} fill={RADAR_META[index].color} />
                    ))}
                </Svg>

                {RADAR_META.map((meta, index) => {
                    const angle = (-90 + (index * 360) / RADAR_META.length) * (Math.PI / 180);
                    const labelRadius = radius + 24;
                    const x = center + labelRadius * Math.cos(angle);
                    const y = center + labelRadius * Math.sin(angle);
                    const textAnchor = index === 0 || index === 2 ? 'middle' : index === 1 ? 'start' : 'end';

                    return (
                        <SvgText
                            key={meta.key}
                            x={x}
                            y={y + 4}
                            fill={colors.text}
                            fontSize="10"
                            fontWeight="700"
                            textAnchor={textAnchor}
                        >
                            {getLocalizedLabel(lang, meta.labelRo, meta.labelEn)}
                        </SvgText>
                    );
                })}
            </View>

            <Text className="text-sm font-bold mt-1" style={{ color: colors.text }}>
                {lang === 'en' ? 'Safety radar' : 'Radar de siguranță'}
            </Text>
            <Text className="text-xs mt-1 text-center leading-relaxed" style={{ color: colors.textSub }}>
                {lang === 'en'
                    ? 'Higher values mean a safer and better balanced product.'
                    : 'Valorile mai mari înseamnă un produs mai sigur și mai echilibrat.'}
            </Text>
        </View>
    );
}

export default function IngredientInsightCharts({ ingredients = [], colors, lang, productScore = 0, skinType = null }) {
    const pieData = buildPieData(ingredients);
    const functionData = buildFunctionData(ingredients, lang);
    const radarData = computeRadarData(ingredients, productScore, skinType);

    const hasIngredients = ingredients.length > 0;

    const copy = lang === 'en'
        ? {
            title: 'Ingredient insights',
            subtitle: 'Visual summary of safety, roles and product balance.',
            pieTitle: 'Risk distribution',
            functionTitle: 'Function analysis',
            radarTitle: 'Safety radar',
            empty: 'No ingredient data available yet.',
        }
        : {
            title: 'Insight-uri ingrediente',
            subtitle: 'Rezumat vizual pentru siguranță, roluri și echilibrul produsului.',
            pieTitle: 'Distribuția riscului',
            functionTitle: 'Analiza funcțiilor',
            radarTitle: 'Radar de siguranță',
            empty: 'Nu sunt disponibile încă date despre ingrediente.',
        };

    return (
        <View className="rounded-3xl shadow-md p-6 mb-6" style={{ backgroundColor: colors.card }}>
            <Text className="text-xl font-black mb-1" style={{ color: colors.text }}>
                {copy.title}
            </Text>
            <Text className="text-xs mb-5 leading-relaxed" style={{ color: colors.textSub }}>
                {copy.subtitle}
            </Text>

            {!hasIngredients ? (
                <Text className="italic text-center py-4" style={{ color: colors.textMuted }}>
                    {copy.empty}
                </Text>
            ) : (
                <View>
                    <View className="mb-6">
                        <Text className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: colors.textSub }}>
                            {copy.pieTitle}
                        </Text>
                        <PieChart data={pieData} colors={colors} lang={lang} />
                        <View className="mt-4">
                            {pieData.map((segment) => {
                                const total = ingredients.length || 1;
                                const percent = Math.round((segment.value / total) * 100);
                                return (
                                    <View key={segment.key} className="flex-row items-center justify-between mb-2">
                                        <View className="flex-row items-center flex-1 pr-3">
                                            <View style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: segment.color, marginRight: 10 }} />
                                            <Text className="text-sm font-medium" style={{ color: colors.text }}>
                                                {getLocalizedLabel(
                                                    lang,
                                                    segment.key === 'safe' ? 'Sigur' : segment.key === 'restricted' ? 'Restricționat' : segment.key === 'banned' ? 'Interzis' : 'Necunoscut',
                                                    segment.key === 'safe' ? 'Safe' : segment.key === 'restricted' ? 'Restricted' : segment.key === 'banned' ? 'Banned' : 'Unknown'
                                                )}
                                            </Text>
                                        </View>
                                        <Text className="text-xs font-bold" style={{ color: colors.textSub }}>
                                            {segment.value} ({percent}%)
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                    </View>

                    <View className="mb-6 pt-5" style={{ borderTopWidth: 1, borderColor: colors.border }}>
                        <Text className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: colors.textSub }}>
                            {copy.functionTitle}
                        </Text>
                        <BarChart data={functionData} colors={colors} lang={lang} />
                    </View>

                    <View className="pt-5" style={{ borderTopWidth: 1, borderColor: colors.border }}>
                        <Text className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: colors.textSub }}>
                            {copy.radarTitle}
                        </Text>
                        <RadarChart values={radarData} colors={colors} lang={lang} />
                    </View>
                </View>
            )}
        </View>
    );
}