import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Plus, MessageSquare, Send, Building2, Globe, AlertCircle, Filter } from 'lucide-react';
import { complaintApi, propertyApi } from '../../api/services';
import { useAuth } from '../../context/AuthContext';
import { Complaint, ComplaintStatus, ComplaintPriority, ComplaintCategory } from '../../types';
import { Modal, StatusBadge, EmptyState, ErrorMessage, Field, Spinner, inputStyle } from '../shared';
import { formatDistanceToNow } from 'date-fns';

type ComplaintTypeTab = 'all' | 'general' | 'property';
const PROPERTY_CATEGORIES: ComplaintCategory[] = ['maintenance'];
const GENERAL_CATEGORIES: ComplaintCategory[] = ['noise', 'security', 'cleanliness', 'billing', 'other'];
const catIcon: Record<string, string> = { maintenance: '🔧', noise: '🔊', security: '🔒', cleanliness: '🧹', billing: '💳', other: '📋' };

// Schema: property is optional for general complaints, required for property complaints
const schema = z.object({
  title:         z.string().min(5, 'At least 5 characters'),
  description:   z.string().min(10, 'Please describe the issue'),
  category:      z.enum(['maintenance', 'noise', 'security', 'cleanliness', 'billing', 'other']),
  priority:      z.enum(['low', 'medium', 'high', 'urgent']),
  property:      z.string().optional(),
  complaintType: z.enum(['general', 'property']),
});
type FD = z.infer<typeof schema>;

const TabBtn: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count: number }> = ({ active, onClick, icon, label, count }) => (
  <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 'var(--r-sm)', border: active ? 'none' : '1px solid var(--border)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13.5, background: active ? 'var(--brand)' : 'var(--surface)', color: active ? 'white' : 'var(--text-3)', transition: 'all 0.15s' }}>
    {icon}{label}
    <span style={{ background: active ? 'rgba(255,255,255,0.22)' : 'var(--surface-3)', color: active ? 'white' : 'var(--text-3)', borderRadius: 99, fontSize: 11, fontWeight: 700, padding: '1px 7px' }}>{count}</span>
  </button>
);

