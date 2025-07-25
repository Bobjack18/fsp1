import { useState, useEffect } from 'react';
import { useAuth } from '@/react-app/contexts/AuthContext';

export interface AdminRequest {
  id: number;
  user_id: number;
  requested_permissions: string;
  reason: string;
  status: 'pending' | 'approved' | 'denied';
  approved_by: number | null;
  approved_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  user: {
    display_name: string | null;
    email: string;
    avatar_url: string | null;
  };
  approver?: {
    display_name: string | null;
    email: string;
  };
}

export function useAdminRequests() {
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchRequests = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/permission-requests');
      if (!response.ok) {
        throw new Error('Failed to fetch admin requests');
      }
      
      const data = await response.json();
      setRequests(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching admin requests:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const createRequest = async (permissions: string, reason: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/permission-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requested_permissions: permissions,
          reason,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create request');
      }
      
      await fetchRequests(); // Refresh the list
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error creating admin request:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const approveRequest = async (requestId: number, duration: number): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/admin/permission-requests/${requestId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          duration_hours: duration,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to approve request');
      }
      
      await fetchRequests(); // Refresh the list
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error approving admin request:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const denyRequest = async (requestId: number): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/admin/permission-requests/${requestId}/deny`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to deny request');
      }
      
      await fetchRequests(); // Refresh the list
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error denying admin request:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const revokeAdminAccess = async (userId: number): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/admin/revoke-access/${userId}`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to revoke access');
      }
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error revoking admin access:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [user]);

  return {
    requests,
    isLoading,
    error,
    fetchRequests,
    createRequest,
    approveRequest,
    denyRequest,
    revokeAdminAccess,
  };
}
