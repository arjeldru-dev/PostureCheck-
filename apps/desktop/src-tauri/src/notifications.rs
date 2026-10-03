use std::sync::{Arc, Mutex};
use std::time::Duration as StdDuration;
use chrono::Local;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};
#[cfg(not(target_os = "windows"))]
use tauri_plugin_notification::NotificationExt;

use crate::tray::{get_active_icon, update_tray_visuals, TRAY_ID};

/// Windows-specific AUMID registration for notification settings
#[cfg(target_os = "windows")]
pub fn ensure_windows_aumid_registered() {
    use std::os::windows::process::CommandExt;
    use std::path::PathBuf;

    let app_id = "com.posturecheck.app";
    let icon_path = std::env::current_dir()
        .map(|d| d.join("icons").join("icon.ico"))
        .unwrap_or_else(|_| PathBuf::from("icons\\icon.ico"));
    let icon_str = icon_path.to_string_lossy().to_string();

    let exe_path = std::env::current_exe()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|_| "D:\\PostureCheck-\\apps\\desktop\\src-tauri\\target\\debug\\posture-check-desktop.exe".to_string());

    let script = format!(
        r#"
        $appId = '{app_id}'
        $classKey = "HKCU:\Software\Classes\AppUserModelId\$appId"
        if (-not (Test-Path $classKey)) {{ New-Item -Path $classKey -Force | Out-Null }}
        Set-ItemProperty -Path $classKey -Name "DisplayName" -Value "Posture Check!" -Type String
        Set-ItemProperty -Path $classKey -Name "ShowInSettings" -Value 1 -Type DWord
        if (Test-Path '{icon_str}') {{
            Set-ItemProperty -Path $classKey -Name "IconUri" -Value '{icon_str}' -Type String
        }}
        $settingsKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Notifications\Settings\$appId"
        if (-not (Test-Path $settingsKey)) {{
            New-Item -Path $settingsKey -Force | Out-Null
            Set-ItemProperty -Path $settingsKey -Name "Enabled" -Value 1 -Type DWord
            Set-ItemProperty -Path $settingsKey -Name "ShowInActionCenter" -Value 1 -Type DWord
        }}

        # Ensure Start Menu Shortcut with AppUserModelID so Windows Settings lists it
        $programs = [Environment]::GetFolderPath([Environment+SpecialFolder]::Programs)
        $lnk = Join-Path $programs "Posture Check!.lnk"
        if (-not (Test-Path $lnk)) {{
            $wsh = New-Object -ComObject WScript.Shell
            $sc = $wsh.CreateShortcut($lnk)
            $sc.TargetPath = '{exe_path}'
            if (Test-Path '{icon_str}') {{ $sc.IconLocation = '{icon_str}' }}
            $sc.Save()

            $source = @"
using System;
using System.Runtime.InteropServices;
using System.Runtime.InteropServices.ComTypes;

public class ShellHelper
{{
    [ComImport, Guid("00021401-0000-0000-C000-000000000046"), ClassInterface(ClassInterfaceType.None)]
    private class ShellLink {{}}

    [ComImport, Guid("886D8EEB-8CF2-4446-8D02-CDBA1DBDCF99"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IPropertyStore
    {{
        int GetCount(out uint cProps);
        int GetAt(uint iProp, out PROPERTYKEY pkey);
        int GetValue(ref PROPERTYKEY key, out PROPVARIANT pv);
        int SetValue(ref PROPERTYKEY key, ref PROPVARIANT pv);
        int Commit();
    }}

    [StructLayout(LayoutKind.Sequential, Pack = 4)]
    private struct PROPERTYKEY
    {{
        public Guid fmtid;
        public uint pid;
    }}

    [StructLayout(LayoutKind.Explicit)]
    private struct PROPVARIANT
    {{
        [FieldOffset(0)] public ushort vt;
        [FieldOffset(8)] public IntPtr pwszVal;
    }}

    public static void SetAppId(string path, string id)
    {{
        ShellLink link = new ShellLink();
        IPersistFile file = (IPersistFile)link;
        file.Load(path, 2);
        IPropertyStore store = (IPropertyStore)link;
        PROPERTYKEY pkey = new PROPERTYKEY {{ fmtid = new Guid("9F4C2855-9F79-4B39-A8D0-E1D42DE1D5F3"), pid = 5 }};
        PROPVARIANT pv = new PROPVARIANT {{ vt = 31, pwszVal = Marshal.StringToCoTaskMemUni(id) }};
        store.SetValue(ref pkey, ref pv);
        store.Commit();
        file.Save(path, true);
        Marshal.FreeCoTaskMem(pv.pwszVal);
    }}
}}
"@
            try {{
                Add-Type -TypeDefinition $source
                [ShellHelper]::SetAppId($lnk, $appId)
            }} catch {{}}
        }}
        "#
    );

    let _ = std::process::Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-Command", &script])
        .creation_flags(0x08000000) // CREATE_NO_WINDOW
        .output();
}

/// Windows-specific helper to clear prior toasts so new notifications replace rather than stack
#[cfg(target_os = "windows")]
pub fn clear_windows_toast_history(app_id: &str) {
    if let Ok(history) = windows::UI::Notifications::ToastNotificationManager::History() {
        let _ = history.ClearWithId(&windows::core::HSTRING::from(app_id));
    }
}

/// Action descriptor for notifications
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct NotificationAction {
    pub id: String,
    pub label: String,
}

/// Structure representing a recorded notification in history
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct NotificationRecord {
    pub id: String,
    pub timestamp: String,
    pub level: u8,
    pub title: String,
    pub body: String,
    pub status: String, // "shown" | "acknowledged" | "snoozed" | "dismissed" | "expired"
    pub actions: Vec<NotificationAction>,
}

/// In-memory notification manager state with message rotation engine
pub struct NotificationManager {
    pub default_intensity_level: u8,
    pub history: Vec<NotificationRecord>,
    pub active_notification_id: Option<String>,
    pub current_tone: String,
    pub recent_messages: Vec<String>,
    pub last_acknowledgment: Option<String>,
}

impl Default for NotificationManager {
    fn default() -> Self {
        Self {
            default_intensity_level: 2, // Default: Level 2 (Nudge)
            history: Vec::new(),
            active_notification_id: None,
            current_tone: "encouraging".to_string(),
            recent_messages: Vec::new(),
            last_acknowledgment: None,
        }
    }
}

// ============================================================================
// Level 1: Whisper Pools
// ============================================================================
pub const LEVEL_1_ENCOURAGING: &[&str] = &[
    "Psst! Quick posture check 🐸",
    "How's your back doing right now? ✨",
    "Gentle reminder: sit tall and breathe.",
    "Tiny frog tap: relax your shoulders. 🌿",
    "Just a soft whisper to align your spine.",
    "Unclench your jaw, soften your neck. 💚",
    "A little frog wink for your posture 😉",
    "Psst! Lift your chin slightly and smile.",
    "Friendly nudge: let your back feel supported.",
    "Take a slow breath and gently reset. 🌸",
    "Micro-stretch time: roll your wrists and neck.",
    "Your spine loves a quick check-in! 🐸",
];

pub const LEVEL_1_SASSY: &[&str] = &[
    "Psst... I see you creeping toward the screen 👀",
    "Are you melting into your chair again? 🐸",
    "Just checking if your spine still has a pulse.",
    "Tiny reminder: you're human, not an overcooked noodle 🍜",
    "Shrimp mode detected at whisper volume 🦐",
    "Psst! Gravity isn't your excuse today.",
    "Did your head just sink two inches? Lift it! 👀",
    "Quiet whisper: don't make me ribbit louder.",
    "Your neck is doing too much heavy lifting right now.",
    "Tiny check: are you sitting or disintegrating?",
    "A little side-eye from your frog companion 😏",
    "Un-slouch real quick, nobody saw... except me 🐸",
];

pub const LEVEL_1_MINIMAL: &[&str] = &[
    "Posture check.",
    "Sit tall.",
    "Align spine.",
    "Roll shoulders back.",
    "Relax neck and jaw.",
    "Check posture.",
    "Crown high, feet flat.",
    "Micro-reset.",
    "Shoulders down.",
    "Reset alignment.",
    "Breathe and lengthen.",
    "Sit upright.",
];

// ============================================================================
// Level 2: Nudge Pools
// ============================================================================
pub const LEVEL_2_ENCOURAGING: &[&str] = &[
    "Hey friend! Time for a posture check 🐸",
    "Your spine says thank you when you sit up!",
    "Quick stretch? Even frogs need to hop around! 🌿",
    "Ribbit! Let's sit tall and conquer the day! 💪",
    "Roll those shoulders back. Ah, feels much better!",
    "Your future self will thank you for sitting straight now.",
    "Take a deep breath, reset your back, and keep shining! ✨",
    "A friendly hop to remind you: you're doing great! 🐸",
    "Chest open, shoulders relaxed. You've got this!",
    "Spinal check-in! Treat your back with kindness.",
    "Let's add a quick point to your posture streak! 🌟",
    "Sit tall like a proud frog on a giant lily pad 🪷",
    "Breathe in deep, lengthen your back, exhale the slouch.",
    "Posture break! A small reset makes a big difference.",
];

pub const LEVEL_2_SASSY: &[&str] = &[
    "Ribbit! Are you slouching again? 👀",
    "I see that slouch... don't make me ribbit louder!",
    "Plot twist: your chair isn't a bed 🐸",
    "Are you turning into a shrimp? Sit tall! 🦐",
    "Your spine is shaped like a question mark right now. Answer it! ❓",
    "Ribbit! Stop auditioning for the Hunchback of Notre Dame!",
    "Chair posture check: upright citizen or melted puddle? 😏",
    "I'm watching your posture from the lily pad. Straighten up!",
    "Gravity is winning. Fight back! 🐸⚡",
    "Did the keyboard magnetize your forehead? Back up!",
    "Ribbit! Slouching burns zero calories. Sit straight!",
    "Nice hunch! Is that the new ergonomic trend? Didn't think so.",
    "Ribbit says: uncurl the spine before you evolve backwards.",
    "Hey! You promised yourself good posture today!",
];

pub const LEVEL_2_MINIMAL: &[&str] = &[
    "Time to reset posture.",
    "Sit up straight.",
    "Spine check: ears over shoulders.",
    "Feet flat, back straight.",
    "Roll shoulders, lift chest.",
    "Quick posture correction.",
    "Adjust your seated posture.",
    "Straighten your spine.",
    "Reset back alignment.",
    "Check your head position.",
    "Un-hunch and breathe.",
    "Posture interval: sit tall.",
    "Level 2 check: reset now.",
    "Back straight, eyes level.",
];

// ============================================================================
// Level 3: Reminder Pools
// ============================================================================
pub const LEVEL_3_ENCOURAGING: &[&str] = &[
    "Time to sit up straight! You got this 💪🐸",
    "Your future self thanks you for good posture!",
    "Ribbit! Posture check time — let's go! 🌿",
    "Hey! Ribbit is tapping on your glass: Posture check! 🪟🐸",
    "Time to level up your posture! Sit tall and tap acknowledge.",
    "Spinal health is wealth! Take 5 seconds to adjust. ✨",
    "Your spine is carrying your dreams today. Give it some love! 🌟",
    "Ribbit reminder: Sit tall like a majestic frog on a lily pad!",
    "Stretch your torso, roll back those shoulder blades, and smile!",
    "Posture logged is habit built! Claim your XP right now! 🏆",
    "Take pride in that posture! Sit tall and strong! 🐸💚",
    "Keep your energy high by giving your lungs full room to expand!",
    "Spine aligned, mind focused! Let's keep the streak alive! 🔥",
    "Ribbit believes in your upright posture journey!",
];

pub const LEVEL_3_SASSY: &[&str] = &[
    "Don't ignore me! Your spine needs a quick adjustment 👀",
    "I see that monitor hunch. Don't make me hop over there! 🐸",
    "Slouching detected! Straighten up before I ribbit in all caps!",
    "Did your spine file a formal complaint? Because I'm hearing one.",
    "Posture check! You're slouching so hard you're about to slip off the chair!",
    "Ribbit! That's not good posture, that's modern caveman posture 🦴",
    "Your monitor is too far down or your back is giving up. Fix it!",
    "I'm not leaving this corner of your screen until you sit up straight! 🐸",
    "Plot twist: slouching won't make the code compile faster.",
    "Ribbit warns: permanent hunchback in 3... 2... 1... Straighten up!",
    "Don't make Ribbit give you the disappointed frog stare... 😐🐸",
    "You're paying for an ergonomic chair, why are you sitting like a pretzel?",
    "Ribbit demands spine justice right now!",
    "Hey! Yes, you! Shoulders back, chin in, sit upright!",
];

pub const LEVEL_3_MINIMAL: &[&str] = &[
    "Posture reminder: ears over shoulders, eyes level.",
    "Feet flat on the floor, back supported. Reset now.",
    "Persistent reminder: align spine and acknowledge.",
    "Straighten your back. Pull shoulder blades together.",
    "Time to sit straight and clear this banner.",
    "Adjust seated position: lift ribcage, drop shoulders.",
    "Spine correction required: sit upright.",
    "Check monitor distance and straighten back.",
    "Acknowledge posture reset to continue.",
    "Align lumbar curve and sit back in chair.",
    "Posture break: straighten up now.",
    "Spinal reset reminder: acknowledge when upright.",
    "Level 3 reminder: sit upright, shoulders back.",
    "Posture alert: reset alignment immediately.",
];

// ============================================================================
// Level 4: Alert Pools
// ============================================================================
pub const LEVEL_4_ENCOURAGING: &[&str] = &[
    "⏰ Hey! This is your posture reminder! Sit up NOW! 🐸⚡",
    "Your back is literally begging you right now! Let's fix it!",
    "Ribbit is jumping with urgency! Back off the desk! 🐸💪",
    "You've been hunched too long! Sit up straight and claim your XP!",
    "Break the slump cycle right now! Deep breath, sit tall!",
    "Spine intervention! Stand or sit tall — you can do this!",
    "Urgent posture check: protect your spine before stiffness sets in!",
    "Ribbit alert: Stand up or sit upright! Treat your body with respect!",
    "Take 10 seconds for your health right now. Straighten your posture!",
    "Time to reset with intensity! Push your shoulders back and rise!",
];

pub const LEVEL_4_SASSY: &[&str] = &[
    "RIBBIT! I'm not going away until you fix that posture! 🐸🚨",
    "ATTENTION: Serious slouch alert! Straighten your spine now!",
    "Posture emergency! Un-hunch immediately for your own good!",
    "Your spine called—it wants its natural curve back right now!",
    "Are you trying to fold yourself in half? SIT UP!",
    "Ribbit is this close to hopping onto your keyboard! Straighten up! 🐸",
    "Stop ignoring your spine! You look like a cashew nut right now!",
    "Red alert! Drop the slouch, pull back the shoulders, or else!",
    "Level 4 alert: your posture is an OSHA hazard right now!",
    "RIBBIT! Even a tadpole sits straighter than that!",
];

pub const LEVEL_4_MINIMAL: &[&str] = &[
    "ALERT: Straighten posture immediately.",
    "Priority check: Lift chest, pull back chin.",
    "Severe slouch detected. Sit upright now.",
    "Posture intervention: correct spine alignment.",
    "Urgent posture reset required.",
    "Level 4 Alert: align spine and acknowledge.",
    "Attention: un-hunch back and neck now.",
    "Immediate action required: sit tall.",
    "Spine check: disengage slouch immediately.",
    "Posture Alert: reset body positioning now.",
];

// ============================================================================
// Level 5: Wake Up! Pools
// ============================================================================
pub const LEVEL_5_ENCOURAGING: &[&str] = &[
    "🚨 POSTURE EMERGENCY! Sit up RIGHT NOW! 🚨",
    "THIS IS NOT A DRILL! Your spine needs you! 🐸❤️",
    "WAKE UP! FULL STOP! Sit up straight, stretch your arms, and breathe! 🛑🐸",
    "CRITICAL RESET: Stand or sit upright. Ribbit demands spine justice!",
    "Spine protection mode active! Stretch tall, inhale deep, reset now!",
    "Pause everything! Take 15 seconds to honor your body and sit upright!",
    "Emergency posture pause! You deserve a pain-free back, let's reset!",
    "Ribbit intervention: You're too important to ruin your back. Sit tall!",
];

pub const LEVEL_5_SASSY: &[&str] = &[
    "I will NOT stop until you sit up straight! 🐸🚨",
    "EMERGENCY POSTURE INTERVENTION! Ribbit is panicking! Straighten up!",
    "No more excuses! Sit up like royalty before you continue! 👑",
    "Full screen takeover! Your slouch has violated the laws of physics!",
    "Ribbit has officially locked down your screen. Un-slouch to survive! 🐸💥",
    "You chose Level 5, now face the consequences: SIT UP STRAIGHT!",
    "I am the blocker of screens and the guardian of spines! RISE UP!",
    "Slouch level critical! Ribbit has seized the means of production! 🐸🛑",
];

pub const LEVEL_5_MINIMAL: &[&str] = &[
    "EMERGENCY: Sit upright to unlock screen.",
    "Screen blocked for spinal safety. Align posture.",
    "Full stop. Reset back, neck, and shoulders.",
    "Critical posture lock: sit tall and acknowledge.",
    "WAKE UP. Straighten spine immediately.",
    "Halt. Restore proper ergonomic posture.",
    "Mandatory posture correction in progress.",
    "Action required: sit upright to proceed.",
];

// ============================================================================
// Golden Frog & Acknowledgment Pools
// ============================================================================
pub const GOLDEN_FROG_MESSAGES: &[&str] = &[
    "✨ The Golden Frog speaks: your posture is magnificent! 👑🐸",
    "✨ 30+ days! I've evolved into my golden form for you!",
    "✨ Golden aura activated! You have achieved true postural enlightenment!",
    "✨ Behold the Golden Ribbit: over a month of unyielding backbone excellence!",
    "✨ A radiant posture fit for the Golden Lily Pad! Keep shining!",
    "✨ The golden glow of spinal mastery illuminates your desk! 🌟",
    "✨ 30+ days unbroken! The mythical Golden Frog bows in deep respect.",
    "✨ You are among the elite few who hear the Golden Ribbit! Sit proud! 🏆",
    "✨ Pure gold! Your spine is stronger and straighter than ever before! 🌿✨",
    "✨ Legendary form unlocked: Your dedication shines across the entire pond! 👑",
    "✨ Golden Ribbit blessing: Keep sitting tall, true posture champion!",
    "✨ The sacred golden lily pad belongs to you! Incredible 30+ day streak! 🪷",
];

pub const ACKNOWLEDGMENT_MESSAGES: &[&str] = &[
    "Great job! Your back thanks you! 🐸",
    "That's what I'm talking about! 💪",
    "Ribbit! You're a posture champion!",
    "Posture logged! Spine aligned and shining! ✨",
    "Look at that royal posture! Long live your spine! 👑",
    "Smooth adjustment! Ribbit nods in deep approval.",
    "+10 XP secured! Feeling tall and proud. 🌟",
    "Spine aligned, mind focused! Back to crushing it! 🚀",
    "Awesome job! Sitting tall looks great on you! 👍🐸",
    "Habit point claimed! Every little check counts!",
    "A majestic reset! The lily pad salutes you 🪷",
    "Ribbit is doing a happy hop! Fantastic posture! 🐸🎉",
    "Your back is rejoicing right now! Keep it up!",
    "Posture master in the making! Streak safe and sound!",
    "Spinal harmony restored. Carry on, legend! 🌿",
];

// Legacy aliases for backwards compatibility
pub const LEVEL_1_MESSAGES: &[&str] = LEVEL_1_ENCOURAGING;
pub const LEVEL_2_MESSAGES: &[&str] = LEVEL_2_ENCOURAGING;
pub const LEVEL_3_MESSAGES: &[&str] = LEVEL_3_ENCOURAGING;
pub const LEVEL_4_MESSAGES: &[&str] = LEVEL_4_ENCOURAGING;
pub const LEVEL_5_MESSAGES: &[&str] = LEVEL_5_ENCOURAGING;

impl NotificationManager {
    pub fn new() -> Self {
        Self::default()
    }

    /// Sets the active mascot personality tone
    pub fn set_tone(&mut self, tone: &str) {
        self.current_tone = match tone {
            "sassy" => "sassy".to_string(),
            "minimal" => "minimal".to_string(),
            _ => "encouraging".to_string(),
        };
    }

    /// Retrieves the current mascot personality tone
    pub fn get_tone(&self) -> &str {
        &self.current_tone
    }

    /// Selects a randomized message for the level using current tone, guaranteeing no repeats in last 5 messages
    pub fn pick_message(&mut self, level: u8) -> String {
        let tone = self.current_tone.clone();
        self.pick_message_with_tone(level, &tone, None)
    }

    /// Selects message with optional streak context to unlock Golden Frog messages (>30 days)
    pub fn pick_message_with_context(&mut self, level: u8, streak_days: Option<u32>) -> String {
        let tone = self.current_tone.clone();
        self.pick_message_with_tone(level, &tone, streak_days)
    }

    /// Selects a randomized message for specific level, tone, and streak count
    pub fn pick_message_with_tone(&mut self, level: u8, tone: &str, streak_days: Option<u32>) -> String {
        // 1. Golden frog unlock check (>30 days streak)
        if let Some(streak) = streak_days {
            if streak > 30 {
                return self.select_from_pool(GOLDEN_FROG_MESSAGES);
            }
        }

        // 2. Select from level + tone pool
        let pool = match (level, tone) {
            (1, "sassy") => LEVEL_1_SASSY,
            (1, "minimal") => LEVEL_1_MINIMAL,
            (1, _) => LEVEL_1_ENCOURAGING,

            (2, "sassy") => LEVEL_2_SASSY,
            (2, "minimal") => LEVEL_2_MINIMAL,
            (2, _) => LEVEL_2_ENCOURAGING,

            (3, "sassy") => LEVEL_3_SASSY,
            (3, "minimal") => LEVEL_3_MINIMAL,
            (3, _) => LEVEL_3_ENCOURAGING,

            (4, "sassy") => LEVEL_4_SASSY,
            (4, "minimal") => LEVEL_4_MINIMAL,
            (4, _) => LEVEL_4_ENCOURAGING,

            (5, "sassy") => LEVEL_5_SASSY,
            (5, "minimal") => LEVEL_5_MINIMAL,
            (5, _) => LEVEL_5_ENCOURAGING,

            _ => LEVEL_2_ENCOURAGING,
        };

        self.select_from_pool(pool)
    }

    /// Selects a random message avoiding the last 5 messages in history
    fn select_from_pool(&mut self, pool: &[&'static str]) -> String {
        use rand::Rng;

        if pool.is_empty() {
            return "Time for a posture check! 🐸".to_string();
        }

        // Exclude messages in recent_messages buffer
        let candidates: Vec<&'static str> = pool
            .iter()
            .copied()
            .filter(|msg| !self.recent_messages.iter().any(|r| r == *msg))
            .collect();

        let mut eligible = candidates;
        if eligible.is_empty() {
            // Buffer exhausted: reset but still exclude immediate last shown if possible
            let last_shown = self.recent_messages.last().cloned();
            self.recent_messages.clear();
            if pool.len() > 1 && last_shown.is_some() {
                let last_str = last_shown.unwrap();
                eligible = pool.iter().copied().filter(|m| *m != last_str.as_str()).collect();
            }
            if eligible.is_empty() {
                eligible = pool.to_vec();
            }
        }

        let mut rng = rand::rng();
        let idx = rng.random_range(0..eligible.len());
        let selected = eligible[idx].to_string();

        self.recent_messages.push(selected.clone());
        if self.recent_messages.len() > 5 {
            self.recent_messages.remove(0);
        }

        selected
    }

    /// Returns a positive acknowledgment message
    pub fn get_acknowledgment_message(&mut self) -> String {
        use rand::Rng;
        let pool = ACKNOWLEDGMENT_MESSAGES;
        let candidates: Vec<&'static str> = pool
            .iter()
            .copied()
            .filter(|msg| {
                if let Some(ref last) = self.last_acknowledgment {
                    *msg != last.as_str()
                } else {
                    true
                }
            })
            .collect();

        let eligible = if candidates.is_empty() {
            pool.to_vec()
        } else {
            candidates
        };

        let mut rng = rand::rng();
        let idx = rng.random_range(0..eligible.len());
        let selected = eligible[idx].to_string();
        self.last_acknowledgment = Some(selected.clone());
        selected
    }

    /// Returns a streak-specific celebration message
    pub fn get_streak_message(&self, streak_days: u32) -> String {
        match streak_days {
            0 => "🌱 Day 1 starts today! Every great posture habit begins with a single hop! 🐸".to_string(),
            1 => "🌱 Day 1 logged! The journey to healthy posture begins! 🐸".to_string(),
            3 => "🔥 3-day streak! You're on fire!".to_string(),
            7 => "🔥 7 days! Week warrior! Ribbit! 🐸".to_string(),
            14 => "🔥 14 days! Two solid weeks of posture perfection! 🌟".to_string(),
            21 => "🔥 21 days! Habit officially forged in stone! 💪".to_string(),
            30 => "🔥 30 days! You're a posture legend! Golden Frog unlocked! 👑🐸".to_string(),
            60 => "🔥 60 days! Unstoppable spinal discipline! Two full months! 🏆".to_string(),
            90 => "🔥 90 days! A quarterly masterpiece of posture mastery! ✨".to_string(),
            100 => "🔥 100 days! Triple-digit royalty! Century Club champion! 👑🎉".to_string(),
            365 => "🔥 365 days! ONE FULL YEAR of elite posture! True legend status! 🪷👑".to_string(),
            n => format!("🔥 {}-day streak! Keep that posture flame burning! Ribbit! 🐸", n),
        }
    }

    /// Records a notification event in history (keeps last 100 entries)
    pub fn record_notification(
        &mut self,
        id: String,
        level: u8,
        title: String,
        body: String,
        status: String,
    ) -> NotificationRecord {
        // If an earlier notification is still marked as "shown", supersede/dismiss it so notifications don't stack
        if let Some(active_id) = &self.active_notification_id {
            if let Some(prev) = self.history.iter_mut().rev().find(|r| &r.id == active_id) {
                if prev.status == "shown" {
                    prev.status = "dismissed".to_string();
                }
            }
        }

        let actions = vec![
            NotificationAction {
                id: "sitting_up".to_string(),
                label: "✓ Sitting up!".to_string(),
            },
            NotificationAction {
                id: "snooze".to_string(),
                label: "💤 Snooze (5m)".to_string(),
            },
        ];

        let record = NotificationRecord {
            id: id.clone(),
            timestamp: Local::now().to_rfc3339(),
            level,
            title,
            body,
            status,
            actions,
        };

        self.active_notification_id = Some(id);
        self.history.push(record.clone());
        if self.history.len() > 100 {
            self.history.remove(0);
        }
        record
    }

    /// Updates status of an existing notification in history
    pub fn update_status(&mut self, id: &str, new_status: &str) -> bool {
        if let Some(record) = self.history.iter_mut().rev().find(|r| r.id == id) {
            if record.status == new_status {
                return false;
            }
            record.status = new_status.to_string();
            if self.active_notification_id.as_deref() == Some(id)
                && (new_status == "acknowledged"
                    || new_status == "snoozed"
                    || new_status == "dismissed"
                    || new_status == "expired")
            {
                self.active_notification_id = None;
            }
            true
        } else {
            false
        }
    }

    /// Mark the latest active notification with a given status.
    /// Returns Some(id) only if the status actually transitioned to the new status.
    pub fn update_latest_active_status(&mut self, new_status: &str) -> Option<String> {
        let id_opt = self.active_notification_id.clone();
        if let Some(id) = id_opt {
            if self.update_status(&id, new_status) {
                return Some(id);
            }
        } else if let Some(last) = self.history.iter_mut().rev().find(|r| r.status == "shown") {
            last.status = new_status.to_string();
            return Some(last.id.clone());
        }
        None
    }
}

/// Constant notification tag ID so OS toasts replace existing ones instead of stacking
pub const POSTURE_NOTIFICATION_ID: i32 = 1;

/// Displays a posture notification through Tauri's notification plugin, manages timeouts,
/// and emits frontend events
pub fn show_posture_notification(
    app: &AppHandle,
    level: u8,
    custom_message: Option<String>,
) -> Result<NotificationRecord, String> {
    show_posture_notification_with_id(app, level, custom_message, None)
}

/// Displays a posture notification with an explicit check ID
pub fn show_posture_notification_with_id(
    app: &AppHandle,
    level: u8,
    custom_message: Option<String>,
    check_id: Option<String>,
) -> Result<NotificationRecord, String> {
    let now = Local::now();
    let is_new_check = check_id.is_none();
    let notification_id = check_id.unwrap_or_else(|| uuid::Uuid::new_v4().to_string());

    // Level 5 requires explicit opt-in confirmation; if not opted in, fall back to Level 4
    let effective_level = if level == 5 {
        let is_opted_in = if let Some(db) = app.try_state::<crate::database::Database>() {
            db.get_settings().map(|s| s.level5_opt_in).unwrap_or(false)
        } else {
            false
        };
        if is_opted_in {
            5
        } else {
            4
        }
    } else {
        level
    };

    // 1. Pick non-repeating message
    let body = match custom_message {
        Some(msg) => msg,
        None => {
            if let Some(mgr) = app.try_state::<Mutex<NotificationManager>>() {
                if let Ok(mut lock) = mgr.lock() {
                    let streak = if let Some(db) = app.try_state::<crate::database::Database>() {
                        db.get_user_progress().ok().map(|p| p.current_streak as u32)
                    } else {
                        None
                    };
                    lock.pick_message_with_context(effective_level, streak)
                } else {
                    "Ribbit says: Time to sit up tall! 🐸".to_string()
                }
            } else {
                "Ribbit says: Time to sit up tall! 🐸".to_string()
            }
        }
    };

    let title = match effective_level {
        1 => "Posture Check! 🐸 (Whisper)",
        2 => "Posture Check! 🐸 (Nudge)",
        3 => "Posture Alert! 🐸 (Reminder)",
        4 => "⏰ Posture Check!",
        5 => "🚨 POSTURE CHECK! 🚨",
        _ => "Posture Check! 🐸",
    };

    // 2. Dispatch notification
    if effective_level >= 4 {
        // Level 4 (Alert) or Level 5 (Wake Up!): Overlay windows with alarm audio
        // Close prior active overlay to avoid stacking
        close_overlay_windows(app);

        // Play alarm sound (Level 4: repeats every 30s; Level 5: loops continuously)
        play_alarm_sound(app, effective_level);

        // Open custom Tauri overlay window
        if effective_level == 4 {
            show_level4_overlay(app, &notification_id, title, &body);
        } else {
            show_level5_fullscreen(app, &notification_id, title, &body);
        }
    } else {
        // Levels 1-3: continue using native OS notifications
        #[cfg(target_os = "windows")]
        {
            // Ensure AUMID registry entry exists so Posture Check! appears in Windows Notification Settings
            ensure_windows_aumid_registered();

            // Clear any previous notification from this app to prevent stacking
            clear_windows_toast_history("com.posturecheck.app");

            let mut toast = tauri_winrt_notification::Toast::new("com.posturecheck.app")
                .title(title)
                .text1(&body);

            let possible_icon_paths = [
                std::env::current_dir().map(|d| d.join("src-tauri").join("icons").join("128x128.png")).ok(),
                std::env::current_dir().map(|d| d.join("icons").join("128x128.png")).ok(),
                std::env::current_exe().ok().and_then(|p| p.parent().map(|d| d.join("icons").join("128x128.png"))),
                Some(std::path::PathBuf::from(r"D:\PostureCheck-\apps\desktop\src-tauri\icons\128x128.png")),
            ];
            let mascot_icon = possible_icon_paths.into_iter().flatten().find(|p| p.exists());

            match effective_level {
                1 => {
                    // Level 1: Whisper (Silent - no sound, no buttons, subtle popup + tray tooltip)
                    toast = toast.sound(None);
                    toast = toast.duration(tauri_winrt_notification::Duration::Short);
                }
                2 => {
                    // Level 2: Nudge (System default sound, standard toast with action buttons)
                    toast = toast.sound(Some(tauri_winrt_notification::Sound::Default));
                    toast = toast.duration(tauri_winrt_notification::Duration::Short);
                    toast = toast.add_button("✓ Sitting up!", "sitting_up");
                    toast = toast.add_button("💤 Snooze (5m)", "snooze");
                }
                3 => {
                    // Level 3: Reminder (Reminder chime + persistent on screen until acknowledged, rich banner layout with mascot icon)
                    toast = toast.scenario(tauri_winrt_notification::Scenario::Reminder);
                    toast = toast.sound(Some(tauri_winrt_notification::Sound::Reminder));
                    if let Some(ref icon) = mascot_icon {
                        toast = toast.icon(icon, tauri_winrt_notification::IconCrop::Square, "Ribbit Mascot");
                    }
                    toast = toast.add_button("✓ Sitting up!", "sitting_up");
                    toast = toast.add_button("💤 Snooze (5m)", "snooze");
                }
                _ => {
                    toast = toast.sound(Some(tauri_winrt_notification::Sound::Default));
                    toast = toast.add_button("✓ Sitting up!", "sitting_up");
                    toast = toast.add_button("💤 Snooze (5m)", "snooze");
                }
            }

            let app_handle = app.clone();
            toast = toast.on_activated(move |action| {
                if let Some(act) = action {
                    let app = app_handle.clone();
                    tauri::async_runtime::spawn(async move {
                        match act.as_str() {
                            "sitting_up" => {
                                acknowledge_active_notification(&app, 10);
                            }
                            "snooze" => {
                                snooze_active_notification(&app, 5);
                            }
                            _ => {}
                        }
                    });
                }
                Ok(())
            });

            if let Err(e) = toast.show() {
                eprintln!("[notifications] Failed to show Windows toast: {e}");
            }
        }

        #[cfg(not(target_os = "windows"))]
        {
            let mut builder = app
                .notification()
                .builder()
                .id(POSTURE_NOTIFICATION_ID)
                .title(title)
                .body(&body);

            match effective_level {
                1 => {}
                2 => {
                    builder = builder.sound("Default");
                }
                3 => {
                    builder = builder.sound("Reminder");
                }
                _ => {
                    builder = builder.sound("Default");
                }
            }

            let _ = builder.show().map_err(|e| e.to_string())?;
        }
    }

    // 3. Level 1 visual enhancement: also display subtle tray tooltip
    if effective_level == 1 {
        if let Some(tray) = app.tray_by_id(TRAY_ID) {
            let _ = tray.set_tooltip(Some(format!("Posture Check! 🐸 — {}", body)));
            if let Some(img) = get_active_icon() {
                let _ = tray.set_icon(Some(img));
            }
        }
    }

    // 4. Record in notification history and SQLite database
    let record = {
        if let Some(mgr) = app.try_state::<Mutex<NotificationManager>>() {
            if let Ok(mut lock) = mgr.lock() {
                let mut rec = lock.record_notification(
                    notification_id.clone(),
                    effective_level,
                    title.to_string(),
                    body.clone(),
                    "shown".to_string(),
                );
                if effective_level == 5 {
                    rec.actions = vec![NotificationAction {
                        id: "sitting_up".to_string(),
                        label: "✓ I'm sitting up! Let me get back to work!".to_string(),
                    }];
                }
                rec
            } else {
                NotificationRecord {
                    id: notification_id.clone(),
                    timestamp: now.to_rfc3339(),
                    level: effective_level,
                    title: title.to_string(),
                    body: body.clone(),
                    status: "shown".to_string(),
                    actions: vec![],
                }
            }
        } else {
            NotificationRecord {
                id: notification_id.clone(),
                timestamp: now.to_rfc3339(),
                level: effective_level,
                title: title.to_string(),
                body: body.clone(),
                status: "shown".to_string(),
                actions: vec![],
            }
        }
    };

    // Ensure check is logged in SQLite database only if not already logged upstream
    if is_new_check {
        if let Some(db) = app.try_state::<crate::database::Database>() {
            let _ = db.log_posture_check(crate::database::NewPostureCheck {
                id: Some(notification_id.clone()),
                fired_at: Some(chrono::Utc::now().to_rfc3339()),
                intensity_level: effective_level,
                message_shown: Some(body),
            });
        }
    }

    // 5. Emit `notification-shown` event to frontend
    let _ = app.emit("notification-shown", &record);

    // 6. Spawn auto-dismiss timer for Level 1 (10s) and Level 2 (30s).
    // Levels 3, 4, 5 stay persistent until acknowledged by the user.
    let auto_dismiss_secs = match effective_level {
        1 => Some(10u64),
        2 => Some(30u64),
        _ => None,
    };

    if let Some(secs) = auto_dismiss_secs {
        let app_handle = app.clone();
        let target_id = notification_id.clone();
        tauri::async_runtime::spawn(async move {
            tokio::time::sleep(StdDuration::from_secs(secs)).await;

            let mut was_dismissed = false;
            if let Some(mgr) = app_handle.try_state::<Mutex<NotificationManager>>() {
                if let Ok(mut lock) = mgr.lock() {
                    if let Some(r) = lock.history.iter_mut().rev().find(|r| r.id == target_id) {
                        if r.status == "shown" {
                            r.status = "dismissed".to_string();
                            was_dismissed = true;
                            if lock.active_notification_id.as_deref() == Some(&target_id) {
                                lock.active_notification_id = None;
                            }
                        }
                    }
                }
            }

            if was_dismissed {
                if let Some(db) = app_handle.try_state::<crate::database::Database>() {
                    let _ = db.update_posture_check(&target_id, "dismissed", None, None);
                }

                let _ = app_handle.emit(
                    "notification-dismissed",
                    serde_json::json!({
                        "id": target_id,
                        "reason": "auto_dismiss_timeout",
                        "level": effective_level
                    }),
                );
                if effective_level == 1 {
                    update_tray_visuals(&app_handle);
                }
            }
        });
    }

    Ok(record)
}

/// Helper: mark active notification as acknowledged, close overlays and emit event
pub fn acknowledge_active_notification(app: &AppHandle, xp_earned: u32) {
    close_overlay_windows(app);

    let mut target_id = None;
    if let Some(mgr) = app.try_state::<Mutex<NotificationManager>>() {
        if let Ok(mut lock) = mgr.lock() {
            target_id = lock.update_latest_active_status("acknowledged");
        }
    }

    if let Some(db) = app.try_state::<crate::database::Database>() {
        if let Ok((updated_progress, newly_unlocked)) =
            db.process_check_acknowledgment(target_id.as_deref(), xp_earned)
        {
            let _ = app.emit("progress-updated", &updated_progress);
            for ach_id in newly_unlocked {
                let _ = app.emit(
                    "achievement-unlocked",
                    serde_json::json!({ "achievementId": ach_id }),
                );
            }
        }
    }

    let _ = app.emit(
        "notification-acknowledged",
        serde_json::json!({
            "id": target_id,
            "xpEarned": xp_earned
        }),
    );
}

/// Helper: mark active notification as snoozed, close overlays and emit event
pub fn snooze_active_notification(app: &AppHandle, minutes: u32) {
    close_overlay_windows(app);

    let mut target_id = None;
    if let Some(mgr) = app.try_state::<Mutex<NotificationManager>>() {
        if let Ok(mut lock) = mgr.lock() {
            target_id = lock.update_latest_active_status("snoozed");
        }
    }

    if let Some(ref id) = target_id {
        if let Some(db) = app.try_state::<crate::database::Database>() {
            let _ = db.update_posture_check(id, "snoozed", None, None);
        }
    }

    let _ = app.emit(
        "notification-snoozed",
        serde_json::json!({
            "id": target_id,
            "minutes": minutes
        }),
    );
}

/// Helper: mark active notification as expired, close overlays and emit event
pub fn expire_active_notification(app: &AppHandle) {
    close_overlay_windows(app);

    let mut target_id = None;
    if let Some(mgr) = app.try_state::<Mutex<NotificationManager>>() {
        if let Ok(mut lock) = mgr.lock() {
            target_id = lock.update_latest_active_status("expired");
        }
    }

    if let Some(ref id) = target_id {
        if let Some(db) = app.try_state::<crate::database::Database>() {
            let _ = db.update_posture_check(id, "expired", None, None);
        }
    }

    if let Some(id) = target_id {
        let _ = app.emit(
            "notification-expired",
            serde_json::json!({
                "id": id,
                "reason": "interval_doubled_unacknowledged"
            }),
        );
    }
}

/// Helper: mark active notification as dismissed, close overlays and emit event
pub fn dismiss_active_notification(app: &AppHandle) {
    close_overlay_windows(app);

    let mut target_id = None;
    if let Some(mgr) = app.try_state::<Mutex<NotificationManager>>() {
        if let Ok(mut lock) = mgr.lock() {
            target_id = lock.update_latest_active_status("dismissed");
        }
    }

    if let Some(ref id) = target_id {
        if let Some(db) = app.try_state::<crate::database::Database>() {
            let _ = db.update_posture_check(id, "dismissed", None, None);
        }
    }

    if let Some(id) = target_id {
        let _ = app.emit(
            "notification-dismissed",
            serde_json::json!({
                "id": id,
                "reason": "window_closed"
            }),
        );
    }
}

/// Helper: Play alarm sound for Level 4 or Level 5
pub fn play_alarm_sound(app: &AppHandle, level: u8) {
    if let Some(audio) = app.try_state::<Arc<crate::audio::AudioManager>>() {
        let audio_mgr = audio.inner().clone();
        tauri::async_runtime::spawn(async move {
            audio_mgr.play_alarm(level).await;
        });
    }
}

/// Helper: Stop alarm sound immediately
pub fn stop_alarm_sound(app: &AppHandle) {
    if let Some(audio) = app.try_state::<Arc<crate::audio::AudioManager>>() {
        audio.stop_alarm();
    }
}

/// Helper: Close/hide all overlay and fullscreen notification windows and stop audio
pub fn close_overlay_windows(app: &AppHandle) {
    stop_alarm_sound(app);
    if let Some(win) = app.get_webview_window("notification-overlay") {
        let _ = win.hide();
    }
    if let Some(win) = app.get_webview_window("notification-fullscreen") {
        let _ = win.hide();
    }
}

/// Helper: Re-focus fullscreen overlay if blurred
pub fn refocus_fullscreen_overlay(app: &AppHandle) {
    if let Some(win) = app.get_webview_window("notification-fullscreen") {
        if win.is_visible().unwrap_or(false) {
            let _ = win.set_always_on_top(true);
            let _ = win.set_focus();
        }
    }
}

/// Helper: Show Level 4 (Alert) overlay window centered on primary monitor
pub fn show_level4_overlay(app: &AppHandle, id: &str, title: &str, body: &str) {
    let win = if let Some(w) = app.get_webview_window("notification-overlay") {
        w
    } else {
        match tauri::WebviewWindowBuilder::new(
            app,
            "notification-overlay",
            tauri::WebviewUrl::App("overlay.html".into()),
        )
        .title("Posture Check! Alert")
        .inner_size(500.0, 300.0)
        .min_inner_size(500.0, 300.0)
        .max_inner_size(500.0, 300.0)
        .resizable(false)
        .decorations(false)
        .always_on_top(true)
        .transparent(true)
        .skip_taskbar(true)
        .build()
        {
            Ok(w) => w,
            Err(e) => {
                eprintln!("[notifications] Failed to create overlay window: {e}");
                return;
            }
        }
    };

    // Center on primary monitor taking into account DPI scale factor
    if let Ok(Some(primary)) = win.primary_monitor() {
        let pos = primary.position();
        let size = primary.size();
        let scale = primary.scale_factor();
        let win_w = (500.0 * scale) as i32;
        let win_h = (300.0 * scale) as i32;
        let x = pos.x + ((size.width as i32 - win_w) / 2);
        let y = pos.y + ((size.height as i32 - win_h) / 2);
        let _ = win.set_position(tauri::Position::Physical(tauri::PhysicalPosition { x, y }));
    } else {
        let _ = win.center();
    }

    let _ = win.set_always_on_top(true);
    let _ = win.show();
    let _ = win.set_focus();

    let _ = win.emit(
        "overlay-data",
        serde_json::json!({
            "id": id,
            "level": 4,
            "title": title,
            "body": body
        }),
    );
}

/// Helper: Show Level 5 (Wake Up!) fullscreen overlay covering primary monitor
pub fn show_level5_fullscreen(app: &AppHandle, id: &str, title: &str, body: &str) {
    let win = if let Some(w) = app.get_webview_window("notification-fullscreen") {
        w
    } else {
        match tauri::WebviewWindowBuilder::new(
            app,
            "notification-fullscreen",
            tauri::WebviewUrl::App("fullscreen.html".into()),
        )
        .title("Posture Check! Wake Up")
        .fullscreen(true)
        .resizable(false)
        .decorations(false)
        .always_on_top(true)
        .transparent(true)
        .skip_taskbar(true)
        .build()
        {
            Ok(w) => w,
            Err(e) => {
                eprintln!("[notifications] Failed to create fullscreen window: {e}");
                return;
            }
        }
    };

    // Target the monitor currently active (where cursor is located) or primary monitor
    let target_monitor = if let Ok(cursor) = win.cursor_position() {
        if let Ok(monitors) = win.available_monitors() {
            monitors.into_iter().find(|m| {
                let pos = m.position();
                let size = m.size();
                let cx = cursor.x as i32;
                let cy = cursor.y as i32;
                cx >= pos.x
                    && cx < (pos.x + size.width as i32)
                    && cy >= pos.y
                    && cy < (pos.y + size.height as i32)
            })
        } else {
            None
        }
    } else {
        None
    };

    let active_monitor = target_monitor.or_else(|| win.primary_monitor().ok().flatten());
    if let Some(m) = active_monitor {
        let pos = m.position();
        let _ = win.set_position(tauri::Position::Physical(*pos));
    }

    let _ = win.set_fullscreen(true);
    let _ = win.set_always_on_top(true);
    let _ = win.show();
    let _ = win.set_focus();

    let _ = win.emit(
        "overlay-data",
        serde_json::json!({
            "id": id,
            "level": 5,
            "title": title,
            "body": body
        }),
    );
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pick_message_non_repeating() {
        let mut mgr = NotificationManager::new();
        let mut prev = String::new();
        for _ in 0..15 {
            let msg = mgr.pick_message(2);
            assert!(!msg.is_empty());
            assert_ne!(msg, prev);
            prev = msg;
        }
    }

    #[test]
    fn test_pick_message_tone_and_streak() {
        let mut mgr = NotificationManager::new();
        mgr.set_tone("sassy");
        let sassy_msg = mgr.pick_message(2);
        assert!(LEVEL_2_SASSY.contains(&sassy_msg.as_str()));

        mgr.set_tone("minimal");
        let min_msg = mgr.pick_message(1);
        assert!(LEVEL_1_MINIMAL.contains(&min_msg.as_str()));

        // Golden frog when streak > 30
        let golden_msg = mgr.pick_message_with_context(3, Some(35));
        assert!(GOLDEN_FROG_MESSAGES.contains(&golden_msg.as_str()));

        // Acknowledgment message
        let ack = mgr.get_acknowledgment_message();
        assert!(ACKNOWLEDGMENT_MESSAGES.contains(&ack.as_str()));

        // Streak milestone
        let streak_msg = mgr.get_streak_message(7);
        assert_eq!(streak_msg, "🔥 7 days! Week warrior! Ribbit! 🐸");
    }

    #[test]
    fn test_record_and_update_history() {
        let mut mgr = NotificationManager::new();
        let record = mgr.record_notification(
            "test-1".to_string(),
            1,
            "Title".to_string(),
            "Body".to_string(),
            "shown".to_string(),
        );

        assert_eq!(record.id, "test-1");
        assert_eq!(mgr.history.len(), 1);
        assert_eq!(record.actions.len(), 2);
        assert_eq!(record.actions[0].id, "sitting_up");

        let updated = mgr.update_status("test-1", "acknowledged");
        assert!(updated);
        assert_eq!(mgr.history[0].status, "acknowledged");
    }

    #[test]
    fn test_supersede_previous_shown_notification() {
        let mut mgr = NotificationManager::new();
        mgr.record_notification(
            "notif-1".to_string(),
            2,
            "Title 1".to_string(),
            "Body 1".to_string(),
            "shown".to_string(),
        );
        assert_eq!(mgr.history[0].status, "shown");

        // Record a second notification
        mgr.record_notification(
            "notif-2".to_string(),
            3,
            "Title 2".to_string(),
            "Body 2".to_string(),
            "shown".to_string(),
        );

        // Previous notification must be marked as dismissed so notifications don't stack
        assert_eq!(mgr.history[0].status, "dismissed");
        assert_eq!(mgr.history[1].status, "shown");
        assert_eq!(mgr.active_notification_id, Some("notif-2".to_string()));
    }

    #[test]
    fn test_history_capacity_cap() {
        let mut mgr = NotificationManager::new();
        for i in 0..120 {
            mgr.record_notification(
                format!("notif-{}", i),
                1,
                "Title".to_string(),
                "Body".to_string(),
                "shown".to_string(),
            );
        }
        assert_eq!(mgr.history.len(), 100);
        assert_eq!(mgr.history.last().unwrap().id, "notif-119");
    }

    #[test]
    fn test_expire_notification_clears_active_and_does_not_repeat() {
        let mut mgr = NotificationManager::new();
        mgr.record_notification(
            "notif-exp".to_string(),
            3,
            "Title".to_string(),
            "Body".to_string(),
            "shown".to_string(),
        );

        assert_eq!(mgr.active_notification_id, Some("notif-exp".to_string()));

        // First expiration attempt succeeds and transitions
        let res1 = mgr.update_latest_active_status("expired");
        assert_eq!(res1, Some("notif-exp".to_string()));
        assert_eq!(mgr.history[0].status, "expired");
        assert_eq!(mgr.active_notification_id, None);

        // Subsequent expiration attempt returns None, preventing repeat IPC emit
        let res2 = mgr.update_latest_active_status("expired");
        assert_eq!(res2, None);
    }
}