const ComplaintCard: React.FC<{ complaint: Complaint; onClick: () => void }> = ({ complaint: c, onClick }) => {
  const isProp = PROPERTY_CATEGORIES.includes(c.category);
  return (
    <div onClick={onClick} className="card" style={{ padding: '16px 20px', cursor: 'pointer', marginBottom: 10, borderLeft: `4px solid ${isProp ? '#8b5cf6' : '#2563eb'}` }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: isProp ? 'rgba(139,92,246,0.1)' : 'rgba(37,99,235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{catIcon[c.category] || '📋'}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--text-1)' }}>{c.title}</span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: isProp ? 'rgba(139,92,246,0.1)' : 'rgba(37,99,235,0.1)', color: isProp ? '#7c3aed' : '#1d4ed8' }}>{isProp ? '🏠 Property' : '🌐 General'}</span>
            <StatusBadge status={c.priority} /><StatusBadge status={c.status} />
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '0 0 8px', lineHeight: 1.5 }}>{c.description.slice(0,120)}{c.description.length > 120 ? '…' : ''}</p>
          <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--text-3)', flexWrap: 'wrap' }}>
            {typeof c.property === 'object' && c.property?.title && <span><Building2 size={11} style={{ display: 'inline' }} /> {c.property.title}</span>}
            <span>👤 {typeof c.raisedBy === 'object' ? c.raisedBy.name : 'Tenant'}</span>
            <span>{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</span>
            <span><MessageSquare size={11} style={{ display: 'inline' }} /> {c.comments?.length || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const ComplaintDetail: React.FC<{ complaint: Complaint; onClose: () => void; isOwnerOrAdmin: boolean }> = ({ complaint, onClose, isOwnerOrAdmin }) => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [comment, setComment] = useState('');
  const isProp = PROPERTY_CATEGORIES.includes(complaint.category);

  const statusMut = useMutation({
    mutationFn: (status: ComplaintStatus) => complaintApi.updateStatus(complaint._id, { status }),
    onSuccess: () => { toast.success('Status updated'); qc.invalidateQueries({ queryKey: ['complaints'] }); onClose(); },
    onError: () => toast.error('Failed to update'),
  });

  const commentMut = useMutation({
    mutationFn: () => {
      const fd = new window.FormData();
      fd.append('message', comment);
      return complaintApi.addComment(complaint._id, fd);
    },
    onSuccess: () => { toast.success('Comment added'); setComment(''); qc.invalidateQueries({ queryKey: ['complaints'] }); onClose(); },
    onError: () => toast.error('Failed to add comment'),
  });

  const statusOpts: ComplaintStatus[] = ['pending', 'in_progress', 'resolved', 'closed'];
  const statusBtnColor: Record<string, string> = { pending: '#f59e0b', in_progress: '#2563eb', resolved: '#10b981', closed: '#64748b' };
  const roleColor: Record<string, string> = { tenant: '#2563eb', owner: '#8b5cf6', admin: '#ef4444' };

  return (
    <Modal isOpen title={complaint.title} onClose={onClose} maxWidth={700}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 'var(--r-sm)', background: isProp ? 'rgba(139,92,246,0.08)' : 'rgba(37,99,235,0.08)', marginBottom: 16, border: `1px solid ${isProp ? 'rgba(139,92,246,0.2)' : 'rgba(37,99,235,0.2)'}` }}>
        <span style={{ fontSize: 22 }}>{isProp ? '🏠' : '🌐'}</span>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: isProp ? '#7c3aed' : '#1d4ed8', margin: 0 }}>{isProp ? 'Property Complaint' : 'General Complaint'}</p>
          {typeof complaint.property === 'object' && complaint.property?.title && <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '2px 0 0' }}>📍 {complaint.property.title}</p>}
        </div>
        <div style={{ display: 'flex', gap: 6 }}><StatusBadge status={complaint.priority} /><StatusBadge status={complaint.status} /></div>
      </div>

      <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--r-sm)', padding: 16, marginBottom: 20, border: '1px solid var(--border)' }}>
        <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7, margin: 0 }}>{complaint.description}</p>
        {complaint.resolutionNote && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: '#ecfdf5', borderRadius: 8, borderLeft: '3px solid #10b981' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#059669', margin: '0 0 4px' }}>✅ Resolution Note:</p>
            <p style={{ fontSize: 13, color: '#065f46', margin: 0 }}>{complaint.resolutionNote}</p>
          </div>
        )}
      </div>

      {isOwnerOrAdmin && complaint.status !== 'closed' && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 8 }}>Update Status:</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {statusOpts.filter(s => s !== complaint.status).map(s => (
              <button key={s} onClick={() => statusMut.mutate(s)} disabled={statusMut.isPending}
                style={{ padding: '7px 16px', borderRadius: 'var(--r-sm)', border: `1px solid ${statusBtnColor[s]}`, background: `${statusBtnColor[s]}18`, color: statusBtnColor[s], fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', textTransform: 'capitalize' as const }}>
                {statusMut.isPending ? '…' : s.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', marginBottom: 12 }}>💬 Comments ({complaint.comments?.length || 0})</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 240, overflowY: 'auto', marginBottom: 16 }}>
          {!complaint.comments?.length
            ? <p style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', padding: '20px 0' }}>No comments yet.</p>
            : complaint.comments.map(c => (
              <div key={c._id} style={{ display: 'flex', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: roleColor[c.authorRole] || 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                  {c.authorName.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{c.authorName}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'capitalize' as const }}>{c.authorRole}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-4)', marginLeft: 'auto' }}>{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</span>
                  </div>
                  <div className="comment-bubble">{c.message}</div>
                </div>
              </div>
            ))
          }
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
            {user?.name?.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
          </div>
          <div style={{ flex: 1, display: 'flex', gap: 8 }}>
            <input value={comment} onChange={e => setComment(e.target.value)} placeholder="Write a comment…" style={{ ...inputStyle, flex: 1 }}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && comment.trim() && commentMut.mutate()} />
            <button onClick={() => comment.trim() && commentMut.mutate()} disabled={!comment.trim() || commentMut.isPending}
              style={{ padding: '10px 16px', background: 'var(--brand)', color: 'white', border: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13 }}>
              {commentMut.isPending ? <Spinner size={14} /> : <Send size={14} />}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

const NewComplaintModal: React.FC<{ isOpen: boolean; onClose: () => void; defaultPropertyId?: string; propertyList: any[] }> = ({ isOpen, onClose, defaultPropertyId, propertyList }) => {
  const qc = useQueryClient();
  const [serverErr, setServerErr] = useState('');
  const [cType, setCType] = useState<'general' | 'property'>('general');

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FD>({
    resolver: zodResolver(schema),
    defaultValues: { priority: 'medium', category: 'noise', complaintType: 'general', property: defaultPropertyId || '' },
  });

  const createMut = useMutation({
    mutationFn: (data: FD) => {
      const fd = new window.FormData();
      Object.entries(data).forEach(([k, v]) => {
        if (v !== undefined && v !== '') fd.append(k, String(v));
      });
      return complaintApi.create(fd);
    },
    onSuccess: () => {
      toast.success('Complaint submitted!');
      reset(); setCType('general'); setServerErr(''); onClose();
      qc.invalidateQueries({ queryKey: ['complaints'] });
    },
    onError: (e: any) => setServerErr(e.response?.data?.message || e.message || 'Failed to submit'),
  });

  const handleTypeChange = (t: 'general' | 'property') => {
    setCType(t);
    setValue('complaintType', t);
    setValue('category', t === 'property' ? 'maintenance' : 'noise');
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { onClose(); setServerErr(''); reset(); }} title="Raise a Complaint" maxWidth={600}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        {[
          { type: 'general' as const, icon: '🌐', label: 'General Complaint', desc: 'Noise, security, cleanliness…', color: '#2563eb' },
          { type: 'property' as const, icon: '🏠', label: 'Property Complaint', desc: 'Maintenance, repairs, damages…', color: '#8b5cf6' },
        ].map(opt => (
          <button key={opt.type} type="button" onClick={() => handleTypeChange(opt.type)}
            style={{ padding: '14px', borderRadius: 'var(--r-sm)', cursor: 'pointer', textAlign: 'left' as const, fontFamily: 'var(--font-body)', background: cType === opt.type ? `${opt.color}10` : 'var(--surface-2)', border: `2px solid ${cType === opt.type ? opt.color : 'var(--border)'}`, transition: 'all 0.15s' }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{opt.icon}</div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: cType === opt.type ? opt.color : 'var(--text-1)', marginBottom: 2 }}>{opt.label}</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{opt.desc}</div>
          </button>
        ))}
      </div>
      <form onSubmit={handleSubmit(d => createMut.mutate(d))} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <input type="hidden" {...register('complaintType')} value={cType} />
        {serverErr && <ErrorMessage message={serverErr} />}
        <Field label="Title" error={errors.title?.message}><input className="input" {...register('title')} placeholder={cType === 'property' ? 'e.g. Broken heating unit' : 'e.g. Loud music past midnight'} /></Field>
        <Field label="Description" error={errors.description?.message}><textarea className="input" {...register('description')} rows={4} placeholder="Describe the issue in detail…" style={{ resize: 'vertical' } as React.CSSProperties} /></Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Category">
            <select className="input" {...register('category')}>
              {(cType === 'property' ? PROPERTY_CATEGORIES : GENERAL_CATEGORIES).map(c => <option key={c} value={c}>{catIcon[c]} {c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </Field>
          <Field label="Priority">
            <select className="input" {...register('priority')}>
              {(['low','medium','high','urgent'] as ComplaintPriority[]).map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
          </Field>
        </div>
        {/* Property selector — always show so backend validation passes */}
        <Field label={cType === 'property' ? 'Property *' : 'Related Property (optional)'} error={errors.property?.message}>
          <select className="input" {...register('property')}>
            {cType === 'general' && <option value="">None — general complaint</option>}
            {propertyList.map((p: any) => <option key={p._id} value={p._id}>{p.title}</option>)}
          </select>
        </Field>
        <button type="submit" disabled={createMut.isPending} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
          {createMut.isPending ? <><Spinner size={15} /> Submitting…</> : `Submit ${cType === 'property' ? 'Property' : 'General'} Complaint`}
        </button>
      </form>
    </Modal>
  );
};

const ComplaintsPage: React.FC = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [typeTab, setTypeTab] = useState<ComplaintTypeTab>('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const isOwnerOrAdmin = user?.role === 'owner' || user?.role === 'admin';

  // Fetch properties from backend (for tenant's assigned property pre-fill)
  const { data: propsData } = useQuery({
    queryKey: ['properties-for-complaint'],
    staleTime: 30_000,
    queryFn: async () => {
      const res = await propertyApi.getAll();
      return res.data.data as { properties: any[] };
    },
  });

  // Fetch complaints from backend
  const { data: complData, isLoading } = useQuery({
    queryKey: ['complaints'],
    staleTime: 0,
    queryFn: async () => {
      const res = await complaintApi.getAll({});
      return res.data.data as { complaints: Complaint[]; total: number };
    },
  });

  const allComplaints: Complaint[] = complData?.complaints ?? [];
  const propertyList = propsData?.properties ?? [];
  // Pre-fill with tenant's assigned property if available
  const defaultPropertyId = (user as any)?.assignedProperty?._id || propertyList[0]?._id || '';

  const filtered = useMemo(() => allComplaints.filter(c => {
    if (typeTab === 'general' && PROPERTY_CATEGORIES.includes(c.category)) return false;
    if (typeTab === 'property' && !PROPERTY_CATEGORIES.includes(c.category)) return false;
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (categoryFilter !== 'all' && c.category !== categoryFilter) return false;
    return true;
  }), [allComplaints, typeTab, statusFilter, categoryFilter]);

  const counts = {
    all: allComplaints.length,
    general: allComplaints.filter(c => !PROPERTY_CATEGORIES.includes(c.category)).length,
    property: allComplaints.filter(c => PROPERTY_CATEGORIES.includes(c.category)).length,
  };

  const statusOpts = [{ label: 'All', value: 'all' }, { label: 'Pending', value: 'pending' }, { label: 'In Progress', value: 'in_progress' }, { label: 'Resolved', value: 'resolved' }, { label: 'Closed', value: 'closed' }];
  const catOpts = ['all', 'maintenance', 'noise', 'security', 'cleanliness', 'billing', 'other'];
  const hasFilters = typeTab !== 'all' || statusFilter !== 'all' || categoryFilter !== 'all';

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28, color: 'var(--text-1)', margin: '0 0 5px' }}>Complaints</h1>
          <p style={{ fontSize: 14, color: 'var(--text-3)', margin: 0 }}>{filtered.length} showing · {allComplaints.length} total</p>
        </div>
        {user?.role === 'tenant' && <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={16} /> Raise Complaint</button>}
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <TabBtn active={typeTab === 'all'}      onClick={() => setTypeTab('all')}      icon={<AlertCircle size={15} />} label="All"           count={counts.all} />
        <TabBtn active={typeTab === 'general'}  onClick={() => setTypeTab('general')}  icon={<Globe size={15} />}       label="General"       count={counts.general} />
        <TabBtn active={typeTab === 'property'} onClick={() => setTypeTab('property')} icon={<Building2 size={15} />}   label="Property-based" count={counts.property} />
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '14px 18px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Filter size={14} color="var(--text-3)" />
          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Filters</span>
          {hasFilters && <button onClick={() => { setStatusFilter('all'); setCategoryFilter('all'); setTypeTab('all'); }} style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: 'var(--red)', background: 'var(--red-bg)', border: 'none', padding: '3px 10px', borderRadius: 99, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>✕ Clear</button>}
        </div>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', margin: '0 0 8px' }}>Status</p>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>{statusOpts.map(o => <button key={o.value} onClick={() => setStatusFilter(o.value)} className={`filter-chip ${statusFilter === o.value ? 'active' : ''}`}>{o.label}</button>)}</div>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', margin: '0 0 8px' }}>Category</p>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{catOpts.map(c => <button key={c} onClick={() => setCategoryFilter(c)} className={`filter-chip ${categoryFilter === c ? 'active' : ''}`} style={{ textTransform: 'capitalize' as const }}>{c === 'all' ? 'All' : `${catIcon[c] || ''} ${c}`}</button>)}</div>
      </div>

      {isLoading
        ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={24} /></div>
        : filtered.length === 0
          ? <EmptyState title="No complaints found" message={user?.role === 'tenant' ? 'Click "Raise Complaint" to report an issue.' : 'No complaints match the filters.'} icon={<MessageSquare size={28} color="var(--brand)" />}
              action={user?.role === 'tenant' ? <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={14} /> Raise Complaint</button> : undefined} />
          : <div>{filtered.map(c => <ComplaintCard key={c._id} complaint={c} onClick={() => setSelected(c)} />)}</div>}

      <NewComplaintModal isOpen={showForm} onClose={() => setShowForm(false)} defaultPropertyId={defaultPropertyId} propertyList={propertyList} />
      {selected && <ComplaintDetail complaint={selected} onClose={() => { setSelected(null); qc.invalidateQueries({ queryKey: ['complaints'] }); }} isOwnerOrAdmin={isOwnerOrAdmin} />}
    </div>
  );
};

export default ComplaintsPage;