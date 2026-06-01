import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Platform } from 'react-native';
import Colors from '@/constants/Colors';
import { colors } from '@/theme/tokens';

export default function TabLayout() {
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
          title: '探索',
          tabBarIcon: ({ color }) => (
            <SymbolView name={{ ios: 'sparkles', android: 'star', web: 'star' }} tintColor={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: '报告',
          tabBarIcon: ({ color }) => (
            <SymbolView name={{ ios: 'doc.text', android: 'description', web: 'description' }} tintColor={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="mirror"
        options={{
          title: '心镜',
          tabBarIcon: ({ color }) => (
            <SymbolView name={{ ios: 'bubble.left.and.bubble.right', android: 'chat', web: 'chat' }} tintColor={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="memorial"
        options={{
          title: '纪念',
          tabBarIcon: ({ color }) => (
            <SymbolView name={{ ios: 'calendar', android: 'calendar_today', web: 'calendar_today' }} tintColor={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '我的',
          tabBarIcon: ({ color }) => (
            <SymbolView name={{ ios: 'person.circle', android: 'person', web: 'person' }} tintColor={color} size={24} />
          ),
        }}
      />
    </Tabs>
  );
}
