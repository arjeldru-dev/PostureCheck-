use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;
use tokio::sync::Mutex;

// Embedded audio assets bundled inside the binary
pub const ALARM_LEVEL4_WAV: &[u8] = include_bytes!("../../src/assets/sounds/alarm-level4.wav");
pub const ALARM_LEVEL5_WAV: &[u8] = include_bytes!("../../src/assets/sounds/alarm-level5.wav");

#[cfg(target_os = "windows")]
#[link(name = "winmm")]
extern "system" {
    fn PlaySoundW(pszSound: *const u16, hmod: isize, fdwSound: u32) -> i32;
}

const SND_ASYNC: u32 = 0x0001;
const SND_NODEFAULT: u32 = 0x0002;
const SND_MEMORY: u32 = 0x0004;
const SND_LOOP: u32 = 0x0008;
const SND_PURGE: u32 = 0x0040;

/// Global audio state tracker
pub struct AudioManager {
    is_playing: Arc<AtomicBool>,
    generation: Arc<AtomicU64>,
    active_level: Arc<Mutex<Option<u8>>>,
}

impl Default for AudioManager {
    fn default() -> Self {
        Self {
            is_playing: Arc::new(AtomicBool::new(false)),
            generation: Arc::new(AtomicU64::new(0)),
            active_level: Arc::new(Mutex::new(None)),
        }
    }
}

impl AudioManager {
    pub fn new() -> Self {
        Self::default()
    }

    /// Play alarm sound for a given intensity level (Level 4 = 30s repeating, Level 5 = continuous loop)
    pub async fn play_alarm(&self, level: u8) {
        self.stop_alarm();

        let current_gen = self.generation.fetch_add(1, Ordering::SeqCst) + 1;
        self.is_playing.store(true, Ordering::SeqCst);
        let mut lvl_lock = self.active_level.lock().await;
        *lvl_lock = Some(level);

        let is_playing_flag = self.is_playing.clone();
        let gen_flag = self.generation.clone();

        match level {
            4 => {
                // Level 4: Plays medium alarm, repeats every 30 seconds until acknowledged
                #[cfg(target_os = "windows")]
                unsafe {
                    let _ = PlaySoundW(
                        ALARM_LEVEL4_WAV.as_ptr() as *const u16,
                        0,
                        SND_MEMORY | SND_ASYNC | SND_NODEFAULT,
                    );
                }

                tokio::spawn(async move {
                    while is_playing_flag.load(Ordering::SeqCst)
                        && gen_flag.load(Ordering::SeqCst) == current_gen
                    {
                        tokio::time::sleep(tokio::time::Duration::from_secs(30)).await;
                        if !is_playing_flag.load(Ordering::SeqCst)
                            || gen_flag.load(Ordering::SeqCst) != current_gen
                        {
                            break;
                        }
                        #[cfg(target_os = "windows")]
                        unsafe {
                            let _ = PlaySoundW(
                                ALARM_LEVEL4_WAV.as_ptr() as *const u16,
                                0,
                                SND_MEMORY | SND_ASYNC | SND_NODEFAULT,
                            );
                        }
                    }
                });
            }
            5 => {
                // Level 5: Plays loud alarm, loops continuously until acknowledged
                #[cfg(target_os = "windows")]
                unsafe {
                    let _ = PlaySoundW(
                        ALARM_LEVEL5_WAV.as_ptr() as *const u16,
                        0,
                        SND_MEMORY | SND_ASYNC | SND_LOOP | SND_NODEFAULT,
                    );
                }
            }
            _ => {}
        }
    }

    /// Stop any currently playing alarm immediately
    pub fn stop_alarm(&self) {
        self.generation.fetch_add(1, Ordering::SeqCst);
        self.is_playing.store(false, Ordering::SeqCst);

        #[cfg(target_os = "windows")]
        unsafe {
            // Passing NULL with SND_PURGE terminates any sound playing asynchronously
            let _ = PlaySoundW(std::ptr::null(), 0, SND_PURGE);
        }
    }

    pub fn is_playing(&self) -> bool {
        self.is_playing.load(Ordering::SeqCst)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_embedded_audio_assets() {
        for (name, bytes) in [("level4", ALARM_LEVEL4_WAV), ("level5", ALARM_LEVEL5_WAV)] {
            assert!(bytes.len() >= 44, "{name} asset too small to be WAV");
            assert_eq!(&bytes[0..4], b"RIFF", "{name} missing RIFF header");
            assert_eq!(&bytes[8..12], b"WAVE", "{name} missing WAVE header");
            assert_eq!(&bytes[12..16], b"fmt ", "{name} missing fmt chunk");
            let audio_format = u16::from_le_bytes([bytes[20], bytes[21]]);
            let num_channels = u16::from_le_bytes([bytes[22], bytes[23]]);
            let sample_rate = u32::from_le_bytes([bytes[24], bytes[25], bytes[26], bytes[27]]);
            let bits_per_sample = u16::from_le_bytes([bytes[34], bytes[35]]);
            assert_eq!(audio_format, 1, "{name} must be PCM format (1)");
            assert_eq!(num_channels, 1, "{name} channel count must be 1 (mono)");
            assert_eq!(sample_rate, 44100, "{name} sample rate must be 44.1kHz");
            assert_eq!(bits_per_sample, 16, "{name} bits per sample must be 16");
            assert_eq!(&bytes[36..40], b"data", "{name} missing data chunk header");
        }
    }

    #[tokio::test]
    async fn test_audio_manager_state() {
        let mgr = AudioManager::new();
        assert!(!mgr.is_playing());
        mgr.stop_alarm();
        assert!(!mgr.is_playing());
    }

    #[tokio::test]
    async fn test_generation_counter_prevents_loop_leak() {
        let mgr = AudioManager::new();
        assert_eq!(mgr.generation.load(Ordering::SeqCst), 0);

        // Playing increments generation
        mgr.play_alarm(4).await;
        let gen1 = mgr.generation.load(Ordering::SeqCst);
        assert!(gen1 > 0);
        assert!(mgr.is_playing());

        // Stopping increments generation to invalidate any sleeping loops
        mgr.stop_alarm();
        let gen2 = mgr.generation.load(Ordering::SeqCst);
        assert!(gen2 > gen1);
        assert!(!mgr.is_playing());

        // Replaying starts with a new generation
        mgr.play_alarm(5).await;
        let gen3 = mgr.generation.load(Ordering::SeqCst);
        assert!(gen3 > gen2);
        assert!(mgr.is_playing());

        mgr.stop_alarm();
        assert!(!mgr.is_playing());
    }
}
