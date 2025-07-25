import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Upload, Nfc, Trash2, Wifi, Shield, User, Camera, RefreshCw, Smartphone, Bell, QrCode, Key, Copy, Download, Eye, AlertTriangle } from 'lucide-react';
import Layout from '@/react-app/components/Layout';
import Avatar from '@/react-app/components/Avatar';
import LoadingSpinner from '@/react-app/components/LoadingSpinner';
import { useAuth } from '@/react-app/contexts/AuthContext';
import { useNFC } from '@/react-app/hooks/useNFC';
import { use2FA, type TwoFASetupData } from '@/react-app/hooks/use2FA';
import { usePushNotifications } from '@/react-app/hooks/usePushNotifications';
import { useUser } from '@/react-app/hooks/useUser';

export default function Settings() {
  const navigate = useNavigate();
  const { user, updateUserProfile } = useAuth();
  const { user: dbUser } = useUser();
  const { enrollNFC, readNFC, clearNFC, nfcStatus, isNFCOperating, checkNFCSupport } = useNFC();
  const { generateSecret, verifyAndEnable2FA, disable2FA, generateBackupCodes, isLoading: is2FALoading, error: twoFAError, status: twoFAStatus, clearStatus: clear2FAStatus } = use2FA();
  const { 
    isSupported: isPushSupported, 
    permission: pushPermission, 
    isLoading: isPushLoading, 
    error: pushError, 
    status: pushStatus, 
    settings: pushSettings,
    requestPermission: requestPushPermission,
    subscribe: subscribeToPush,
    unsubscribe: unsubscribeFromPush,
    updateSettings: updatePushSettings,
    sendTestNotification,
    clearStatus: clearPushStatus
  } = usePushNotifications();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [nfcMode, setNfcMode] = useState<'enroll' | 'read' | 'clear'>('enroll');
  
  // 2FA states
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [twoFASetupData, setTwoFASetupData] = useState<TwoFASetupData | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [disable2FACode, setDisable2FACode] = useState('');
  const [showDisable2FA, setShowDisable2FA] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [showQRCode, setShowQRCode] = useState(true);

  const handleDisplayNameUpdate = async () => {
    if (!displayName.trim() || isUpdating) return;

    try {
      setIsUpdating(true);
      await updateUserProfile({ displayName: displayName.trim() });
      setUploadStatus('✅ Display name updated successfully!');
      setTimeout(() => setUploadStatus(''), 3000);
    } catch (error) {
      setUploadStatus('❌ Failed to update display name');
      setTimeout(() => setUploadStatus(''), 3000);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      setUploadStatus(`📁 File selected: ${file.name}`);
    }
  };

  const uploadAvatar = async () => {
    if (!avatarFile) {
      setUploadStatus('❌ Please select an image first');
      return;
    }

    try {
      setIsUpdating(true);
      setUploadStatus('📤 Uploading avatar...');

      // Upload to imgbb (using the same API key from original code)
      const apiKey = '6c210d991c8a37528141924040680b2e';
      const formData = new FormData();
      formData.append('image', avatarFile);

      const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const imageUrl = data.data.url;
        await updateUserProfile({ photoURL: imageUrl });
        setUploadStatus('✅ Avatar uploaded successfully!');
        setAvatarFile(null);
        setAvatarPreview(null);
        // Clear file input
        const fileInput = document.getElementById('avatar-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        setUploadStatus(`❌ Upload failed: ${data.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      setUploadStatus(`❌ Error during upload: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUpdating(false);
      setTimeout(() => setUploadStatus(''), 5000);
    }
  };

  const handleNFCOperation = async (operation: 'enroll' | 'read' | 'clear') => {
    setIsUpdating(true);
    let result;
    
    switch (operation) {
      case 'enroll':
        result = await enrollNFC();
        break;
      case 'read':
        result = await readNFC();
        break;
      case 'clear':
        result = await clearNFC();
        break;
    }
    
    setUploadStatus(result.message);
    setIsUpdating(false);
    
    if (result.success && operation === 'read' && result.data) {
      console.log('NFC Data:', result.data);
    }
  };

  // 2FA handlers
  const handle2FASetup = async () => {
    const setupData = await generateSecret();
    if (setupData) {
      setTwoFASetupData(setupData);
      setShow2FASetup(true);
    }
  };

  const handleVerify2FA = async () => {
    if (!twoFASetupData || !verificationCode.trim()) return;
    
    const success = await verifyAndEnable2FA(twoFASetupData.secret, verificationCode);
    if (success) {
      setShow2FASetup(false);
      setTwoFASetupData(null);
      setVerificationCode('');
      setUploadStatus('✅ 2FA enabled successfully!');
    }
  };

  const handleDisable2FA = async () => {
    if (!disable2FACode.trim()) return;
    
    const success = await disable2FA(disable2FACode);
    if (success) {
      setShowDisable2FA(false);
      setDisable2FACode('');
      setUploadStatus('✅ 2FA disabled successfully');
    }
  };

  const handleGenerateBackupCodes = async () => {
    const codes = await generateBackupCodes();
    if (codes) {
      setBackupCodes(codes);
      setShowBackupCodes(true);
    }
  };

  const downloadBackupCodes = () => {
    if (!backupCodes) return;
    
    const content = `Flatbush Safety Patrol - 2FA Backup Codes\nGenerated: ${new Date().toISOString()}\n\n${backupCodes.join('\n')}\n\nKeep these codes safe! Each can only be used once.`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fsp-2fa-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Push notification handlers
  const handleEnablePushNotifications = async () => {
    // First request permission, then subscribe
    const hasPermission = await requestPushPermission();
    if (hasPermission) {
      await subscribeToPush();
    }
  };

  const handleDisablePushNotifications = async () => {
    await unsubscribeFromPush();
  };

  const handlePushSettingChange = async (setting: keyof typeof pushSettings, value: boolean) => {
    await updatePushSettings({ [setting]: value });
  };

  // Clear all status messages
  useEffect(() => {
    const timer = setTimeout(() => {
      clear2FAStatus();
      clearPushStatus();
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [twoFAStatus, pushStatus]);

  if (!user) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container max-w-4xl mx-auto mt-8 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center space-x-2 text-accent hover:text-accent/80 transition-all duration-200 bg-black/20 hover:bg-black/30 px-4 py-2 rounded-lg border border-accent/30"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Home</span>
          </button>
          <h2 className="text-3xl font-bold text-accent holographic-text">Settings</h2>
          <div className="w-32" /> {/* Spacer */}
        </div>

        {/* Current User Info */}
        <div className="bg-gradient-to-br from-black/30 to-black/20 backdrop-blur-lg border border-accent/40 rounded-xl p-8 mb-8 shadow-glow">
          <div className="flex items-center space-x-6 mb-6">
            <div className="relative">
              <Avatar
                src={user.photoURL}
                name={user.displayName || user.email || 'User'}
                size="xl"
                className="shadow-glow-strong"
              />
              <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-green-500 rounded-full border-2 border-black flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-white mb-2">
                {user.displayName || user.email?.split('@')[0] || 'User'}
              </h3>
              <p className="text-gray-300 text-lg mb-2">{user.email}</p>
              <div className="flex items-center space-x-3">
                {user.isAdmin && (
                  <span className="inline-flex items-center space-x-1 bg-gradient-to-r from-accent/30 to-blue-400/30 text-accent text-sm px-3 py-1 rounded-full border border-accent/40">
                    <Shield className="w-4 h-4" />
                    <span>Administrator</span>
                  </span>
                )}
                <span className="inline-flex items-center space-x-1 bg-green-500/20 text-green-400 text-sm px-3 py-1 rounded-full border border-green-500/40">
                  <Wifi className="w-4 h-4" />
                  <span>Online</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Display Name Settings */}
          <div className="bg-gradient-to-br from-black/30 to-black/20 backdrop-blur-lg border border-accent/40 rounded-xl p-6 shadow-glow-subtle">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-accent/30 to-blue-400/30 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-accent" />
              </div>
              <h3 className="text-xl font-semibold text-accent">Profile Settings</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your display name"
                  className="w-full p-4 bg-black/30 border border-accent/30 hover:border-accent/50 focus:border-accent rounded-xl text-white placeholder-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </div>
              <button
                onClick={handleDisplayNameUpdate}
                disabled={isUpdating || !displayName.trim() || displayName === user?.displayName}
                className="w-full bg-gradient-to-r from-accent to-blue-400 hover:from-accent/80 hover:to-blue-400/80 disabled:from-gray-600 disabled:to-gray-700 text-black disabled:text-gray-400 font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 flex items-center justify-center space-x-2"
              >
                {isUpdating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <User className="w-4 h-4" />
                    <span>Update Profile</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Avatar Settings */}
          <div className="bg-gradient-to-br from-black/30 to-black/20 backdrop-blur-lg border border-accent/40 rounded-xl p-6 shadow-glow-subtle">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500/30 to-pink-400/30 rounded-lg flex items-center justify-center">
                <Camera className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-purple-400">Avatar Settings</h3>
            </div>
            
            {/* Preview */}
            <div className="text-center mb-6">
              {avatarPreview ? (
                <div className="relative inline-block">
                  <img
                    src={avatarPreview}
                    alt="Avatar Preview"
                    className="w-32 h-32 rounded-full object-cover border-4 border-purple-400/50 shadow-glow mx-auto"
                  />
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-purple-500 rounded-full border-2 border-black flex items-center justify-center">
                    <Camera className="w-4 h-4 text-white" />
                  </div>
                </div>
              ) : (
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center mx-auto text-gray-400 border-4 border-gray-600/50">
                  <Camera className="w-8 h-8" />
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Choose New Avatar</label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="w-full p-3 bg-black/30 border border-purple-400/30 hover:border-purple-400/50 rounded-xl text-white transition-all duration-200 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-gradient-to-r file:from-purple-500 file:to-pink-400 file:text-white file:font-medium file:cursor-pointer hover:file:from-purple-600 hover:file:to-pink-500"
                />
              </div>
              <button
                onClick={uploadAvatar}
                disabled={!avatarFile || isUpdating}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-400 hover:from-purple-600 hover:to-pink-500 disabled:from-gray-600 disabled:to-gray-700 text-white disabled:text-gray-400 font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 flex items-center justify-center space-x-2"
              >
                {isUpdating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Upload Avatar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Push Notifications Settings - Full Width */}
        <div className="bg-gradient-to-br from-black/30 to-black/20 backdrop-blur-lg border border-accent/40 rounded-xl p-6 shadow-glow-subtle mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500/30 to-red-400/30 rounded-lg flex items-center justify-center">
                <Bell className="w-5 h-5 text-orange-400" />
              </div>
              <h3 className="text-xl font-semibold text-orange-400">Push Notifications</h3>
            </div>
            <div className="flex items-center space-x-2">
              {pushSettings.enabled ? (
                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full border border-green-500/40">
                  Enabled
                </span>
              ) : (
                <span className="text-xs bg-gray-500/20 text-gray-400 px-2 py-1 rounded-full border border-gray-500/40">
                  Disabled
                </span>
              )}
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <p className="text-gray-300 text-sm leading-relaxed">
              Stay informed about important messages, incidents, and alerts even when the app is closed. Enable notifications to receive real-time updates.
            </p>

            {!isPushSupported && (
              <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
                  <div>
                    <p className="text-red-400 text-sm font-medium mb-1">Push notifications not supported</p>
                    <p className="text-red-300 text-xs">Please use a modern browser like Chrome, Edge, Firefox, or Safari for the best experience.</p>
                  </div>
                </div>
              </div>
            )}

            {isPushSupported && pushPermission === 'denied' && (
              <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
                  <div>
                    <p className="text-red-400 text-sm font-medium mb-1">Notification permission denied</p>
                    <p className="text-red-300 text-xs">To enable notifications: Click the 🔒 lock icon in your browser's address bar → Set "Notifications" to "Allow" → Refresh the page</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {/* Permission and Setup */}
            {!pushSettings.enabled && (
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={requestPushPermission}
                  disabled={isPushLoading || !isPushSupported || pushPermission === 'granted'}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 disabled:from-gray-600 disabled:to-gray-700 text-white disabled:text-gray-400 font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 flex items-center justify-center space-x-2"
                >
                  {isPushLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : pushPermission === 'granted' ? (
                    <>
                      <Bell className="w-4 h-4" />
                      <span>Permission Granted ✓</span>
                    </>
                  ) : (
                    <>
                      <Bell className="w-4 h-4" />
                      <span>1. Request Permission</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleEnablePushNotifications}
                  disabled={isPushLoading || !isPushSupported || pushPermission !== 'granted'}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-red-400 hover:from-orange-600 hover:to-red-500 disabled:from-gray-600 disabled:to-gray-700 text-white disabled:text-gray-400 font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 flex items-center justify-center space-x-2"
                >
                  {isPushLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Setting up...</span>
                    </>
                  ) : (
                    <>
                      <Bell className="w-4 h-4" />
                      <span>2. Enable Notifications</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Notification Categories */}
            {pushSettings.enabled && (
              <>
                <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <Bell className="w-4 h-4 text-green-400" />
                    <span className="text-green-400 font-medium text-sm">Push notifications are active!</span>
                  </div>
                  <p className="text-green-300 text-xs">You'll receive notifications for selected categories even when the app is closed.</p>
                </div>

                <div className="space-y-3 pl-4 border-l-2 border-orange-500/30">
                  {[
                    { key: 'messages' as const, label: 'Chat Messages', desc: 'New messages in group chats', icon: '💬' },
                    { key: 'incidents' as const, label: 'Incident Reports', desc: 'New incident reports in your area', icon: '🚨' },
                    { key: 'alerts' as const, label: 'Emergency Alerts', desc: 'Critical safety alerts and announcements', icon: '⚠️' },
                    { key: 'directMessages' as const, label: 'Direct Messages', desc: 'Private messages from other users', icon: '💌' }
                  ].map(({ key, label, desc, icon }) => (
                    <div key={key} className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-gray-700/50">
                      <div className="flex items-center space-x-3">
                        <span className="text-lg">{icon}</span>
                        <div>
                          <label className="text-sm font-medium text-gray-300">{label}</label>
                          <p className="text-xs text-gray-400">{desc}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handlePushSettingChange(key, !pushSettings[key])}
                        disabled={isPushLoading}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-1 focus:ring-orange-400 ${
                          pushSettings[key] ? 'bg-orange-500' : 'bg-gray-600'
                        } disabled:opacity-50`}
                      >
                        <span
                          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                            pushSettings[key] ? 'translate-x-5' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={sendTestNotification}
                    disabled={isPushLoading}
                    className="bg-gradient-to-r from-green-500 to-emerald-400 hover:from-green-600 hover:to-emerald-500 disabled:from-gray-600 disabled:to-gray-700 text-white disabled:text-gray-400 font-semibold py-2 px-4 rounded-lg transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 flex items-center space-x-2 text-sm"
                  >
                    {isPushLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Bell className="w-4 h-4" />
                        <span>Send Test</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleDisablePushNotifications}
                    disabled={isPushLoading}
                    className="bg-gradient-to-r from-red-500 to-pink-400 hover:from-red-600 hover:to-pink-500 disabled:from-gray-600 disabled:to-gray-700 text-white disabled:text-gray-400 font-semibold py-2 px-4 rounded-lg transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 flex items-center space-x-2 text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Disable</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {(pushStatus || pushError) && (
            <div className={`mt-4 p-4 rounded-lg ${pushError ? 'bg-red-900/30 border border-red-500/30' : 'bg-orange-900/30 border border-orange-500/30'}`}>
              <p className={`text-sm font-medium ${pushError ? 'text-red-400' : 'text-orange-400'}`}>
                {pushError || pushStatus}
              </p>
            </div>
          )}
        </div>

        {/* 2FA Settings - Full Width */}
        <div className="bg-gradient-to-br from-black/30 to-black/20 backdrop-blur-lg border border-accent/40 rounded-xl p-6 shadow-glow-subtle mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500/30 to-emerald-400/30 rounded-lg flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-green-400">Two-Factor Authentication</h3>
            </div>
            <div className="flex items-center space-x-2">
              {dbUser?.is_2fa_enabled ? (
                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full border border-green-500/40">
                  Enabled
                </span>
              ) : (
                <span className="text-xs bg-gray-500/20 text-gray-400 px-2 py-1 rounded-full border border-gray-500/40">
                  Disabled
                </span>
              )}
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <p className="text-gray-300 text-sm leading-relaxed">
              Add an extra layer of security to your account with two-factor authentication using any TOTP authenticator app like Google Authenticator, Authy, or 1Password.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {!dbUser?.is_2fa_enabled ? (
              <button
                onClick={handle2FASetup}
                disabled={is2FALoading}
                className="bg-gradient-to-r from-green-500 to-emerald-400 hover:from-green-600 hover:to-emerald-500 disabled:from-gray-600 disabled:to-gray-700 text-white disabled:text-gray-400 font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 flex items-center space-x-2"
              >
                {is2FALoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Setting up...</span>
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4" />
                    <span>Enable 2FA</span>
                  </>
                )}
              </button>
            ) : (
              <>
                <button
                  onClick={() => setShowDisable2FA(true)}
                  disabled={is2FALoading}
                  className="bg-gradient-to-r from-red-500 to-pink-400 hover:from-red-600 hover:to-pink-500 disabled:from-gray-600 disabled:to-gray-700 text-white disabled:text-gray-400 font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 flex items-center space-x-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Disable 2FA</span>
                </button>
                <button
                  onClick={handleGenerateBackupCodes}
                  disabled={is2FALoading}
                  className="bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 disabled:from-gray-600 disabled:to-gray-700 text-white disabled:text-gray-400 font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Backup Codes</span>
                </button>
              </>
            )}
          </div>

          {(twoFAStatus || twoFAError) && (
            <div className={`mt-4 p-3 rounded-lg ${twoFAError ? 'bg-red-900/30 border border-red-500/30' : 'bg-green-900/30 border border-green-500/30'}`}>
              <p className={`text-sm ${twoFAError ? 'text-red-400' : 'text-green-400'}`}>
                {twoFAError || twoFAStatus}
              </p>
            </div>
          )}
        </div>

        {/* NFC Settings - Full Width */}
        <div className="bg-gradient-to-br from-black/30 to-black/20 backdrop-blur-lg border border-accent/40 rounded-xl p-6 shadow-glow-subtle mb-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500/30 to-cyan-400/30 rounded-lg flex items-center justify-center">
              <Nfc className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-blue-400">NFC Authentication</h3>
          </div>
          
          <div className="space-y-4 mb-6">
            <p className="text-gray-300 text-sm leading-relaxed">
              Configure NFC tags for secure, contactless authentication. Compatible with modern Android and iOS devices.
            </p>
            
            {!checkNFCSupport() && (
              <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-3">
                <p className="text-red-400 text-sm">
                  ⚠️ NFC not supported on this device/browser. Use Chrome on Android or Safari on iOS.
                </p>
              </div>
            )}
          </div>

          {/* NFC Mode Selector */}
          <div className="space-y-3 mb-6">
            <label className="block text-sm font-medium text-gray-300">NFC Operation</label>
            <div className="grid grid-cols-3 gap-2 max-w-md">
              {[
                { mode: 'enroll', label: 'Enroll', icon: Nfc, color: 'from-blue-500 to-cyan-400' },
                { mode: 'read', label: 'Read', icon: Wifi, color: 'from-green-500 to-emerald-400' },
                { mode: 'clear', label: 'Clear', icon: Trash2, color: 'from-red-500 to-pink-400' }
              ].map(({ mode, label, icon: Icon, color }) => (
                <button
                  key={mode}
                  onClick={() => setNfcMode(mode as any)}
                  className={`p-3 rounded-lg border-2 transition-all duration-200 flex flex-col items-center space-y-1 ${
                    nfcMode === mode
                      ? `border-accent bg-gradient-to-br ${color.replace('from-', 'from-').replace('to-', 'to-')}/20`
                      : 'border-gray-600 bg-black/20 hover:border-gray-500'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${nfcMode === mode ? 'text-accent' : 'text-gray-400'}`} />
                  <span className={`text-xs font-medium ${nfcMode === mode ? 'text-accent' : 'text-gray-400'}`}>
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => handleNFCOperation(nfcMode)}
            disabled={isUpdating || isNFCOperating || !checkNFCSupport()}
            className="bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 disabled:from-gray-600 disabled:to-gray-700 text-white disabled:text-gray-400 font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 flex items-center justify-center space-x-2 max-w-md"
          >
            {isUpdating || isNFCOperating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Nfc className="w-4 h-4" />
                <span>{nfcMode === 'enroll' ? 'Enroll NFC Tag' : nfcMode === 'read' ? 'Read NFC Tag' : 'Clear NFC Tag'}</span>
              </>
            )}
          </button>
          
          {nfcStatus && (
            <div className="mt-4 p-3 rounded-lg bg-blue-900/30 border border-blue-500/30">
              <p className="text-blue-400 text-sm">{nfcStatus}</p>
            </div>
          )}
        </div>

        {/* Status Messages */}
        {uploadStatus && (
          <div className={`fixed bottom-6 right-6 max-w-md p-4 rounded-xl backdrop-blur-lg border shadow-glow-strong z-50 animate-in slide-in-from-bottom-2 ${
            uploadStatus.includes('✅') || uploadStatus.includes('success') ? 'bg-green-900/80 border-green-500/50 text-green-300' :
            uploadStatus.includes('❌') || uploadStatus.includes('failed') || uploadStatus.includes('Error') ? 'bg-red-900/80 border-red-500/50 text-red-300' :
            'bg-blue-900/80 border-blue-500/50 text-blue-300'
          }`}>
            <div className="flex items-start space-x-3">
              <div className={`w-2 h-2 rounded-full mt-2 ${
                uploadStatus.includes('✅') || uploadStatus.includes('success') ? 'bg-green-400' :
                uploadStatus.includes('❌') || uploadStatus.includes('failed') || uploadStatus.includes('Error') ? 'bg-red-400' :
                'bg-blue-400'
              } animate-pulse`}></div>
              <p className="text-sm font-medium">{uploadStatus}</p>
            </div>
          </div>
        )}

        {/* 2FA Setup Modal */}
        {show2FASetup && twoFASetupData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-gradient-to-br from-black/90 to-gray-900/90 backdrop-blur-lg border border-accent/40 rounded-xl p-8 max-w-md w-full mx-4 shadow-glow-strong">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-green-400">Setup Two-Factor Authentication</h3>
                <button
                  onClick={() => setShow2FASetup(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6">
                <div className="text-center">
                  <p className="text-sm text-gray-300 mb-4">
                    Scan this QR code with your authenticator app, or enter the key manually.
                  </p>
                  
                  {showQRCode ? (
                    <div className="bg-white p-4 rounded-lg inline-block">
                      <img 
                        src={twoFASetupData.qrCodeUrl} 
                        alt="2FA QR Code" 
                        className="w-48 h-48 mx-auto"
                      />
                    </div>
                  ) : (
                    <div className="bg-black/30 border border-gray-600 rounded-lg p-4">
                      <p className="text-xs text-gray-400 mb-2">Manual Entry Key:</p>
                      <p className="text-sm font-mono text-white break-all">
                        {twoFASetupData.manualEntryKey}
                      </p>
                    </div>
                  )}

                  <div className="flex justify-center gap-2 mt-4">
                    <button
                      onClick={() => setShowQRCode(!showQRCode)}
                      className="text-xs text-accent hover:text-accent/80 underline flex items-center space-x-1"
                    >
                      {showQRCode ? <Eye className="w-3 h-3" /> : <QrCode className="w-3 h-3" />}
                      <span>{showQRCode ? 'Show Key' : 'Show QR'}</span>
                    </button>
                    <button
                      onClick={() => navigator.clipboard.writeText(twoFASetupData.manualEntryKey)}
                      className="text-xs text-accent hover:text-accent/80 underline flex items-center space-x-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy Key</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Enter verification code from your app:
                  </label>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="w-full p-3 bg-black/30 border border-green-400/30 hover:border-green-400/50 focus:border-green-400 rounded-xl text-white text-center text-lg font-mono tracking-widest placeholder-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-400/20"
                    maxLength={6}
                    autoComplete="off"
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => setShow2FASetup(false)}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleVerify2FA}
                    disabled={is2FALoading || verificationCode.length !== 6}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-400 hover:from-green-600 hover:to-emerald-500 disabled:from-gray-600 disabled:to-gray-700 text-white disabled:text-gray-400 font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    {is2FALoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <span>Enable 2FA</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Disable 2FA Modal */}
        {showDisable2FA && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-gradient-to-br from-black/90 to-gray-900/90 backdrop-blur-lg border border-red-500/40 rounded-xl p-8 max-w-md w-full mx-4 shadow-glow-strong">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-red-400">Disable Two-Factor Authentication</h3>
                <button
                  onClick={() => setShowDisable2FA(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6">
                <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-4">
                  <p className="text-red-400 text-sm">
                    ⚠️ Warning: Disabling 2FA will make your account less secure. Enter your current 2FA code to confirm.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Enter current 2FA code:
                  </label>
                  <input
                    type="text"
                    value={disable2FACode}
                    onChange={(e) => setDisable2FACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="w-full p-3 bg-black/30 border border-red-400/30 hover:border-red-400/50 focus:border-red-400 rounded-xl text-white text-center text-lg font-mono tracking-widest placeholder-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-400/20"
                    maxLength={6}
                    autoComplete="off"
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowDisable2FA(false)}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDisable2FA}
                    disabled={is2FALoading || disable2FACode.length !== 6}
                    className="flex-1 bg-gradient-to-r from-red-500 to-pink-400 hover:from-red-600 hover:to-pink-500 disabled:from-gray-600 disabled:to-gray-700 text-white disabled:text-gray-400 font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    {is2FALoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Disabling...</span>
                      </>
                    ) : (
                      <span>Disable 2FA</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Backup Codes Modal */}
        {showBackupCodes && backupCodes && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-gradient-to-br from-black/90 to-gray-900/90 backdrop-blur-lg border border-accent/40 rounded-xl p-8 max-w-md w-full mx-4 shadow-glow-strong">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-blue-400">2FA Backup Codes</h3>
                <button
                  onClick={() => setShowBackupCodes(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6">
                <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4">
                  <p className="text-blue-400 text-sm">
                    💡 Save these backup codes in a safe place. Each code can only be used once if you lose access to your authenticator.
                  </p>
                </div>

                <div className="bg-black/30 border border-gray-600 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-2">
                    {backupCodes.map((code, index) => (
                      <div key={index} className="font-mono text-sm text-center py-2 px-3 bg-gray-800 rounded border border-gray-700">
                        {code}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => navigator.clipboard.writeText(backupCodes.join('\n'))}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <Copy className="w-4 h-4" />
                    <span>Copy</span>
                  </button>
                  <button
                    onClick={downloadBackupCodes}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
