import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, UserCheck, UserX, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/services';
import { mockUserOps } from '../../api/mockOperations';
import { isMockToken } from '../../api/mockAuth';
const isMock = () => isMockToken(localStorage.getItem('accessToken'));
import { User, UserRole } from '../../types';
import { StatusBadge, EmptyState, Spinner, Modal, Field, inputStyle } from '../shared';
import { format } from 'date-fns';

const roleColors: Record<UserRole, string> = { tenant: '#06b6d4', owner: '#8b5cf6', admin: '#4361ee' };

const UsersPage: React.FC = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [roleModal, setRoleModal] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<UserRole>('tenant');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search, roleFilter],
    staleTime: 0,
    queryFn: async () => {
      const params = { search: search || undefined, role: roleFilter !== 'all' ? roleFilter : undefined };
      if (isMock()) return mockUserOps.getAll(params);
      return adminApi.getUsers(params).then(r => r.data.data).catch(() => mockUserOps.getAll(params));
    },
  });

  const toggleMut = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      if (isMock()) return mockUserOps.updateStatus(id, isActive);
      return adminApi.updateUserStatus(id, isActive);
    },
    onSuccess: (_d, vars) => { toast.success(vars.isActive ? 'User activated' : 'User deactivated'); qc.invalidateQueries({ queryKey: ['admin-users'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const roleMut = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      if (isMock()) return mockUserOps.updateRole(id, role);
      return adminApi.updateUserRole(id, role);
    },
    onSuccess: () => { toast.success('Role updated'); setRoleModal(null); qc.invalidateQueries({ queryKey: ['admin-users'] }); },
    onError: () => toast.error('Failed to update role'),
  });

  const users: User[] = data?.users || [];

  return (
    <div style={{ padding: 28, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--ink)', margin: '0 0 4px', fontFamily: 'var(--serif)' }}>User Management</h2>
        <p style={{ fontSize: 14, color: 'var(--ink3)', margin: 0 }}>{data?.total || 0} registered users</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={14} color="var(--ink3)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email…" style={{ ...inputStyle, paddingLeft: 36 }} />
        </div>
        {['all','tenant','owner','admin'].map(r => (
          <button key={r} onClick={() => setRoleFilter(r)} style={{ padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', fontFamily: 'var(--sans)', background: roleFilter === r ? 'var(--brand)' : 'var(--surface)', color: roleFilter === r ? 'white' : 'var(--ink3)', boxShadow: 'var(--neu-sm)', textTransform: 'capitalize' }}>
            {r === 'all' ? 'All Roles' : r}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={24} /></div>
      ) : users.length === 0 ? (
        <EmptyState title="No users found" message="Try adjusting the filters." />
      ) : (
        <div className="neu-card" style={{ overflow: 'hidden', padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg)', borderBottom: '1px solid rgba(163,168,210,0.25)' }}>
                {['User', 'Role', 'Status', 'Joined', 'Property', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 18px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u._id} style={{ borderBottom: i < users.length - 1 ? '1px solid rgba(163,168,210,0.15)' : 'none' }}>
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: roleColors[u.role], display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                        {u.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{u.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink3)' }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 18px' }}><StatusBadge status={u.role} /></td>
                  <td style={{ padding: '14px 18px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: u.isActive ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.1)', color: u.isActive ? '#059669' : '#dc2626' }}>
                      {u.isActive ? '● Active' : '● Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 18px', fontSize: 12, color: 'var(--ink3)' }}>
                    {format(new Date(u.createdAt), 'MMM d, yyyy')}
                  </td>
                  <td style={{ padding: '14px 18px', fontSize: 12, color: 'var(--ink3)' }}>
                    {u.assignedProperty ? (typeof u.assignedProperty === 'object' ? u.assignedProperty.title : 'Assigned') : <span style={{ color: 'var(--ink4)' }}>None</span>}
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => toggleMut.mutate({ id: u._id, isActive: !u.isActive })} title={u.isActive ? 'Deactivate' : 'Activate'} style={{ padding: '6px 10px', border: 'none', borderRadius: 8, cursor: 'pointer', background: u.isActive ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', color: u.isActive ? '#dc2626' : '#059669' }}>
                        {u.isActive ? <UserX size={14} /> : <UserCheck size={14} />}
                      </button>
                      <button onClick={() => { setRoleModal(u); setNewRole(u.role); }} title="Change Role" style={{ padding: '6px 10px', border: 'none', borderRadius: 8, cursor: 'pointer', background: 'rgba(67,97,238,0.1)', color: '#4361ee' }}>
                        <Shield size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Role change modal */}
      {roleModal && (
        <Modal isOpen title={`Change Role — ${roleModal.name}`} onClose={() => setRoleModal(null)} maxWidth={380}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: 14, color: 'var(--ink3)', margin: 0 }}>Current role: <strong style={{ textTransform: 'capitalize' }}>{roleModal.role}</strong></p>
            <Field label="New Role">
              <select value={newRole} onChange={e => setNewRole(e.target.value as UserRole)} style={inputStyle}>
                {(['tenant','owner','admin'] as UserRole[]).map(r => <option key={r} value={r} style={{ textTransform: 'capitalize' }}>{r}</option>)}
              </select>
            </Field>
            <button onClick={() => roleMut.mutate({ id: roleModal._id, role: newRole })} disabled={roleMut.isPending || newRole === roleModal.role} style={{ padding: '10px', background: 'var(--blue)', color: 'white', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--sans)', opacity: newRole === roleModal.role ? 0.5 : 1 }}>
              {roleMut.isPending ? 'Saving…' : 'Update Role'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default UsersPage;