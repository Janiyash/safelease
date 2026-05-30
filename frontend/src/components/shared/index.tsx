import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { AlertCircle, FolderOpen, X, Loader2 } from 'lucide-react';
import { FullPageLoader } from '../skeleton/Skeletons';

export { FullPageLoader };

export const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: UserRole[] }> = ({ children, allowedRoles }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  if (isLoading) return <FullPageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  if (allowedRoles && user && !allowedRoles.includes(user.role)) return <Navigate to={`/${user.role}`} replace />;
  return <>{children}</>;
};

const statusMap: Record<string, string> = {
  pending: 'badge-amber', in_progress: 'badge-brand', resolved: 'badge-green', closed: 'badge-gray',
  available: 'badge-green', rented: 'badge-brand', maintenance: 'badge-amber', pending_approval: 'badge-gray',
  low: 'badge-gray', medium: 'badge-amber', high: 'badge-red', urgent: 'badge-purple',
  general: 'badge-brand', emergency: 'badge-red', event: 'badge-green', billing: 'badge-purple',
  noise: 'badge-amber', security: 'badge-red', cleanliness: 'badge-cyan', other: 'badge-gray',
  tenant: 'badge-cyan', owner: 'badge-purple', admin: 'badge-red',
};

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <span className={`badge ${statusMap[status] || 'badge-gray'}`} style={{ textTransform: 'capitalize' }}>
    {status.replace(/_/g, ' ')}
  </span>
);

// Spinner — was missing, caused import errors in complaints/notices
export const Spinner: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <>
    <Loader2 size={size} style={{ animation: 'spin 0.8s linear infinite', display: 'block' }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </>
);

// Card — was missing, caused import error in ComplaintsPage
export const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; className?: string }> = ({ children, style, className }) => (
  <div className={`card ${className || ''}`} style={{ padding: '20px 22px', ...style }}>
    {children}
  </div>
);

export const EmptyState: React.FC<{ title: string; message: string; icon?: React.ReactNode; action?: React.ReactNode }> = ({ title, message, icon, action }) => (
  <div className="empty-state">
    <div style={{ width: 64, height: 64, borderRadius: 18, background: 'var(--brand-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {icon || <FolderOpen size={28} color="var(--brand)" />}
    </div>
    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17, color: 'var(--text-1)', margin: 0 }}>{title}</h3>
    <p style={{ fontSize: 14, color: 'var(--text-3)', maxWidth: 320, margin: 0, lineHeight: 1.6 }}>{message}</p>
    {action}
  </div>
);

export const ErrorMessage: React.FC<{ message: string }> = ({ message }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--red-bg)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--r-sm)', color: 'var(--red)', fontSize: 13 }}>
    <AlertCircle size={15} style={{ flexShrink: 0 }} /> {message}
  </div>
);

export const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; maxWidth?: number }> = ({ isOpen, onClose, title, children, maxWidth = 520 }) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ width: '100%', maxWidth }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, color: 'var(--text-1)', margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', padding: 4, borderRadius: 8 }}><X size={18} /></button>
        </div>
        <div style={{ padding: 22 }}>{children}</div>
      </div>
    </div>
  );
};

export const StatCard: React.FC<{ label: string; value: string | number; icon: React.ReactNode; color: string; bg: string; sub?: string }> = ({ label, value, icon, color, bg, sub }) => (
  <div className="card fade-up" style={{ padding: '20px 22px' }}>
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.02em' }}>{label}</span>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>{icon}</div>
    </div>
    <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, color: 'var(--text-1)', letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 6 }}>{value}</div>
    {sub && <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: 0 }}>{sub}</p>}
  </div>
);

export const Field: React.FC<{ label: string; error?: string; children: React.ReactNode }> = ({ label, error, children }) => (
  <div className="field">
    <label className="label">{label}</label>
    {children}
    {error && <span className="field-error">{error}</span>}
  </div>
);

// inputStyle — was missing export, caused errors in all pages that imported it
export const inputStyle: React.CSSProperties = {
  padding: '10px 14px',
  background: 'var(--surface)',
  border: '1px solid var(--border-strong)',
  borderRadius: 'var(--r-sm)',
  fontSize: 14,
  color: 'var(--text-1)',
  outline: 'none',
  fontFamily: 'var(--font-body)',
  width: '100%',
  boxSizing: 'border-box' as const,
};
