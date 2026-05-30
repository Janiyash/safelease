import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell, CheckCheck, Trash2, Filter, BanknoteIcon,
  AlertCircle, Megaphone, Wrench, Info, X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { notificationApi } from '../../api/services';
import { AppNotification } from '../../types';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

// ── Category config ────────────────────────────────────────────────────────────
type NotifCategory = 'all' | 'rent' | 'payment' | 'complaint' | 'notice' | 'maintenance' | 'system';

const CATEGORY_CONFIG: Record<NotifCategory, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  all:         { label: 'All',         icon: <Bell size={14} />,        color: 'var(--text-2)',  bg: 'var(--surface-2)' },
  rent:        { label: 'Rent',        icon: <BanknoteIcon size={14} />, color: '#f59e0b',        bg: '#fffbeb' },
  payment:     { label: 'Payments',    icon: <BanknoteIcon size={14} />, color: '#10b981',        bg: '#ecfdf5' },
  complaint:   { label: 'Complaints',  icon: <AlertCircle size={14} />,  color: '#ef4444',        bg: '#fef2f2' },
  notice:      { label: 'Notices',     icon: <Megaphone size={14} />,    color: '#8b5cf6',        bg: '#f5f3ff' },
  maintenance: { label: 'Maintenance', icon: <Wrench size={14} />,       color: '#f59e0b',        bg: '#fffbeb' },
  system:      { label: 'System',      icon: <Info size={14} />,         color: '#2563eb',        bg: '#eff6ff' },
};

const TYPE_COLORS = {
  success: { bg: '#ecfdf5', color: '#10b981', border: '#a7f3d0' },
  warning: { bg: '#fffbeb', color: '#f59e0b', border: '#fde68a' },
  error:   { bg: '#fef2f2', color: '#ef4444', border: '#fecaca' },
  info:    { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
};

const TYPE_ICONS: Record<string, string> = {
  success: '✅', warning: '⚠️', error: '🚨', info: 'ℹ️',
};

// ── Single notification item ───────────────────────────────────────────────────
const NotificationItem: React.FC<{
  notification: AppNotification & { category?: string };
  onRead: (id: string) => void;
  onDismiss: (id: string) => void;
}> = ({ notification: n, onRead, onDismiss }) => {
  const tc = TYPE_COLORS[n.type] || TYPE_COLORS.info;
  const timeAgo = formatDistanceToNow(new Date(n.createdAt), { addSuffix: true });

  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        padding: '14px 16px',
        background: n.read ? 'transparent' : tc.bg,
        borderLeft: `3px solid ${n.read ? 'transparent' : tc.border}`,
        borderBottom: '1px solid var(--border)',
        cursor: 'pointer',
        transition: 'background 0.15s',
      }}
      onClick={() => { if (!n.read) onRead(n._id); if (n.link) window.location.href = n.link; }}
    >
      <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{TYPE_ICONS[n.type] || 'ℹ️'}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 13.5, fontWeight: n.read ? 400 : 600,
          color: 'var(--text-1)', margin: '0 0 3px', lineHeight: 1.5,
        }}>
          {n.message}
        </p>
        <p style={{ fontSize: 11, color: 'var(--text-4)', margin: 0 }}>{timeAgo}</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {!n.read && (
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: tc.color }} />
        )}
        <button
          onClick={e => { e.stopPropagation(); onDismiss(n._id); }}
          title="Dismiss"
          style={{
            width: 24, height: 24, borderRadius: 6, border: 'none',
            background: 'transparent', cursor: 'pointer', color: 'var(--text-4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.1s, color 0.1s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#ef4444'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-4)'; }}
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
};

