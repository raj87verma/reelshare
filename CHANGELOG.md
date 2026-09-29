# Changelog

All notable changes to ReelShare will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.6] - 2026-09-29

### Fixed
- **Connecting a social account did nothing / silently "succeeded" with a fake account**: the entire OAuth flow was previously a client-side mock -- clicking "Connect Account" just waited a couple seconds and flipped local state to "connected" with a hardcoded fake username, without ever opening a browser or contacting the real platform. Every platform (Instagram, Facebook, TikTok, YouTube) now runs a real OAuth Authorization Code flow: it opens the platform's actual login/consent page in your system browser and captures the redirect via a local loopback server (`electron/oauth-loopback.ts`), then exchanges the real authorization code for real access/refresh tokens with that platform's API. Connection state is now read from and written to the local encrypted database instead of resetting to hardcoded values on every restart.
- **No option to schedule an uploaded video**: the "Schedule" button on video cards in the Video Library previously only logged to the developer console and did nothing visible. It now navigates to the Schedule page and opens the scheduling form pre-filled with that video.
- **Scheduling a post didn't actually schedule anything**: submitting the Schedule form previously only updated in-memory state with fabricated data, so scheduled posts vanished on refresh/restart and the background scheduler never knew about them. Scheduling now persists a real row to the local database and arms a real background job that will actually attempt to publish via the connected platform's API at the scheduled time.
- **A random/fake profile and fake stats were shown after logging in**: the Dashboard, Social Accounts, and Analytics pages previously displayed hardcoded fabricated data (a "Coming Soon" fake `@traveler_alex` / `@alexcreates` connected-accounts demo, "127 total videos", "342 published", "254,000 views", etc.) regardless of what the logged-in user had actually done. All of these now reflect the real signed-in user's real videos, real scheduled/published posts, and real platform connections; metrics that require a real analytics-collection pipeline not yet built (views, engagement rate) are shown as "not yet available" instead of being invented.
- Login/register/connect/schedule error messages no longer leak Electron's internal IPC wrapper text; the real underlying error from the platform (e.g. a specific "invalid client secret" message) is shown instead.

### Added
- `electron/oauth-loopback.ts`: shared local HTTP server used by every platform's OAuth flow to capture the authorization redirect, following the same pattern used by tools like the GitHub CLI for desktop app logins.
- New `platforms:*` and `scheduler:*` IPC channels (`electron/preload.js`) exposing the previously-orphaned (never wired to the UI) `PlatformManager` and `SchedulerService` backends to the renderer.
- `getAllPendingScheduledPosts`-backed real publishing path: the background scheduler now calls the real platform upload API instead of waiting 2 seconds and fabricating a fake post ID.

## [1.0.5] - 2026-09-26

### Added
- Facebook Pages support: new `FacebookPlatform` backend class, API key fields in Settings > API Keys, and a real connectable card on the Social Accounts page (previously "Coming Soon")
- Real local login/register system: password hashing (scrypt) in the local SQLite database, `auth:*` IPC handlers, a new Login/Register screen (`src/pages/Auth.tsx`), and session persistence across app restarts — replaces the previous hardcoded "Alex Johnson" placeholder user
- User-configurable "Maximum Video Duration" setting (Settings > Video), default 30 minutes
- `API_KEYS_GUIDE.md`: step-by-step instructions for obtaining API keys/credentials for Instagram, Facebook, TikTok, and YouTube, linked from the README and from within the app's Settings screen

### Fixed
- Videos disappearing from the Video Library shortly after upload: uploads are now persisted via real SQLite-backed IPC calls (`db:createVideo`) with files copied into permanent app storage (`userData/videos`), instead of relying on in-memory state that was lost/reset on reload; deleting a video now also removes its underlying files from disk
- Video duration caps were too restrictive: increased Instagram from 90s to 15 minutes and TikTok from 180s to 10 minutes to match each platform's actual documented API upload limits, in addition to the new user-configurable maximum
- Generated thumbnails were stored in a temp directory that was periodically auto-deleted even while still referenced by saved videos; thumbnails now live in permanent app storage
- Login/register error messages no longer leak Electron's internal IPC wrapper text (e.g. `Error invoking remote method 'auth:login': ...`) — errors now display cleanly (e.g. "Invalid email or password")
- Scheduler no longer assumes a hardcoded `user_1`; it now correctly processes pending scheduled posts for all registered users

### Added (prior)
- Initial release of ReelShare desktop application
- Cross-platform support (Windows, macOS, Linux)
- Social media integrations: Instagram, TikTok, YouTube
- Video upload and management system
- Scheduling calendar with multi-platform posting
- Analytics dashboard with performance metrics
- User authentication and configuration
- FFmpeg-based video processing
- Local SQLite database with encryption
- React + Electron + TypeScript architecture

### Fixed
- Dependency compatibility issues
- TypeScript compilation errors
- Missing UI components
- Build process optimization

### Changed
- Updated all dependencies to latest stable versions
- Improved error handling and user feedback
- Enhanced documentation and installation guides

## [1.0.0] - 2024-01-01

### Added
- Initial public release
- All core features implemented and tested
- Comprehensive documentation
- Installation packages for all platforms

## Development Notes

### Versioning Scheme
- **MAJOR** version for incompatible API changes
- **MINOR** version for new functionality in a backward compatible manner
- **PATCH** version for backward compatible bug fixes

### Release Checklist
- [ ] Update version in package.json
- [ ] Update this CHANGELOG.md
- [ ] Test all features on target platforms
- [ ] Build installers for all platforms
- [ ] Create GitHub release with assets
- [ ] Update documentation if needed
- [ ] Announce release to users

### Planned Features for Future Releases
- Additional social media platforms (Facebook, LinkedIn, Twitter)
- Advanced video editing tools
- Team collaboration features
- Cloud backup and sync
- Mobile companion app
- API for third-party integrations
- Plugin system for extensions
- Advanced analytics with AI insights
- Bulk upload and scheduling
- Template system for posts
- Content calendar planning
- Competitor analysis
- Hashtag suggestion engine
- Performance optimization tools
- Accessibility improvements
- Localization support