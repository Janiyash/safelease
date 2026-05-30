import React, { useState } from 'react';
import { Wrench, Clock, CheckCircle, AlertTriangle, Plus, Calendar, User, DollarSign } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge, Modal, Field, EmptyState, inputStyle } from '../shared';

interface MaintenanceJob {
  id: string; title: string; property: string; category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  assignedTo: string; scheduledDate: string; estimatedCost: number; actualCost?: number; notes: string; createdAt: string;
}

const MOCK_JOBS: MaintenanceJob[] = [
  { id: 'm1', title: 'HVAC Filter Replacement', property: 'Sunset Apartments 4B', category: 'HVAC', priority: 'medium', status: 'scheduled', assignedTo: 'Bob Plumber', scheduledDate: '2026-04-22', estimatedCost: 150, notes: 'Quarterly filter change', createdAt: '2026-04-18T00:00:00Z' },
  { id: 'm2', title: 'Leaking Kitchen Faucet', property: 'Marina District 1BR', category: 'Plumbing', priority: 'high', status: 'in_progress', assignedTo: 'Alice Fix-It', scheduledDate: '2026-04-19', estimatedCost: 200, notes: 'Reported by tenant', createdAt: '2026-04-17T00:00:00Z' },
  { id: 'm3', title: 'Exterior Paint Touch-up', property: 'Downtown Loft Studio 7', category: 'Painting', priority: 'low', status: 'completed', assignedTo: 'Carlos Paint', scheduledDate: '2026-04-10', estimatedCost: 500, actualCost: 480, notes: 'Annual maintenance', createdAt: '2026-04-01T00:00:00Z' },
  { id: 'm4', title: 'Broken Window Lock', property: 'SOMA Penthouse PH', category: 'Security', priority: 'urgent', status: 'in_progress', assignedTo: 'Dave Lock', scheduledDate: '2026-04-18', estimatedCost: 120, notes: 'Security concern', createdAt: '2026-04-18T00:00:00Z' },
];

const PRIORITY_COLOR: Record<string, string> = { low: '#10b981', medium: '#f59e0b', high: '#ef4444', urgent: '#7c3aed' };

