import { describe, expect, it, beforeEach } from 'vitest';
import { useSettingsStore } from '../settingsStore';
import { useThemeStore } from '@posture-check/shared';

describe('useSettingsStore (Zustand + SQLite / Tauri Mock)', () => {
  beforeEach(async () => {
    await useSettingsStore.getState().loadSettings();
  });

  it('loads default initial settings', () => {
    const state = useSettingsStore.getState();
    expect(state.hasLoaded).toBe(true);
    expect(state.profileName).toBe('Default');
    expect(state.intervalMinutes).toBe(30);
    expect(state.intensityLevel).toBe(2);
    expect(state.activeHoursStart).toBe('08:00');
    expect(state.activeHoursEnd).toBe('22:00');
    expect(state.activeDays).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(state.routingMode).toBe('pc_only');
    expect(state.autoEscalation).toBe(false);
    expect(state.profiles.length).toBeGreaterThanOrEqual(1);
  });

  it('updates reminder interval with min/max clamping', async () => {
    const { setIntervalMinutes } = useSettingsStore.getState();

    // Normal valid update
    await setIntervalMinutes(45);
    expect(useSettingsStore.getState().intervalMinutes).toBe(45);

    // Clamps below 5 min
    await setIntervalMinutes(2);
    expect(useSettingsStore.getState().intervalMinutes).toBe(5);

    // Clamps above 120 min
    await setIntervalMinutes(180);
    expect(useSettingsStore.getState().intervalMinutes).toBe(120);

    // Reset back to 30
    await setIntervalMinutes(30);
    expect(useSettingsStore.getState().intervalMinutes).toBe(30);
  });

  it('updates intensity level within 1..5 range', async () => {
    const { setIntensityLevel } = useSettingsStore.getState();

    await setIntensityLevel(4);
    expect(useSettingsStore.getState().intensityLevel).toBe(4);

    // Clamp below 1
    await setIntensityLevel(0);
    expect(useSettingsStore.getState().intensityLevel).toBe(1);

    // Clamp above 5
    await setIntensityLevel(10);
    expect(useSettingsStore.getState().intensityLevel).toBe(5);

    // Reset
    await setIntensityLevel(2);
    expect(useSettingsStore.getState().intensityLevel).toBe(2);
  });

  it('updates active hours window and active days', async () => {
    const { setActiveHours, setActiveDays } = useSettingsStore.getState();

    await setActiveHours('09:30', '17:45');
    expect(useSettingsStore.getState().activeHoursStart).toBe('09:30');
    expect(useSettingsStore.getState().activeHoursEnd).toBe('17:45');

    await setActiveDays([1, 2, 3, 4, 5]);
    expect(useSettingsStore.getState().activeDays).toEqual([1, 2, 3, 4, 5]);
  });

  it('updates auto escalation and routing mode', async () => {
    const { setAutoEscalation, setRoutingMode } = useSettingsStore.getState();

    await setAutoEscalation(true);
    expect(useSettingsStore.getState().autoEscalation).toBe(true);

    await setRoutingMode('both');
    expect(useSettingsStore.getState().routingMode).toBe('both');

    await setAutoEscalation(false);
    expect(useSettingsStore.getState().autoEscalation).toBe(false);
  });

  it('manages quick profiles: create, switch, and delete', async () => {
    const store = useSettingsStore.getState();
    const initialCount = store.profiles.length;

    // Create a new Deep Focus profile
    await store.createProfile({
      profileName: 'Deep Focus',
      intervalMinutes: 50,
      intensityLevel: 3,
      activeHoursStart: '10:00',
      activeHoursEnd: '19:00',
      routingMode: 'pc_only',
      activeDays: [1, 2, 3, 4, 5],
    });

    let state = useSettingsStore.getState();
    expect(state.profiles.length).toBe(initialCount + 1);
    const createdProfile = state.profiles.find((p) => p.profileName === 'Deep Focus');
    expect(createdProfile).toBeDefined();

    // Switch to the new profile
    await store.switchProfile(createdProfile!.id);
    state = useSettingsStore.getState();
    expect(state.profileName).toBe('Deep Focus');
    expect(state.intervalMinutes).toBe(50);
    expect(state.intensityLevel).toBe(3);

    // Switch back to Default profile
    const defaultProfile = state.profiles.find((p) => p.profileName === 'Default')!;
    await store.switchProfile(defaultProfile.id);
    expect(useSettingsStore.getState().profileName).toBe('Default');

    // Delete created profile
    await store.deleteProfile(createdProfile!.id);
    state = useSettingsStore.getState();
    expect(state.profiles.some((p) => p.id === createdProfile!.id)).toBe(false);
  });

  it('updates existing profile properties via updateProfile', async () => {
    const store = useSettingsStore.getState();
    const defaultProfile = store.profiles.find((p) => p.profileName === 'Default')!;

    await store.updateProfile(defaultProfile.id, {
      profileName: 'Renamed Default',
      intervalMinutes: 25,
      intensityLevel: 3,
    });

    const state = useSettingsStore.getState();
    const updated = state.profiles.find((p) => p.id === defaultProfile.id);
    expect(updated?.profileName).toBe('Renamed Default');
    expect(updated?.intervalMinutes).toBe(25);
    expect(updated?.intensityLevel).toBe(3);

    // Revert back for other tests
    await store.updateProfile(defaultProfile.id, {
      profileName: 'Default',
      intervalMinutes: 30,
      intensityLevel: 2,
    });
  });

  it('toggles DND and syncs state', async () => {
    const { setDnd } = useSettingsStore.getState();

    await setDnd(true, 45);
    expect(useSettingsStore.getState().dndEnabled).toBe(true);

    await setDnd(false);
    expect(useSettingsStore.getState().dndEnabled).toBe(false);
  });

  it('updates launch on startup and theme mode', async () => {
    const { setLaunchOnStartup, setThemeMode } = useSettingsStore.getState();

    await setLaunchOnStartup(true);
    expect(useSettingsStore.getState().launchOnStartup).toBe(true);

    await setThemeMode('dark');
    expect(useSettingsStore.getState().themeMode).toBe('dark');
    expect(useThemeStore.getState().mode).toBe('dark');

    await setThemeMode('light');
    expect(useSettingsStore.getState().themeMode).toBe('light');
    expect(useThemeStore.getState().mode).toBe('light');
  });

  it('exports posture data as formatted JSON', async () => {
    const { exportData } = useSettingsStore.getState();
    const jsonStr = await exportData();

    expect(typeof jsonStr).toBe('string');
    const parsed = JSON.parse(jsonStr);
    expect(parsed).toHaveProperty('appName');
    expect(parsed).toHaveProperty('activeSettings');
    expect(parsed).toHaveProperty('profiles');
  });

  it('toggles level5 opt-in setting', async () => {
    const { optInLevel5 } = useSettingsStore.getState();

    await optInLevel5(true);
    expect(useSettingsStore.getState().level5OptIn).toBe(true);

    await optInLevel5(false);
    expect(useSettingsStore.getState().level5OptIn).toBe(false);
  });
});

