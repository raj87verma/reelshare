# ReelShare - Social Media Video Manager

A cross-platform desktop application for sharing video reels across multiple social media platforms with scheduling and analytics features.

## Features

- **Cross-Platform**: Windows, macOS, and Linux support via Electron
- **Video Management**: Upload, organize, and preview video content
- **Multi-Platform Publishing**: Schedule and publish to Instagram, TikTok, YouTube, Facebook, LinkedIn, and more
- **Scheduling**: Calendar-based scheduling with timezone support
- **Analytics**: Track performance metrics across all platforms
- **Basic Editing**: Trim videos, add captions, generate thumbnails
- **Local Database**: Secure storage of credentials and schedules

## Technology Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Desktop**: Electron.js
- **Database**: SQLite (via better-sqlite3)
- **Video Processing**: FFmpeg (via @ffmpeg/ffmpeg)
- **State Management**: Zustand
- **Routing**: React Router DOM
- **UI Components**: ShadCN/UI + Lucide React icons
- **Build Tool**: Vite

## Project Structure

```
reelshare/
├── src/                    # React frontend source
│   ├── components/        # Reusable UI components
│   ├── pages/            # Page components
│   ├── store/            # Zustand state management
│   ├── App.tsx           # Main app component
│   ├── main.tsx          # React entry point
│   └── index.css         # Global styles
├── electron/              # Electron main process
│   ├── main.ts           # Main process entry
│   ├── preload.js        # Preload script
│   ├── database.ts       # Database initialization
│   ├── scheduler.ts      # Scheduling service
│   └── video-processor.ts # Video processing service
├── public/               # Static assets
├── dist/                # Build output
├── package.json         # Dependencies and scripts
├── vite.config.ts       # Vite configuration
├── tailwind.config.js   # Tailwind CSS configuration
├── tsconfig.json        # TypeScript configuration
└── README.md            # This file
```

## Getting Started

### Prerequisites

