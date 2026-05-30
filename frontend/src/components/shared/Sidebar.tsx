import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Building2, AlertCircle, Bell, Users, BarChart3, LogOut, ChevronLeft, ChevronRight, ShieldCheck, CreditCard, Zap, IndianRupee } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const navByRole = {
  tenant: [
    { label: 'Dashboard',    icon: Home,         path: '/tenant' },
    { label: 'My Property',  icon: Building2,    path: '/tenant/property' },
    { label: 'Complaints',   icon: AlertCircle,  path: '/tenant/complaints' },
    { label: 'Notices',      icon: Bell,         path: '/tenant/notices' },
    { label: 'Payments',     icon: CreditCard,   path: '/tenant/payments' },
    { label: 'Rent',         icon: IndianRupee,  path: '/tenant/rent' },
  ],
  owner: [
    { label: 'Dashboard',    icon: Home,         path: '/owner' },
    { label: 'Properties',   icon: Building2,    path: '/owner/properties' },
    { label: 'Complaints',   icon: AlertCircle,  path: '/owner/complaints' },
    { label: 'Notices',      icon: Bell,         path: '/owner/notices' },
    { label: 'Payments',     icon: CreditCard,   path: '/owner/payments' },
    { label: 'Rent',         icon: IndianRupee,  path: '/owner/rent' },
  ],
  admin: [
    { label: 'Dashboard',    icon: Home,         path: '/admin' },
    { label: 'Properties',   icon: Building2,    path: '/admin/properties' },
    { label: 'Complaints',   icon: AlertCircle,  path: '/admin/complaints' },
    { label: 'Notices',      icon: Bell,         path: '/admin/notices' },
    { label: 'Users',        icon: Users,        path: '/admin/users' },
    { label: 'Analytics',    icon: BarChart3,    path: '/admin/analytics' },
    { label: 'Payments',     icon: CreditCard,   path: '/admin/payments' },
    { label: 'Rent',         icon: IndianRupee,  path: '/admin/rent' },
    { label: 'Rent Monitor', icon: Zap,          path: '/admin/rent-monitor' },
  ],
};

const roleColors = { tenant: '#06b6d4', owner: '#8b5cf6', admin: '#4361ee' };
const roleLabels = { tenant: 'Tenant', owner: 'Property Owner', admin: 'Administrator' };

const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = user ? navByRole[user.role] : [];
  const roleColor = user ? roleColors[user.role] : 'var(--blue)';

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out');
    navigate('/login');
  };

  return (
    <aside style={{ width: collapsed ? 72 : 232, minHeight: '100vh', background: 'var(--surface)', boxShadow: '6px 0 24px rgba(163,168,210,0.25)', display: 'flex', flexDirection: 'column', padding: '20px 0', transition: 'width 0.3s var(--ease)', position: 'relative', zIndex: 10, flexShrink: 0 }}>
      {/* Logo */}
      <div style={{ padding: collapsed ? '0 16px 28px' : '0 20px 28px', display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
        <div style={{ width: 38, height: 38, background: roleColor, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `4px 4px 10px rgba(67,97,238,0.35), -2px -2px 6px rgba(255,255,255,0.7)`, flexShrink: 0 }}>
          <ShieldCheck size={20} color="white" />
        </div>
        {!collapsed && (
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)', letterSpacing: '-0.3px' }}>SafeLease</div>
            <div style={{ fontSize: 10, color: roleColor, fontWeight: 700, letterSpacing: '0.05em' }}>{user ? roleLabels[user.role].toUpperCase() : ''}</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '0 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {navItems.map(({ label, icon: Icon, path }) => {
          const active = location.pathname === path;
          return (
            <button key={path} onClick={() => navigate(path)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: collapsed ? '12px 16px' : '12px 14px', borderRadius: 'var(--r-md)', border: 'none', cursor: 'pointer', background: active ? 'var(--blue-light)' : 'transparent', boxShadow: active ? 'var(--neu-inset)' : 'none', color: active ? roleColor : 'var(--ink3)', fontFamily: 'var(--sans)', fontWeight: active ? 600 : 400, fontSize: 14, transition: 'all 0.2s var(--ease)', width: '100%', textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden' }}>
              <Icon size={18} style={{ flexShrink: 0, color: active ? roleColor : 'var(--ink3)' }} />
              {!collapsed && label}
              {!collapsed && active && <div style={{ marginLeft: 'auto', width: 6, height: 6, background: roleColor, borderRadius: '50%', boxShadow: `0 0 6px ${roleColor}` }} />}
            </button>
          );
        })}
      </nav>

      {/* Collapse */}
      <div style={{ padding: '8px 10px' }}>
        <button onClick={() => setCollapsed(c => !c)} style={{ width: '100%', padding: 10, background: 'var(--surface)', border: 'none', borderRadius: 'var(--r-md)', boxShadow: 'var(--neu-sm)', cursor: 'pointer', color: 'var(--ink3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* User card */}
      {!collapsed && user && (
        <div style={{ margin: '8px 10px 0', padding: 12, background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', border: '1px solid var(--glass-border)', borderRadius: 'var(--r-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: roleColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
              {user.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
              <div style={{ fontSize: 10, color: 'var(--ink3)', textTransform: 'capitalize' }}>{user.role}</div>
            </div>
          </div>
          <button onClick={handleLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: 8, color: '#dc2626', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--sans)' }}>
            <LogOut size={13} />Sign out
          </button>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
