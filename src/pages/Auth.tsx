import React, { useState } from 'react';
import { Video, Mail, Lock, User, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAppStore } from '../store/app-store';

// Shown whenever there is no logged-in user. Replaces the previous
// hardcoded "Alex Johnson" placeholder user with a real local
// login/register flow backed by electron/database.ts's users table
// (email + scrypt-hashed password, stored in the app's own SQLite file --
// nothing is sent anywhere external).
const Auth: React.FC = () => {
  const { login, register, authLoading, authError } = useAppStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const resetForm = () => {
    setEmail('');
    setName('');
    setPassword('');
    setConfirmPassword('');
    setFormError(null);
  };

  const switchMode = (newMode: 'login' | 'register') => {
    setMode(newMode);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!email.trim() || !password) {
      setFormError('Email and password are required');
      return;
    }

    if (mode === 'register') {
      if (!name.trim()) {
        setFormError('Name is required');
        return;
      }
      if (password.length < 8) {
        setFormError('Password must be at least 8 characters');
        return;
      }
      if (password !== confirmPassword) {
        setFormError('Passwords do not match');
        return;
      }
    }

    try {
      if (mode === 'login') {
        await login(email.trim(), password);
      } else {
        await register(email.trim(), name.trim(), password);
      }
    } catch {
      // authError is already set by the store; nothing further to do here.
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-pink-500/5 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-primary to-pink-500 rounded-2xl flex items-center justify-center mb-4">
            <Video className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">ReelShare</h1>
          <p className="text-sm text-muted-foreground mt-1">Social Media Video Manager</p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl shadow-sm p-8">
          {/* Tabs */}
          <div className="flex bg-muted rounded-lg p-1 mb-6">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                mode === 'login'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                mode === 'register'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="Your name"
                    autoComplete="name"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder={mode === 'register' ? 'At least 8 characters' : 'Your password'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                  />
                </div>
              </div>
            )}

            {(formError || authError) && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <p className="text-sm text-destructive">{formError || authError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-primary text-primary-foreground font-medium py-2.5 rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {authLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{mode === 'login' ? 'Logging in...' : 'Creating account...'}</span>
                </>
              ) : (
                <span>{mode === 'login' ? 'Log In' : 'Create Account'}</span>
              )}
            </button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-6">
            Your account and password are stored locally on this device only.
            Nothing is sent to any external server.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
