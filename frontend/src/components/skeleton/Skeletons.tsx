import React from 'react';

const Sk: React.FC<{ w?: string | number; h?: number; r?: number; mb?: number }> = ({ w = '100%', h = 16, r = 8, mb = 0 }) => (
  <div className="skeleton" style={{ width: w, height: h, borderRadius: r, marginBottom: mb, flexShrink: 0,
    background: 'linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)',
    backgroundSize: '700px 100%',
    animation: 'shimmer 1.4s infinite linear',
  }} />
);

export const PropertyCardSkeleton: React.FC = () => (
  <div className="card" style={{ overflow: 'hidden' }}>
    <Sk h={200} r={0} />
    <div style={{ padding: 18 }}>
      <Sk h={20} w="70%" mb={8} />
      <Sk h={14} w="90%" mb={14} />
      <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}><Sk h={14} w={60} /><Sk h={14} w={60} /><Sk h={14} w={60} /></div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><Sk h={24} w={100} /><Sk h={30} w={80} r={99} /></div>
      <div style={{ margin: '14px 0', height: 1, background: 'var(--border)' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Sk h={32} w={32} r={99} />
        <div style={{ flex: 1 }}><Sk h={12} w="60%" mb={5} /><Sk h={11} w="40%" /></div>
      </div>
    </div>
    <style>{`@keyframes shimmer { 0% { background-position: -700px 0; } 100% { background-position: 700px 0; } }`}</style>
  </div>
);

export const PropertyGridSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <div className="property-grid">
    {Array.from({ length: count }).map((_, i) => <PropertyCardSkeleton key={i} />)}
  </div>
);

export const StatCardSkeleton: React.FC = () => (
  <div className="card" style={{ padding: '20px 22px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}><Sk h={13} w="60%" /><Sk h={40} w={40} r={12} /></div>
    <Sk h={32} w="45%" mb={8} />
    <Sk h={12} w="70%" />
  </div>
);

export const StatsGridSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="stats-grid">
    {Array.from({ length: count }).map((_, i) => <StatCardSkeleton key={i} />)}
  </div>
);

export const ComplaintSkeleton: React.FC = () => (
  <div className="card" style={{ padding: 20, marginBottom: 10 }}>
    <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}><Sk h={22} w={80} r={99} /><Sk h={22} w={70} r={99} /></div>
    <Sk h={18} w="65%" mb={8} />
    <Sk h={14} w="90%" mb={14} />
  </div>
);

export const Spinner: React.FC<{ size?: number; color?: string }> = ({ size = 18, color = 'var(--brand, #2563eb)' }) => (
  <div style={{ width: size, height: size, border: `2px solid rgba(37,99,235,0.15)`, borderTop: `2px solid ${color}`, borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }}>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

export const FullPageLoader: React.FC = () => (
  <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, background: 'var(--bg, #f1f5f9)' }}>
    <div style={{ width: 52, height: 52, borderRadius: 16, background: 'var(--brand, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>🛡️</div>
    <Spinner size={28} />
    <p style={{ fontSize: 14, color: 'var(--text-3, #64748b)', fontWeight: 500 }}>Loading SafeLease…</p>
  </div>
);
