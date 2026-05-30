import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, AlertCircle, Clock, CheckCircle, Plus, ArrowRight, TrendingUp, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { propertyApi, complaintApi } from '../../api/services';
import { StatCard, StatusBadge, EmptyState } from '../shared';
import { StatsGridSkeleton, PropertyCardSkeleton } from '../skeleton/Skeletons';
import { MOCK_PROPERTIES, MOCK_COMPLAINTS } from '../../data/mockData';
import PropertyCard from '../properties/PropertyCard';
import { Property, Complaint } from '../../types';
import { formatDistanceToNow } from 'date-fns';

const OwnerDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: propsData, isLoading: propsLoading } = useQuery({
    queryKey: ['owner-properties'],
    queryFn: () => propertyApi.getAll().then(r => r.data.data).catch(() => ({ properties: MOCK_PROPERTIES })),
  });
  const { data: complData, isLoading: complLoading } = useQuery({
    queryKey: ['owner-complaints'],
    queryFn: () => complaintApi.getAll({ limit: 5 }).then(r => r.data.data).catch(() => ({ complaints: MOCK_COMPLAINTS })),
  });

  const properties: Property[] = propsData?.properties || MOCK_PROPERTIES;
  const complaints: Complaint[] = complData?.complaints || MOCK_COMPLAINTS;
  const rented = properties.filter(p => p.status === 'rented').length;
  const available = properties.filter(p => p.status === 'available').length;
  const openC = complaints.filter(c => c.status === 'pending').length;
  const inProgressC = complaints.filter(c => c.status === 'in_progress').length;
  const occupancy = properties.length ? Math.round((rented / properties.length) * 100) : 0;

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 14 }} className="fade-in">
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 30, color: 'var(--text-1)', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            Welcome, <span style={{ color: '#8b5cf6' }}>{user?.name?.split(' ')[0]}</span>
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-3)', margin: 0 }}>Your property portfolio overview</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/owner/properties')}>
          <Plus size={16} /> Add Property
        </button>
      </div>

      {/* Stats */}
      {propsLoading ? <StatsGridSkeleton count={4} /> : (
        <div className="stats-grid" style={{ marginBottom: 32 }}>
          <StatCard label="Total Properties" value={properties.length} icon={<Building2 size={18}/>} color="#8b5cf6" bg="#f5f3ff" sub="In your portfolio" />
          <StatCard label="Occupancy Rate" value={`${occupancy}%`} icon={<TrendingUp size={18}/>} color="#10b981" bg="#ecfdf5" sub={`${rented} rented, ${available} available`} />
          <StatCard label="Open Complaints" value={openC} icon={<AlertCircle size={18}/>} color="#f59e0b" bg="#fffbeb" sub="Need your attention" />
          <StatCard label="In Progress" value={inProgressC} icon={<Clock size={18}/>} color="#2563eb" bg="#eff6ff" sub="Being resolved" />
        </div>
      )}

      {/* Occupancy progress */}
      <div className="card fade-up delay-1" style={{ padding: '20px 24px', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-2)' }}>Portfolio Occupancy</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: occupancy >= 70 ? '#10b981' : '#f59e0b' }}>{occupancy}%</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${occupancy}%`, background: occupancy >= 70 ? 'var(--green)' : 'var(--amber)' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: 'var(--text-3)' }}>
          <span>{rented} rented</span>
          <span>{available} available</span>
          <span>{properties.filter(p => p.status === 'maintenance').length} maintenance</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 380px', gap: 24, alignItems: 'start' }}>
        {/* Properties grid (first 3) */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, margin: 0 }}>My Properties</h2>
            <button onClick={() => navigate('/owner/properties')} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--brand)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              View all <ArrowRight size={13} />
            </button>
          </div>
          {propsLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
              {Array.from({length:3}).map((_,i) => <PropertyCardSkeleton key={i} />)}
            </div>
          ) : properties.length === 0 ? (
            <div className="card" style={{ padding: 0 }}>
              <EmptyState title="No properties yet" message="Add your first property to start managing tenants." icon={<Building2 size={26} color="var(--brand)" />}
                action={<button className="btn btn-primary" onClick={() => navigate('/owner/properties')}><Plus size={14}/> Add Property</button>} />
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
              {properties.slice(0,3).map((p, i) => (
                <div key={p._id} className={`delay-${i+1}`}>
                  <PropertyCard property={p} isOwner onClick={() => navigate('/owner/properties')} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: complaints + quick actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card fade-up delay-2" style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={15} color="#8b5cf6" /> Recent Complaints
              </h3>
              <button onClick={() => navigate('/owner/complaints')} style={{ fontSize: 12.5, fontWeight: 600, color: '#8b5cf6', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>View all</button>
            </div>
            {complLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Array.from({length:3}).map((_,i) => <div key={i} className="skeleton" style={{ height: 62, borderRadius: 10 }} />)}
              </div>
            ) : complaints.length === 0 ? (
              <EmptyState title="No complaints" message="Tenant complaints will appear here." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {complaints.slice(0,4).map(c => (
                  <div key={c._id} onClick={() => navigate('/owner/complaints')} style={{ padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 'var(--r-sm)', cursor: 'pointer', border: '1px solid var(--border)', transition: 'background 0.12s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-2)'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 600, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title}</span>
                      <StatusBadge status={c.priority} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                        {typeof c.raisedBy === 'object' ? c.raisedBy.name : 'Tenant'} · {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                      </span>
                      <StatusBadge status={c.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card fade-up delay-3" style={{ padding: '18px 20px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, margin: '0 0 14px' }}>Quick Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Manage Properties', path: '/owner/properties', icon: '🏠', color: '#8b5cf6', bg: '#f5f3ff' },
                { label: 'View Complaints', path: '/owner/complaints', icon: '⚠️', color: '#f59e0b', bg: '#fffbeb' },
                { label: 'Post Notice', path: '/owner/notices', icon: '📢', color: '#2563eb', bg: '#eff6ff' },
              ].map(a => (
                <button key={a.path} onClick={() => navigate(a.path)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: a.bg, border: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer', fontFamily: 'var(--font-body)', color: a.color, fontWeight: 600, fontSize: 13.5 }}>
                  <span style={{ fontSize: 16 }}>{a.icon}</span> {a.label} <ArrowRight size={14} style={{ marginLeft: 'auto' }} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`@media (max-width: 1024px) { .page > div:last-child { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
};

export default OwnerDashboard;