1. **Node.js 18+** - Download from [nodejs.org](https://nodejs.org/)
2. **npm, yarn, or pnpm** - Package manager
3. **Git** - Version control system
4. **FFmpeg** (optional) - For advanced video processing features
   
   **Windows:**
   ```bash
   # Using chocolatey
   choco install ffmpeg
   # Or download from https://ffmpeg.org/download.html
   ```

   **macOS:**
   ```bash
   brew install ffmpeg
   ```

   **Linux:**
   ```bash
   sudo apt install ffmpeg  # Ubuntu/Debian
   sudo yum install ffmpeg  # Fedora/RHEL
   ```

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd reelshare
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment configuration:
   ```bash
   cp .env.example .env
   # Edit .env file with your API keys
   ```

4. Start development:
   ```bash
   npm run dev
   ```

### Development Scripts

- `npm run dev` - Start development server (React + Electron)
- `npm run build` - Build for production
- `npm run pack` - Package the app without distribution
- `npm run dist` - Build and create installers
- `npm run lint` - Run ESLint
- `npm run type-check` - TypeScript type checking

## Usage Guide

### First Launch

1. **Initial Setup**: On first launch, ReelShare will guide you through:
   - Setting up your profile
   - Connecting social media accounts
   - Configuring default settings

2. **Dashboard**: The main dashboard shows:
   - Quick stats (total posts, views, engagement)
   - Recent videos
   - Upcoming schedule
   - Platform connections

### Connecting Social Media Accounts

Before connecting an account, ReelShare needs your own developer API credentials
(Client ID + Client Secret) for that platform — this is required by every platform
before any third-party app can publish on your behalf.

1. Get your API keys for each platform you want to use: see
   **[API_KEYS_GUIDE.md](./API_KEYS_GUIDE.md)** for step-by-step instructions
   (Instagram, Facebook, TikTok, YouTube)
2. In ReelShare, go to **Settings → API Keys** and paste in your Client ID,
   Client Secret, and Redirect URI for each platform
3. Navigate to the **Social Accounts** page
4. Click **Connect Account** for each platform
5. Follow the OAuth authentication flow in the window that opens
6. Grant necessary permissions for posting and analytics

### Uploading and Managing Videos

1. **Video Library**: Access from sidebar or dashboard
2. **Upload**: Click "Upload Video" (sidebar or Video Library) to open the native
   file picker and choose a video from your computer
3. **Edit**: Add titles, descriptions, tags
4. **Preview**: View video with auto-generated thumbnail

### Scheduling Posts

1. **Schedule Page**: Click "Schedule" in sidebar
2. **Calendar View**: Select date and time
3. **Post Creation**:
   - Select video(s) from library
   - Add captions and hashtags
   - Choose platforms
   - Set posting time
4. **Review**: Preview post before scheduling
5. **Schedule**: Confirm to add to queue

### Analytics and Reporting

1. **Analytics Dashboard**: View overall performance
2. **Platform-specific**: Filter by individual platforms
3. **Video Performance**: Track individual video metrics
4. **Export**: Download reports as CSV or PDF

## Building for Production

### Windows
```bash
npm run dist
```
Output: `.exe` installer in `release/` directory

### macOS
```bash
npm run dist
```
Output: `.dmg` and `.zip` in `release/` directory

### Linux
```bash
npm run dist
```
Output: `.AppImage` and `.deb` in `release/` directory

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
NODE_ENV=development
ELECTRON_START_URL=http://localhost:3000
```

### Database

The application uses SQLite for local storage. The database file is created at:
- **Windows**: `%APPDATA%/ReelShare/database.sqlite`
- **macOS**: `~/Library/Application Support/ReelShare/database.sqlite`
- **Linux**: `~/.config/ReelShare/database.sqlite`

## API Integrations

The application integrates with the following social media APIs:

- **Instagram**: Graph API
- **TikTok**: Business API
- **YouTube**: Data API v3
- **Facebook**: Graph API
- **LinkedIn**: Marketing API
- **Twitter**: API v2

## Security

- API tokens are encrypted before storage
- OAuth 2.0 authentication flow
- Local data encryption
- Secure credential refresh mechanism
- No external data transmission without user consent

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - see LICENSE file for details

## Troubleshooting

### Common Issues

1. **Electron won't start**
   ```bash
   # Clear node_modules and reinstall
   rm -rf node_modules
   npm install
   ```

2. **FFmpeg errors**
   - Ensure FFmpeg is installed system-wide
   - Check `npm list @ffmpeg/ffmpeg` for correct version
   - Restart application after FFmpeg installation

3. **Database errors**
   - Delete the database file (see path above)
   - Restart application to recreate database

4. **Social media authentication fails**
   - Verify API credentials in `.env` file
   - Check redirect URIs match platform settings
   - Ensure internet connectivity

5. **Video upload fails**
   - Check file size limits (default: 1GB)
   - Verify supported formats: MP4, MOV, AVI, MKV
   - Ensure sufficient disk space

### Development Issues

1. **TypeScript compilation errors**
   ```bash
   npm run type-check
   # Check for missing @types packages
   ```

2. **Build failures**
   ```bash
   # Clear build artifacts
   rm -rf dist
   npm run build
   ```

3. **Dependency conflicts**
   ```bash
   npm list --depth=0
   # Check for version mismatches
   ```

## Support

For issues and feature requests, please use the GitHub issue tracker.

### Getting Help

1. **Documentation**: Check this README and code comments
2. **GitHub Issues**: Search existing issues before creating new
3. **Debug Mode**: Run with `NODE_ENV=development npm start` for detailed logs
4. **Logs**: Application logs are stored in the user data directory:
   - Windows: `%APPDATA%/ReelShare/logs/`
   - macOS: `~/Library/Logs/ReelShare/`
   - Linux: `~/.local/share/ReelShare/logs/`