import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings, Bell, Moon, Sun, Globe, ShieldCheck,
  ChevronRight, Smartphone, Mail, MessageSquare, ToggleLeft, ToggleRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const Toggle: React.FC<{ value: boolean; onChange: (v: boolean) => void }> = ({ value, onChange }) => (
  <button
    onClick={() => onChange(!value)}
    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: value ? 'var(--brand)' : 'var(--text-4)', transition: 'color 0.2s' }}
  >
    {value ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
  </button>
);

interface SettingRowProps {
  icon: React.ReactNode;
  title: string;
  desc?: string;
  right?: React.ReactNode;
  onClick?: () => void;
}

const SettingRow: React.FC<SettingRowProps> = ({ icon, title, desc, right, onClick }) => (
  <button
    onClick={onClick}
    style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', width: '100%', background: 'none', border: 'none', borderBottom: '1px solid var(--border)', cursor: onClick ? 'pointer' : 'default', textAlign: 'left', transition: 'background 0.15s' }}
    onMouseEnter={e => { if (onClick) e.currentTarget.style.background = 'var(--surface-2)'; }}
    onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
  >
    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--brand-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--brand)' }}>
      {icon}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', margin: 0 }}>{title}</p>
      {desc && <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '2px 0 0' }}>{desc}</p>}
    </div>
    <div style={{ flexShrink: 0 }}>
      {right ?? (onClick ? <ChevronRight size={16} color="var(--text-4)" /> : null)}
    </div>
  </button>
);

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <div style={{ padding: '14px 20px 8px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>{title}</p>
  </div>
);

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
    rentReminders: true,
    complaints: true,
    notices: true,
  });

  const [appearance, setAppearance] = useState({ darkMode: false, language: 'English' });

  const [dataSurfing, setDataSurfing] = useState({
    enabled: true,
    analytics: true,
    improvements: false,
  });

  const toggle = (key: keyof typeof notifications) =>
    setNotifications(n => { const v = { ...n, [key]: !n[key] }; toast.success(`${key} notifications ${v[key] ? 'enabled' : 'disabled'}`); return v; });

  const toggleData = (key: keyof typeof dataSurfing) =>
    setDataSurfing(d => { const v = { ...d, [key]: !d[key] }; toast.success(`Data ${key} ${v[key] ? 'enabled' : 'disabled'}`); return v; });

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <div style={{ width: 44, height: 44, background: 'var(--brand)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Settings size={22} color="white" />
        </div>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: 'var(--text-1)', margin: 0 }}>Settings</h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>Manage your preferences and account settings</p>
        </div>
      </div>

      {/* Notifications */}
      <div className="card" style={{ marginBottom: 20, overflow: 'hidden', padding: 0 }}>
        <SectionHeader title="Notifications" />
        <SettingRow icon={<Mail size={16} />} title="Email Notifications" desc="Receive updates via email" right={<Toggle value={notifications.email} onChange={() => toggle('email')} />} />
        <SettingRow icon={<Smartphone size={16} />} title="Push Notifications" desc="Browser push alerts" right={<Toggle value={notifications.push} onChange={() => toggle('push')} />} />
        <SettingRow icon={<MessageSquare size={16} />} title="SMS Notifications" desc="Text message alerts" right={<Toggle value={notifications.sms} onChange={() => toggle('sms')} />} />
        <SettingRow icon={<Bell size={16} />} title="Rent Reminders" desc="Upcoming & overdue rent alerts" right={<Toggle value={notifications.rentReminders} onChange={() => toggle('rentReminders')} />} />
        <SettingRow icon={<Bell size={16} />} title="Complaint Updates" desc="Status changes on your complaints" right={<Toggle value={notifications.complaints} onChange={() => toggle('complaints')} />} />
        <SettingRow icon={<Bell size={16} />} title="Notice Alerts" desc="New notices and announcements" right={<Toggle value={notifications.notices} onChange={() => toggle('notices')} />} />
      </div>

      {/* Appearance */}
      <div className="card" style={{ marginBottom: 20, overflow: 'hidden', padding: 0 }}>
        <SectionHeader title="Appearance" />
        <SettingRow
          icon={appearance.darkMode ? <Moon size={16} /> : <Sun size={16} />}
          title="Dark Mode"
          desc="Switch between light and dark theme"
          right={<Toggle value={appearance.darkMode} onChange={v => { setAppearance(a => ({ ...a, darkMode: v })); toast('Dark mode coming soon!', { icon: '🌙' }); }} />}
        />
        <SettingRow icon={<Globe size={16} />} title="Language" desc={appearance.language} onClick={() => toast('Language selection coming soon', { icon: '🌐' })} />
      </div>

      {/* Data & Surfing */}
      <div className="card" style={{ marginBottom: 20, overflow: 'hidden', padding: 0 }}>
        <SectionHeader title="Data & Surfing" />
        <SettingRow
          icon={<Globe size={16} />}
          title="Data Surfing"
          desc="Allow the app to fetch live property data and market rates"
          right={<Toggle value={dataSurfing.enabled} onChange={() => toggleData('enabled')} />}
        />
        <SettingRow
          icon={<Globe size={16} />}
          title="Usage Analytics"
          desc="Help improve the app by sharing anonymized usage data"
          right={<Toggle value={dataSurfing.analytics} onChange={() => toggleData('analytics')} />}
        />
        <SettingRow
          icon={<Globe size={16} />}
          title="Product Improvements"
          desc="Participate in beta features and feedback programs"
          right={<Toggle value={dataSurfing.improvements} onChange={() => toggleData('improvements')} />}
        />
      </div>

      {/* Security */}
      <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
        <SectionHeader title="Security" />
        <SettingRow icon={<ShieldCheck size={16} />} title="Security & Two-Factor Auth" desc="Manage 2FA and login security" onClick={() => navigate('/settings/security')} />
      </div>
    </div>
  );
};

export default SettingsPage;
