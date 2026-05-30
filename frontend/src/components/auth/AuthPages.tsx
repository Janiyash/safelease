import React, { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Eye, EyeOff, ShieldCheck, ArrowRight, Lock, Mail, User, Phone } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/services';
import { Spinner } from '../skeleton/Skeletons';
import { TwoFactorVerify } from './twoFactor/TwoFactorVerify';

const AuthLayout: React.FC<{ children: React.ReactNode; title: string; subtitle: string }> = ({ children, title, subtitle }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) return null;
  if (isAuthenticated && user) return <Navigate to={`/${user.role}`} replace />;
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, background: 'var(--brand)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', boxShadow: '0 8px 24px rgba(37,99,235,0.3)' }}>
            <ShieldCheck size={26} color="white" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, color: 'var(--text-1)' }}>Safe</span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, color: 'var(--brand)' }}>Lease</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-1)', margin: '0 0 8px' }}>{title}</h1>
          <p style={{ color: 'var(--text-3)', fontSize: 14, margin: 0 }}>{subtitle}</p>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.07)' }}>
          {children}
        </div>
      </div>
    </div>
  );
};

const Fw: React.FC<{ label: string; error?: string; children: React.ReactNode }> = ({ label, error, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
    <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>{label}</label>
    {children}
    {error && <span style={{ fontSize: 12, color: 'var(--red)' }}>{error}</span>}
  </div>
);

const inputSt: React.CSSProperties = {
  width: '100%', padding: '11px 14px', paddingLeft: 40,
  background: 'var(--surface-2)', border: '1px solid var(--border-strong)',
  borderRadius: 'var(--r-sm)', fontSize: 14, color: 'var(--text-1)',
  outline: 'none', fontFamily: 'var(--font-body)', boxSizing: 'border-box',
};

const Err: React.FC<{ msg: string }> = ({ msg }) => (
  <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 'var(--r-sm)', color: '#dc2626', fontSize: 13 }}>{msg}</div>
);

const DEMO = [
  { label: 'Owner',  email: 'owner@safelease.com',  password: 'Owner@1234' },
  { label: 'Tenant', email: 'tenant@safelease.com', password: 'Tenant@1234' },
];

