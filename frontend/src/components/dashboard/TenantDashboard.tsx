import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Bell, Clock, CheckCircle, MessageSquare, ArrowRight, Home, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { complaintApi, noticeApi } from '../../api/services';
import { StatCard, StatusBadge, EmptyState } from '../shared';
import { StatsGridSkeleton, ComplaintSkeleton } from '../skeleton/Skeletons';
import { Complaint, Notice } from '../../types';
import { formatDistanceToNow } from 'date-fns';


const categoryColors: Record<string, string> = {
  emergency: '#ef4444', maintenance: '#f59e0b', general: '#2563eb', event: '#10b981', billing: '#8b5cf6',
};

const TenantDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: complData, isLoading: complLoading } = useQuery({
    queryKey: ['complaints'],
    staleTime: 0,
    queryFn: async () => complaintApi.getAll({ limit: 5 }).then(r => r.data.data),
  });

  const { data: noticeData, isLoading: noticeLoading } = useQuery({
    queryKey: ['notices'],
    staleTime: 0,
    queryFn: async () => noticeApi.getAll({ limit: 4 }).then(r => r.data.data),
  });

  const complaints: Complaint[] = complData?.complaints || [];
  const notices: Notice[]       = noticeData?.notices || [];
  const open       = complaints.filter(c => c.status === 'pending').length;
  const inProgress = complaints.filter(c => c.status === 'in_progress').length;
  const resolved   = complaints.filter(c => c.status === 'resolved').length;

  // Use real assigned property from user object (populated by /auth/me)
  const assignedProp = user?.assignedProperty as any;

  return (
    <div className="page">
      {/* Hero */}
      <div style={{ marginBottom: 32 }} className="fade-in">
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 30, color: 'var(--text-1)', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
          Good day, <span style={{ color: 'var(--brand)' }}>{user?.name?.split(' ')[0]}</span> 👋
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-3)', margin: 0 }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Stats */}
      {complLoading ? <StatsGridSkeleton count={3} /> : (
        <div className="stats-grid" style={{ marginBottom: 32 }}>
          <StatCard label="Open Complaints" value={open} icon={<AlertCircle size={18}/>} color="#f59e0b" bg="#fffbeb" sub="Awaiting response" />
          <StatCard label="In Progress" value={inProgress} icon={<Clock size={18}/>} color="#2563eb" bg="#eff6ff" sub="Being worked on" />
          <StatCard label="Resolved" value={resolved} icon={<CheckCircle size={18}/>} color="#10b981" bg="#ecfdf5" sub="Successfully closed" />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: 24, alignItems: 'start' }}>
        {/* Left: Property + Complaints */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Assigned property card */}
          {assignedProp ? (
            <div className="card fade-up" style={{ overflow: 'hidden' }}>
              <div style={{ height: 140, background: 'linear-gradient(135deg, #dbeafe 0%, #ede9fe 100%)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {assignedProp.images?.[0] ? (
                  <img src={assignedProp.images[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <Home size={40} color="#93c5fd" />
                )}
                <div style={{ position: 'absolute', top: 12, left: 12 }}>
                  <span className="badge badge-brand">My Property</span>
                </div>
                {assignedProp.hazardScore && (
                  <div style={{ position: 'absolute', bottom: 12, left: 12, display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(6px)' }}>
                    <Star size={12} fill="#f59e0b" color="#f59e0b" />
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#92400e' }}>{assignedProp.hazardScore} Safety Score</span>
                  </div>
                )}
              </div>
              <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, margin: '0 0 3px' }}>{assignedProp.title}</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>📍 {assignedProp.address}, {assignedProp.city}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--brand)' }}>
                    ₹{(assignedProp.rent || 0).toLocaleString()}
                    <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-3)' }}>/mo</span>
                  </div>
                  <div style={{ display: 'flex', gap: 10, fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                    {assignedProp.bedrooms !== undefined && (
                      <span>{assignedProp.bedrooms === 0 ? 'Studio' : `${assignedProp.bedrooms} BR`}</span>
                    )}
                    {assignedProp.bathrooms && <span>{assignedProp.bathrooms} BA</span>}
                    {assignedProp.sqft && <span>{(assignedProp.sqft || 0).toLocaleString()} ft²</span>}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="card fade-up" style={{ padding: '24px', textAlign: 'center' }}>
              <Home size={36} color="var(--brand)" style={{ opacity: 0.4, marginBottom: 10 }} />
              <p style={{ fontSize: 14, color: 'var(--text-3)', margin: 0 }}>No property assigned yet. Contact your landlord or admin.</p>
            </div>
          )}

          {/* Recent complaints */}
          <div className="card fade-up delay-1" style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={16} color="var(--brand)" /> My Complaints
              </h3>
              <button onClick={() => navigate('/tenant/complaints')} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--brand)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                View all <ArrowRight size={13} />
              </button>
            </div>

            {complLoading ? Array.from({length: 3}).map((_,i) => <ComplaintSkeleton key={i} />) : complaints.length === 0 ? (
              <EmptyState title="No complaints" message="Raise a complaint using the Complaints page." icon={<MessageSquare size={24} color="var(--brand)" />} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {complaints.slice(0,4).map(c => (
                  <div key={c._id} onClick={() => navigate('/tenant/complaints')} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px', background: 'var(--surface-2)', borderRadius: 'var(--r-sm)', cursor: 'pointer', border: '1px solid var(--border)', transition: 'all 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-2)'}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13.5, fontWeight: 600, margin: '0 0 3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <StatusBadge status={c.priority} />
                      <StatusBadge status={c.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Notices + quick actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Quick actions */}
          <div className="card fade-up delay-2" style={{ padding: '18px 20px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, margin: '0 0 14px' }}>Quick Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Raise a Complaint', icon: '⚠️', path: '/tenant/complaints', color: '#f59e0b', bg: '#fffbeb' },
                { label: 'Browse Properties', icon: '🏠', path: '/tenant/properties', color: '#2563eb', bg: '#eff6ff' },
                { label: 'Read Notices', icon: '📢', path: '/tenant/notices', color: '#8b5cf6', bg: '#f5f3ff' },
              ].map(a => (
                <button key={a.path} onClick={() => navigate(a.path)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: a.bg, border: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer', fontFamily: 'var(--font-body)', color: a.color, fontWeight: 600, fontSize: 13.5, textAlign: 'left', transition: 'opacity 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  <span style={{ fontSize: 18 }}>{a.icon}</span>
                  {a.label}
                  <ArrowRight size={14} style={{ marginLeft: 'auto' }} />
                </button>
              ))}
            </div>
          </div>

          {/* Notices */}
          <div className="card fade-up delay-3" style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bell size={15} color="var(--brand)" /> Recent Notices
              </h3>
              <button onClick={() => navigate('/tenant/notices')} style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>View all</button>
            </div>
            {noticeLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Array.from({length:3}).map((_,i) => <div key={i} className="skeleton" style={{ height: 68, borderRadius: 10 }} />)}
              </div>
            ) : notices.length === 0 ? (
              <EmptyState title="No notices" message="Society notices will appear here." icon={<Bell size={22} color="var(--brand)" />} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {notices.map(n => (
                  <div key={n._id} style={{ padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 'var(--r-sm)', borderLeft: `3px solid ${categoryColors[n.category] || 'var(--brand)'}`, border: '1px solid var(--border)', borderLeftWidth: 3 }}>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 5 }}>
                      {n.isPinned && <span className="badge badge-brand" style={{ fontSize: 10 }}>📌 Pinned</span>}
                      <StatusBadge status={n.category} />
                    </div>
                    <p style={{ fontSize: 13.5, fontWeight: 600, margin: '0 0 3px', color: 'var(--text-1)' }}>{n.title}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`@media (max-width: 900px) { .page > div:last-child { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
};

export default TenantDashboard;
