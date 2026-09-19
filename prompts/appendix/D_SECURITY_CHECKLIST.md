# Appendix D: Security Checklist

## Authentication & Authorization

- [ ] All API endpoints require authentication (JWT Bearer token)
- [ ] JWTs expire after 1 hour; refresh tokens expire after 7 days
- [ ] Supabase RLS policies enabled on ALL tables
- [ ] Users can only access their own data (verified by `auth.uid()`)
- [ ] No service role key exposed in client-side code
- [ ] OAuth redirect URLs restricted to known domains
- [ ] Password requirements: minimum 8 characters

## Data Security

- [ ] No PII stored in client-side logs
- [ ] SQLite database stored in platform-appropriate app data directory (not world-readable)
- [ ] `.env` files in `.gitignore` (never committed to repository)
- [ ] Supabase anon key is safe to expose (RLS protects data)
- [ ] Service role key only used server-side (Edge Functions)
- [ ] Auth tokens stored in secure storage (SecureStore on mobile, httpOnly cookies or secure localStorage on desktop)

## Network Security

- [ ] All Supabase connections use HTTPS
- [ ] Expo Push API calls use HTTPS
- [ ] QR pairing tokens are cryptographically random and expire in 5 minutes
- [ ] QR pairing uses one-time tokens (can't be reused)
- [ ] No sensitive data transmitted in URL parameters

## Edge Function Security

- [ ] JWT validation on every request
- [ ] Rate limiting: 100 pushes per user per day
- [ ] Input validation on all request body fields
- [ ] Error messages don't leak internal details
- [ ] CORS configured to allow only known origins

## Desktop App Security

- [ ] Tauri CSP (Content Security Policy) configured restrictively
- [ ] No `eval()` or `innerHTML` with user input
- [ ] IPC commands validate inputs before execution
- [ ] File system access restricted to app data directory
- [ ] No sensitive data in Tauri window titles or tooltip text visible to other apps

## Mobile App Security

- [ ] Push notification tokens not logged
- [ ] Biometric auth uses platform-secure APIs (Keychain/Keystore)
- [ ] App doesn't screenshot sensitive data (disabled screen capture on auth screens)
- [ ] Certificate pinning considered for Supabase API (optional, advanced)

## GDPR / Privacy

- [ ] Users can export all their data (JSON export in Settings)
- [ ] Users can delete their account and all associated cloud data
- [ ] Account deletion request processed within 30 days
- [ ] No third-party analytics tracking without user consent
- [ ] Privacy policy accessible from Settings > About
- [ ] Data processing is transparent: users know what data is collected and why
