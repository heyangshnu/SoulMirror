import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Platform } from 'react-native';
import Colors from '@/constants/Colors';
import { useTranslation } from '@/hooks/useTranslation';
import { colors } from '@/theme/tokens';

export default function TabLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.light.tint,
        tabBarInactiveTintColor: Colors.light.tabIconDefault,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      }}
    >
      <Tabs.Screen
        name="explore"
        options={{
          title: t('tabs.today'),
          tabBarIcon: ({ color }) => (
            <SymbolView name={{ ios: 'house', android: 'home', web: 'home' }} tintColor={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: t('tabs.myPlans'),
          tabBarIcon: ({ color }) => (
            <SymbolView name={{ ios: 'doc.text', android: 'description', web: 'description' }} tintColor={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="mirror"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="family"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="memorial"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color }) => (
            <SymbolView name={{ ios: 'person.circle', android: 'person', web: 'person' }} tintColor={color} size={24} />
          ),
        }}
      />
    </Tabs>
  );
}
