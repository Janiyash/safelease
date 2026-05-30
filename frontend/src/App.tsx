import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute, FullPageLoader } from './components/shared';
import Navbar from './components/Navbar/Navbar';
import { LoginPage, SignupPage, ForgotPasswordPage } from './components/auth/AuthPages';
import TenantDashboard from './components/dashboard/TenantDashboard';
import OwnerDashboard from './components/dashboard/OwnerDashboard';
import AdminDashboard from './components/dashboard/AdminDashboard';
import ComplaintsPage from './components/complaints/ComplaintsPage';
import PropertiesPage from './components/properties/PropertiesPage';
import NoticesPage from './components/notices/NoticesPage';
import UsersPage from './components/admin/UsersPage';
import RentPayments from './components/payments/RentPayments';
import DocumentVault from './components/documents/DocumentVault';
import MaintenanceTracker from './components/maintenance/MaintenanceTracker';
import RentCycleMonitor from './components/RentCycleMonitor/RentCycleMonitor';
import SecuritySettingsPage from './components/auth/twoFactor/SecuritySettingsPage';
import ProfilePage from './components/Profile/ProfilePage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 0 },
    mutations: { retry: 0 },
  },
});

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
    <Navbar />
    <div style={{ paddingTop: 'var(--nav-h)' }}>{children}</div>
  </div>
);

const RootRedirect: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) return <FullPageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={`/${user!.role}`} replace />;
};

const PR = (roles: ('tenant' | 'owner' | 'admin')[], element: React.ReactNode) => (
  <ProtectedRoute allowedRoles={roles}>
    <AppLayout>{element}</AppLayout>
  </ProtectedRoute>
);

const AppRoutes: React.FC = () => (
  <Routes>
    {/* ── Public ─────────────────────────────────────────────────── */}
    <Route path="/login"           element={<LoginPage />} />
    <Route path="/signup"          element={<SignupPage />} />
    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
    <Route path="/"                element={<RootRedirect />} />

    {/* ── Security Settings (all roles) ──────────────────────────── */}
    <Route path="/settings/security" element={PR(['tenant', 'owner', 'admin'], <SecuritySettingsPage />)} />
    <Route path="/profile"           element={PR(['tenant', 'owner', 'admin'], <ProfilePage />)} />

    {/* ── Tenant ─────────────────────────────────────────────────── */}
    <Route path="/tenant"             element={PR(['tenant'], <TenantDashboard />)} />
    <Route path="/tenant/property"    element={PR(['tenant'], <PropertiesPage />)} />
    <Route path="/tenant/complaints"  element={PR(['tenant'], <ComplaintsPage />)} />
    <Route path="/tenant/notices"     element={PR(['tenant'], <NoticesPage />)} />
    <Route path="/tenant/payments"    element={PR(['tenant'], <RentPayments />)} />
    <Route path="/tenant/documents"   element={PR(['tenant'], <DocumentVault />)} />
    <Route path="/tenant/maintenance" element={PR(['tenant'], <MaintenanceTracker />)} />

    {/* ── Owner ──────────────────────────────────────────────────── */}
    <Route path="/owner"              element={PR(['owner'], <OwnerDashboard />)} />
    <Route path="/owner/properties"   element={PR(['owner'], <PropertiesPage />)} />
    <Route path="/owner/complaints"   element={PR(['owner'], <ComplaintsPage />)} />
    <Route path="/owner/notices"      element={PR(['owner'], <NoticesPage />)} />
    <Route path="/owner/payments"     element={PR(['owner'], <RentPayments />)} />
    <Route path="/owner/documents"    element={PR(['owner'], <DocumentVault />)} />
    <Route path="/owner/maintenance"  element={PR(['owner'], <MaintenanceTracker />)} />

    {/* ── Admin ──────────────────────────────────────────────────── */}
    <Route path="/admin"                element={PR(['admin'], <AdminDashboard />)} />
    <Route path="/admin/properties"     element={PR(['admin'], <PropertiesPage />)} />
    <Route path="/admin/complaints"     element={PR(['admin'], <ComplaintsPage />)} />
    <Route path="/admin/notices"        element={PR(['admin'], <NoticesPage />)} />
    <Route path="/admin/users"          element={PR(['admin'], <UsersPage />)} />
    <Route path="/admin/analytics"      element={PR(['admin'], <AdminDashboard />)} />
    <Route path="/admin/payments"       element={PR(['admin'], <RentPayments />)} />
    <Route path="/admin/documents"      element={PR(['admin'], <DocumentVault />)} />
    <Route path="/admin/maintenance"    element={PR(['admin'], <MaintenanceTracker />)} />
    <Route path="/admin/rent-monitor"   element={PR(['admin'], <RentCycleMonitor />)} />

    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

const App: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              fontFamily: 'var(--font-body)', fontSize: 14,
              background: 'var(--surface)', color: 'var(--text-1)',
              border: '1px solid var(--border)', borderRadius: '10px',
              boxShadow: 'var(--shadow-lg)', padding: '12px 16px',
            },
            success: { iconTheme: { primary: '#10b981', secondary: 'white' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: 'white' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;