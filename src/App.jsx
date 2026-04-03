import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import OverviewPage from './pages/OverviewPage';
import EngagementPage from './pages/EngagementPage';
import RetentionPage from './pages/RetentionPage';
import SessionsPage from './pages/SessionsPage';
import DropOffsPage from './pages/DropOffsPage';
import UsersPage from './pages/UsersPage';
import UserDetailPage from './pages/UserDetailPage';
import TherapistVerificationPage from './pages/TherapistVerificationPage';
import { TherapistPortalPage, ClientDetailPage } from './pages/TherapistPortalPage';
import SignupsPage from './pages/SignupsPage';
import AIAnalyticsPage from './pages/AIAnalyticsPage';
import BroadcastPage from './pages/BroadcastPage';
import NarrativeReportsPage from './pages/NarrativeReportsPage';
import TestingPage from './pages/TestingPage';
import ProductsPage from './pages/ProductsPage';
import DnaUploadsPage from './pages/DnaUploadsPage';

function ProtectedRoute({ children }) {
  const { token, loading } = useAuth();
  if (loading) return null;
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function DefaultRedirect() {
  const { role, portalMode } = useAuth();
  if (portalMode === 'admin' && role.isAdmin) return <Navigate to="/" replace />;
  return <Navigate to="/portal" replace />;
}

function AppRoutes() {
  const { portalMode } = useAuth();

  if (portalMode === 'therapist') {
    return (
      <Routes>
        <Route path="/portal" element={<TherapistPortalPage />} />
        <Route path="/portal/client/:id" element={<ClientDetailPage />} />
        <Route path="*" element={<Navigate to="/portal" replace />} />
      </Routes>
    );
  }

  // Admin mode — full routes
  return (
    <Routes>
      <Route path="/" element={<OverviewPage />} />
      <Route path="/engagement" element={<EngagementPage />} />
      <Route path="/retention" element={<RetentionPage />} />
      <Route path="/sessions" element={<SessionsPage />} />
      <Route path="/drop-offs" element={<DropOffsPage />} />
      <Route path="/signups" element={<SignupsPage />} />
      <Route path="/ai" element={<AIAnalyticsPage />} />
      <Route path="/users" element={<UsersPage />} />
      <Route path="/users/:id" element={<UserDetailPage />} />
      <Route path="/therapists" element={<TherapistVerificationPage />} />
      <Route path="/narrative-reports" element={<NarrativeReportsPage />} />
      <Route path="/broadcast" element={<BroadcastPage />} />
      <Route path="/testing" element={<TestingPage />} />
      <Route path="/products" element={<ProductsPage />} />
      <Route path="/dna" element={<DnaUploadsPage />} />
      <Route path="/portal" element={<TherapistPortalPage />} />
      <Route path="/portal/client/:id" element={<ClientDetailPage />} />
      <Route path="*" element={<DefaultRedirect />} />
    </Routes>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <AppRoutes />
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
