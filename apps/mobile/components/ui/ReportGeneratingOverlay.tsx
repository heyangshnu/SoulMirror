import { Image, Modal, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme/tokens';

const GENERATING_IMAGE = require('@/assets/images/report-generating.png');

type Props = {
  visible: boolean;
};

export function ReportGeneratingOverlay({ visible }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={styles.content}>
          <View style={styles.imageWrap}>
            <Image source={GENERATING_IMAGE} style={styles.image} resizeMode="cover" />
          </View>
          <Text style={styles.message}>报告生成中，请耐心等待。</Text>
        </View>
      </View>
    </Modal>
  );
}

const IMAGE_SIZE = 260;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(26, 26, 30, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageWrap: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: radius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  message: {
    ...typography.body,
    fontSize: 16,
    color: colors.background,
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: 24,
    fontWeight: '500',
  },
});
