import React from 'react';
import { Settings, Sun, Moon } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useTheme } from './ThemeProvider';

interface LayoutProps {
  children: React.ReactNode;
  showBackgroundEffects?: boolean;
}

export default function Layout({ children, showBackgroundEffects = true }: LayoutProps) {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  return (
    <>
      {showBackgroundEffects && (
        <>
          <div className="plasma-field"></div>
          <div className="quantum-field">
            <div className="quantum-particle" style={{ top: '10%', left: '15%' }}></div>
            <div className="quantum-particle" style={{ top: '30%', left: '60%' }}></div>
            <div className="quantum-particle" style={{ top: '60%', left: '25%' }}></div>
            <div className="quantum-particle" style={{ top: '80%', left: '75%' }}></div>
            <div className="quantum-particle" style={{ top: '40%', left: '90%' }}></div>
          </div>
        </>
      )}

      {/* Top Navigation Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-black/10 backdrop-blur-md border-b border-accent/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Left side - Logo/Brand */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-accent via-blue-400 to-purple-500 rounded-lg shadow-glow flex items-center justify-center">
                <span className="text-xs font-bold text-white">FSP</span>
              </div>
              <span className="text-white font-semibold text-lg holographic-text hidden sm:block">
                Flatbush Safety Patrol
              </span>
            </div>

            {/* Right side - Controls */}
            <div className="flex items-center space-x-3">
              
              {/* Theme Toggle */}
              <div className="relative">
                <button
                  onClick={toggleTheme}
                  className="flex items-center justify-center w-10 h-10 rounded-lg bg-black/20 hover:bg-black/30 border border-accent/30 hover:border-accent/50 transition-all duration-200 group"
                  title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                  {isDark ? (
                    <Sun className="w-5 h-5 text-yellow-400 group-hover:text-yellow-300 transition-colors" />
                  ) : (
                    <Moon className="w-5 h-5 text-blue-400 group-hover:text-blue-300 transition-colors" />
                  )}
                </button>
              </div>

              {/* Settings Button */}
              <button
                onClick={() => navigate('/settings')}
                className="flex items-center justify-center w-10 h-10 rounded-lg bg-black/20 hover:bg-black/30 border border-accent/30 hover:border-accent/50 transition-all duration-200 group"
                title="Settings"
              >
                <Settings className="w-5 h-5 text-accent group-hover:text-accent/80 transition-colors drop-shadow-glow" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - with top padding to account for fixed nav */}
      <div className="pt-16">
        {children}
      </div>
    </>
  );
}
