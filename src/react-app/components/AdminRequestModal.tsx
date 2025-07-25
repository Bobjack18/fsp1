import { useState } from 'react';
import { X, Shield, Clock, AlertTriangle } from 'lucide-react';
import LoadingSpinner from '@/react-app/components/LoadingSpinner';

interface AdminRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (permissions: string, reason: string) => Promise<boolean>;
}

const PERMISSION_OPTIONS = [
  { value: 'temporary_admin', label: 'Temporary Admin Access', description: 'Full administrative privileges for a limited time' },
  { value: 'message_moderation', label: 'Message Moderation', description: 'Ability to delete and edit messages' },
  { value: 'user_management', label: 'User Management', description: 'Manage user accounts and permissions' },
  { value: 'incident_management', label: 'Incident Management', description: 'Manage and respond to incident reports' },
  { value: 'system_settings', label: 'System Settings', description: 'Access to system configuration' },
];

export default function AdminRequestModal({ isOpen, onClose, onSubmit }: AdminRequestModalProps) {
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (selectedPermissions.length === 0 || !reason.trim()) {
      alert('Please select permissions and provide a reason for your request.');
      return;
    }

    setIsSubmitting(true);
    const success = await onSubmit(selectedPermissions.join(','), reason.trim());
    
    if (success) {
      setSelectedPermissions([]);
      setReason('');
      onClose();
    }
    
    setIsSubmitting(false);
  };

  const handleClose = () => {
    setSelectedPermissions([]);
    setReason('');
    onClose();
  };

  const togglePermission = (permission: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permission) 
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-black/90 to-gray-900/90 backdrop-blur-lg border border-accent/40 rounded-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-glow-strong">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-yellow-500/30 to-orange-400/30 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-yellow-400">Request Admin Permissions</h3>
              <p className="text-sm text-gray-400">Request temporary administrative access</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors p-2"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Warning */}
          <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
              <div>
                <p className="text-yellow-400 text-sm font-medium">Important Notice</p>
                <p className="text-yellow-300 text-sm mt-1">
                  Admin permissions are granted on a temporary basis and require approval from a current administrator. 
                  Misuse of administrative privileges may result in account suspension.
                </p>
              </div>
            </div>
          </div>

          {/* Permission Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Select Permissions <span className="text-red-400">*</span>
            </label>
            <div className="space-y-3">
              {PERMISSION_OPTIONS.map((option) => (
                <div key={option.value} className="relative">
                  <label className={`flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                    selectedPermissions.includes(option.value)
                      ? 'border-yellow-400 bg-yellow-400/10'
                      : 'border-gray-600 bg-black/20 hover:border-gray-500'
                  }`}>
                    <input
                      type="checkbox"
                      checked={selectedPermissions.includes(option.value)}
                      onChange={() => togglePermission(option.value)}
                      className="mt-1 w-4 h-4 text-yellow-400 bg-transparent border-gray-400 rounded focus:ring-yellow-400 focus:ring-2"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-white">{option.label}</div>
                      <div className="text-sm text-gray-400 mt-1">{option.description}</div>
                    </div>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Reason for Request <span className="text-red-400">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please explain why you need these permissions and how long you expect to need them..."
              className="w-full p-4 bg-black/30 border border-gray-600 hover:border-gray-500 focus:border-yellow-400 rounded-lg text-white placeholder-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-400/20 resize-none"
              rows={4}
              maxLength={500}
            />
            <div className="text-xs text-gray-400 mt-1">
              {reason.length}/500 characters
            </div>
          </div>

          {/* Duration Info */}
          <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Clock className="w-5 h-5 text-blue-400 mt-0.5" />
              <div>
                <p className="text-blue-400 text-sm font-medium">Duration Policy</p>
                <p className="text-blue-300 text-sm mt-1">
                  Admin permissions are typically granted for 1-24 hours depending on the request. 
                  You will be notified when your permissions are approved and when they expire.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-3 mt-8">
          <button
            onClick={handleClose}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || selectedPermissions.length === 0 || !reason.trim()}
            className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-400 hover:from-yellow-600 hover:to-orange-500 disabled:from-gray-600 disabled:to-gray-700 text-black disabled:text-gray-400 font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 flex items-center justify-center space-x-2"
          >
            {isSubmitting ? (
              <>
                <LoadingSpinner size="sm" />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <Shield className="w-4 h-4" />
                <span>Submit Request</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
