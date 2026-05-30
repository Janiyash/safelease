import React, { useState, useEffect } from 'react';
import { Shield, ShieldCheck, ShieldOff, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { twoFactorApi } from '../../../api/services';
import { Spinner } from '../../skeleton/Skeletons';

export const TwoFactorSettings: React.FC = () => {
  const [enabled,        setEnabled]        = useState<boolean | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [actionLoading,  setActionLoading]  = useState(false);
  const [password,       setPassword]       = useState('');
  const [showPw,         setShowPw]         = useState(false);
  const [showDisableForm,setShowDisableForm] = useState(false);
  const [error,          setError]          = useState('');

  useEffect(() => { fetchStatus(); }, []);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const { data } = await twoFactorApi.getStatus();
      setEnabled(data.data.twoFactorEnabled);
    } catch {
      toast.error('Failed to load 2FA status.');
    } finally { setLoading(false); }
  };

  const handleEnable = async () => {
    setActionLoading(true); setError('');
    try {
      await twoFactorApi.enable();
      setEnabled(true);
      toast.success('Email 2FA enabled! You will receive a code by email at each login.');
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to enable 2FA.');
    } finally { setActionLoading(false); }
  };

  const handleDisable = async () => {
    if (!password.trim()) { setError('Password is required.'); return; }
    setActionLoading(true); setError('');
    try {
      await twoFactorApi.disable(password);
      setEnabled(false);
      setPassword(''); setShowDisableForm(false);
      toast.success('2FA has been disabled.');
    } catch (e: any) {
      setError(e.response?.data?.message || 'Incorrect password.');
    } finally { setActionLoading(false); }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
      <Spinner size={28} />
    </div>
  );

  const box: React.CSSProperties = {
    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 24px',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Status card */}
      <div style={{ ...box, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: enabled ? '#d1fae5' : '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {enabled ? <ShieldCheck size={22} color="#059669" /> : <ShieldOff size={22} color="#d97706" />}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-1)' }}>Two-Factor Authentication</div>
            <div style={{ fontSize: 13, color: enabled ? '#059669' : '#d97706', fontWeight: 600 }}>
              {enabled ? '✓ Enabled — email OTP' : '✗ Disabled'}
            </div>
          </div>
        </div>
        {!enabled ? (
          <button onClick={handleEnable} disabled={actionLoading} className="btn btn-primary" style={{ gap: 8, padding: '10px 18px' }}>
            {actionLoading ? <Spinner size={14} /> : <ShieldCheck size={15} />}
            {actionLoading ? 'Enabling…' : 'Enable 2FA'}
          </button>
        ) : (
          <button onClick={() => { setShowDisableForm(v => !v); setError(''); }} style={{ gap: 8, padding: '10px 18px', background: 'transparent', border: '1px solid #fecaca', borderRadius: 10, cursor: 'pointer', color: '#dc2626', fontSize: 13.5, fontWeight: 600, fontFamily: 'var(--font-body)', display: 'inline-flex', alignItems: 'center' }}>
            <ShieldOff size={15} /> Disable 2FA
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, color: '#dc2626', fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Disable form */}
      {showDisableForm && enabled && (
        <div style={{ ...box, background: '#fff5f5', border: '1px solid #fecaca' }}>
          <p style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: '#dc2626' }}>Confirm to disable 2FA</p>
          <p style={{ margin: '0 0 14px', fontSize: 13, color: '#7f1d1d', lineHeight: 1.5 }}>
            Enter your current password. Once disabled, logins will only require your password.
          </p>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <Lock size={14} color="#9ca3af" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              type={showPw ? 'text' : 'password'}
              placeholder="Current password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              onKeyDown={e => { if (e.key === 'Enter') handleDisable(); }}
              style={{ width: '100%', padding: '10px 40px 10px 36px', background: 'white', border: '1px solid #fecaca', borderRadius: 10, fontSize: 14, color: '#1e2140', outline: 'none', fontFamily: 'var(--font-body)', boxSizing: 'border-box' }}
            />
            <button type="button" onClick={() => setShowPw(v => !v)} style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex' }}>
              {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleDisable} disabled={actionLoading} style={{ padding: '10px 18px', background: '#dc2626', border: 'none', borderRadius: 10, cursor: actionLoading ? 'not-allowed' : 'pointer', color: '#fff', fontSize: 13.5, fontWeight: 700, fontFamily: 'var(--font-body)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {actionLoading ? <Spinner size={14} /> : null}
              {actionLoading ? 'Disabling…' : 'Confirm Disable'}
            </button>
            <button onClick={() => { setShowDisableForm(false); setPassword(''); setError(''); }} style={{ padding: '10px 16px', background: 'transparent', border: '1px solid #fecaca', borderRadius: 10, cursor: 'pointer', color: '#dc2626', fontSize: 13.5, fontFamily: 'var(--font-body)' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Benefits when disabled */}
      {!enabled && (
        <div style={box}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', marginBottom: 12 }}>Why enable 2FA?</div>
          {[
            { icon: <Mail size={15} color="var(--brand)" />, text: 'A 6-digit code is sent to your email at every login' },
            { icon: '⏱', text: 'Codes expire in 10 minutes and are single-use' },
            { icon: '🔒', text: 'Even if your password is stolen, your account stays protected' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
              <span style={{ flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
              <span style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.5 }}>{item.text}</span>
            </div>
          ))}
          <div style={{ marginTop: 14, padding: '11px 14px', background: 'rgba(37,99,235,0.06)', borderRadius: 10, border: '1px solid rgba(37,99,235,0.12)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <Mail size={14} color="var(--brand)" style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-3)', lineHeight: 1.5 }}>
              Codes are sent to your <strong>registered email address</strong>. Make sure it is accessible before enabling.
            </p>
          </div>
        </div>
      )}

      {/* Active confirmation when enabled */}
      {enabled && !showDisableForm && (
        <div style={{ ...box, background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <ShieldCheck size={16} color="#10b981" style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.6 }}>
              Your account is protected. A 6-digit code is sent to your email at every login.
              To access the code, make sure your email is accessible when you sign in.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TwoFactorSettings;
