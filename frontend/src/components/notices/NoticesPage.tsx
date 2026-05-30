import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Bell, Plus, Trash2, Pin, Globe, Building2 } from 'lucide-react';
import { noticeApi, propertyApi } from '../../api/services';
import { useAuth } from '../../context/AuthContext';
import { Notice, NoticeCategory } from '../../types';
import { Modal, StatusBadge, EmptyState, ErrorMessage, Field, Spinner } from '../shared';
import { formatDistanceToNow, format } from 'date-fns';

const categoryConfig: Record<NoticeCategory, { color: string; bg: string; icon: string }> = {
  emergency:   { color: '#dc2626', bg: '#fef2f2', icon: '🚨' },
  maintenance: { color: '#d97706', bg: '#fffbeb', icon: '🔧' },
  general:     { color: '#2563eb', bg: '#eff6ff', icon: '📢' },
  event:       { color: '#059669', bg: '#ecfdf5', icon: '🎉' },
  billing:     { color: '#7c3aed', bg: '#f5f3ff', icon: '💳' },
};

const schema = z.object({
  title:    z.string().min(5,  'Title must be at least 5 characters'),
  content:  z.string().min(10, 'Content must be at least 10 characters'),
  category: z.enum(['general', 'emergency', 'maintenance', 'event', 'billing']),
  isPinned: z.boolean().optional(),
  isGlobal: z.boolean().optional(),
  // ✅ FIX: property is always optional — empty string is treated as undefined
  property: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

// ── Notice Card ────────────────────────────────────────────────────────────────
const NoticeCard: React.FC<{
  notice: Notice;
  canDelete: boolean;
  onDelete: () => void;
  onRead: () => void;
  userId: string;
}> = ({ notice: n, canDelete, onDelete, onRead, userId }) => {
  const cfg    = categoryConfig[n.category];
  const isRead = n.readBy?.includes(userId);

  return (
    <div
      onClick={onRead}
      className="card"
      style={{
        padding: '20px 22px', cursor: 'pointer',
        borderLeft: `4px solid ${cfg.color}`,
        transition: 'all 0.15s',
        opacity: isRead ? 0.82 : 1,
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none';             e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 18 }}>{cfg.icon}</span>
            {n.isPinned && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: cfg.color, background: cfg.bg, padding: '2px 8px', borderRadius: 6 }}>
                <Pin size={10} /> PINNED
              </span>
            )}
            <StatusBadge status={n.category} />
            {n.isGlobal ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: 6 }}>
                <Globe size={9} /> Global
              </span>
            ) : typeof n.property === 'object' && n.property?.title ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, background: 'rgba(139,92,246,0.1)', color: '#7c3aed', padding: '2px 8px', borderRadius: 6 }}>
                <Building2 size={9} /> {n.property.title}
              </span>
            ) : null}
            {!isRead && (
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color, display: 'inline-block', flexShrink: 0 }} />
            )}
          </div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--text-1)', margin: '0 0 8px' }}>{n.title}</h3>
          <p style={{ fontSize: 13.5, color: 'var(--text-2)', margin: '0 0 12px', lineHeight: 1.7 }}>{n.content}</p>
          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-3)', flexWrap: 'wrap' }}>
            <span>By {typeof n.author === 'object' ? n.author.name : 'Admin'}</span>
            <span>{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</span>
            {n.expiresAt && <span>Expires {format(new Date(n.expiresAt), 'MMM d, yyyy')}</span>}
          </div>
        </div>
        {canDelete && (
          <button
            onClick={e => { e.stopPropagation(); onDelete(); }}
            style={{ padding: '7px', background: '#fef2f2', border: 'none', borderRadius: 8, color: '#dc2626', cursor: 'pointer', flexShrink: 0 }}
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

// ── Main Page ──────────────────────────────────────────────────────────────────
const NoticesPage: React.FC = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm,       setShowForm]       = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [scopeFilter,    setScopeFilter]    = useState<'all' | 'global' | 'property'>('all');
  const [serverError,    setServerError]    = useState('');

  const canCreate = user?.role === 'owner' || user?.role === 'admin';
  const isAdmin   = user?.role === 'admin';
  const isOwner   = user?.role === 'owner';
  const isTenant  = user?.role === 'tenant';

  // Fetch properties for the dropdown
  const { data: propsData } = useQuery({
    queryKey: ['my-properties-for-notice'],
    staleTime: 0,
    queryFn: () => propertyApi.getAll().then(r => r.data.data),
    enabled: canCreate,
  });

  // Fetch notices
  const { data, isLoading } = useQuery({
    queryKey: ['notices'],
    staleTime: 0,
    queryFn: () => noticeApi.getAll({}).then(r => r.data.data),
  });

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { category: 'general', isPinned: false, isGlobal: false, property: '' },
  });

  const watchedIsGlobal = watch('isGlobal');

  // ── CREATE ────────────────────────────────────────────────────────────────────
  const createMut = useMutation({
    mutationFn: (d: FormData) => {
      // ✅ FIX: Build payload explicitly — NEVER send property="" to MongoDB
      // When isGlobal is true OR property is empty string → omit the property field entirely
      const payload: any = {    
        title:    d.title,
        content:  d.content,
        category: d.category,
        isPinned: !!d.isPinned,
        isGlobal: !!d.isGlobal,
      };

      // Only add property if it has a real non-empty value AND notice is not global
      if (!d.isGlobal && d.property && d.property.trim() !== '') {
        payload.property = d.property;
      }
      // When isGlobal=true → property is intentionally omitted → no BSONError

      return noticeApi.create(payload).then(r => r.data);
    },
    onSuccess: () => {
      toast.success('Notice posted!');
      reset();
      setShowForm(false);
      setServerError('');
      qc.invalidateQueries({ queryKey: ['notices'] });
    },
    onError: (e: any) => {
      setServerError(e.response?.data?.message || 'Failed to post notice. Is the backend running?');
    },
  });

  // ── DELETE ────────────────────────────────────────────────────────────────────
  const deleteMut = useMutation({
    mutationFn: (id: string) => noticeApi.delete(id).then(r => r.data),
    onSuccess: () => { toast.success('Notice deleted'); qc.invalidateQueries({ queryKey: ['notices'] }); },
    onError:   () => toast.error('Failed to delete notice'),
  });

  // ── MARK READ ─────────────────────────────────────────────────────────────────
  const readMut = useMutation({
    mutationFn: (id: string) => noticeApi.markRead(id).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notices'] }),
  });

  const allNotices: Notice[] = data?.notices || [];

  // Visibility filtering per role
  const visibleNotices = useMemo(() => {
    if (isAdmin) return allNotices;

    if (isOwner) {
      return allNotices.filter(n => {
        const authorId   = typeof n.author === 'object' ? n.author._id : n.author;
        const isMyNotice = authorId === user?._id;
        const isAdminGlobal = n.isGlobal && (typeof n.author === 'object' ? (n.author as any).role === 'admin' : false);
        return isMyNotice || isAdminGlobal;
      });
    }

    if (isTenant) {
      return allNotices.filter(n => {
        if (n.isGlobal) return true;
        const noticePropertyId = typeof n.property === 'object' ? (n.property as any)?._id : n.property;
        const tenantPropertyId = (user as any)?.property || (user as any)?.assignedProperty;
        return noticePropertyId && tenantPropertyId && noticePropertyId === tenantPropertyId;
      });
    }

    return allNotices;
  }, [allNotices, isAdmin, isOwner, isTenant, user]);

  // Client-side category + scope filters
  const filtered = useMemo(() => visibleNotices.filter(n => {
    if (categoryFilter !== 'all' && n.category !== categoryFilter) return false;
    if (scopeFilter === 'global'   && !n.isGlobal) return false;
    if (scopeFilter === 'property' &&  n.isGlobal) return false;
    return true;
  }), [visibleNotices, categoryFilter, scopeFilter]);

  const pinned  = filtered.filter(n =>  n.isPinned);
  const regular = filtered.filter(n => !n.isPinned);

  const categories: NoticeCategory[] = ['general', 'emergency', 'maintenance', 'event', 'billing'];
  const propertyList = propsData?.properties || [];
  const hasFilters   = categoryFilter !== 'all' || scopeFilter !== 'all';
  const unreadCount  = visibleNotices.filter(n => !n.readBy?.includes(user?._id || '')).length;

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28, color: 'var(--text-1)', margin: '0 0 5px', letterSpacing: '-0.02em' }}>Notice Board</h1>
          <p style={{ fontSize: 14, color: 'var(--text-3)', margin: 0 }}>{filtered.length} notices · {unreadCount} unread</p>
        </div>
        {canCreate && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Post Notice
          </button>
        )}
      </div>

      {/* Info banners */}
      {isTenant && (
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '10px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Bell size={16} color="#2563eb" style={{ flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: '#1d4ed8', margin: 0 }}>
            You can see <strong>global notices</strong> and notices specific to your property.
          </p>
        </div>
      )}
      {isOwner && (
        <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 10, padding: '10px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Bell size={16} color="#7c3aed" style={{ flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: '#6d28d9', margin: 0 }}>
            Mark a notice as <strong>Global</strong> or link it to a property for tenants to see it.
          </p>
        </div>
      )}

      {/* Category filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <button onClick={() => setCategoryFilter('all')} className={`filter-chip ${categoryFilter === 'all' ? 'active' : ''}`}>All Categories</button>
        {categories.map(c => (
          <button key={c} onClick={() => setCategoryFilter(c)}
            className={`filter-chip ${categoryFilter === c ? 'active' : ''}`}
            style={categoryFilter === c ? { background: categoryConfig[c].color, borderColor: categoryConfig[c].color } : {}}>
            {categoryConfig[c].icon} {c.charAt(0).toUpperCase() + c.slice(1)}
          </button>
        ))}
      </div>

      {/* Scope filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        {([
          { label: 'All Notices',       value: 'all',      icon: '📋' },
          { label: 'Global',            value: 'global',   icon: '🌐' },
          { label: 'Property-specific', value: 'property', icon: '🏠' },
        ] as const).map(opt => (
          <button key={opt.value} onClick={() => setScopeFilter(opt.value)}
            className={`filter-chip ${scopeFilter === opt.value ? 'active' : ''}`}>
            {opt.icon} {opt.label}
          </button>
        ))}
        {hasFilters && (
          <button
            onClick={() => { setCategoryFilter('all'); setScopeFilter('all'); }}
            style={{ fontSize: 12, fontWeight: 600, color: 'var(--red)', background: 'var(--red-bg)', border: 'none', padding: '5px 12px', borderRadius: 99, cursor: 'pointer', fontFamily: 'var(--font-body)' }}
          >✕ Clear filters</button>
        )}
      </div>

      {/* Notice list */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={24} /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No notices"
          message={canCreate ? 'Click "Post Notice" to create an announcement.' : 'No notices available right now.'}
          icon={<Bell size={28} color="var(--brand)" />}
          action={canCreate ? (
            <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={14} /> Post Notice</button>
          ) : undefined}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {pinned.length > 0 && (
            <>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>📌 Pinned</p>
              {pinned.map(n => (
                <NoticeCard key={n._id} notice={n} canDelete={canCreate}
                  onDelete={() => deleteMut.mutate(n._id)}
                  onRead={() => readMut.mutate(n._id)}
                  userId={user?._id || ''} />
              ))}
              {regular.length > 0 && (
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '8px 0 4px' }}>All Notices</p>
              )}
            </>
          )}
          {regular.map(n => (
            <NoticeCard key={n._id} notice={n} canDelete={canCreate}
              onDelete={() => deleteMut.mutate(n._id)}
              onRead={() => readMut.mutate(n._id)}
              userId={user?._id || ''} />
          ))}
        </div>
      )}

      {/* Create notice modal */}
      <Modal isOpen={showForm} onClose={() => { setShowForm(false); setServerError(''); reset(); }} title="Post New Notice" maxWidth={540}>
        <form onSubmit={handleSubmit(d => createMut.mutate(d))} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {serverError && <ErrorMessage message={serverError} />}

          {/* Visibility hint */}
          <div style={{ background: isOwner ? '#f5f3ff' : '#eff6ff', border: `1px solid ${isOwner ? '#ddd6fe' : '#bfdbfe'}`, borderRadius: 8, padding: '10px 14px' }}>
            <p style={{ fontSize: 12.5, color: isOwner ? '#6d28d9' : '#1d4ed8', margin: 0 }}>
              {isOwner
                ? watchedIsGlobal
                  ? '🌐 This notice will be visible to all tenants and admins.'
                  : '🏠 Select "For Property" below to target a specific tenant, or check "Global notice" to reach all tenants.'
                : '👁️ Your global notices are visible to all users including owners and tenants.'
              }
            </p>
          </div>

          <Field label="Title" error={errors.title?.message}>
            <input className="input" {...register('title')} placeholder="Brief notice title" />
          </Field>

          <Field label="Content" error={errors.content?.message}>
            <textarea className="input" {...register('content')} rows={4}
              placeholder="Full notice content…"
              style={{ resize: 'vertical' } as React.CSSProperties} />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Category" error={errors.category?.message}>
              <select className="input" {...register('category')}>
                {categories.map(c => (
                  <option key={c} value={c}>{categoryConfig[c].icon} {c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </Field>

            {/* ✅ Only show property dropdown when NOT global AND properties exist */}
            {propertyList.length > 0 && !watchedIsGlobal && (
              <Field label="For Property (optional)">
                <select className="input" {...register('property')}>
                  <option value="">All properties (no specific target)</option>
                  {propertyList.map((p: any) => (
                    <option key={p._id} value={p._id}>{p.title}</option>
                  ))}
                </select>
              </Field>
            )}
          </div>

          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 600, color: 'var(--text-2)', cursor: 'pointer' }}>
              <input type="checkbox" {...register('isPinned')} style={{ width: 16, height: 16, accentColor: 'var(--brand)' }} />
              📌 Pin to top
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 600, color: 'var(--text-2)', cursor: 'pointer' }}>
              <input type="checkbox" {...register('isGlobal')} style={{ width: 16, height: 16, accentColor: 'var(--brand)' }} />
              🌐 Global notice <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-3)' }}>(visible to all tenants)</span>
            </label>
          </div>

          <button type="submit" disabled={createMut.isPending} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
            {createMut.isPending ? <><Spinner size={15} /> Posting…</> : 'Post Notice'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default NoticesPage;
