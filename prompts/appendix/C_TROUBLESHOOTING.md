# Appendix C: Troubleshooting Guide

## Desktop App Issues

### App won't start
- **Symptom**: Double-clicking the app does nothing
- **Cause**: WebView2 runtime missing (Windows) or Rust binary crashed
- **Fix**: Install Microsoft Edge WebView2 Runtime. Check Event Viewer for crash logs.

### System tray icon not visible
- **Symptom**: App is running but no tray icon
- **Fix**: Windows → Right-click taskbar → Taskbar Settings → Turn on Posture Check!

### Timer doesn't fire
- **Symptom**: No notifications at expected interval
- **Debug**: Check `get_timer_state()` in dev tools console
- **Causes**: Paused, DND active, outside active hours, or system was asleep

### Notifications not showing
- **Symptom**: Timer fires but no notification appears
- **Causes**: OS notifications disabled for the app
- **Fix**: Windows → Settings → Notifications → Enable for Posture Check!

### Level 5 can be bypassed
- **Symptom**: Alt+Tab escapes the fullscreen overlay
- **Note**: This is a known limitation — OS keyboard shortcuts can't be fully blocked
- **Mitigation**: Window re-focuses after 2 seconds

## Mobile App Issues

### Push notifications not received
- **Causes**: Notification permissions denied, push token not registered, phone in DND
- **Fix**: Settings → Posture Check! → Enable notifications. Re-open app to re-register token.

### Background notifications stop on Android
- **Cause**: Battery optimization killing the app
- **Fix**: Settings → Battery → Posture Check! → Don't optimize

### Charts show no data
- **Cause**: No posture checks logged yet
- **Fix**: Use the app for at least one day to generate data

## Cloud Sync Issues

### Data not syncing
- **Causes**: Not signed in, no internet, Supabase outage
- **Debug**: Settings → Account → Sync Status (shows error details)
- **Fix**: Try "Sync Now" button, or sign out and back in

### Duplicate data after sync
- **Cause**: Merge conflict during initial sync
- **Fix**: In most cases, duplicates resolve on the next sync cycle. If persistent, export data, clear local database, and re-sync.

### OAuth redirect fails
- **Cause**: Deep link scheme not registered
- **Fix**: Verify `posturecheck://` scheme in `tauri.conf.json` and Supabase redirect URLs

## Database Issues

### "Database is locked" error
- **Cause**: Multiple concurrent write operations
- **Fix**: Ensure WAL mode is enabled: `PRAGMA journal_mode=WAL;`

### Migration fails on update
- **Cause**: Schema change conflicts with existing data
- **Fix**: Export data (Settings → General → Export), clear app data, re-import

## Build Issues

### Tauri build fails
- **Cause**: Missing Rust toolchain or system dependencies
- **Fix**: Run `rustup update` and install platform-specific requirements

### EAS Build fails
- **Cause**: Missing credentials or incompatible dependency versions
- **Fix**: Run `npx eas credentials` to set up certificates. Run `npx expo install --fix` to align dependency versions with SDK 57.

### Bundle too large
- **Target**: Desktop < 500KB JS (gzipped), Mobile < 15MB total
- **Fix**: Check bundle analyzer output, tree-shake unused imports, lazy-load heavy components