const MaintenanceTracker: React.FC = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<MaintenanceJob[]>(MOCK_JOBS);
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', property: '', category: 'Plumbing', priority: 'medium', assignedTo: '', scheduledDate: '', estimatedCost: '', notes: '' });

  const filtered = filter === 'all' ? jobs : jobs.filter(j => j.status === filter);

  const handleAdd = () => {
    if (!form.title || !form.property) return;
    setJobs(prev => [{ id: `m${Date.now()}`, ...form as any, status: 'scheduled' as const, estimatedCost: Number(form.estimatedCost) || 0, createdAt: new Date().toISOString() }, ...prev]);
    setShowModal(false);
    setForm({ title: '', property: '', category: 'Plumbing', priority: 'medium', assignedTo: '', scheduledDate: '', estimatedCost: '', notes: '' });
  };

  const updateStatus = (id: string, status: MaintenanceJob['status']) => setJobs(prev => prev.map(j => j.id === id ? { ...j, status } : j));

  const totalSpent = jobs.filter(j => j.status === 'completed').reduce((s, j) => s + (j.actualCost || j.estimatedCost), 0);

  return (
    <div style={{ padding: '24px var(--content-px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 24, color: 'var(--text-1)', margin: 0 }}>Maintenance Tracker</h1>
          <p style={{ color: 'var(--text-3)', fontSize: 14, margin: '4px 0 0' }}>Schedule and track all maintenance jobs</p>
        </div>
        {(user?.role === 'owner' || user?.role === 'admin') && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Plus size={16} /> New Job</button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Pending', value: jobs.filter(j => j.status === 'scheduled').length, icon: <Clock size={20}/>, color: '#f59e0b', bg: '#fffbeb' },
          { label: 'In Progress', value: jobs.filter(j => j.status === 'in_progress').length, icon: <Wrench size={20}/>, color: '#2563eb', bg: '#eff6ff' },
          { label: 'Completed', value: jobs.filter(j => j.status === 'completed').length, icon: <CheckCircle size={20}/>, color: '#10b981', bg: '#ecfdf5' },
          { label: 'Total Spent', value: `$${totalSpent.toLocaleString()}`, icon: <DollarSign size={20}/>, color: '#7c3aed', bg: '#f5f3ff' },
        ].map(c => (
          <div key={c.label} className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.color, flexShrink: 0 }}>{c.icon}</div>
            <div><p style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-1)', margin: 0, fontFamily: 'var(--font-display)' }}>{c.value}</p><p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>{c.label}</p></div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {['all', 'scheduled', 'in_progress', 'completed', 'cancelled'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: '6px 14px', borderRadius: 99, border: '1px solid', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', borderColor: filter === f ? 'var(--brand)' : 'var(--border)', background: filter === f ? 'var(--brand)' : 'var(--surface)', color: filter === f ? 'white' : 'var(--text-2)' }}>
            {f === 'all' ? 'All' : f.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.length === 0
          ? <EmptyState title="No jobs found" message="No maintenance jobs match this filter." icon={<Wrench size={28} color="var(--brand)" />} />
          : filtered.map(job => (
          <div key={job.id} className="card" style={{ padding: '18px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>{job.title}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: PRIORITY_COLOR[job.priority] + '20', color: PRIORITY_COLOR[job.priority] }}>{job.priority.toUpperCase()}</span>
                  <StatusBadge status={job.status} />
                </div>
                <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--text-3)' }}><User size={13}/>{job.assignedTo}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--text-3)' }}><Calendar size={13}/>{job.scheduledDate}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--text-3)' }}><DollarSign size={13}/>Est. ${job.estimatedCost}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-3)' }}>🏠 {job.property}</span>
                </div>
                {job.notes && <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '8px 0 0' }}>{job.notes}</p>}
              </div>
              {(user?.role === 'owner' || user?.role === 'admin') && job.status !== 'completed' && job.status !== 'cancelled' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  {job.status === 'scheduled' && <button onClick={() => updateStatus(job.id, 'in_progress')} style={{ fontSize: 12, padding: '6px 12px', background: 'var(--brand-light)', color: 'var(--brand)', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600 }}>Start</button>}
                  {job.status === 'in_progress' && <button onClick={() => updateStatus(job.id, 'completed')} style={{ fontSize: 12, padding: '6px 12px', background: '#ecfdf5', color: '#10b981', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600 }}>Complete</button>}
                  <button onClick={() => updateStatus(job.id, 'cancelled')} style={{ fontSize: 12, padding: '6px 12px', background: 'var(--red-bg)', color: 'var(--red)', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600 }}>Cancel</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Schedule Maintenance Job" maxWidth={540}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Job Title"><input value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} placeholder="e.g. Fix leaking pipe" style={inputStyle} /></Field>
          <Field label="Property"><input value={form.property} onChange={e => setForm(p => ({...p, property: e.target.value}))} placeholder="Property name" style={inputStyle} /></Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Category"><select value={form.category} onChange={e => setForm(p => ({...p, category: e.target.value}))} style={inputStyle}>{['Plumbing','Electrical','HVAC','Painting','Structural','Security','Cleaning','Other'].map(c=><option key={c}>{c}</option>)}</select></Field>
            <Field label="Priority"><select value={form.priority} onChange={e => setForm(p => ({...p, priority: e.target.value}))} style={inputStyle}>{['low','medium','high','urgent'].map(p=><option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}</select></Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Assigned To"><input value={form.assignedTo} onChange={e => setForm(p => ({...p, assignedTo: e.target.value}))} placeholder="Contractor name" style={inputStyle} /></Field>
            <Field label="Scheduled Date"><input type="date" value={form.scheduledDate} onChange={e => setForm(p => ({...p, scheduledDate: e.target.value}))} style={inputStyle} /></Field>
          </div>
          <Field label="Estimated Cost ($)"><input type="number" value={form.estimatedCost} onChange={e => setForm(p => ({...p, estimatedCost: e.target.value}))} placeholder="0" style={inputStyle} /></Field>
          <Field label="Notes"><textarea value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))} placeholder="Additional notes..." style={{...inputStyle, height: 80, resize: 'vertical' as const}} /></Field>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '10px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-2)', borderRadius: 'var(--r-sm)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600 }}>Cancel</button>
            <button onClick={handleAdd} className="btn btn-primary" style={{ flex: 1, padding: '10px', justifyContent: 'center' }}>Schedule Job</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MaintenanceTracker;