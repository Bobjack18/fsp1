import React, { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import Layout from '@/react-app/components/Layout';
import LoadingSpinner from '@/react-app/components/LoadingSpinner';
import { useAuth } from '@/react-app/contexts/AuthContext';

type ViewType = 'welcome' | 'login' | 'signup';

export default function Welcome() {
  const [currentView, setCurrentView] = useState<ViewType>('welcome');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  const { login, signup, resetPassword, error, setError } = useAuth();

  // Load saved email on component mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('savedEmail');
    if (savedEmail) {
      setLoginEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  // Clear error when switching views
  useEffect(() => {
    setError(null);
  }, [currentView, setError]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword) return;

    setIsSubmitting(true);
    try {
      await login(loginEmail, loginPassword, rememberMe);
    } catch (err) {
      // Error is handled by the hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupName.trim() || !signupEmail.trim() || !signupPassword) return;

    setIsSubmitting(true);
    try {
      await signup(signupName, signupEmail, signupPassword);
    } catch (err) {
      // Error is handled by the hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!loginEmail.trim()) {
      setError('Please enter your email to reset password.');
      return;
    }

    try {
      await resetPassword(loginEmail);
      alert('Password reset email sent. Check your inbox.');
    } catch (err) {
      // Error is handled by the hook
    }
  };

  return (
    <Layout>
      <div className="container max-w-md mx-auto mt-20">
        {/* Welcome Screen */}
        {currentView === 'welcome' && (
          <>
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-accent mb-4 holographic-text">
                FlatbushSafetyPatrol1
              </h1>
              <p className="text-lg opacity-90">
                Welcome to the FSP Web App!
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="text-center mb-8 text-white">
                Please log in or sign up to continue!
              </div>
              <button
                onClick={() => setCurrentView('login')}
                className="w-full bg-gradient-to-r from-accent to-blue-500 hover:from-accent/80 hover:to-blue-500/80 text-white font-semibold py-4 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-glow"
              >
                Login➡
              </button>
              <button
                onClick={() => setCurrentView('signup')}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-4 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                Sign Up➡
              </button>
            </div>
          </>
        )}

        {/* Login Form */}
        {currentView === 'login' && (
          <>
            <h2 className="text-2xl font-bold text-center text-accent mb-6">Login</h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="Email"
                className="w-full p-3 bg-black/20 border border-accent/30 rounded-lg text-white placeholder-gray-400"
                required
              />
              
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full p-3 pr-12 bg-black/20 border border-accent/30 rounded-lg text-white placeholder-gray-400"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm text-white">Remember Me</span>
                </label>
                
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm text-accent hover:text-accent/80 underline"
                >
                  Forgot Password?
                </button>
              </div>

              {error && (
                <div className="text-red-400 text-sm text-center p-2 bg-red-900/20 rounded">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-accent hover:bg-accent/80 disabled:bg-gray-600 text-black font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center space-x-2">
                    <LoadingSpinner size="sm" />
                    <span>Logging in...</span>
                  </div>
                ) : (
                  'Login'
                )}
              </button>
            </form>

            <div className="mt-6 text-center space-y-2">
              <button
                onClick={() => setCurrentView('signup')}
                className="text-accent hover:text-accent/80 underline"
              >
                Don't have an account? Sign Up
              </button>
              <br />
              <button
                onClick={() => setCurrentView('welcome')}
                className="text-gray-400 hover:text-white underline"
              >
                Back to Welcome
              </button>
            </div>
          </>
        )}

        {/* Signup Form */}
        {currentView === 'signup' && (
          <>
            <h2 className="text-2xl font-bold text-center text-accent mb-6">Sign Up</h2>
            <form onSubmit={handleSignup} className="space-y-4">
              <input
                type="text"
                value={signupName}
                onChange={(e) => setSignupName(e.target.value)}
                placeholder="Full Name"
                className="w-full p-3 bg-black/20 border border-accent/30 rounded-lg text-white placeholder-gray-400"
                required
              />
              
              <input
                type="email"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                placeholder="Email"
                className="w-full p-3 bg-black/20 border border-accent/30 rounded-lg text-white placeholder-gray-400"
                required
              />
              
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full p-3 pr-12 bg-black/20 border border-accent/30 rounded-lg text-white placeholder-gray-400"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {error && (
                <div className="text-red-400 text-sm text-center p-2 bg-red-900/20 rounded">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-accent hover:bg-accent/80 disabled:bg-gray-600 text-black font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center space-x-2">
                    <LoadingSpinner size="sm" />
                    <span>Signing up...</span>
                  </div>
                ) : (
                  'Sign Up'
                )}
              </button>
            </form>

            <div className="mt-6 text-center space-y-2">
              <button
                onClick={() => setCurrentView('login')}
                className="text-accent hover:text-accent/80 underline"
              >
                Already have an account? Login
              </button>
              <br />
              <button
                onClick={() => setCurrentView('welcome')}
                className="text-gray-400 hover:text-white underline"
              >
                Back to Welcome
              </button>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
