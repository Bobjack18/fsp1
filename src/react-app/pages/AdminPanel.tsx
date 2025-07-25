import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { 
  ArrowLeft, Shield, Users, Clock, Check, X, 
  AlertTriangle, RefreshCw, Bell,
  Calendar, User
} from 'lucide-react';
import Layout from '@/react-app/components/Layout';
import Avatar from '@/react-app/components/Avatar';
import LoadingSpinner from '@/react-app/components/LoadingSpinner';
import { useAuth } from '@/react-app/contexts/AuthContext';
import { useAdminRequests, type AdminRequest } from '@/react-app/hooks/useAdminRequests';
import { useUser } from '@/react-app/hooks/useUser';

export default function AdminPanel() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { user: dbUser } = useUser();
  const { 
    requests, 
    isLoading, 
    error, 
    fetchRequests, 
    approveRequest, 
    denyRequest
  } = useAdminRequests();
  
  const [selectedRequest, setSelectedRequest] = useState<AdminRequest | null>(null);
  const [approveDuration, setApproveDuration] = useState(24);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeAdmins: 0,
    pendingRequests: 0,
    recentActivity: 0
  });

  useEffect(() => {
    if (!user?.isAdmin && !(dbUser as any)?.is_temporary_admin) {
      navigate('/');
      return;
    }
    
    fetchRequests();
    fetchStats();
  }, [user, dbUser]);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    }
  };

  const handleApprove = async (requestId: number) => {
    setIsProcessing(true);
    const success = await approveRequest(requestId, approveDuration);
    if (success) {
      setSelectedRequest(null);
      fetchStats();
    }
    setIsProcessing(false);
  };

  const handleDeny = async (requestId: number) => {
    if (!confirm('Are you sure you want to deny this request?')) return;
    
    setIsProcessing(true);
    const success = await denyRequest(requestId);
    if (success) {
      setSelectedRequest(null);
    }
    setIsProcessing(false);
  };

  

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-400 bg-yellow-400/20 border-yellow-400/30';
      case 'approved': return 'text-green-400 bg-green-400/20 border-green-400/30';
      case 'denied': return 'text-red-400 bg-red-400/20 border-red-400/30';
      default: return 'text-gray-400 bg-gray-400/20 border-gray-400/30';
    }
  };

  const getPriorityColor = (permissions: string) => {
    if (permissions.includes('temporary_admin')) return 'text-red-400';
    if (permissions.includes('user_management')) return 'text-orange-400';
    return 'text-blue-400';
  };

  if (!user?.isAdmin && !(dbUser as any)?.is_temporary_admin) {
    return null;
  }

  return (
    <Layout showBackgroundEffects={false}>
      <div className="container max-w-7xl mx-auto mt-8 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center space-x-2 text-accent hover:text-accent/80 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Home</span>
          </button>
          <div className="text-center">
            <h2 className="text-3xl font-bold text-accent holographic-text">Admin Panel</h2>
            <p className="text-sm text-gray-400 mt-1">Manage permissions and monitor activity</p>
          </div>
          <button
            onClick={fetchRequests}
            disabled={isLoading}
            className="flex items-center space-x-2 bg-accent/20 hover:bg-accent/30 border border-accent/40 text-accent font-medium py-2 px-4 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-black/30 to-black/20 backdrop-blur-lg border border-blue-500/40 rounded-xl p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{stats.totalUsers}</div>
                <div className="text-sm text-gray-400">Total Users</div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-black/30 to-black/20 backdrop-blur-lg border border-green-500/40 rounded-xl p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{stats.activeAdmins}</div>
                <div className="text-sm text-gray-400">Active Admins</div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-black/30 to-black/20 backdrop-blur-lg border border-yellow-500/40 rounded-xl p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{stats.pendingRequests}</div>
                <div className="text-sm text-gray-400">Pending Requests</div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-black/30 to-black/20 backdrop-blur-lg border border-purple-500/40 rounded-xl p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Bell className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{stats.recentActivity}</div>
                <div className="text-sm text-gray-400">Recent Activity</div>
              </div>
            </div>
          </div>
        </div>

        {/* Permission Requests */}
        <div className="bg-gradient-to-br from-black/30 to-black/20 backdrop-blur-lg border border-accent/40 rounded-xl p-6 shadow-glow-subtle">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-accent">Permission Requests</h3>
            {error && (
              <div className="text-red-400 text-sm">{error}</div>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">No permission requests found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className={`border rounded-lg p-4 transition-all duration-200 hover:shadow-md ${
                    request.status === 'pending' 
                      ? 'border-yellow-400/40 bg-yellow-400/5' 
                      : request.status === 'approved'
                      ? 'border-green-400/40 bg-green-400/5'
                      : 'border-red-400/40 bg-red-400/5'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <Avatar
                        src={request.user.avatar_url}
                        name={request.user.display_name || request.user.email}
                        size="md"
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-semibold text-white">
                            {request.user.display_name || request.user.email.split('@')[0]}
                          </h4>
                          <span className={`text-xs px-2 py-1 rounded border ${getStatusColor(request.status)}`}>
                            {request.status.toUpperCase()}
                          </span>
                          <span className={`text-xs font-medium ${getPriorityColor(request.requested_permissions)}`}>
                            {request.requested_permissions.includes('temporary_admin') ? 'HIGH PRIORITY' : 'NORMAL'}
                          </span>
                        </div>
                        
                        <div className="text-sm text-gray-300 mb-2">
                          <span className="font-medium">Email:</span> {request.user.email}
                        </div>
                        
                        <div className="text-sm text-gray-300 mb-2">
                          <span className="font-medium">Requested:</span> {request.requested_permissions}
                        </div>
                        
                        <div className="text-sm text-gray-300 mb-3">
                          <span className="font-medium">Reason:</span> {request.reason}
                        </div>
                        
                        <div className="flex items-center space-x-4 text-xs text-gray-400">
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>Requested: {new Date(request.created_at).toLocaleDateString()}</span>
                          </div>
                          {request.approved_at && (
                            <div className="flex items-center space-x-1">
                              <User className="w-3 h-3" />
                              <span>By: {request.approver?.display_name || request.approver?.email}</span>
                            </div>
                          )}
                          {request.expires_at && (
                            <div className="flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>Expires: {new Date(request.expires_at).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    {request.status === 'pending' && (
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => setSelectedRequest(request)}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                        >
                          <Check className="w-4 h-4" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => handleDeny(request.id)}
                          disabled={isProcessing}
                          className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                        >
                          <X className="w-4 h-4" />
                          <span>Deny</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Approval Modal */}
        {selectedRequest && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-black/90 to-gray-900/90 backdrop-blur-lg border border-green-500/40 rounded-xl p-8 max-w-md w-full shadow-glow-strong">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-green-400">Approve Request</h3>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-4">
                  <p className="text-green-400 text-sm font-medium">Request Details</p>
                  <p className="text-white mt-1">{selectedRequest.user.display_name || selectedRequest.user.email}</p>
                  <p className="text-gray-300 text-sm mt-1">{selectedRequest.requested_permissions}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Grant access for how many hours?
                  </label>
                  <select
                    value={approveDuration}
                    onChange={(e) => setApproveDuration(Number(e.target.value))}
                    className="w-full p-3 bg-black/30 border border-green-400/30 rounded-lg text-white"
                  >
                    <option value={1}>1 hour</option>
                    <option value={4}>4 hours</option>
                    <option value={8}>8 hours</option>
                    <option value={24}>24 hours</option>
                    <option value={72}>3 days</option>
                    <option value={168}>1 week</option>
                  </select>
                </div>

                <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-lg p-3">
                  <p className="text-yellow-400 text-sm">
                    <AlertTriangle className="w-4 h-4 inline mr-1" />
                    Access will automatically expire after the selected duration.
                  </p>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleApprove(selectedRequest.id)}
                  disabled={isProcessing}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-400 hover:from-green-600 hover:to-emerald-500 disabled:from-gray-600 disabled:to-gray-700 text-white disabled:text-gray-400 font-semibold py-3 px-6 rounded-xl transition-colors flex items-center justify-center space-x-2"
                >
                  {isProcessing ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Approve</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
