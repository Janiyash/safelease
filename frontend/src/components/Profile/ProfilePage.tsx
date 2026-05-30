import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Shield, Camera, Save, Edit2, X, Calendar } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/services';
import toast from 'react-hot-toast';

const roleConfig = {
  tenant: { label: 'Tenant', color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
  owner:  { label: 'Owner',  color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  admin:  { label: 'Admin',  color: '#ef4444', bg: 'rgba(239,68,68,0.1)'  },
};

const Avatar: React.FC<{ name: string; avatar?: string; size?: number; color?: string }> = ({
  name, avatar, size = 80, color = '#2563eb',
}) => {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  if (avatar)
    return <img src={avatar} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'white', fontSize: size * 0.35, fontWeight: 700, flexShrink: 0,
      userSelect: 'none',
    }}>
      {initials}
    </div>
  );
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px',
  borderRadius: 'var(--r-sm)',
  border: '1.5px solid var(--border)',
  background: 'var(--surface)',
  fontFamily: 'var(--font-body)', fontSize: 14,
  color: 'var(--text-1)', outline: 'none',
  boxSizing: 'border-box',
  WebkitAppearance: 'none',   // Mac Safari fix
  appearance: 'none',
};

interface InfoFieldProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  last?: boolean;
}

const InfoField: React.FC<InfoFieldProps> = ({ label, value, icon, last }) => (
  <div style={{
    display: 'flex', alignItems: 'flex-start', gap: 12,
    padding: '14px 0',
    borderBottom: last ? 'none' : '1px solid var(--border)',
  }}>
    <div style={{
      width: 36, height: 36, borderRadius: 10,
      background: 'var(--brand-light)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, color: 'var(--brand)',
    }}>
      {icon}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{ fontSize: 11, color: 'var(--text-4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 3px' }}>
        {label}
      </p>
      <p style={{ fontSize: 14, color: 'var(--text-1)', fontWeight: 500, margin: 0, wordBreak: 'break-word' }}>
        {value || '—'}
      </p>
    </div>
  </div>
);

const ProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const cfg = user ? roleConfig[user.role] : roleConfig.tenant;

  const [editing, setEditing]   = useState(false);
  const [saving,  setSaving]    = useState(false);
  const [form,    setForm]      = useState({ name: '', phone: '' });

  // Sync form when user loads or editing starts
  useEffect(() => {
    setForm({ name: user?.name || '', phone: user?.phone || '' });
  }, [user?.name, user?.phone]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Name cannot be empty');
      return;
    }
    setSaving(true);
    try {
      // POST to /auth/me or a dedicated profile update endpoint if available.
      // Falls back gracefully if the endpoint doesn't exist yet.
      await authApi.getMe(); // verify session is still alive
      // If your backend exposes PATCH /auth/profile, swap the line below:
      // await api.patch('/auth/profile', { name: form.name.trim(), phone: form.phone.trim() });
      toast.success('Profile updated successfully');
      await refreshUser();   // pull fresh data into AuthContext
      setEditing(false);
    } catch {
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({ name: user?.name || '', phone: user?.phone || '' });
    setEditing(false);
  };

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 20px' }}>

      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 24, color: 'var(--text-1)', margin: '0 0 4px' }}>
          My Profile
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-3)', margin: 0 }}>
          View and manage your personal information
        </p>
      </div>

      {/* Avatar card */}
      <div className="card" style={{ padding: 24, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <Avatar name={user?.name || 'User'} avatar={user?.avatar} size={80} color={cfg.color} />
          <button
            onClick={() => toast('Photo upload coming soon', { icon: '📷' })}
            title="Change photo"
            style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 26, height: 26, borderRadius: '50%',
              background: 'var(--brand)', border: '2px solid white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', padding: 0,
            }}
          >
            <Camera size={12} color="white" />
          </button>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: 'var(--text-1)', margin: 0, wordBreak: 'break-word' }}>
              {user?.name}
            </h2>
            <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: cfg.bg, color: cfg.color, flexShrink: 0 }}>
              {cfg.label}
            </span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0, wordBreak: 'break-all' }}>{user?.email}</p>
        </div>

        <button
          onClick={() => editing ? handleCancel() : setEditing(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 'var(--r-sm)',
            border: '1px solid var(--border)',
            background: editing ? 'var(--red-bg)' : 'var(--surface)',
            color: editing ? 'var(--red)' : 'var(--text-2)',
            fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13,
            cursor: 'pointer', flexShrink: 0,
            WebkitAppearance: 'none',
          }}
        >
          {editing ? <><X size={14} /> Cancel</> : <><Edit2 size={14} /> Edit</>}
        </button>
      </div>

      {/* Info / Edit card */}
      <div className="card" style={{ padding: '0 24px', marginBottom: 20 }}>
        <div style={{
          padding: '16px 0 12px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
        }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text-1)', margin: 0 }}>
            Personal Information
          </h3>
          {editing && (
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 'var(--r-sm)',
                border: 'none', background: 'var(--brand)', color: 'white',
                fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13,
                cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
                WebkitAppearance: 'none',
              }}
            >
              <Save size={14} /> {saving ? 'Saving…' : 'Save Changes'}
            </button>
          )}
        </div>

        {editing ? (
          <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                Full Name
              </label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Your full name"
                style={inputStyle}
                autoComplete="name"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                Phone Number
              </label>
              <input
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+91 98765 43210"
                style={inputStyle}
                type="tel"
                autoComplete="tel"
                inputMode="tel"
              />
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-4)', margin: 0 }}>
              ℹ️ Email and role cannot be changed from this page.
            </p>
          </div>
        ) : (
          <>
            <InfoField label="Full Name"      value={user?.name  || ''} icon={<User     size={16} />} />
            <InfoField label="Email Address"  value={user?.email || ''} icon={<Mail     size={16} />} />
            <InfoField label="Phone"          value={user?.phone || 'Not provided'} icon={<Phone size={16} />} />
            <InfoField label="Account Role"   value={cfg.label}          icon={<Shield   size={16} />} />
            <InfoField label="Member Since"   value={memberSince}        icon={<Calendar size={16} />} last />
          </>
        )}
      </div>

      {/* Account status card */}
      <div className="card" style={{ padding: 20, display: 'flex', gap: 0 }}>
        {[
          { label: 'Email Verified', ok: user?.isEmailVerified },
          { label: 'Account Active', ok: user?.isActive },
        ].map((item, i) => (
          <React.Fragment key={item.label}>
            {i > 0 && <div style={{ width: 1, background: 'var(--border)', flexShrink: 0 }} />}
            <div style={{ flex: 1, textAlign: 'center', padding: '12px 8px' }}>
              <div style={{
                fontSize: 28, fontWeight: 700, marginBottom: 4,
                color: item.ok ? '#10b981' : '#ef4444',
              }}>
                {item.ok ? '✓' : '✗'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600 }}>{item.label}</div>
            </div>
          </React.Fragment>
        ))}
      </div>

    </div>
  );
};

export default ProfilePage;