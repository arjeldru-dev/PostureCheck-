import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  XP_PER_ACKNOWLEDGE,
  XP_DAILY_COMPLETION_BONUS,
  DEFAULT_INTERVAL_MINUTES,
  COLORS,
  FONT_SIZES,
  type RibbitState,
  RIBBIT_STATE_DESCRIPTIONS,
} from '@posture-check/shared';
import RibbitMascot from '../../components/ribbit/RibbitMascot';

const MASCOT_STATES: RibbitState[] = [
  'idle',
  'reminding',
  'encouraging',
  'celebrating',
  'concerned',
  'sleeping',
  'disappointed',
];

export default function HomeScreen() {
  const [activeState, setActiveState] = useState<RibbitState>('idle');

  return (
    <ScrollView className="flex-1 bg-pond-dark" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="p-5">
        {/* Hero / Mascot Interactive Card */}
        <View className="bg-surface-dark rounded-2xl p-6 border border-surface-card shadow-lg mb-5">
          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text className="text-text-muted-dark text-xs uppercase tracking-wider font-semibold font-display">
                Companion App • Phase 00
              </Text>
              <Text className="text-text-primary-dark text-2xl font-bold mt-1 font-display">
                Posture Check!
              </Text>
            </View>
            <View className="bg-frog-green/20 px-3 py-1 rounded-full border border-frog-green/30">
              <Text className="text-frog-green text-xs font-bold uppercase">
                {activeState}
              </Text>
            </View>
          </View>

          {/* Ribbit Mascot Showcase */}
          <View className="items-center justify-center my-3 py-4 bg-pond-dark/80 rounded-2xl border border-surface-card relative overflow-hidden">
            <View className="absolute inset-0 bg-frog-green/5 rounded-2xl" />
            <RibbitMascot state={activeState} size="md" showBreathing={true} />
            <Text className="text-text-primary-dark font-semibold text-sm mt-3">
              Ribbit the Frog
            </Text>
            <Text className="text-text-muted-dark text-xs mt-0.5 text-center px-4">
              {RIBBIT_STATE_DESCRIPTIONS[activeState]}
            </Text>
          </View>

          {/* Mascot State Selector Pills */}
          <View className="mt-3">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-text-muted-dark text-xs font-semibold uppercase tracking-wide">
                Mascot State Preview
              </Text>
              {__DEV__ && (
                <View className="bg-golden-xp/15 px-2 py-0.5 rounded-md border border-golden-xp/30">
                  <Text className="text-golden-xp text-[10px] font-bold font-mono uppercase">
                    DEV ONLY
                  </Text>
                </View>
              )}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row -mx-1">
              {MASCOT_STATES.map((state) => {
                const isSelected = activeState === state;
                return (
                  <TouchableOpacity
                    key={state}
                    onPress={() => setActiveState(state)}
                    activeOpacity={0.7}
                    className={`mx-1 px-3 py-1.5 rounded-xl border ${
                      isSelected
                        ? 'bg-frog-green border-frog-green'
                        : 'bg-pond-dark/60 border-surface-card'
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold capitalize ${
                        isSelected ? 'text-white' : 'text-text-muted-dark'
                      }`}
                    >
                      {state}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>

        {/* Gamification XP Summary Card */}
        <View className="bg-surface-dark rounded-2xl p-5 border border-surface-card mb-5">
          <View className="flex-row items-center gap-2 mb-3">
            <Ionicons name="sparkles" size={18} color="#FFD54F" />
            <Text className="text-text-primary-dark font-semibold text-base font-display">
              Habit Rewards
            </Text>
          </View>
          <View className="flex-row gap-3">
            <View className="flex-1 bg-pond-dark/60 p-3.5 rounded-xl border border-surface-card">
              <Text className="text-text-muted-dark text-xs font-medium">Per Check-in</Text>
              <Text className="text-golden-xp font-bold text-lg mt-0.5">
                +{XP_PER_ACKNOWLEDGE} XP
              </Text>
            </View>
            <View className="flex-1 bg-pond-dark/60 p-3.5 rounded-xl border border-surface-card">
              <Text className="text-text-muted-dark text-xs font-medium">Daily Bonus</Text>
              <Text className="text-golden-xp font-bold text-lg mt-0.5">
                +{XP_DAILY_COMPLETION_BONUS} XP
              </Text>
            </View>
          </View>
        </View>

        {/* Sync Status Card */}
        <View className="bg-surface-dark rounded-2xl p-5 border border-surface-card mb-5">
          <View className="flex-row items-center gap-3 mb-2">
            <Ionicons name="desktop-outline" size={20} color={COLORS.frogGreen} />
            <Text className="text-text-primary-dark font-semibold text-base font-display">
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
          className="bg-frog-green p-4 rounded-xl items-center flex-row justify-center gap-2 touch-target shadow-lg"
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

