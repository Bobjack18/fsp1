import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router";
import { AuthProvider } from "@/react-app/contexts/AuthContext";
import HomePage from "@/react-app/pages/Home";
import WelcomePage from "@/react-app/pages/Welcome";
import ChatPage from "@/react-app/pages/Chat";
import Chat2Page from "@/react-app/pages/Chat2";
import DirectMessagesPage from "@/react-app/pages/DirectMessages";
import SettingsPage from "@/react-app/pages/Settings";
import CodesPage from "@/react-app/pages/Codes";
import UnitsPage from "@/react-app/pages/Units";
import AdminPanelPage from "@/react-app/pages/AdminPanel";
import { ThemeProvider } from "@/react-app/components/ThemeProvider";
import { useAuth } from "@/react-app/contexts/AuthContext";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/welcome" replace />;
  }
  
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  if (user) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Router>
          <Routes>
            <Route path="/welcome" element={
              <PublicRoute>
                <WelcomePage />
              </PublicRoute>
            } />
            <Route path="/" element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            } />
            <Route path="/chat" element={
              <ProtectedRoute>
                <ChatPage />
              </ProtectedRoute>
            } />
            <Route path="/chat2" element={
              <ProtectedRoute>
                <Chat2Page />
              </ProtectedRoute>
            } />
            <Route path="/direct-messages" element={
              <ProtectedRoute>
                <DirectMessagesPage />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            } />
            <Route path="/codes" element={
              <ProtectedRoute>
                <CodesPage />
              </ProtectedRoute>
            } />
            <Route path="/units" element={
              <ProtectedRoute>
                <UnitsPage />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute>
                <AdminPanelPage />
              </ProtectedRoute>
            } />
          </Routes>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}
