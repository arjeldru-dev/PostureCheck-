import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function AchievementsScreen() {
  return (
    <ScrollView className="flex-1 bg-pond-dark">
      <View className="p-5">
        <View className="bg-surface-dark rounded-2xl p-6 border border-surface-card mb-5">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-text-primary-dark text-xl font-bold">
              Ribbit Badges
            </Text>
            <Ionicons name="trophy" size={24} color="#FFD54F" />
          </View>
          <Text className="text-text-muted-dark text-sm leading-relaxed mb-4">
            Unlock achievements as you improve your ergonomic habits. Earn XP to level up your frog mascot!
          </Text>

          <View className="space-y-3 gap-3">
            <View className="flex-row items-center bg-pond-dark/60 p-4 rounded-xl border border-surface-card gap-4">
              <Text className="text-3xl">🌱</Text>
              <View className="flex-1">
                <Text className="text-text-primary-dark font-semibold text-base">
                  First Sprout
                </Text>
                <Text className="text-text-muted-dark text-xs mt-0.5">
                  Complete your first posture check-in
                </Text>
              </View>
              <Ionicons name="checkmark-circle" size={22} color="#4CAF50" />
            </View>

            <View className="flex-row items-center bg-pond-dark/60 p-4 rounded-xl border border-surface-card gap-4 opacity-75">
              <Text className="text-3xl">👑</Text>
              <View className="flex-1">
                <Text className="text-text-primary-dark font-semibold text-base">
                  Lily Pad Royalty
                </Text>
                <Text className="text-text-muted-dark text-xs mt-0.5">
                  Maintain a 7-day posture streak
                </Text>
              </View>
              <Ionicons name="lock-closed" size={20} color="#8A9BB5" />
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
