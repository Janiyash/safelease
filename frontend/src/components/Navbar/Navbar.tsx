import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  ShieldCheck, Bell, ChevronDown, User, Settings, LogOut,
  Menu, X, LayoutDashboard, Building2, AlertCircle, Bell as BellIcon,
  BarChart3, Users, DollarSign, FileText, Wrench, Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const roleConfig = {
  tenant: { label: 'Tenant', color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
  owner:  { label: 'Owner',  color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  admin:  { label: 'Admin',  color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
};

const navByRole = {
  tenant: [
    { label: 'Dashboard',   path: '/tenant',             icon: LayoutDashboard },
    { label: 'Properties', path: '/tenant/property',    icon: Building2 },
    { label: 'Complaints',  path: '/tenant/complaints',  icon: AlertCircle },
    { label: 'Notices',     path: '/tenant/notices',     icon: BellIcon },
    { label: 'Payments',    path: '/tenant/payments',    icon: DollarSign },
    { label: 'Documents',   path: '/tenant/documents',   icon: FileText },
    { label: 'Maintenance', path: '/tenant/maintenance', icon: Wrench },
  ],
  owner: [
    { label: 'Dashboard',   path: '/owner',              icon: LayoutDashboard },
    { label: 'Properties',  path: '/owner/properties',   icon: Building2 },
    { label: 'Complaints',  path: '/owner/complaints',   icon: AlertCircle },
    { label: 'Notices',     path: '/owner/notices',      icon: BellIcon },
    { label: 'Payments',    path: '/owner/payments',     icon: DollarSign },
    { label: 'Documents',   path: '/owner/documents',    icon: FileText },
    { label: 'Maintenance', path: '/owner/maintenance',  icon: Wrench },
  ],
  admin: [
    { label: 'Dashboard',    path: '/admin',              icon: LayoutDashboard },
    { label: 'Properties',   path: '/admin/properties',   icon: Building2 },
    { label: 'Complaints',   path: '/admin/complaints',   icon: AlertCircle },
    { label: 'Notices',      path: '/admin/notices',      icon: BellIcon },
    { label: 'Users',        path: '/admin/users',        icon: Users },
    { label: 'Payments',     path: '/admin/payments',     icon: DollarSign },
    { label: 'Rent Monitor', path: '/admin/rent-monitor', icon: Zap },
    { label: 'Documents',    path: '/admin/documents',    icon: FileText },
    { label: 'Maintenance',  path: '/admin/maintenance',  icon: Wrench },
  ],
};

const useClickOutside = (handler: () => void) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) handler(); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [handler]);
  return ref;
};

const Avatar: React.FC<{ name: string; avatar?: string; size?: number; color?: string }> = ({ name, avatar, size = 32, color = '#2563eb' }) => {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  if (avatar) return <img src={avatar} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: size * 0.35, fontWeight: 700, flexShrink: 0 }}>
      {initials}
    </div>
  );
};

