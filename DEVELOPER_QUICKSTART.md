# ReelShare Developer QuickStart

## 5-Minute Setup

### 1. Clone and Install
```bash
git clone <repository-url>
cd reelshare
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env
# Edit .env with test credentials (use dummy values for development)
```

### 3. Start Development Server
```bash
npm run dev
```

### 4. Access the App
- Electron window should open automatically
- Or access React dev server at: http://localhost:3000

## Common Development Tasks

### Adding a New Page

1. **Create Page Component** (`src/pages/NewPage.tsx`):
```typescript
import React from 'react';

const NewPage: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold">New Page</h1>
      {/* Your content */}
    </div>
  );
};

export default NewPage;
```

2. **Add Route** (`src/App.tsx`):
```typescript
// Add import
import NewPage from './pages/NewPage';

// Add route
<Route path="/new-page" element={<NewPage />} />
```

3. **Add Navigation** (`src/components/Sidebar.tsx`):
```typescript
// Add menu item
{
  icon: <NewIcon />,
  label: 'New Page',
  path: '/new-page'
}
```

### Creating a New Store

1. **Create Store** (`src/store/new-store.ts`):
```typescript
import { create } from 'zustand';

interface NewStore {
  data: string[];
  loading: boolean;
  fetchData: () => Promise<void>;
  addItem: (item: string) => void;
}

export const useNewStore = create<NewStore>((set) => ({
  data: [],
  loading: false,
  fetchData: async () => {
    set({ loading: true });
    // API call
    set({ data: ['item1', 'item2'], loading: false });
  },
  addItem: (item) => {
    set((state) => ({ data: [...state.data, item] }));
  }
}));
```

2. **Use in Component**:
```typescript
import { useNewStore } from '@/store/new-store';

const MyComponent: React.FC = () => {
  const { data, loading, fetchData } = useNewStore();
  
  useEffect(() => {
    fetchData();
  }, []);
  
  return (
    <div>
      {loading ? 'Loading...' : data.map(item => <div key={item}>{item}</div>)}
    </div>
  );
};
```

### Adding Electron IPC Handlers

1. **Main Process** (`electron/main.ts`):
```typescript
// Add handler
ipcMain.handle('custom:action', async (event, data) => {
  console.log('Custom action with data:', data);
  return { success: true, result: 'Action completed' };
});
```

2. **Preload Script** (`electron/preload.js`):
```javascript
contextBridge.exposeInMainWorld('electronAPI', {
  // Add function
  customAction: (data) => ipcRenderer.invoke('custom:action', data),
  // ... existing functions
});
```

3. **Renderer Usage**:
```typescript
// In React component
const handleAction = async () => {
  const result = await window.electronAPI.customAction({ foo: 'bar' });
  console.log('Result:', result);
};
```

## Debugging Tips

### Frontend Debugging

1. **React DevTools**:
   - Install Chrome/Firefox extension
   - Inspect components and props
   - Profile performance

2. **Zustand DevTools**:
```typescript
// In store creation
import { devtools } from 'zustand/middleware';

export const useStore = create(
  devtools(
    // Your store implementation
  )
);
```

3. **Console Logging**:
```typescript
// Use debug middleware
const withLogging = (config) => (set, get, api) => 
  config((...args) => {
    console.log('Store update:', args);
    set(...args);
  }, get, api);
```

### Electron Debugging

1. **Main Process Logs**:
```bash
# Run with debug logging
npm run dev 2>&1 | grep -i electron
```

2. **DevTools**:
   - Right-click in app → Inspect Element
   - Or: `mainWindow.webContents.openDevTools()` in development

3. **Process Monitor**:
```bash
# Monitor CPU/Memory usage
ps aux | grep electron
top -p $(pgrep electron)
```

### Database Debugging

1. **SQLite Browser**:
   ```bash
   # Install SQLite browser
   sudo apt install sqlitebrowser  # Ubuntu
   brew install sqlitebrowser      # macOS
   
   # Open database
   sqlitebrowser ~/.config/ReelShare/database.sqlite
   ```

