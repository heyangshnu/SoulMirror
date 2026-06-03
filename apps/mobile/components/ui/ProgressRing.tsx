import Svg, { Circle } from 'react-native-svg';
import { StyleSheet, Text, View } from 'react-native';
import { colors, typography } from '@/theme/tokens';

type Props = {
  score: number;
  label?: string;
  size?: number;
};

export function ProgressRing({ score, label, size = 120 }: Props) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;

  return (
    <View style={styles.wrap}>
      {/* 圆环 + 分数：固定高度容器，overflow 防止溢出 */}
      <View style={[styles.ringBox, { width: size, height: size }]}>
        <Svg width={size} height={size} style={styles.ringSvg}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={colors.primaryMuted}
            strokeWidth={stroke}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={colors.primary}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>
        <Text style={styles.score}>{score}</Text>
      </View>

      {/* 圆环下方独立区域，不与分数层叠 */}
      <View style={styles.meta}>
        <Text style={styles.scoreHint}>综合能量指数</Text>
        {label ? (
          <Text style={styles.label} numberOfLines={2}>
            {label}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'center',
    alignItems: 'center',
    marginVertical: 8,
  },
  ringBox: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  ringSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  score: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
    lineHeight: 34,
    includeFontPadding: false,
  },
  meta: {
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 16,
    gap: 4,
  },
  scoreHint: {
    ...typography.small,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  label: {
    ...typography.caption,
    maxWidth: 260,
    textAlign: 'center',
    color: colors.primary,
    fontWeight: '600',
    lineHeight: 20,
  },
});
