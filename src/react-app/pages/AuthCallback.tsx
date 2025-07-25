import { useEffect } from 'react';
import { useAuth } from '@getmocha/users-service/react';
import { useNavigate } from 'react-router';
import Layout from '@/react-app/components/Layout';
import LoadingSpinner from '@/react-app/components/LoadingSpinner';

export default function AuthCallback() {
  const { exchangeCodeForSessionToken, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        await exchangeCodeForSessionToken();
        // Redirect to home page after successful authentication
        navigate('/');
      } catch (error) {
        console.error('Authentication failed:', error);
        // Redirect to home page anyway to show the login screen
        navigate('/');
      }
    };

    handleAuthCallback();
  }, [exchangeCodeForSessionToken, navigate]);

  // If user is already authenticated, redirect to home
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  return (
    <Layout>
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mb-4" />
          <h2 className="text-xl font-semibold text-accent mb-2">
            Completing Authentication...
          </h2>
          <p className="opacity-80">
            Please wait while we log you into SafeWatch Pro
          </p>
        </div>
      </div>
    </Layout>
  );
}
