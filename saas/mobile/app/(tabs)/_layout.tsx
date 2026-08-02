import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: '#FFFFFF' },
        headerTintColor: '#111827',
        tabBarActiveTintColor: '#4F46E5',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E2E8F0',
        },
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'book-outline';

          if (route.name === 'upload') {
            iconName = 'cloud-upload-outline';
          } else if (route.name === 'settings') {
            iconName = 'settings-outline';
          }

          return <Ionicons color={color} name={iconName} size={size} />;
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'My Books' }} />
      <Tabs.Screen name="upload" options={{ title: 'Upload' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
