import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { type Href, useRouter, useFocusEffect } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { AxisChip } from '@/components/guanxin/AxisChip';
import { ChatInputBar } from '@/components/guanxin/ChatInputBar';
import { GuidanceCard } from '@/components/guanxin/GuidanceCard';
import { HeroTopicCard } from '@/components/guanxin/HeroTopicCard';
import { useTranslation } from '@/hooks/useTranslation';
import { api } from '@/lib/api';
import { colors, spacing, typography } from '@/theme/tokens';

type Dashboard = {
  ming?: { summary?: string; label?: string };
  yuan?: { summary?: string; label?: string };
  jing?: { summary?: string; label?: string };
  yuanRel?: { summary?: string; label?: string };
  li?: { summary?: string; label?: string };
  currentTopic?: { id: string; title: string; summary: string; domain: string } | null;
};

type Activity = { id: string; title: string; excerpt: string; domain: string; updatedAt?: string };

type PlanReport = {
  _id: string;
  topic?: string;
  testType?: string;
  portrait?: string;
  stage?: string;
  headlineSummary?: string;
  summary?: string;
  plans?: Array<{ id: string; title: string; body: string; actions: string[] }>;
};

type InitStatus = {
  phase: string;
  progress: number;
  fuxiNodesDone: number;
  fuxiNodesTotal: number;
  fuxiCoreTotal?: number;
  fuxiExtendedTotal?: number;
  lazyPending?: string[];
  nodes?: Array<{ code: string; title?: string; done?: boolean; lazy?: boolean }>;
  agentMode?: string;
  canChat?: boolean;
  bootstrapReady?: boolean;
  lastError?: string;
};

type MingReportIndex = { code: string; title: string; rel: string };

const CORE_MING_CODES = ['A01', 'A02', 'A03', 'A04', 'A05'];
const CORE_MING_TITLES: Record<string, string> = {
  A01: '命主格局',
  A02: '性格底色',
  A03: '优势与课题',
  A04: '关系模式',
  A05: '当下焦点',
};

const AXES: Array<{
  key: keyof Dashboard;
  route: string;
  labelKey: string;
  accent: 'primary' | 'sage' | 'amber';
}> = [
  { key: 'ming', route: 'ming', labelKey: 'today.axis.ming', accent: 'primary' },
  { key: 'yuan', route: 'yuan', labelKey: 'today.axis.yuan', accent: 'sage' },
  { key: 'jing', route: 'jing', labelKey: 'today.axis.jing', accent: 'amber' },
  { key: 'yuanRel', route: 'yuan_rel', labelKey: 'today.axis.yuanRel', accent: 'primary' },
  { key: 'li', route: 'li', labelKey: 'today.axis.li', accent: 'sage' },
];

