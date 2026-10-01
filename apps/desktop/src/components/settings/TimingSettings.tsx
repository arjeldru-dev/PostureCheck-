import { useSettingsStore } from '@/stores/settingsStore';
import { Clock, Calendar, Check, Info } from 'lucide-react';

const PRESET_INTERVALS = [15, 30, 45, 60];

const DAYS_OF_WEEK = [
  { day: 1, label: 'Mon', full: 'Monday' },
  { day: 2, label: 'Tue', full: 'Tuesday' },
  { day: 3, label: 'Wed', full: 'Wednesday' },
  { day: 4, label: 'Thu', full: 'Thursday' },
  { day: 5, label: 'Fri', full: 'Friday' },
  { day: 6, label: 'Sat', full: 'Saturday' },
  { day: 7, label: 'Sun', full: 'Sunday' },
];

export default function TimingSettings() {
  const {
    intervalMinutes,
    activeHoursStart,
    activeHoursEnd,
    activeDays,
    setIntervalMinutes,
    setActiveHours,
    setActiveDays,
  } = useSettingsStore();

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setIntervalMinutes(val);
  };

  const handlePresetClick = (preset: number) => {
    setIntervalMinutes(preset);
  };

  const toggleDay = (day: number) => {
    let newDays: number[];
    if (activeDays.includes(day)) {
      if (activeDays.length <= 1) {
        // Keep at least one day selected
        return;
      }
      newDays = activeDays.filter((d) => d !== day);
    } else {
      newDays = [...activeDays, day].sort((a, b) => a - b);
    }
    setActiveDays(newDays);
  };

  const selectAllDays = () => {
    setActiveDays([1, 2, 3, 4, 5, 6, 7]);
  };

  const selectWeekdaysOnly = () => {
    setActiveDays([1, 2, 3, 4, 5]);
  };

  return (
    <div className="space-y-8 animate-fade-in text-(--color-theme-text)">
      {/* Tab Header */}
      <div>
        <h2 className="text-2xl font-bold font-display flex items-center gap-2">
          <Clock className="w-6 h-6 text-(--color-frog-green)" />
          Timing & Cadence
        </h2>
        <p className="text-sm text-(--color-theme-muted) mt-1">
          Control how often Ribbit nudges you to adjust your posture and your active work hours.
        </p>
      </div>

      {/* Reminder Interval Section */}
      <div className="p-6 rounded-2xl bg-(--color-theme-surface) border border-(--color-theme-border) shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold">Reminder Frequency</h3>
            <p className="text-xs text-(--color-theme-muted)">
              How often a posture check notification appears on your desktop
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold font-display text-(--color-frog-green)">
              {intervalMinutes}
            </span>
            <span className="text-sm font-medium text-(--color-theme-muted)">minutes</span>
          </div>
        </div>

        {/* Slider */}
        <div className="space-y-3">
          <input
            type="range"
            min="5"
            max="120"
            step="5"
            value={intervalMinutes}
            onChange={handleSliderChange}
            aria-label="Reminder interval in minutes"
            className="w-full h-2.5 bg-(--color-theme-border) rounded-lg appearance-none cursor-pointer accent-(--color-frog-green) focus:outline-none focus:ring-2 focus:ring-(--color-frog-green)/50"
          />
          <div className="flex justify-between text-xs text-(--color-theme-muted) font-mono">
            <span>5 min</span>
            <span>30 min</span>
            <span>60 min</span>
            <span>90 min</span>
            <span>120 min</span>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs text-(--color-theme-muted) mr-2">Quick Presets:</span>
          {PRESET_INTERVALS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => handlePresetClick(preset)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                intervalMinutes === preset
                  ? 'bg-(--color-frog-green) text-white shadow-(--shadow-glow-green)'
                  : 'bg-(--color-theme-card) border border-(--color-theme-border) text-(--color-theme-text) hover:border-(--color-frog-green)/60 hover:bg-(--color-frog-green)/10'
              }`}
            >
              {preset} min
            </button>
          ))}
        </div>

        {/* Informative Banner */}
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-(--color-frog-green)/10 border border-(--color-frog-green)/30 text-xs">
          <div className="w-8 h-8 rounded-full bg-(--color-frog-green)/20 flex items-center justify-center shrink-0 text-base">
            🐸
          </div>
          <div>
            <span className="font-semibold text-(--color-frog-green)">
              Ribbit will check in every {intervalMinutes} minutes.
            </span>
            <p className="text-(--color-theme-muted) mt-0.5">
              Consistent micro-breaks every 30-45 minutes help avoid cervical spine fatigue and posture slouch.
            </p>
          </div>
        </div>
      </div>

      {/* Active Hours Section */}
      <div className="p-6 rounded-2xl bg-(--color-theme-surface) border border-(--color-theme-border) shadow-sm space-y-5">
        <div>
          <h3 className="text-base font-semibold">Active Hours Window</h3>
          <p className="text-xs text-(--color-theme-muted)">
            Ribbit will only alert you during these hours. Reminders stay paused during your quiet time.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-(--color-theme-card) border border-(--color-theme-border) space-y-2">
            <label htmlFor="start-time-input" className="block text-xs font-semibold text-(--color-theme-muted)">
              Start Time (Daily)
            </label>
            <input
              id="start-time-input"
              type="time"
              value={activeHoursStart}
              onChange={(e) => setActiveHours(e.target.value, activeHoursEnd)}
              className="w-full px-3 py-2 rounded-lg bg-(--color-theme-surface) border border-(--color-theme-border) text-(--color-theme-text) font-mono text-sm focus:outline-none focus:ring-2 focus:ring-(--color-frog-green)/40"
            />
          </div>

          <div className="p-4 rounded-xl bg-(--color-theme-card) border border-(--color-theme-border) space-y-2">
            <label htmlFor="end-time-input" className="block text-xs font-semibold text-(--color-theme-muted)">
              End Time (Daily)
            </label>
            <input
              id="end-time-input"
              type="time"
              value={activeHoursEnd}
              onChange={(e) => setActiveHours(activeHoursStart, e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-(--color-theme-surface) border border-(--color-theme-border) text-(--color-theme-text) font-mono text-sm focus:outline-none focus:ring-2 focus:ring-(--color-frog-green)/40"
            />
          </div>
        </div>
      </div>

      {/* Active Days Section */}
      <div className="p-6 rounded-2xl bg-(--color-theme-surface) border border-(--color-theme-border) shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-(--color-frog-green)" />
              Active Days
            </h3>
            <p className="text-xs text-(--color-theme-muted)">
              Select which days of the week reminders should be active
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={selectAllDays}
              className="text-(--color-frog-green) hover:underline font-medium"
            >
              All Days
            </button>
            <span className="text-(--color-theme-border)">|</span>
            <button
              type="button"
              onClick={selectWeekdaysOnly}
              className="text-(--color-theme-muted) hover:text-(--color-theme-text) font-medium"
            >
              Weekdays
            </button>
          </div>
        </div>

        {/* 7 Day Toggle Buttons */}
        <div className="grid grid-cols-7 gap-2">
          {DAYS_OF_WEEK.map(({ day, label, full }) => {
            const isSelected = activeDays.includes(day);
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                title={full}
                aria-pressed={isSelected}
                className={`py-3 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all font-medium text-xs ${
                  isSelected
                    ? 'bg-(--color-frog-green) text-white shadow-(--shadow-glow-green)'
                    : 'bg-(--color-theme-card) border border-(--color-theme-border) text-(--color-theme-muted) hover:border-(--color-frog-green)/40 hover:text-(--color-theme-text)'
                }`}
              >
                <span>{label}</span>
                <div
                  className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${
                    isSelected ? 'bg-white/20' : 'bg-transparent'
                  }`}
                >
                  {isSelected && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-xs text-(--color-theme-muted)">
          <Info className="w-3.5 h-3.5" />
          <span>
            {activeDays.length === 7
              ? 'Active all 7 days of the week'
              : activeDays.length === 5 && !activeDays.includes(6) && !activeDays.includes(7)
              ? 'Active Monday through Friday (weekends paused)'
              : `Active on ${activeDays.length} selected days`}
          </span>
        </div>
      </div>
    </div>
  );
}
