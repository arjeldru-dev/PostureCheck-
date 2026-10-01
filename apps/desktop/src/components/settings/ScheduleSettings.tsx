import { useState } from 'react';
import { useSettingsStore, type QuickProfile } from '@/stores/settingsStore';
import {
  Layers,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Monitor,
  Smartphone,
  SmartphoneNfc,
  Clock,
  AlertCircle,
  X,
} from 'lucide-react';

export default function ScheduleSettings() {
  const {
    profiles,
    id: activeProfileId,
    switchProfile,
    createProfile,
    updateProfile,
    deleteProfile,
    loading,
  } = useSettingsStore();

  const [isCreating, setIsCreating] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [intervalMinutes, setIntervalMinutes] = useState(30);
  const [intensityLevel, setIntensityLevel] = useState(2);
  const [activeHoursStart, setActiveHoursStart] = useState('09:00');
  const [activeHoursEnd, setActiveHoursEnd] = useState('18:00');
  const [routingMode, setRoutingMode] = useState<'pc_only' | 'phone_only' | 'both'>('pc_only');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Edit modal state
  const [editingProfile, setEditingProfile] = useState<QuickProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [editInterval, setEditInterval] = useState(30);
  const [editIntensity, setEditIntensity] = useState(2);
  const [editHoursStart, setEditHoursStart] = useState('08:00');
  const [editHoursEnd, setEditHoursEnd] = useState('22:00');
  const [editRouting, setEditRouting] = useState<'pc_only' | 'phone_only' | 'both'>('pc_only');
  const [editError, setEditError] = useState<string | null>(null);

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) {
      setErrorMsg('Profile name cannot be blank.');
      return;
    }

    try {
      setErrorMsg(null);
      await createProfile({
        profileName: profileName.trim(),
        intervalMinutes,
        intensityLevel,
        activeHoursStart,
        activeHoursEnd,
        routingMode,
        activeDays: [1, 2, 3, 4, 5, 6, 7],
      });
      setIsCreating(false);
      setProfileName('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const handleOpenEdit = (profile: QuickProfile) => {
    setEditingProfile(profile);
    setEditName(profile.profileName);
    setEditInterval(profile.intervalMinutes);
    setEditIntensity(profile.intensityLevel);
    setEditHoursStart(profile.activeHoursStart);
    setEditHoursEnd(profile.activeHoursEnd);
    setEditRouting(profile.routingMode);
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile) return;
    if (!editName.trim()) {
      setEditError('Profile name cannot be blank.');
      return;
    }

    try {
      setEditError(null);
      await updateProfile(editingProfile.id, {
        profileName: editName.trim(),
        intervalMinutes: editInterval,
        intensityLevel: editIntensity,
        activeHoursStart: editHoursStart,
        activeHoursEnd: editHoursEnd,
        routingMode: editRouting,
      });
      setEditingProfile(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDelete = async (profileId: string, name: string) => {
    if (confirm(`Are you sure you want to delete profile "${name}"?`)) {
      try {
        await deleteProfile(profileId);
      } catch (err) {
        alert(err instanceof Error ? err.message : String(err));
      }
    }
  };

  return (
    <div className="space-y-8 animate-fade-in text-(--color-theme-text)">
      {/* Tab Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-display flex items-center gap-2">
            <Layers className="w-6 h-6 text-(--color-frog-green)" />
            Quick Profiles & Routines
          </h2>
          <p className="text-sm text-(--color-theme-muted) mt-1">
            Switch your entire routine with a single click — tailored for coding, deep work, or gaming.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreating(!isCreating)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-(--color-frog-green) text-white hover:bg-(--color-frog-green)/90 transition-all shadow-sm active:scale-95 shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          {isCreating ? 'Cancel' : 'New Profile'}
        </button>
      </div>

      {/* New Profile Creation Form */}
      {isCreating && (
        <form
          onSubmit={handleCreateProfile}
          className="p-6 rounded-2xl bg-(--color-theme-surface) border border-(--color-frog-green)/40 shadow-md space-y-5 animate-scale-in"
        >
          <h3 className="text-base font-semibold">Create New Profile</h3>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-(--color-coral-alert)/10 border border-(--color-coral-alert)/30 text-xs text-(--color-coral-alert) flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-(--color-theme-muted)">Profile Name</label>
              <input
                type="text"
                placeholder="e.g. Chill Weekend, Deep Study"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-(--color-theme-card) border border-(--color-theme-border) text-sm focus:outline-none focus:ring-2 focus:ring-(--color-frog-green)/50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-(--color-theme-muted)">
                Interval ({intervalMinutes}m)
              </label>
              <input
                type="range"
                min="5"
                max="120"
                step="5"
                value={intervalMinutes}
                onChange={(e) => setIntervalMinutes(parseInt(e.target.value, 10))}
                className="w-full h-2 mt-3 accent-(--color-frog-green)"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-(--color-theme-muted)">
                Intensity (Level {intensityLevel})
              </label>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={intensityLevel}
                onChange={(e) => setIntensityLevel(parseInt(e.target.value, 10))}
                className="w-full h-2 mt-3 accent-(--color-frog-green)"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-(--color-theme-muted)">Active Window</label>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={activeHoursStart}
                  onChange={(e) => setActiveHoursStart(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg bg-(--color-theme-card) border border-(--color-theme-border) text-xs"
                />
                <span className="text-xs text-(--color-theme-muted)">to</span>
                <input
                  type="time"
                  value={activeHoursEnd}
                  onChange={(e) => setActiveHoursEnd(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg bg-(--color-theme-card) border border-(--color-theme-border) text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-(--color-theme-muted)">Routing Mode</label>
              <select
                value={routingMode}
                onChange={(e) => setRoutingMode(e.target.value as 'pc_only' | 'phone_only' | 'both')}
                className="w-full px-3 py-2 rounded-xl bg-(--color-theme-card) border border-(--color-theme-border) text-xs focus:outline-none focus:ring-2 focus:ring-(--color-frog-green)/50"
              >
                <option value="pc_only">PC Only (Desktop)</option>
                <option value="phone_only">Phone Only (Silent on PC)</option>
                <option value="both">Both PC & Phone</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-(--color-theme-muted) hover:text-(--color-theme-text)"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-(--color-frog-green) text-white shadow-(--shadow-glow-green) hover:bg-(--color-frog-green)/90"
            >
              Save Profile
            </button>
          </div>
        </form>
      )}

      {/* Edit Profile Modal */}
      {editingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <form
            onSubmit={handleSaveEdit}
            className="max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 rounded-2xl bg-(--color-theme-surface) border border-(--color-theme-border) shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold font-display flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-(--color-frog-green)" />
                Edit Profile: {editingProfile.profileName}
              </h3>
              <button
                type="button"
                onClick={() => setEditingProfile(null)}
                className="p-1 rounded-lg text-(--color-theme-muted) hover:text-(--color-theme-text)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-xl bg-(--color-coral-alert)/10 border border-(--color-coral-alert)/30 text-xs text-(--color-coral-alert) flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-(--color-theme-muted)">Profile Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-(--color-theme-card) border border-(--color-theme-border) text-sm focus:outline-none focus:ring-2 focus:ring-(--color-frog-green)/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-(--color-theme-muted)">
                    Interval ({editInterval}m)
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="120"
                    step="5"
                    value={editInterval}
                    onChange={(e) => setEditInterval(parseInt(e.target.value, 10))}
                    className="w-full h-2 mt-3 accent-(--color-frog-green)"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-(--color-theme-muted)">
                    Intensity (Level {editIntensity})
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={editIntensity}
                    onChange={(e) => setEditIntensity(parseInt(e.target.value, 10))}
                    className="w-full h-2 mt-3 accent-(--color-frog-green)"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-(--color-theme-muted)">Active Window</label>
                  <div className="flex items-center gap-1.5 mt-1">
                    <input
                      type="time"
                      value={editHoursStart}
                      onChange={(e) => setEditHoursStart(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg bg-(--color-theme-card) border border-(--color-theme-border) text-xs font-mono"
                    />
                    <span className="text-xs text-(--color-theme-muted)">–</span>
                    <input
                      type="time"
                      value={editHoursEnd}
                      onChange={(e) => setEditHoursEnd(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg bg-(--color-theme-card) border border-(--color-theme-border) text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-(--color-theme-muted)">Routing Mode</label>
                  <select
                    value={editRouting}
                    onChange={(e) => setEditRouting(e.target.value as 'pc_only' | 'phone_only' | 'both')}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-(--color-theme-card) border border-(--color-theme-border) text-xs focus:outline-none focus:ring-2 focus:ring-(--color-frog-green)/50"
                  >
                    <option value="pc_only">PC Only (Desktop)</option>
                    <option value="phone_only">Phone Only</option>
                    <option value="both">Both PC & Phone</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setEditingProfile(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-(--color-theme-muted) hover:text-(--color-theme-text)"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-(--color-frog-green) text-white shadow-(--shadow-glow-green) hover:bg-(--color-frog-green)/90"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Profiles Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {profiles.map((profile) => {
          const isActive = profile.isActiveProfile || profile.id === activeProfileId;
          const isDefault = profile.profileName === 'Default';
          return (
            <div
              key={profile.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                isActive
                  ? 'bg-(--color-theme-surface) border-(--color-frog-green) shadow-(--shadow-glow-green)'
                  : 'bg-(--color-theme-surface) border-(--color-theme-border) hover:border-(--color-frog-green)/30'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-lg">
                    {profile.profileName === 'Work'
                      ? '💼'
                      : profile.profileName === 'Gaming'
                      ? '🎮'
                      : '🐸'}
                  </span>
                  {isActive ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-(--color-frog-green) bg-(--color-frog-green)/10 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" />
                      Active
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => switchProfile(profile.id)}
                      disabled={loading}
                      className="text-xs font-medium text-(--color-theme-muted) hover:text-(--color-frog-green) transition-colors"
                    >
                      Activate
                    </button>
                  )}
                </div>

                <h3 className="text-base font-bold font-display mt-2 text-(--color-theme-text)">
                  {profile.profileName}
                </h3>

                <div className="mt-3 space-y-1.5 text-xs text-(--color-theme-muted)">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-(--color-frog-green)" />
                    <span>Every {profile.intervalMinutes} min · Level {profile.intensityLevel}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono">🕒</span>
                    <span>
                      {profile.activeHoursStart} – {profile.activeHoursEnd}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {profile.routingMode === 'phone_only' ? (
                      <Smartphone className="w-3.5 h-3.5 text-(--color-sky-blue)" />
                    ) : profile.routingMode === 'both' ? (
                      <SmartphoneNfc className="w-3.5 h-3.5 text-(--color-golden-xp)" />
                    ) : (
                      <Monitor className="w-3.5 h-3.5 text-(--color-theme-muted)" />
                    )}
                    <span className="capitalize">{profile.routingMode.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-(--color-theme-border)/60 flex items-center justify-between text-xs">
                {!isActive ? (
                  <button
                    type="button"
                    onClick={() => switchProfile(profile.id)}
                    className="px-3 py-1.5 rounded-lg bg-(--color-theme-card) hover:bg-(--color-frog-green) hover:text-white font-semibold transition-all border border-(--color-theme-border)"
                  >
                    Switch to this
                  </button>
                ) : (
                  <span className="text-xs text-(--color-theme-muted)">Currently in use</span>
                )}

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(profile)}
                    title="Edit profile"
                    className="p-1.5 rounded-lg text-(--color-theme-muted) hover:text-(--color-theme-text) hover:bg-(--color-theme-border)/40 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  {!isDefault && profiles.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDelete(profile.id, profile.profileName)}
                      title="Delete profile"
                      className="p-1.5 rounded-lg text-(--color-theme-muted) hover:text-(--color-coral-alert) hover:bg-(--color-coral-alert)/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
