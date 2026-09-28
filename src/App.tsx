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
import { useAppStore } from './store/app-store';

// Handles app-wide effects that need router context (e.g. navigating in
// response to tray menu actions), separate from the top-level App component
// so it can live inside <Router> where useNavigate() is available.
function AppEffects() {
  const { initializeApp } = useAppStore();
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