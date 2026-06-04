import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Building2, AlertCircle, Bell, TrendingUp, CheckCircle, Clock, Shield } from 'lucide-react';
import { adminApi } from '../../api/services';
import { StatCard, StatusBadge } from '../shared';
import { StatsGridSkeleton, Spinner } from '../skeleton/Skeletons';
import { Analytics } from '../../types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';

const COLORS = ['#2563eb','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4'];
const MONTHS = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const AdminDashboard: React.FC = () => {
  const { data, isLoading } = useQuery<Analytics>({
    queryKey: ['analytics'],
    queryFn: async () => adminApi.getAnalytics().then(r => r.data.data),
    refetchInterval: 60_000,
  });

  if (isLoading || !data) return (
    <div className="page">
      <StatsGridSkeleton count={4} />
      <div style={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--text-3)' }}>
        <Spinner size={22} /> Loading analytics…
      </div>
    </div>
  );

  const monthlyData = data.charts.monthlyComplaints.map(m => ({
    name: MONTHS[m._id.month],
    Complaints: m.count,
  }));

  const statusData = data.charts.complaintsByStatus.map(s => ({ name: s._id.replace('_',' '), value: s.count }));
  const categoryData = data.charts.complaintsByCategory.map(c => ({ name: c._id, value: c.count }));
  const propertyData = data.charts.propertiesByStatus.map(s => ({ name: s._id.replace('_',' '), value: s.count }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', boxShadow: 'var(--shadow-md)', fontSize: 13 }}>
        <p style={{ fontWeight: 700, marginBottom: 4 }}>{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color, margin: '2px 0' }}>{p.name}: {p.value}</p>
        ))}
      </div>
    );
  };

  return (
    <div className="page">
      {/* Header */}
      <div style={{ marginBottom: 32 }} className="fade-in">
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 30, color: 'var(--text-1)', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
          <span style={{ color: 'var(--brand)' }}>Admin</span> Analytics
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-3)', margin: 0 }}>Platform-wide overview · updates every 60s</p>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 28 }}>
        <StatCard label="Total Users" value={data.users.total} icon={<Users size={18}/>} color="#2563eb" bg="#eff6ff" sub={`${data.users.tenants} tenants · ${data.users.owners} owners`} />
        <StatCard label="Properties" value={data.properties.total} icon={<Building2 size={18}/>} color="#10b981" bg="#ecfdf5" sub={`${data.properties.occupancyRate}% occupied`} />
        <StatCard label="Open Complaints" value={data.complaints.open} icon={<AlertCircle size={18}/>} color="#f59e0b" bg="#fffbeb" sub={`${data.complaints.resolutionRate}% resolved`} />
        <StatCard label="Pending Approval" value={data.properties.pending} icon={<Clock size={18}/>} color="#ef4444" bg="#fef2f2" sub="Properties awaiting review" />
      </div>

      {/* Resolution & occupancy KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Resolution Rate', value: data.complaints.resolutionRate, color: '#10b981', icon: '✅' },
          { label: 'Occupancy Rate', value: data.properties.occupancyRate, color: '#2563eb', icon: '🏠' },
          { label: 'Total Notices', value: data.notices.total, color: '#8b5cf6', icon: '📢', isCount: true },
        ].map(item => (
          <div key={item.label} className="card fade-up" style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 28 }}>{item.icon}</span>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: item.color, lineHeight: 1 }}>
                {item.isCount ? item.value : `${item.value}%`}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 500 }}>{item.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div className="chart-card fade-up delay-2">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <TrendingUp size={16} color="var(--brand)" />
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, margin: 0 }}>Complaint Trend</h3>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="complGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.12}/>
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11.5, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="Complaints" stroke="#2563eb" strokeWidth={2.5} fill="url(#complGrad)" dot={{ fill: '#2563eb', r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card fade-up delay-3">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <AlertCircle size={16} color="var(--brand)" />
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, margin: 0 }}>Complaints by Status</h3>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                {statusData.map((_entry, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={10} formatter={(v) => <span style={{ fontSize: 12, color: 'var(--text-2)', textTransform: 'capitalize' }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
        <div className="chart-card fade-up delay-4">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <Building2 size={16} color="var(--brand)" />
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, margin: 0 }}>Properties by Status</h3>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={propertyData} barSize={24}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11.5, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Count" radius={[6,6,0,0]}>
                {propertyData.map((_e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card fade-up delay-5">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <AlertCircle size={16} color="var(--brand)" />
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, margin: 0 }}>By Category</h3>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={categoryData} barSize={24} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11.5, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} width={80} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Count" radius={[0,6,6,0]}>
                {categoryData.map((_e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card fade-up" style={{ padding: '20px 22px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={15} color="var(--brand)" /> Recent Complaints
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.recent.complaints.slice(0,4).map(c => (
              <div key={c._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13.5, fontWeight: 600, margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title}</p>
                  <p style={{ fontSize: 11.5, color: 'var(--text-3)', margin: 0 }}>{typeof c.property === 'object' ? c.property.title : ''}</p>
                </div>
                <StatusBadge status={c.status} />
              </div>
            ))}
          </div>
        </div>

        <div className="card fade-up delay-1" style={{ padding: '20px 22px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={15} color="var(--brand)" /> New Users
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.recent.users.slice(0,4).map(u => (
              <div key={u._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)' }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                  {u.name.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13.5, fontWeight: 600, margin: 0 }}>{u.name}</p>
                  <p style={{ fontSize: 11.5, color: 'var(--text-3)', margin: 0 }}>{u.email}</p>
                </div>
                <StatusBadge status={u.role} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`@media (max-width: 900px) { .page > div[style*="grid-template-columns: 1fr 1fr"] { grid-template-columns: 1fr !important; } .page > div[style*="repeat(3"] { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
};

export default AdminDashboard;
