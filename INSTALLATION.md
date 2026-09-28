# ReelShare Installation Guide

## Table of Contents
1. [System Requirements](#system-requirements)
2. [Quick Installation](#quick-installation)
3. [Detailed Platform Instructions](#detailed-platform-instructions)
4. [Development Installation](#development-installation)
5. [Troubleshooting](#troubleshooting)
6. [Post-Installation Setup](#post-installation-setup)

## System Requirements

### Minimum Requirements
- **Operating System**: Windows 10+, macOS 10.15+, or Ubuntu 20.04+ (64-bit)
- **RAM**: 4 GB minimum, 8 GB recommended
- **Storage**: 500 MB free disk space
- **Internet Connection**: Required for social media integrations

### Recommended Requirements
- **CPU**: 4-core processor (Intel i5 / AMD Ryzen 5 or better)
- **RAM**: 16 GB
- **Storage**: 1 GB SSD
- **GPU**: Dedicated graphics card for video processing

### Dependencies
- **FFmpeg**: Required for video processing
- **Node.js**: Required for development builds only
- **Git**: Required for development builds only

## Quick Installation

### For End Users (Pre-built Packages)

#### Windows
1. Download the latest `.exe` installer from [releases page](https://github.com/yourusername/reelshare/releases)
2. Double-click `ReelShare-Setup-x.x.x.exe`
3. Follow the installation wizard
4. Launch ReelShare from Start Menu or Desktop shortcut

#### macOS
1. Download the latest `.dmg` file from [releases page](https://github.com/yourusername/reelshare/releases)
2. Double-click the `.dmg` file to mount it
3. Drag ReelShare.app to the Applications folder
4. Launch ReelShare from Applications

#### Linux
1. Download the latest `.AppImage` or `.deb` file from [releases page](https://github.com/yourusername/reelshare/releases)

   **For .AppImage:**
   ```bash
   chmod +x ReelShare-x.x.x.AppImage
   ./ReelShare-x.x.x.AppImage
   ```

   **For .deb (Ubuntu/Debian):**
   ```bash
   sudo dpkg -i reelshare_x.x.x_amd64.deb
   sudo apt-get install -f  # Install dependencies if needed
   ```

## Detailed Platform Instructions

### Windows Installation

#### Method 1: Windows Installer (.exe)
1. **Download**: Get the latest `.exe` installer
2. **Run as Administrator**: Right-click → "Run as administrator"
3. **Installation Options**:
   - Choose installation directory (default: `C:\Program Files\ReelShare`)
   - Create desktop shortcut (recommended)
   - Add to PATH (optional)
4. **Complete Installation**: Click "Finish"
5. **First Run**: Windows Defender may ask for permission - click "Allow"

#### Method 2: Portable Version (.exe)
1. **Download**: Get the portable `.exe` version
2. **Extract**: Unzip to any folder
3. **Run**: Double-click `ReelShare.exe`
4. **Note**: Settings are stored in the same folder

#### Method 3: Microsoft Store (Coming Soon)
1. Open Microsoft Store
2. Search for "ReelShare"
3. Click "Install"
4. Launch from Start Menu

### macOS Installation

#### Method 1: DMG Installer
1. **Download**: Get the `.dmg` file
2. **Security**: If blocked, right-click → "Open" → "Open anyway"
3. **Install**: Drag ReelShare.app to Applications folder
4. **First Run**: Right-click → "Open" to bypass Gatekeeper
5. **Permissions**:
   - Allow screen recording (for video preview)
   - Allow disk access (for video storage)

#### Method 2: Homebrew (Coming Soon)
```bash
brew install --cask reelshare
```

#### Method 3: Mac App Store (Coming Soon)
1. Open App Store
2. Search for "ReelShare"
3. Click "Get" → "Install"

### Linux Installation

#### Method 1: AppImage (All Distributions)
```bash
# Download
wget https://github.com/yourusername/reelshare/releases/latest/download/ReelShare-x.x.x.AppImage

# Make executable
chmod +x ReelShare-x.x.x.AppImage

# Run
./ReelShare-x.x.x.AppImage

# Optional: Move to applications directory
sudo mv ReelShare-x.x.x.AppImage /usr/local/bin/reelshare
```

#### Method 2: DEB Package (Ubuntu/Debian)
```bash
# Download
wget https://github.com/yourusername/reelshare/releases/latest/download/reelshare_x.x.x_amd64.deb

# Install
sudo dpkg -i reelshare_x.x.x_amd64.deb

# Fix dependencies if needed
sudo apt-get install -f

# Launch
reelshare
```

#### Method 3: RPM Package (Fedora/RHEL)
```bash
# Download
wget https://github.com/yourusername/reelshare/releases/latest/download/reelshare-x.x.x.x86_64.rpm

# Install
sudo rpm -i reelshare-x.x.x.x86_64.rpm

# Launch
reelshare
```

#### Method 4: Snap (Coming Soon)
```bash
sudo snap install reelshare
```

#### Method 5: Flatpak (Coming Soon)
```bash
flatpak install flathub com.reelshare.app
```

## Development Installation

### Prerequisites
```bash
# Windows
# Install Node.js from https://nodejs.org/
# Install Git from https://git-scm.com/

# macOS
brew install node git ffmpeg

# Linux (Ubuntu/Debian)
sudo apt update
sudo apt install nodejs npm git ffmpeg

# Linux (Fedora)
sudo dnf install nodejs npm git ffmpeg
```

### Clone and Build
```bash
# Clone repository
git clone https://github.com/yourusername/reelshare.git
cd reelshare

# Install dependencies
npm install

# Build for production
npm run build

# Create installer
npm run dist

# Installers will be in the 'release' directory
```

### Development Mode
```bash
# Start development server
npm run dev

# The app will open in Electron window
# Hot reload is enabled for both React and Electron
```

## Troubleshooting

### Common Installation Issues

#### Windows
1. **"Windows protected your PC"**
   - Click "More info" → "Run anyway"
   - Or: Right-click installer → Properties → Unblock → Apply

2. **Missing DLL errors**
   - Install [Visual C++ Redistributable](https://aka.ms/vs/17/release/vc_redist.x64.exe)
   - Install [.NET Framework 4.8](https://dotnet.microsoft.com/download/dotnet-framework)

3. **Antivirus blocking**
   - Add exception for ReelShare in antivirus settings
   - Or: Use portable version

#### macOS
1. **"App can't be opened"**
   ```bash
   # Method 1: Right-click → Open
   # Method 2: Remove quarantine flag
   xattr -d com.apple.quarantine /Applications/ReelShare.app
   ```

2. **Permission errors**
   - System Preferences → Security & Privacy → Privacy
   - Allow Screen Recording, Files and Folders, etc.

3. **Rosetta 2 required (Apple Silicon)**
   - Install Rosetta: `softwareupdate --install-rosetta`
   - Native Apple Silicon build coming soon

#### Linux
1. **AppImage won't run**
   ```bash
   # Make executable
   chmod +x ReelShare-*.AppImage
   
   # May need FUSE
   sudo apt install fuse libfuse2  # Ubuntu
   sudo dnf install fuse           # Fedora
   ```

2. **Missing libraries**
   ```bash
   # Common dependencies
   sudo apt install libgtk-3-0 libnotify4 libnss3 libxss1 libxtst6 xdg-utils libatspi2.0-0 libuuid1 libappindicator3-1
   ```

3. **Sandboxing issues**
   ```bash
   # Run with --no-sandbox (not recommended for security)
   ./ReelShare.AppImage --no-sandbox
   ```

### FFmpeg Issues
```bash
# Check if FFmpeg is installed
ffmpeg -version

# Install FFmpeg if missing

# Windows (using chocolatey)
choco install ffmpeg

# macOS
brew install ffmpeg

# Linux (Ubuntu)
sudo apt install ffmpeg

# Linux (Fedora)
sudo dnf install ffmpeg
```

### Database Issues
```bash
# Reset database (will delete all data)
# Close ReelShare first
rm -rf ~/.config/ReelShare  # Linux/macOS
rm -rf %APPDATA%/ReelShare  # Windows
```

## Post-Installation Setup

### First Run Configuration
1. **Welcome Screen**: Set up your profile
2. **Social Media Accounts**: Connect your platforms
3. **Storage Location**: Choose where videos are stored
4. **Preferences**: Set default settings

### Connecting Social Media Accounts
1. Go to **Settings** → **Social Accounts**
2. Click "Connect" for each platform
3. Follow OAuth authentication flow
4. Grant necessary permissions

### Setting Up Video Storage
1. **Default Location**: 
   - Windows: `%USERPROFILE%\Videos\ReelShare`
   - macOS: `~/Movies/ReelShare`
   - Linux: `~/Videos/ReelShare`
2. **Change Location**: Settings → Storage → Choose folder
3. **Network Drives**: Supported but not recommended for performance

### Configuring Preferences
1. **Upload Settings**: Default video quality, format
2. **Scheduling**: Timezone, default posting times
3. **Notifications**: Enable/disable notifications
4. **Analytics**: Data collection preferences
5. **Updates**: Automatic update settings

## Updating ReelShare

### Automatic Updates
- Windows: Updates through installer
- macOS: Updates through DMG or App Store
- Linux: Manual update required for AppImage

### Manual Update
1. Download latest version
2. Close ReelShare if running
3. Install new version over old
4. Settings and data are preserved

### Version Migration
- Version 1.x to 2.x: Automatic migration
- Database format changes: Automatic conversion
- Backup recommended before major updates

## Uninstallation

### Windows
1. **Control Panel** → **Programs** → **Uninstall**
2. Select ReelShare → Uninstall
3. **Optional**: Delete `%APPDATA%\ReelShare` for complete removal

### macOS
1. Drag ReelShare.app to Trash
2. **Optional**: Delete `~/Library/Application Support/ReelShare`
3. **Optional**: Delete `~/Library/Preferences/com.reelshare.app.plist`

### Linux
```bash
# DEB packages
sudo apt remove reelshare

# AppImage
rm ~/Downloads/ReelShare-*.AppImage

# Remove config files
rm -rf ~/.config/ReelShare
rm -rf ~/.local/share/ReelShare
```

## Support

### Getting Help
- **Documentation**: [README.md](./README.md)
- **Issues**: [GitHub Issues](https://github.com/yourusername/reelshare/issues)
- **Email**: support@reelshare.app
- **Community**: Discord/Slack (coming soon)

### Reporting Issues
Include the following information:
1. ReelShare version
2. Operating system and version
3. Steps to reproduce
4. Error messages
5. Log files (Settings → Help → Export Logs)

### Log Files Location
- Windows: `%APPDATA%\ReelShare\logs\`
- macOS: `~/Library/Logs/ReelShare/`
- Linux: `~/.local/share/ReelShare/logs/`