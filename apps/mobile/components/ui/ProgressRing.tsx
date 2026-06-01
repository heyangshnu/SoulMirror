import Svg, { Circle } from 'react-native-svg';
import { StyleSheet, Text, View } from 'react-native';
import { colors, typography } from '@/theme/tokens';

type Props = {
  score: number;
  label?: string;
  size?: number;
};

export function ProgressRing({ score, label, size = 160 }: Props) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
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
      <View style={styles.center}>
        <Text style={styles.score}>{score}</Text>
        {label ? <Text style={styles.label}>{label}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'center', marginVertical: 16 },
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  score: { fontSize: 36, fontWeight: '700', color: colors.primary },
  label: { ...typography.caption, marginTop: 4 },
});
