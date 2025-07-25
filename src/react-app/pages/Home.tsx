import { useAuth } from '@/react-app/contexts/AuthContext';
import { useNavigate } from 'react-router';
import { 
  MessageCircle, 
  MessageSquare, 
  Users, 
  Shield, 
  Hash, 
  LogOut,
  History,
  Bell,
  UserPlus
} from 'lucide-react';
import Layout from '@/react-app/components/Layout';
import Avatar from '@/react-app/components/Avatar';
import LoadingSpinner from '@/react-app/components/LoadingSpinner';
import { useChatPassword } from '@/react-app/hooks/useChatPassword';
import { useNotifications } from '@/react-app/hooks/useNotifications';
import { useAdminRequests } from '@/react-app/hooks/useAdminRequests';
import { useUser } from '@/react-app/hooks/useUser';
import NotificationCenter from '@/react-app/components/NotificationCenter';
import AdminRequestModal from '@/react-app/components/AdminRequestModal';
import { useState } from 'react';

export default function Home() {
  const { user, isLoading, logout } = useAuth();
  const { checkChatPassword, isChecking } = useChatPassword();
  const { unreadCount } = useNotifications();
  const { createRequest } = useAdminRequests();
  const { user: dbUser } = useUser();
  const navigate = useNavigate();
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAdminRequest, setShowAdminRequest] = useState(false);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  if (!user) {
    return null; // Navigation handled by ProtectedRoute
  }

  const handleChatAccess = async (chatType: 'chat' | 'chat2') => {
    const dbChatType = chatType === 'chat' ? 'messages' : 'messages_v2';
    const hasAccess = await checkChatPassword(dbChatType);
    
    if (hasAccess) {
      navigate(`/${chatType}`);
    }
  };

  return (
    <Layout>
      <div className="container max-w-4xl mx-auto mt-20 px-4">
        {/* Welcome Area */}
        <div className="text-center mb-8">
          <div className="relative inline-block">
            <Avatar 
              src={user.photoURL} 
              name={user.displayName || user.email || 'User'}
              size="xl"
              className="mx-auto mb-4 shadow-glow hover:shadow-glow-strong transition-all duration-300"
            />
            {/* Notification Bell */}
            <button
              onClick={() => setShowNotifications(true)}
              className="absolute -top-2 -right-2 bg-accent hover:bg-accent/80 text-black p-2 rounded-full shadow-lg transition-all duration-300 transform hover:scale-110"
            >
              <div className="relative">
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-xs text-white font-bold">{unreadCount}</span>
                  </div>
                )}
              </div>
            </button>
          </div>
          <h2 className="text-2xl font-bold text-accent mb-2">
            Welcome, {user.displayName || user.email?.split('@')[0]}!
          </h2>
          <p className="opacity-80">FlatbushSafetyPatrol1 Communication Hub</p>
        </div>

        {/* Main Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <button
            onClick={() => handleChatAccess('chat')}
            disabled={isChecking}
            className="flex items-center justify-center space-x-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-6 px-8 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            {isChecking ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                <MessageCircle className="w-6 h-6" />
                <span>Open Calls</span>
              </>
            )}
          </button>

          <button
            onClick={() => handleChatAccess('chat2')}
            disabled={isChecking}
            className="flex items-center justify-center space-x-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-6 px-8 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            {isChecking ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                <MessageSquare className="w-6 h-6" />
                <span>Chat 2.0</span>
              </>
            )}
          </button>

          <button
            onClick={() => navigate('/direct-messages')}
            className="flex items-center justify-center space-x-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-6 px-8 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            <Users className="w-6 h-6" />
            <span>Direct Messages</span>
          </button>

          <button
            onClick={() => navigate('/settings')}
            className="flex items-center justify-center space-x-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-6 px-8 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            <Shield className="w-6 h-6" />
            <span>Settings</span>
          </button>
        </div>

        {/* Secondary Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <button
            onClick={() => navigate('/units')}
            className="flex items-center justify-center space-x-2 bg-accent/20 hover:bg-accent/30 border border-accent/40 text-accent font-medium py-3 px-4 rounded-lg transition-all duration-300"
          >
            <Shield className="w-5 h-5" />
            <span>Our Units</span>
          </button>

          <button
            onClick={() => navigate('/codes')}
            className="flex items-center justify-center space-x-2 bg-accent/20 hover:bg-accent/30 border border-accent/40 text-accent font-medium py-3 px-4 rounded-lg transition-all duration-300"
          >
            <Hash className="w-5 h-5" />
            <span>Codes</span>
          </button>

          {!user.isAdmin && (
            <button
              onClick={() => setShowAdminRequest(true)}
              className="flex items-center justify-center space-x-2 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-400/40 text-yellow-400 font-medium py-3 px-4 rounded-lg transition-all duration-300"
            >
              <UserPlus className="w-5 h-5" />
              <span>Request Admin</span>
            </button>
          )}

          <button
            onClick={() => {/* TODO: Show login history */}}
            className="flex items-center justify-center space-x-2 bg-accent/20 hover:bg-accent/30 border border-accent/40 text-accent font-medium py-3 px-4 rounded-lg transition-all duration-300"
          >
            <History className="w-5 h-5" />
            <span>Login History</span>
          </button>
        </div>

        {/* Admin Features */}
        {(user.isAdmin || (dbUser as any)?.is_temporary_admin) && (
          <div className="mb-8">
            <div className="bg-accent/10 border border-accent/30 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-accent mb-4">Admin Panel</h3>
              <p className="text-sm opacity-80 mb-4">
                You have administrative privileges for this FlatbushSafetyPatrol1 instance.
              </p>
              <div className="space-y-2 mb-4">
                <div className="text-sm">
                  <span className="font-medium">Email:</span> {user.email}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Admin Status:</span> {user.isAdmin ? 'Permanent Admin' : 'Temporary Admin'}
                </div>
                {(dbUser as any)?.admin_expires_at && (
                  <div className="text-sm">
                    <span className="font-medium">Access Expires:</span> {new Date((dbUser as any).admin_expires_at).toLocaleString()}
                  </div>
                )}
              </div>
              <button
                onClick={() => navigate('/admin')}
                className="bg-accent hover:bg-accent/80 text-black font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Open Admin Panel
              </button>
            </div>
          </div>
        )}

        {/* Logout Button */}
        <div className="text-center">
          <button
            onClick={logout}
            className="flex items-center justify-center space-x-2 mx-auto bg-red-600/80 hover:bg-red-600 text-white font-medium py-3 px-6 rounded-lg transition-all duration-300"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>

        {/* Notification Center Modal */}
        <NotificationCenter
          isOpen={showNotifications}
          onClose={() => setShowNotifications(false)}
        />

        {/* Admin Request Modal */}
        <AdminRequestModal
          isOpen={showAdminRequest}
          onClose={() => setShowAdminRequest(false)}
          onSubmit={createRequest}
        />
      </div>
    </Layout>
  );
}
