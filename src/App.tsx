import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import VideoLibrary from './pages/VideoLibrary';
import Schedule from './pages/Schedule';
import Analytics from './pages/Analytics';
import SocialAccounts from './pages/SocialAccounts';
import Settings from './pages/Settings';
import { useAppStore } from './store/app-store';

function App() {
  const { initializeApp } = useAppStore();

  useEffect(() => {
    initializeApp();
    
    // Handle tray actions
    if (window.electronAPI) {
      window.electronAPI.onTrayAction((action) => {
        console.log('Tray action:', action);
        // Handle tray actions here
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
    <Router>
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
          </Routes>
        </Layout>
        <Toaster position="bottom-right" richColors />
      </div>
    </Router>
  );
}

export default App;