export default function TodayScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [initStatus, setInitStatus] = useState<InitStatus | null>(null);
  const [bootstrapReports, setBootstrapReports] = useState<PlanReport[]>([]);
  const [mingReports, setMingReports] = useState<MingReportIndex[]>([]);
  const [quickInput, setQuickInput] = useState('');
  const [lazyStarting, setLazyStarting] = useState(false);

  const loadTodayData = useCallback(() => {
    api
      .get<{ profile?: unknown } | null>('/chart/birth-profile')
      .then((res) => setHasProfile(!!res?.profile))
      .catch(() => setHasProfile(false));

    api.get<InitStatus>('/agent/init-status').then(setInitStatus).catch(() => setInitStatus(null));

    api
      .get<Dashboard>('/memory/dashboard')
      .then(setDashboard)
      .catch(() => setDashboard(null));

    api
      .get<Activity[]>('/memory/recent-activity?limit=5')
      .then(setActivity)
      .catch(() => setActivity([]));

    api
      .get<PlanReport[]>('/reports')
      .then((list) =>
        setBootstrapReports(
          list.filter((r) => r.topic === 'self_profile' || r.topic === 'recent_years' || r.testType?.includes('plan_')),
        ),
      )
      .catch(() => setBootstrapReports([]));

    api
      .get<MingReportIndex[]>('/ming/reports')
      .then(setMingReports)
      .catch(() => setMingReports([]));
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTodayData();
    }, [loadTodayData]),
  );

  const waitingBootstrap =
    hasProfile === true &&
    initStatus?.agentMode === 'claude' &&
    !initStatus?.bootstrapReady;

  const openChat = (prefill?: string, topicId?: string) => {
    router.push({
      pathname: '/(tabs)/chat',
      params: {
        ...(prefill ? { prefill } : {}),
        ...(topicId ? { topicContext: topicId } : {}),
      },
    } as Href);
  };

  const canChat = true;

  const initRunning =
    initStatus?.agentMode === 'claude' &&
    initStatus.phase !== 'done' &&
    initStatus.phase !== 'skipped' &&
    initStatus.phase !== 'failed';

  const coreFromApi = mingReports.filter((r) => CORE_MING_CODES.includes(r.code));
  const coreMingByCode = new Map(coreFromApi.map((r) => [r.code, r]));
  // Prefer filesystem reports; fall back to init-status nodes so A01–A05 never "vanish".
  const coreMingRows: MingReportIndex[] = CORE_MING_CODES.map((code) => {
    const hit = coreMingByCode.get(code);
    if (hit) return hit;
    const node = initStatus?.nodes?.find((n) => n.code === code && n.done);
    if (node) {
      return {
        code,
        title: node.title || CORE_MING_TITLES[code] || code,
        rel: '',
      };
    }
    return null;
  }).filter((r): r is MingReportIndex => !!r);

  const coreMingCount = coreMingRows.length;
  // Keep bootstrap cards as a readable fallback when deep list is incomplete.
  const showBootstrapCards = coreMingCount < 5;

  const portraitReport = bootstrapReports.find((r) => r.topic === 'self_profile');
  const stageReport = bootstrapReports.find((r) => r.topic === 'recent_years');
  const portraitText =
    portraitReport?.portrait || portraitReport?.headlineSummary || portraitReport?.summary || '';
  const stageText = stageReport?.stage || stageReport?.headlineSummary || stageReport?.summary || '';
  const firstPlan = portraitReport?.plans?.[0] || stageReport?.plans?.[0];

  const guidance =
    portraitText ||
    dashboard?.jing?.summary ||
    dashboard?.yuan?.summary ||
    t('today.guidanceDefault');

  useEffect(() => {
    const shouldPoll =
      waitingBootstrap ||
      (hasProfile === true &&
        initStatus?.agentMode === 'claude' &&
        coreMingCount < 5 &&
        (initRunning || (initStatus?.fuxiNodesDone ?? 0) < 5));
    if (!shouldPoll) return undefined;
    const timer = setInterval(loadTodayData, 5000);
    return () => clearInterval(timer);
  }, [
    waitingBootstrap,
    hasProfile,
    initStatus?.agentMode,
    initStatus?.fuxiNodesDone,
    coreMingCount,
    initRunning,
    loadTodayData,
  ]);

  return (
    <Screen scroll>
      <Text style={styles.brand}>{t('common.brand')}</Text>
      <Text style={styles.title}>{t('today.title')}</Text>
      <Text style={styles.subtitle}>{t('today.subtitle')}</Text>

      {hasProfile === null ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : !hasProfile ? (
        <Card>
          <Text style={styles.cardBody}>{t('today.noProfile')}</Text>
          <Button
            title={t('today.fillBirthInfo')}
            onPress={() => router.push('/chart/setup?first=1' as Href)}
            style={{ marginTop: 12 }}
          />
        </Card>
      ) : (
        <>
          {initRunning ? (
            <Card style={styles.initCard}>
              <Text style={styles.initTitle}>{t('today.deepInitTitle')}</Text>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.max(initStatus?.progress ?? 0, 5)}%` },
                  ]}
                />
              </View>
              <Text style={styles.initMeta}>
                {t('today.deepInitProgress', {
                  done: initStatus?.fuxiNodesDone ?? 0,
                  total: initStatus?.fuxiNodesTotal ?? 5,
                })}
              </Text>
              {initStatus?.bootstrapReady ? (
                <Text style={styles.initHint}>{t('today.bootstrapReadyHint')}</Text>
              ) : (
                <Text style={styles.initHint}>{t('today.bootstrapPendingHint')}</Text>
              )}
              {initStatus?.phase === 'partial' && initStatus.lastError ? (
                <Text style={styles.initWarn}>{initStatus.lastError}</Text>
              ) : null}
              <Pressable onPress={() => router.push('/onboarding/init-progress' as Href)}>
                <Text style={styles.link}>{t('today.viewInitProgress')}</Text>
              </Pressable>
            </Card>
          ) : null}

          {(initStatus?.lazyPending?.length ?? 0) > 0 ? (
            <Card style={styles.initCard}>
              <Text style={styles.initTitle}>{t('today.lazyReportsTitle')}</Text>
              <Text style={styles.initMeta}>
                {t('today.lazyReportsMeta', { count: initStatus?.lazyPending?.length ?? 0 })}
              </Text>
              <Button
                title={lazyStarting ? t('common.generating') : t('today.lazyReportsAction')}
                onPress={async () => {
                  if (lazyStarting) return;
                  setLazyStarting(true);
                  try {
                    await api.post('/agent/fuxi-run', {});
                    loadTodayData();
                  } catch {
                    /* keep UI calm; user can retry */
                  } finally {
                    setLazyStarting(false);
                  }
                }}
                style={{ marginTop: 12 }}
              />
            </Card>
          ) : null}

          {coreMingRows.length > 0 ? (
            <>
              <Text style={[styles.sectionTitle, { marginTop: spacing.md, marginBottom: spacing.sm }]}>
                {t('today.mingReportsTitle')}
              </Text>
              <Text style={styles.coreMeta}>
                {t('today.deepInitProgress', {
                  done: Math.max(coreMingCount, initStatus?.fuxiNodesDone ?? 0),
                  total: 5,
                })}
              </Text>
              <Card style={styles.axesCard}>
                {coreMingRows.map((r, index) => (
                  <View key={r.rel || r.code}>
                    {index > 0 ? <View style={styles.axesDivider} /> : null}
                    <Pressable
                      style={styles.mingRow}
                      onPress={() => {
                        if (!r.rel) {
                          router.push('/onboarding/init-progress' as Href);
                          return;
                        }
                        router.push({
                          pathname: '/ming/report/[code]',
                          params: { code: r.code, rel: r.rel },
                        } as Href);
                      }}
                    >
                      <View style={styles.mingCodeBadge}>
                        <Text style={styles.mingCode}>{r.code}</Text>
                      </View>
                      <Text style={styles.mingTitle} numberOfLines={2}>
                        {r.title}
                      </Text>
                      <Text style={styles.mingLink}>
                        {r.rel ? t('today.readReport') : t('today.viewInitProgress')}
                      </Text>
                    </Pressable>
                  </View>
                ))}
              </Card>
            </>
          ) : null}

          {showBootstrapCards && portraitText ? (
            <Card style={styles.planCard}>
              <Text style={styles.planLabel}>{t('today.portraitTitle')}</Text>
              <Text style={styles.planBody}>{portraitText.trim()}</Text>
            </Card>
          ) : null}

          {showBootstrapCards && stageText ? (
            <Card style={styles.planCard}>
              <Text style={styles.planLabel}>{t('today.stageTitle')}</Text>
              <Text style={styles.planBody}>{stageText.trim()}</Text>
            </Card>
          ) : null}

          {showBootstrapCards && firstPlan ? (
            <GuidanceCard
              text={firstPlan.body}
              title={firstPlan.title || t('today.guidanceTitle')}
            />
          ) : showBootstrapCards ? (
            <GuidanceCard text={guidance} title={t('today.guidanceTitle')} />
          ) : null}

          {coreMingRows.length > 0 || (showBootstrapCards && firstPlan?.actions?.[0]) ? (
            <Button
              title={coreMingRows.length > 0 ? t('today.askAboutMing') : t('today.askAboutPlan')}
              variant="secondary"
              onPress={() =>
                openChat(coreMingRows.length > 0 ? t('today.mingPrefill') : t('today.planPrefill'))
              }
              style={{ marginBottom: spacing.md }}
            />
          ) : null}

          {canChat ? (
            <>
              {dashboard?.currentTopic ? (
                <HeroTopicCard
                  title={dashboard.currentTopic.title}
                  summary={dashboard.currentTopic.summary}
                  domain={dashboard.currentTopic.domain}
                  continueLabel={t('today.continueTopic')}
                  onContinue={() => openChat(undefined, dashboard.currentTopic!.id)}
                />
              ) : null}

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t('today.fiveAxes')}</Text>
                <Pressable onPress={() => router.push('/dashboard/axes' as Href)}>
                  <Text style={styles.linkInline}>{t('today.expandAxes')}</Text>
                </Pressable>
              </View>
              <Card style={styles.axesCard}>
                {AXES.map(({ key, route, labelKey, accent }, index) => (
                  <View key={key}>
                    {index > 0 ? <View style={styles.axesDivider} /> : null}
                    <AxisChip
                      label={dashboard?.[key]?.label ?? t(labelKey)}
                      summary={dashboard?.[key]?.summary}
                      emptyHint={t('today.axisEmpty')}
                      accent={accent}
                      onPress={() => router.push(`/dashboard/axis/${route}` as Href)}
                    />
                  </View>
                ))}
              </Card>

              {activity.length > 0 ? (
                <>
                  <Text style={styles.sectionTitle}>{t('today.recentActivity')}</Text>
                  {activity.map((item) => (
                    <Pressable
                      key={item.id}
                      style={styles.activityRow}
                      onPress={() => router.push(`/topic/${item.id}` as Href)}
                    >
                      <Text style={styles.activityTitle}>{item.title}</Text>
                      <Text style={styles.activityMeta} numberOfLines={1}>
                        {item.excerpt}
                      </Text>
                    </Pressable>
                  ))}
                </>
              ) : null}

              <ChatInputBar
                value={quickInput}
                onChangeText={setQuickInput}
                placeholder={t('today.askPlaceholder')}
                onSubmit={() => {
                  openChat(quickInput.trim());
                  setQuickInput('');
                }}
              />
            </>
          ) : (
            <Card>
              <Text style={styles.cardBody}>{t('today.initBlocked')}</Text>
              <Button
                title={t('today.viewInitProgress')}
                onPress={() => router.push('/onboarding/init-progress' as Href)}
                style={{ marginTop: 12 }}
              />
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: { ...typography.small, color: colors.primary, marginTop: spacing.md, fontWeight: '600' },
  title: { ...typography.hero, marginTop: 8 },
  subtitle: { ...typography.caption, marginBottom: spacing.lg, lineHeight: 22 },
  cardBody: { ...typography.body, color: colors.textSecondary },
  initCard: { marginBottom: spacing.md },
  initTitle: { ...typography.body, fontWeight: '600', marginBottom: 8 },
  initMeta: { ...typography.caption, marginTop: 8 },
  initHint: { ...typography.small, color: colors.success, marginTop: 8 },
  initWarn: { ...typography.small, color: colors.danger, marginTop: 8 },
  progressTrack: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.primary },
  planCard: {
    marginBottom: spacing.md,
    backgroundColor: colors.card,
    borderColor: colors.border,
  },
  planLabel: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '700',
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  planBody: { ...typography.body, lineHeight: 26, color: colors.text },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  sectionTitle: {
    ...typography.title,
    fontSize: 16,
    color: colors.primary,
    marginBottom: 0,
    marginTop: 0,
  },
  link: { ...typography.caption, color: colors.primary, fontWeight: '600', marginTop: 8 },
  linkInline: { ...typography.caption, color: colors.primary, fontWeight: '600' },
  axesCard: { marginBottom: spacing.md, paddingVertical: spacing.xs, paddingHorizontal: 0 },
  axesDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 64,
  },
  axesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
  activityRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  activityTitle: { ...typography.body, fontWeight: '600' },
  activityMeta: { ...typography.small, color: colors.textSecondary, marginTop: 4 },
  mingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: 12,
  },
  mingCodeBadge: {
    backgroundColor: colors.primaryMuted,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  mingCode: { ...typography.small, fontWeight: '700', color: colors.primary },
  mingTitle: { flex: 1, ...typography.body, fontSize: 15, color: colors.text },
  mingLink: { ...typography.small, color: colors.primary, fontWeight: '600' },
  coreMeta: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.sm },
});
