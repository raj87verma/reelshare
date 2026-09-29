import { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import VideoLibrary from './pages/VideoLibrary';
import Schedule from './pages/Schedule';
import Analytics from './pages/Analytics';
import SocialAccounts from './pages/SocialAccounts';
import Settings from './pages/Settings';
import Auth from './pages/Auth';
import { useAppStore } from './store/app-store';
import { useVideoStore } from './store/video-store';

// Handles app-wide effects that need router context (e.g. navigating in
// response to tray menu actions), separate from the top-level App component
// so it can live inside <Router> where useNavigate() is available.
function AppEffects() {
  const { initializeApp, user, authChecked } = useAppStore();
  const { getVideos } = useVideoStore();
  const navigate = useNavigate();

  useEffect(() => {
    initializeApp();
    
    // Handle tray actions
    if (window.electronAPI) {
      window.electronAPI.onTrayAction((action) => {
        if (action === 'upload-video') {
          navigate('/videos', { state: { openUpload: true } });
        }
      });

      window.electronAPI.onAppBeforeQuit(() => {
        // Save app state before quit
        console.log('App is quitting, saving state...');
      });

      // Get app version
      window.electronAPI.getVersion().then((version) => {
        console.log('App version:', version);
      });
    }

    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeTrayActionListener();
        window.electronAPI.removeAppBeforeQuitListener();
      }
    };
  }, [initializeApp]);

  // Reload the video library whenever the logged-in user changes (login,
  // logout, or switching accounts), so one user's videos never briefly
  // appear for another, and a freshly logged-in user immediately sees
  // their own library rather than stale/empty state left over from
  // before login.
  useEffect(() => {
    if (user) {
      getVideos();
    }
  }, [user, getVideos]);

  // While the initial session check is in flight, render nothing rather
  // than briefly flashing the Login screen before we know whether a user
  // is already logged in from a previous run.
  if (!authChecked) {
    return (
      <>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
        <Toaster position="bottom-right" richColors />
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Auth />
        <Toaster position="bottom-right" richColors />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/videos" element={<VideoLibrary />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/accounts" element={<SocialAccounts />} />
          <Route path="/settings" element={<Settings />} />
          {/* Fallback for any unmatched route: show Dashboard instead of a
              blank page. This is defense-in-depth against exactly the bug
              that shipped in v1.0.3 (BrowserRouter under Electron's file://
              protocol failed to match any route, and with no fallback the
              app rendered nothing at all with no visible error). */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Layout>
      <Toaster position="bottom-right" richColors />
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppEffects />
    </Router>
  );
}

export default App;