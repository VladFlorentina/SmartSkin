import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE = 140;
const STROKE_WIDTH = 12;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function getScoreStyle(score) {
    if (score >= 80) return { stroke: '#4ADE80', color: '#16A34A', label: 'Sigur' };
    if (score >= 40) return { stroke: '#F97316', color: '#C2410C', label: 'Moderat' };
    return { stroke: '#D97AAA', color: '#A63D75', label: 'Risc Ridicat' };
}

function getScoreEmoji(score) {
    if (score >= 80) return '🌱';
    if (score >= 40) return '⚠️';
    return '❌';
}

export default function AnimatedScoreRing({ score = 0 }) {
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

    const style = getScoreStyle(score);

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
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 4 }}>
                <Text style={{ fontSize: 14 }}>{getScoreEmoji(score)}</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: style.color, letterSpacing: 0.5 }}>
                    {style.label}
                </Text>
            </View>
        </View>
    );
}