2. **Query Logging**:
```typescript
// In database.ts
const db = new Database(dbPath, {
  verbose: process.env.NODE_ENV === 'development' ? console.log : undefined
});
```

## Testing

### Run Tests
```bash
# Unit tests (if configured)
npm test

# Type checking
npm run type-check

# Linting
npm run lint
```

### Manual Testing Checklist

1. **Video Upload**:
   - [ ] Upload MP4 file
   - [ ] Generate thumbnail
   - [ ] Preview video
   - [ ] Edit metadata

2. **Platform Connection**:
   - [ ] OAuth flow
   - [ ] Token storage
   - [ ] Account display

3. **Scheduling**:
   - [ ] Create schedule
   - [ ] Calendar display
   - [ ] Edit/delete schedule

4. **Posting**:
   - [ ] Single platform post
   - [ ] Multi-platform post
   - [ ] Error handling

5. **Analytics**:
   - [ ] Data display
   - [ ] Chart rendering
   - [ ] Filtering

## Performance Testing

### Memory Usage
```bash
# Check memory usage
node -e "console.log(process.memoryUsage())"

# Monitor over time
watch -n 1 "ps aux | grep electron | head -1"
```

### Build Size
```bash
# Check bundle size
npm run build
du -sh dist/
```

### Load Testing
```bash
# Simulate multiple operations
for i in {1..100}; do
  curl -X POST http://localhost:3000/api/test > /dev/null &
done
```

## Deployment Checklist

### Before Release
- [ ] Update version in `package.json`
- [ ] Update CHANGELOG.md
- [ ] Test all major features
- [ ] Verify API rate limits
- [ ] Check error messages
- [ ] Test on target OS

### Build Commands
```bash
# Test build
npm run build

# Create installer
npm run dist

# Verify installer
# On Windows: Run .exe
# On macOS: Mount .dmg
# On Linux: Run .AppImage
```

### Post-Release
- [ ] Monitor error logs
- [ ] Check user feedback
- [ ] Update documentation
- [ ] Plan next release

## Common Issues & Solutions

### Issue: "Module not found"
```bash
# Solution: Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Issue: "FFmpeg not loading"
```bash
# Solution: Check FFmpeg installation
which ffmpeg
ffmpeg -version

# Or use bundled version
npm install @ffmpeg/core
```

### Issue: "Database locked"
```bash
# Solution: Close app and delete lock file
# Check for existing instances
ps aux | grep electron
killall electron

# Remove lock files
find ~/.config/ReelShare -name "*.lock" -delete
```

### Issue: "API rate limiting"
- Implement exponential backoff
- Add request queuing
- Cache responses
- Monitor usage with platform dashboards

## Useful Commands

### Development
```bash
# Hot reload
npm run dev

# Build only
npm run build

# Lint and fix
npm run lint -- --fix

# Type check
npm run type-check
```

### Debugging
```bash
# Run with debug logs
DEBUG=* npm run dev

# Monitor file changes
find src electron -name "*.ts" -o -name "*.tsx" | entr npm run type-check

# Check dependencies
npm outdated
npm audit
```

### Maintenance
```bash
# Clean up
npm run clean
rm -rf node_modules dist

# Update dependencies
npm update
npm audit fix

# Check disk usage
du -sh node_modules/
du -sh dist/
```

## Getting Help

### Resources
- [Electron Documentation](https://www.electronjs.org/docs)
- [React Documentation](https://react.dev)
- [Zustand Documentation](https://docs.pmnd.rs/zustand)
- [Tailwind CSS](https://tailwindcss.com/docs)

### Community
- GitHub Issues: Bug reports and feature requests
- Discord/Slack: Real-time help
- Stack Overflow: Tag with `electron` `react` `reelshare`

### Support Levels
1. **Community**: Documentation, examples, GitHub issues
2. **Premium**: Priority support, custom features
3. **Enterprise**: Dedicated support, SLA, custom development