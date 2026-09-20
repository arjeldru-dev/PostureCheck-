import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  XP_PER_ACKNOWLEDGE,
  XP_DAILY_COMPLETION_BONUS,
  DEFAULT_INTERVAL_MINUTES,
  COLORS,
  FONT_SIZES,
} from '@posture-check/shared';

export default function HomeScreen() {
  return (
    <ScrollView className="flex-1 bg-pond-dark">
      <View className="p-5">
        {/* Hero Card */}
        <View className="bg-surface-dark rounded-2xl p-6 border border-surface-card shadow-lg mb-5">
          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text className="text-text-muted-dark text-xs uppercase tracking-wider font-semibold">
                Companion App
              </Text>
              <Text className="text-text-primary-dark text-2xl font-bold mt-1">
                Posture Check!
              </Text>
            </View>
            <View className="w-12 h-12 rounded-full bg-frog-green/20 items-center justify-center border border-frog-green/30">
              <Text className="text-2xl">🐸</Text>
            </View>
          </View>

          {/* Test Component for NativeWind Verification */}
          <View className="bg-frog-green p-4 rounded-xl mb-4">
            <Text className="text-white font-bold text-base">
              Ribbit! Ready to stand tall?
            </Text>
            <Text className="text-white/90 text-sm mt-0.5">
              NativeWind 4 & Expo SDK 57 initialized successfully.
            </Text>
          </View>

          {/* Shared Constants Badges */}
          <View className="flex-row gap-3">
            <View className="flex-1 bg-pond-dark/60 p-3 rounded-xl border border-surface-card">
              <Text className="text-text-muted-dark text-xs">Per Check-in</Text>
              <Text className="text-golden-xp font-bold text-lg mt-0.5">
                +{XP_PER_ACKNOWLEDGE} XP
              </Text>
            </View>
            <View className="flex-1 bg-pond-dark/60 p-3 rounded-xl border border-surface-card">
              <Text className="text-text-muted-dark text-xs">Daily Bonus</Text>
              <Text className="text-golden-xp font-bold text-lg mt-0.5">
                +{XP_DAILY_COMPLETION_BONUS} XP
              </Text>
            </View>
          </View>
        </View>

        {/* Sync Status Card */}
        <View className="bg-surface-dark rounded-2xl p-5 border border-surface-card mb-5">
          <View className="flex-row items-center gap-3 mb-3">
            <Ionicons name="desktop-outline" size={22} color={COLORS.frogGreen} />
            <Text className="text-text-primary-dark font-semibold text-base">
              Desktop Sync
            </Text>
          </View>
          <Text className="text-text-muted-dark text-sm leading-relaxed">
            Paired with Tauri desktop app. Reminder intervals default to{' '}
            <Text className="text-frog-green font-semibold">
              {DEFAULT_INTERVAL_MINUTES} mins
            </Text>
            . Design tokens loaded (base font: {FONT_SIZES.base}).
          </Text>
        </View>

        {/* Quick Action Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          className="bg-frog-green p-4 rounded-xl items-center flex-row justify-center gap-2 touch-target"
        >
          <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
          <Text className="text-white font-bold text-base">
            Check Posture Now
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
