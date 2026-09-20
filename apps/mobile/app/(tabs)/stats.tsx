import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function StatsScreen() {
  return (
    <ScrollView className="flex-1 bg-pond-dark">
      <View className="p-5">
        <View className="bg-surface-dark rounded-2xl p-6 border border-surface-card mb-5">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-text-primary-dark text-xl font-bold">
              Posture Analytics
            </Text>
            <Ionicons name="bar-chart" size={24} color="#4CAF50" />
          </View>
          <Text className="text-text-muted-dark text-sm leading-relaxed mb-4">
            Track your daily streaks, posture sessions, and slouch alerts. Detailed charts and Supabase cloud sync will be built in Phase 5.
          </Text>

          <View className="flex-row gap-3">
            <View className="flex-1 bg-pond-dark/60 p-4 rounded-xl border border-surface-card">
              <Text className="text-text-muted-dark text-xs">Current Streak</Text>
              <Text className="text-frog-green font-bold text-2xl mt-1">3 Days</Text>
            </View>
            <View className="flex-1 bg-pond-dark/60 p-4 rounded-xl border border-surface-card">
              <Text className="text-text-muted-dark text-xs">Total Checks</Text>
              <Text className="text-golden-xp font-bold text-2xl mt-1">42</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
