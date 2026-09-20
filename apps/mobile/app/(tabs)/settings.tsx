import React from 'react';
import { View, Text, ScrollView, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DEFAULT_INTERVAL_MINUTES } from '@posture-check/shared';

export default function SettingsScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);

  return (
    <ScrollView className="flex-1 bg-pond-dark">
      <View className="p-5">
        <View className="bg-surface-dark rounded-2xl p-6 border border-surface-card mb-5">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-text-primary-dark text-xl font-bold">
              Preferences
            </Text>
            <Ionicons name="options" size={24} color="#4CAF50" />
          </View>
          <Text className="text-text-muted-dark text-sm leading-relaxed mb-5">
            Configure local push notifications, paired desktop routing, and frog sound alerts.
          </Text>

          <View className="gap-4">
            <View className="flex-row items-center justify-between bg-pond-dark/60 p-4 rounded-xl border border-surface-card">
              <View className="flex-1 pr-4">
                <Text className="text-text-primary-dark font-semibold text-base">
                  Push Notifications
                </Text>
                <Text className="text-text-muted-dark text-xs mt-0.5">
                  Receive local alerts on this device
                </Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: '#243447', true: '#4CAF50' }}
                thumbColor={notificationsEnabled ? '#FFFFFF' : '#8A9BB5'}
              />
            </View>

            <View className="flex-row items-center justify-between bg-pond-dark/60 p-4 rounded-xl border border-surface-card">
              <View className="flex-1 pr-4">
                <Text className="text-text-primary-dark font-semibold text-base">
                  Reminder Frequency
                </Text>
                <Text className="text-text-muted-dark text-xs mt-0.5">
                  Default interval between nudges
                </Text>
              </View>
              <Text className="text-frog-green font-bold text-base">
                {DEFAULT_INTERVAL_MINUTES}m
              </Text>
            </View>
          </View>
        </View>

        <View className="items-center py-4">
          <Text className="text-text-muted-dark text-xs">
            Posture Check! Mobile v1.0.0 (Expo SDK 57)
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