// ── Main notification center page ─────────────────────────────────────────────
const NotificationCenter: React.FC = () => {
  const { refreshUser } = useAuth();
  const qc = useQueryClient();
  const [category, setCategory]   = useState<NotifCategory>('all');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage]           = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', category, unreadOnly, page],
    staleTime: 0,
    queryFn: async () => {
      const params: Record<string, any> = { page, limit: 20 };
      if (category !== 'all') params.category = category;
      if (unreadOnly) params.unreadOnly = 'true';
      const res = await notificationApi.getAll(params);
      return res.data.data;
    },
  });

  const notifications: (AppNotification & { category?: string })[] = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;
  const totalPages  = data?.pages || 1;

  const invalidate = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: ['notifications'] });
    await refreshUser();
  }, [qc, refreshUser]);

  const readMut = useMutation({
    mutationFn: (ids: string[]) => notificationApi.markRead({ ids }),
    onSuccess: invalidate,
  });

  const readAllMut = useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: async () => { await invalidate(); toast.success('All notifications marked as read'); },
  });

  const dismissMut = useMutation({
    mutationFn: (id: string) => notificationApi.dismiss(id),
    onSuccess: invalidate,
  });

  const dismissAllMut = useMutation({
    mutationFn: () => notificationApi.dismissAll(),
    onSuccess: async () => { await invalidate(); toast.success('All notifications cleared'); },
  });

  const handleRead  = (id: string) => readMut.mutate([id]);
  const handleDismiss = (id: string) => dismissMut.mutate(id);

  return (
    <div style={{ padding: '24px var(--content-px)', maxWidth: 720 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 24, color: 'var(--text-1)', margin: 0 }}>
            Notifications
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-3)', margin: '4px 0 0' }}>
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {unreadCount > 0 && (
            <button
              onClick={() => readAllMut.mutate()}
              disabled={readAllMut.isPending}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-2)', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)' }}
            >
              <CheckCheck size={14} /> Mark all read
            </button>
          )}
          <button
            onClick={() => dismissAllMut.mutate()}
            disabled={dismissAllMut.isPending || notifications.length === 0}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: '#fef2f2', color: '#ef4444', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)' }}
          >
            <Trash2 size={14} /> Clear all
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <Filter size={14} color="var(--text-3)" />
        {(Object.keys(CATEGORY_CONFIG) as NotifCategory[]).map(cat => {
          const cfg    = CATEGORY_CONFIG[cat];
          const active = category === cat;
          return (
            <button
              key={cat}
              onClick={() => { setCategory(cat); setPage(1); }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '5px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'var(--font-body)',
                border: `1px solid ${active ? cfg.color : 'var(--border)'}`,
                background: active ? cfg.bg : 'var(--surface)',
                color: active ? cfg.color : 'var(--text-2)',
                transition: 'all 0.15s',
              }}
            >
              {cfg.icon} {cfg.label}
            </button>
          );
        })}
        <button
          onClick={() => { setUnreadOnly(!unreadOnly); setPage(1); }}
          style={{
            marginLeft: 'auto', padding: '5px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'var(--font-body)',
            border: `1px solid ${unreadOnly ? 'var(--brand)' : 'var(--border)'}`,
            background: unreadOnly ? '#eff6ff' : 'var(--surface)',
            color: unreadOnly ? 'var(--brand)' : 'var(--text-2)',
          }}
        >
          Unread only
        </button>
      </div>

      {/* List */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-3)' }}>Loading notifications…</div>
        ) : notifications.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center' }}>
            <Bell size={40} color="var(--text-4)" style={{ marginBottom: 12 }} />
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-2)', margin: '0 0 6px' }}>
              {unreadOnly ? 'No unread notifications' : 'No notifications'}
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>
              {unreadOnly ? 'Switch off the unread filter to see all.' : "You're all caught up!"}
            </p>
          </div>
        ) : (
          notifications.map(n => (
            <NotificationItem
              key={n._id}
              notification={n}
              onRead={handleRead}
              onDismiss={handleDismiss}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            style={{ padding: '6px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-2)', cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.5 : 1, fontFamily: 'var(--font-body)', fontSize: 13 }}
          >
            Previous
          </button>
          <span style={{ padding: '6px 12px', fontSize: 13, color: 'var(--text-3)' }}>
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
            style={{ padding: '6px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-2)', cursor: page >= totalPages ? 'not-allowed' : 'pointer', opacity: page >= totalPages ? 0.5 : 1, fontFamily: 'var(--font-body)', fontSize: 13 }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;