const NotificationDropdown: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { user } = useAuth();
  const notifications = user?.notifications?.slice(0, 6) || [];
  const unread = notifications.filter(n => !n.read).length;
  const typeIcon: Record<string, string> = { success: '✅', warning: '⚠️', error: '🚨', info: 'ℹ️' };
  return (
    <div className="dropdown-menu" style={{ width: 340, right: 0 }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>Notifications {unread > 0 && <span style={{ background: 'var(--red-bg)', color: 'var(--red)', fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 99, marginLeft: 6 }}>{unread}</span>}</span>
      </div>
      {notifications.length === 0 ? (
        <div style={{ padding: '32px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🔔</div>
          <p style={{ fontSize: 13, color: 'var(--text-3)' }}>No notifications yet</p>
        </div>
      ) : notifications.map(n => (
        <button key={n._id} className="dropdown-item" style={{ borderLeft: `3px solid ${n.read ? 'transparent' : 'var(--brand)'}`, padding: '10px 14px', alignItems: 'flex-start', gap: 10 }}>
          <span style={{ flexShrink: 0, fontSize: 16 }}>{typeIcon[n.type]}</span>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <p style={{ fontSize: 13, fontWeight: n.read ? 400 : 600, color: 'var(--text-1)', margin: 0 }}>{n.message}</p>
            <p style={{ fontSize: 11, color: 'var(--text-4)', margin: '3px 0 0' }}>{new Date(n.createdAt).toLocaleDateString()}</p>
          </div>
          {!n.read && <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--brand)', flexShrink: 0, marginTop: 4 }} />}
        </button>
      ))}
    </div>
  );
};

const ProfileDropdown: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const cfg = user ? roleConfig[user.role] : roleConfig.tenant;
  const handleLogout = async () => {
    onClose();
    await logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };
  return (
    <div className="dropdown-menu" style={{ width: 224, right: 0 }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Avatar name={user?.name || ''} avatar={user?.avatar} size={36} color={cfg.color} />
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-1)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</p>
            <p style={{ fontSize: 11.5, color: 'var(--text-3)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</p>
          </div>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: cfg.bg, color: cfg.color }}>{cfg.label}</div>
      </div>
      <div style={{ padding: '6px 0' }}>
        <button className="dropdown-item" onClick={() => { onClose(); navigate('/profile'); }}><User size={15} /> Profile</button>
        <button className="dropdown-item" onClick={() => { onClose(); navigate('/settings/security'); }}><ShieldCheck size={15} /> Security &amp; 2FA</button>
        <button className="dropdown-item" onClick={() => { onClose(); navigate('/settings'); }}><Settings size={15} /> Settings</button>
        <div className="divider" />
        <button className="dropdown-item danger" onClick={handleLogout}><LogOut size={15} /> Sign out</button>
      </div>
    </div>
  );
};

const Navbar: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const notifRef   = useClickOutside(() => setShowNotif(false));
  const profileRef = useClickOutside(() => setShowProfile(false));

  const navItems    = user ? navByRole[user.role] : [];
  const cfg         = user ? roleConfig[user.role] : roleConfig.tenant;
  const unreadCount = user?.notifications?.filter(n => !n.read).length || 0;

  return (
    <>
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, height: 'var(--nav-h)', background: 'var(--nav-bg)', borderBottom: '1px solid var(--nav-border)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', display: 'flex', alignItems: 'center', padding: '0 var(--content-px)', gap: 0 }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none', flexShrink: 0, marginRight: 28 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(37,99,235,0.35)' }}>
            <ShieldCheck size={18} color="white" />
          </div>
          <div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, color: 'var(--text-1)', letterSpacing: '-0.02em' }}>Safe</span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, color: 'var(--brand)', letterSpacing: '-0.02em' }}>Lease</span>
          </div>
        </Link>

        {/* Desktop nav links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, overflowX: 'auto' }} className="desktop-nav">
          {navItems.map(({ label, path, icon: Icon }) => {
            const active = location.pathname === path;
            const isMonitor = path === '/admin/rent-monitor';
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '6px 11px', borderRadius: 'var(--r-sm)', border: 'none',
                  background: active ? (isMonitor ? 'rgba(245,158,11,0.15)' : 'var(--brand-light)') : 'transparent',
                  color: active ? (isMonitor ? '#b45309' : 'var(--brand)') : 'var(--text-3)',
                  fontFamily: 'var(--font-body)', fontWeight: active ? 600 : 500,
                  fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--surface-3)'; e.currentTarget.style.color = 'var(--text-1)'; }}}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-3)'; }}}
              >
                <Icon size={14} />{label}
              </button>
            );
          })}
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 8 }}>
          <div ref={notifRef} style={{ position: 'relative' }}>
            <button onClick={() => { setShowNotif(v => !v); setShowProfile(false); }}
              style={{ position: 'relative', width: 36, height: 36, borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-3)', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text-1)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)';   e.currentTarget.style.color = 'var(--text-3)'; }}
            >
              <Bell size={15} />
              {unreadCount > 0 && <span style={{ position: 'absolute', top: 5, right: 5, width: 8, height: 8, background: 'var(--red)', borderRadius: '50%', border: '2px solid white' }} />}
            </button>
            {showNotif && <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0 }}><NotificationDropdown onClose={() => setShowNotif(false)} /></div>}
          </div>

          <div ref={profileRef} style={{ position: 'relative' }}>
            <button onClick={() => { setShowProfile(v => !v); setShowNotif(false); }}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '4px 7px 4px 4px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}
            >
              <Avatar name={user?.name || 'User'} avatar={user?.avatar} size={26} color={cfg.color} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name?.split(' ')[0]}</span>
              <ChevronDown size={12} color="var(--text-4)" style={{ transform: showProfile ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
            {showProfile && <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0 }}><ProfileDropdown onClose={() => setShowProfile(false)} /></div>}
          </div>

          <button onClick={() => setMobileOpen(v => !v)} className="mobile-menu-btn btn btn-ghost btn-icon" style={{ display: 'none' }}>
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div style={{ position: 'fixed', top: 'var(--nav-h)', left: 0, right: 0, background: 'var(--surface)', borderBottom: '1px solid var(--border)', zIndex: 199, padding: '12px var(--content-px)', display: 'flex', flexDirection: 'column', gap: 4, boxShadow: 'var(--shadow-lg)', maxHeight: '70vh', overflowY: 'auto' }}>
          {navItems.map(({ label, path, icon: Icon }) => {
            const active = location.pathname === path;
            return (
              <button key={path} onClick={() => { navigate(path); setMobileOpen(false); }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 'var(--r-sm)', border: 'none', background: active ? 'var(--brand-light)' : 'transparent', color: active ? 'var(--brand)' : 'var(--text-2)', fontFamily: 'var(--font-body)', fontWeight: active ? 600 : 500, fontSize: 14, cursor: 'pointer', width: '100%', textAlign: 'left' }}>
                <Icon size={16} />{label}
              </button>
            );
          })}
        </div>
      )}

      <style>{`
        @media (max-width: 900px) { .desktop-nav { display: none !important; } .mobile-menu-btn { display: flex !important; } }
      `}</style>
    </>
  );
};

export default Navbar;
