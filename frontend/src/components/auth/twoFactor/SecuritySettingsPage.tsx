import React from 'react';
import { Shield } from 'lucide-react';
import { TwoFactorSettings } from './TwoFactorSettings';
import { useAuth } from '../../../context/AuthContext';

export const SecuritySettingsPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 20px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 }}>
        <div style={{ width: 44, height: 44, background: 'var(--brand)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Shield size={22} color="white" />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text-1)', fontFamily: 'var(--font-display)' }}>Security Settings</h1>
          <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-3)' }}>Manage your account security and authentication</p>
        </div>
      </div>

      {/* Account Info */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Account</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 16 }}>
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: 14 }}>{user?.name}</div>
            <div style={{ color: 'var(--text-3)', fontSize: 13 }}>{user?.email}</div>
          </div>
          <div style={{ marginLeft: 'auto', padding: '4px 10px', background: 'var(--surface-2)', borderRadius: 8, fontSize: 12, fontWeight: 600, color: 'var(--text-2)', textTransform: 'capitalize' }}>
            {user?.role}
          </div>
        </div>
      </div>

      {/* 2FA Section */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Two-Factor Authentication</div>
        <TwoFactorSettings />
      </div>
    </div>
  );
};

export default SecuritySettingsPage;