// ── LOGIN ─────────────────────────────────────────────────────────────────────
const loginSchema = z.object({
  email:    z.string().email('Valid email required'),
  password: z.string().min(1, 'Required'),
});
type LF = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const nav = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const [err,    setErr]    = useState('');
  const [demo,   setDemo]   = useState<string | null>(null);

  // 2FA state — set when backend returns requiresTwoFactor: true
  const [twoFactorToken, setTwoFactorToken]   = useState<string | null>(null);
  const [maskedEmail,    setMaskedEmail]       = useState<string | undefined>(undefined);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LF>({ resolver: zodResolver(loginSchema) });

  const doLogin = async (email: string, password: string, label?: string) => {
    try {
      const { data } = await authApi.login({ email, password });
      const result = data.data;

      // Server says 2FA required → show OTP screen
      if (result.requiresTwoFactor) {
        setTwoFactorToken(result.tempToken);
        setMaskedEmail(result.maskedEmail);
        return;
      }

      const { user, accessToken } = result;
      login(user, accessToken);
      toast.success(`Welcome${label ? ` (${label})` : ''}, ${user.name.split(' ')[0]}!`);
      nav(`/${user.role}`, { replace: true });
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Login failed. Is the backend running?';
      setErr(msg);
      toast.error(msg);
    }
  };

  const onSubmit  = async (d: LF) => { setErr(''); await doLogin(d.email, d.password); };
  const loginDemo = async (d: typeof DEMO[0]) => {
    setErr(''); setDemo(d.label);
    await doLogin(d.email, d.password, d.label);
    setDemo(null);
  };

  // Show OTP verification screen
  if (twoFactorToken) {
    return (
      <TwoFactorVerify
        tempToken={twoFactorToken}
        maskedEmail={maskedEmail}
        onBack={() => { setTwoFactorToken(null); setMaskedEmail(undefined); }}
      />
    );
  }

  return (
    <AuthLayout title="Sign in to your account" subtitle="Rental safety & property management">
      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {err && <Err msg={err} />}
        <Fw label="Email" error={errors.email?.message}>
          <div style={{ position: 'relative' }}>
            <Mail size={15} color="var(--text-4)" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input type="email" placeholder="you@example.com" style={{ ...inputSt, borderColor: errors.email ? 'var(--red)' : undefined }} {...register('email')} />
          </div>
        </Fw>
        <Fw label="Password" error={errors.password?.message}>
          <div style={{ position: 'relative' }}>
            <Lock size={15} color="var(--text-4)" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input type={showPw ? 'text' : 'password'} placeholder="••••••••" style={{ ...inputSt, paddingRight: 44 }} {...register('password')} />
            <button type="button" onClick={() => setShowPw(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', display: 'flex' }}>
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </Fw>
        <div style={{ textAlign: 'right', marginTop: -8 }}>
          <Link to="/forgot-password" style={{ fontSize: 13, color: 'var(--brand)', textDecoration: 'none', fontWeight: 500 }}>Forgot password?</Link>
        </div>
        <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px', gap: 8 }}>
          {isSubmitting ? <Spinner size={16} /> : <><span>Sign in</span><ArrowRight size={15} /></>}
        </button>
        <p style={{ textAlign: 'center', fontSize: 13.5, margin: 0 }}>
          No account? <Link to="/signup" style={{ color: 'var(--brand)', fontWeight: 600, textDecoration: 'none' }}>Create one</Link>
        </p>
      </form>
      <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-4)', textAlign: 'center', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Quick Demo (seed required)</p>
        <div style={{ display: 'flex', gap: 8 }}>
          {DEMO.map(d => (
            <button key={d.label} disabled={!!demo} onClick={() => loginDemo(d)}
              style={{ flex: 1, padding: '9px 4px', background: 'var(--surface-2)', border: '1px solid var(--border-strong)', borderRadius: 'var(--r-sm)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 12.5, color: 'var(--text-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {demo === d.label ? <Spinner size={12} /> : d.label}
            </button>
          ))}
        </div>
      </div>
    </AuthLayout>
  );
};

// ── SIGNUP ────────────────────────────────────────────────────────────────────
const signupSchema = z.object({
  name:     z.string().min(2, 'At least 2 characters'),
  email:    z.string().email('Valid email required'),
  password: z.string().min(8, 'At least 8 characters').regex(/[A-Z]/, 'Need uppercase').regex(/[0-9]/, 'Need a number'),
  phone:    z.string().optional(),
  role:     z.enum(['tenant', 'owner']),
});
type SF = z.infer<typeof signupSchema>;

export const SignupPage: React.FC = () => {
  const { login } = useAuth();
  const nav = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SF>({ resolver: zodResolver(signupSchema), defaultValues: { role: 'tenant' } });

  const onSubmit = async (d: SF) => {
    setErr('');
    try {
      const res = await authApi.signup(d);
      const { user, accessToken } = res.data.data;
      login(user, accessToken);
      toast.success('Account created!');
      nav(`/${user.role}`, { replace: true });
    } catch (e: any) {
      setErr(e.response?.data?.message || 'Signup failed. Is the backend running?');
    }
  };

  return (
    <AuthLayout title="Create your account" subtitle="Join SafeLease — know before you sign">
      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {err && <Err msg={err} />}
        <Fw label="Full Name *" error={errors.name?.message}>
          <div style={{ position: 'relative' }}>
            <User size={15} color="var(--text-4)" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input placeholder="Sarah Johnson" style={inputSt} {...register('name')} />
          </div>
        </Fw>
        <Fw label="Email *" error={errors.email?.message}>
          <div style={{ position: 'relative' }}>
            <Mail size={15} color="var(--text-4)" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input type="email" placeholder="you@example.com" style={inputSt} {...register('email')} />
          </div>
        </Fw>
        <Fw label="Phone (optional)">
          <div style={{ position: 'relative' }}>
            <Phone size={15} color="var(--text-4)" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input type="tel" placeholder="+91 98765 43210" style={inputSt} {...register('phone')} />
          </div>
        </Fw>
        <Fw label="I am a…">
          <select {...register('role')} style={{ width: '100%', padding: '11px 14px', background: 'var(--surface-2)', border: '1px solid var(--border-strong)', borderRadius: 'var(--r-sm)', fontSize: 14, color: 'var(--text-1)', fontFamily: 'var(--font-body)' }}>
            <option value="tenant">Tenant — looking to rent</option>
            <option value="owner">Property Owner / Landlord</option>
          </select>
        </Fw>
        <Fw label="Password *" error={errors.password?.message}>
          <div style={{ position: 'relative' }}>
            <Lock size={15} color="var(--text-4)" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input type={showPw ? 'text' : 'password'} placeholder="Min 8 chars, uppercase + number" style={{ ...inputSt, paddingRight: 44 }} {...register('password')} />
            <button type="button" onClick={() => setShowPw(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', display: 'flex' }}>
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </Fw>
        <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px', gap: 8, marginTop: 4 }}>
          {isSubmitting ? <Spinner size={16} /> : <><span>Create Account</span><ArrowRight size={15} /></>}
        </button>
        <p style={{ textAlign: 'center', fontSize: 13.5, margin: 0 }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--brand)', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
        </p>
      </form>
    </AuthLayout>
  );
};

// ── FORGOT PASSWORD ───────────────────────────────────────────────────────────
export const ForgotPasswordPage: React.FC = () => {
  const [sent, setSent] = useState(false);
  const [err,  setErr]  = useState('');
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<{ email: string }>({
    resolver: zodResolver(z.object({ email: z.string().email() })),
  });
  const onSubmit = async ({ email }: { email: string }) => {
    try { await authApi.forgotPassword(email); setSent(true); }
    catch (e: any) { setErr(e.response?.data?.message || 'Something went wrong.'); }
  };
  return (
    <AuthLayout title="Reset your password" subtitle="We'll email you a reset link">
      {sent ? (
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📬</div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Check your inbox</h3>
          <p style={{ color: 'var(--text-3)', fontSize: 14, lineHeight: 1.6 }}>If that email is registered, a reset link was sent.</p>
          <Link to="/login" style={{ display: 'inline-block', marginTop: 20, color: 'var(--brand)', fontWeight: 600, textDecoration: 'none' }}>← Back to login</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {err && <Err msg={err} />}
          <Fw label="Email address">
            <div style={{ position: 'relative' }}>
              <Mail size={15} color="var(--text-4)" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input type="email" placeholder="you@example.com" style={inputSt} {...register('email')} />
            </div>
          </Fw>
          <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
            {isSubmitting ? <Spinner size={16} /> : 'Send Reset Link'}
          </button>
          <p style={{ textAlign: 'center', fontSize: 13.5, margin: 0 }}>
            <Link to="/login" style={{ color: 'var(--brand)', fontWeight: 600, textDecoration: 'none' }}>← Back to login</Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
};
