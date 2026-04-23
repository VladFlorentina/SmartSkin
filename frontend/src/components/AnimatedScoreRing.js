import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../lib/AppContext';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE = 140;
const STROKE_WIDTH = 12;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function getScoreStyle(score, colors) {
    let key = 'scoreLabelSafe';
    if (score < 80) key = 'scoreLabelModerate';
    if (score < 40) key = 'scoreLabelRisk';
    return { stroke: colors.primary, color: colors.text, key };
}

function getScoreIcon(score) {
    if (score >= 80) return 'checkmark-circle';
    if (score >= 40) return 'warning';
    return 'alert-circle';
}

export default function AnimatedScoreRing({ score = 0 }) {
    const { t, colors } = useApp();
    const progress = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(progress, {
            toValue: score / 100,
            duration: 1200,
            useNativeDriver: false, // SVG props nu suporta native driver
        }).start();
    }, [score]);

    const strokeDashoffset = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [CIRCUMFERENCE, 0],
    });

    const style = getScoreStyle(score, colors);

    return (
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
                <Svg
                    width={SIZE}
                    height={SIZE}
                    style={{ position: 'absolute', top: 0, left: 0 }}
                >
                    {/* Track gri in spate */}
                    <Circle
                        cx={SIZE / 2}
                        cy={SIZE / 2}
                        r={RADIUS}
                        stroke="#e2e8f0"
                        strokeWidth={STROKE_WIDTH}
                        fill="transparent"
                    />
                    {/* Arc animat */}
                    <AnimatedCircle
                        cx={SIZE / 2}
                        cy={SIZE / 2}
                        r={RADIUS}
                        stroke={style.stroke}
                        strokeWidth={STROKE_WIDTH}
                        fill="transparent"
                        strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        rotation="-90"
                        origin={`${SIZE / 2}, ${SIZE / 2}`}
                    />
                </Svg>

                {/* Scor numeric in centru */}
                <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 32, fontWeight: '800', color: style.color, lineHeight: 36 }}>
                        {score}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#94a3b8', fontWeight: '600', letterSpacing: 1 }}>
                        / 100
                    </Text>
                </View>
            </View>

            {/* Label sub cerc */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 6 }}>
                <Ionicons name={getScoreIcon(score)} size={16} color={style.color} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: style.color, letterSpacing: 0.5 }}>
                    {t(style.key)}
                </Text>
            </View>
        </View>
    );
}
