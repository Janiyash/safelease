import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ShieldCheck, ArrowRight, RefreshCw, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import { twoFactorApi } from '../../../api/services';
import { Spinner } from '../../skeleton/Skeletons';
import { useNavigate } from 'react-router-dom';

interface Props {
  tempToken: string;
  maskedEmail?: string;
  onBack: () => void;
}

const RESEND_COOLDOWN = 60;

export const TwoFactorVerify: React.FC<Props> = ({ tempToken, maskedEmail, onBack }) => {
  const { login }  = useAuth();
  const nav        = useNavigate();

  const [digits,    setDigits]    = useState(['', '', '', '', '', '']);
  const [loading,   setLoading]   = useState(false);
  const [resending, setResending] = useState(false);
  const [error,     setError]     = useState('');
  const [cooldown,  setCooldown]  = useState(0);
  const [shake,     setShake]     = useState(false);

  const inputs   = useRef<(HTMLInputElement | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { inputs.current[0]?.focus(); }, []);
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const startCooldown = useCallback(() => {
    setCooldown(RESEND_COOLDOWN);
    timerRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) { clearInterval(timerRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // ── Digit handling ──────────────────────────────────────────────────────────
  const handleDigit = (i: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...digits];
    next[i] = val.slice(-1);
    setDigits(next);
    setError('');
    if (val && i < 5) inputs.current[i + 1]?.focus();
    if (val && i === 5 && next.every(d => d !== '')) submitOtp(next.join(''));
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
    if (e.key === 'Enter') { const c = digits.join(''); if (c.length === 6) submitOtp(c); }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) { setDigits(pasted.split('')); submitOtp(pasted); }
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const submitOtp = async (code: string) => {
    if (loading || code.length !== 6) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await twoFactorApi.verify(code, tempToken);
      const { user, accessToken } = data.data;
      login(user, accessToken);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      nav(`/${user.role}`, { replace: true });
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Invalid code. Please try again.';
      setError(msg);
      setDigits(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setLoading(false);
    }
  };

  // ── Resend ──────────────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (resending || cooldown > 0) return;
    setResending(true);
    setError('');
    try {
      await twoFactorApi.resend(tempToken);
      toast.success('New code sent to your email.');
      setDigits(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
      startCooldown();
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Failed to resend. Try again.';
      toast.error(msg);
      if (e.response?.status === 429) startCooldown();
    } finally {
      setResending(false);
    }
  };

  const isComplete = digits.every(d => d !== '');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 440 }}>

        {/* Logo + heading */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 64, height: 64, background: 'linear-gradient(135deg,var(--brand),#7c3aed)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 8px 28px rgba(37,99,235,0.35)' }}>
            <ShieldCheck size={30} color="white" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, color: 'var(--text-1)' }}>Safe</span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, color: 'var(--brand)' }}>Lease</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--text-1)', margin: '0 0 6px' }}>Check your email</h1>
          <p style={{ color: 'var(--text-3)', fontSize: 13.5, margin: 0, lineHeight: 1.5 }}>
            We sent a 6-digit code to{' '}
            {maskedEmail
              ? <strong style={{ color: 'var(--text-2)' }}>{maskedEmail}</strong>
              : 'your registered email'}
          </p>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.07)' }}>

          {/* Info strip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: 'rgba(37,99,235,0.06)', borderRadius: 12, marginBottom: 24, border: '1px solid rgba(37,99,235,0.12)' }}>
            <Mail size={15} color="var(--brand)" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.4 }}>
              Enter the code from your email. It expires in <strong style={{ color: 'var(--text-2)' }}>10 minutes</strong>.
            </span>
          </div>

          {/* OTP boxes */}
          <div
            onPaste={handlePaste}
            style={{
              display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 20,
              animation: shake ? 'shake 0.4s ease' : 'none',
            }}
          >
            {digits.map((d, i) => (
              <input
                key={i}
                ref={el => { inputs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={e => handleDigit(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                disabled={loading}
                style={{
                  width: 52, height: 62, textAlign: 'center', fontSize: 26, fontWeight: 800,
                  background: 'var(--surface-2)',
                  border: `2px solid ${error ? '#ef4444' : d ? 'var(--brand)' : 'var(--border-strong)'}`,
                  borderRadius: 14, color: 'var(--text-1)',
                  outline: 'none', transition: 'border-color 0.15s, transform 0.1s',
                  transform: d ? 'scale(1.06)' : 'scale(1)',
                  cursor: loading ? 'not-allowed' : 'text',
                  fontFamily: "'Courier New', monospace",
                }}
              />
            ))}
          </div>

          {/* Error */}
          {error && (
            <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, color: '#dc2626', fontSize: 13, marginBottom: 16, textAlign: 'center' }}>
              {error}
            </div>
          )}

          {/* Verify button */}
          <button
            onClick={() => submitOtp(digits.join(''))}
            disabled={loading || !isComplete}
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '13px', gap: 8, fontSize: 15, fontWeight: 700 }}
          >
            {loading ? <Spinner size={17} /> : <><span>Verify &amp; Sign In</span><ArrowRight size={16} /></>}
          </button>

          {/* Resend */}
          <div style={{ marginTop: 18, textAlign: 'center' }}>
            <span style={{ fontSize: 13.5, color: 'var(--text-3)' }}>Didn't receive it? </span>
            {cooldown > 0 ? (
              <span style={{ fontSize: 13.5, color: 'var(--text-4)', fontWeight: 600 }}>Resend in {cooldown}s</span>
            ) : (
              <button
                onClick={handleResend}
                disabled={resending}
                style={{ background: 'none', border: 'none', cursor: resending ? 'not-allowed' : 'pointer', fontSize: 13.5, color: 'var(--brand)', fontWeight: 700, fontFamily: 'var(--font-body)', display: 'inline-flex', alignItems: 'center', gap: 5, padding: 0 }}
              >
                {resending ? <Spinner size={12} /> : <RefreshCw size={12} />}
                {resending ? 'Sending…' : 'Resend code'}
              </button>
            )}
          </div>

          {/* Back */}
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border)', textAlign: 'center' }}>
            <button
              onClick={onBack}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}
            >
              ← Back to login
            </button>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-4)', marginTop: 16 }}>
          Having trouble? <a href="mailto:support@safelease.com" style={{ color: 'var(--brand)', textDecoration: 'none' }}>Contact support</a>
        </p>
      </div>

      <style>{`
        @keyframes shake {
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-7px)}
          40%{transform:translateX(7px)}
          60%{transform:translateX(-4px)}
          80%{transform:translateX(4px)}
        }
      `}</style>
    </div>
  );
};

export default TwoFactorVerify;
