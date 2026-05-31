import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Plus } from 'lucide-react';
import { propertyApi, adminApi } from '../../api/services';
import { useAuth } from '../../context/AuthContext';
import { Property } from '../../types';
import PropertyCard from './PropertyCard';
import SearchFilterBar from '../search/SearchFilterBar';
import { PropertyGridSkeleton } from '../skeleton/Skeletons';
import { Modal, EmptyState, ErrorMessage, Field, Spinner } from '../shared';
import { isMockToken } from '../../api/mockAuth';
import { mockPropertyOps, getMockTenants } from '../../api/mockOperations';

const isMock = () => isMockToken(localStorage.getItem('accessToken'));

const schema = z.object({
  title:       z.string().min(5, 'Title required'),
  address:     z.string().min(5, 'Address required'),
  city:        z.string().min(2, 'City required'),
  state:       z.string().min(2, 'State required'),
  zipCode:     z.string().min(4, 'ZIP required'),
  rent:        z.coerce.number().min(1),
  deposit:     z.coerce.number().min(0),
  bedrooms:    z.coerce.number().min(0),
  bathrooms:   z.coerce.number().min(1),
  sqft:        z.coerce.number().min(1),
  description: z.string().optional(),
  amenities:   z.string().optional(),
});
type FD = z.infer<typeof schema>;

const PropertiesPage: React.FC = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm]       = useState(false);
  const [assignModal, setAssignModal] = useState<string | null>(null);
  const [imgFiles, setImgFiles]       = useState<FileList | null>(null);
  const [serverErr, setServerErr]     = useState('');
  const [filters, setFilters]         = useState({ search: '', status: '', minRent: '', maxRent: '', city: '', bedrooms: '' });

  const isAdmin = user?.role === 'admin';
  const isOwner = user?.role === 'owner';

  // Fetch ALL properties for every role — owner filtering happens client-side
  const { data, isLoading, error } = useQuery({
    queryKey: ['properties'],
    staleTime: 0,
    queryFn: async () => {
      if (isMock()) return mockPropertyOps.getAll();
      try {
        const res = await propertyApi.getAll();
        return res.data.data as { properties: Property[]; total: number };
      } catch {
        return mockPropertyOps.getAll();
      }
    },
  });

  // Fetch tenants for assign modal — normalise to always be any[]
  const { data: tenantsList } = useQuery<any[]>({
    queryKey: ['tenants-list'],
    enabled: isAdmin || isOwner,
    staleTime: 30_000,
    queryFn: async () => {
      if (isMock()) {
        const result = await getMockTenants();
        return result.users;
      }
      try {
        const res = await adminApi.getUsers({ role: 'tenant' });
        const d = res.data.data as { users: any[] };
        return d.users;
      } catch {
        const result = await getMockTenants();
        return result.users;
      }
    },
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FD>({ resolver: zodResolver(schema) });

  // Fix TS2322: mutationFn always returns Promise<any> so both branches are compatible
  const createMut = useMutation<any, any, FD>({
    mutationFn: async (fd: FD) => {
      if (isMock()) {
        return { data: { success: true } };
      }
      const form = new window.FormData();
      Object.entries(fd).forEach(([k, v]) => v !== undefined && form.append(k, String(v)));
      if (imgFiles) Array.from(imgFiles).forEach(f => form.append('images', f));
      return propertyApi.create(form);
    },
    onSuccess: () => {
      toast.success('Property listed! Awaiting admin approval.');
      reset(); setShowForm(false); setImgFiles(null); setServerErr('');
      qc.invalidateQueries({ queryKey: ['properties'] });
    },
    onError: (e: any) => { const m = e.response?.data?.message || 'Failed'; setServerErr(m); toast.error(m); },
  });

  const approveMut = useMutation<any, any, string>({
    mutationFn: async (id: string) => {
      if (isMock()) return mockPropertyOps.approve(id);
      return propertyApi.approve(id);
    },
    onSuccess: () => { toast.success('Approved!'); qc.invalidateQueries({ queryKey: ['properties'] }); },
  });

  const deleteMut = useMutation<any, any, string>({
    mutationFn: async (id: string) => {
      if (isMock()) return mockPropertyOps.delete(id);
      return propertyApi.delete(id);
    },
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['properties'] }); },
  });

  const allProperties: Property[] = data?.properties ?? [];

  const filtered = useMemo(() => allProperties.filter(p => {
    const s = filters.search.toLowerCase();
    if (s && !p.title.toLowerCase().includes(s) && !p.address.toLowerCase().includes(s) && !p.city.toLowerCase().includes(s)) return false;
    if (filters.status && p.status !== filters.status) return false;
    if (filters.city && !p.city.toLowerCase().includes(filters.city.toLowerCase())) return false;
    if (filters.minRent && p.rent < Number(filters.minRent)) return false;
    if (filters.maxRent && p.rent > Number(filters.maxRent)) return false;
    if (filters.bedrooms !== '') {
      if (filters.bedrooms === '3' && p.bedrooms < 3) return false;
      if (filters.bedrooms !== '3' && p.bedrooms !== Number(filters.bedrooms)) return false;
    }
    return true;
  }), [allProperties, filters]);

  // Set of property IDs owned by the logged-in owner
  const ownedIds = useMemo(() => {
    if (!isOwner || !user?._id) return new Set<string>();
    return new Set(
      allProperties
        .filter(p => {
          const ownerId = typeof p.owner === 'object' ? p.owner._id : p.owner;
          return ownerId === user._id;
        })
        .map(p => p._id)
    );
  }, [allProperties, isOwner, user]);

  const tenants: any[] = tenantsList ?? [];

  if (error) return <div className="page"><ErrorMessage message="Could not load properties. Make sure the backend is running." /></div>;

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28, color: 'var(--text-1)', margin: '0 0 5px' }}>
            {isAdmin ? 'All Properties' : isOwner ? 'Properties' : 'Available Properties'}
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-3)', margin: 0 }}>
            {allProperties.length} total · {allProperties.filter(p => p.status === 'available').length} available · {allProperties.filter(p => p.status === 'rented').length} rented
            {isOwner && ownedIds.size > 0 && ` · ${ownedIds.size} owned by you`}
          </p>
        </div>
        {(isAdmin || isOwner) && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={16} /> Add Property</button>
        )}
      </div>

      <SearchFilterBar filters={filters} onChange={setFilters} totalResults={filtered.length} />

      {isLoading ? (
        <PropertyGridSkeleton count={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No properties found"
          message={filters.search || filters.status ? 'Adjust your filters.' : isOwner ? 'Click "Add Property" to list your first property.' : 'No properties available right now.'}
          icon={<span style={{ fontSize: 36 }}>🏠</span>}
          action={(isAdmin || isOwner) && !filters.search ? (
            <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={14} /> Add First Property</button>
          ) : undefined}
        />
      ) : (
        <div className="property-grid">
          {filtered.map(p => (
            <PropertyCard
              key={p._id}
              property={p}
              isAdmin={isAdmin}
              isOwner={isOwner}
              isOwnedByMe={ownedIds.has(p._id)}
              onApprove={id => approveMut.mutate(id)}
              onDelete={id => { if (window.confirm('Delete this property?')) deleteMut.mutate(id); }}
              onAssign={id => setAssignModal(id)}
            />
          ))}
        </div>
      )}

      {/* Create property modal */}
      <Modal isOpen={showForm} onClose={() => { setShowForm(false); setServerErr(''); reset(); setImgFiles(null); }} title="List New Property" maxWidth={580}>
        <form onSubmit={handleSubmit(d => createMut.mutate(d))} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          {serverErr && <ErrorMessage message={serverErr} />}
          <Field label="Title *" error={errors.title?.message}><input className="input" {...register('title')} placeholder="e.g. Sunset Apartments — Unit 4B" /></Field>
          <Field label="Address *" error={errors.address?.message}><input className="input" {...register('address')} placeholder="Street address" /></Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px', gap: 12 }}>
            <Field label="City *" error={errors.city?.message}><input className="input" {...register('city')} /></Field>
            <Field label="State *" error={errors.state?.message}><input className="input" {...register('state')} /></Field>
            <Field label="ZIP *" error={errors.zipCode?.message}><input className="input" {...register('zipCode')} /></Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Rent ($/mo) *" error={errors.rent?.message}><input className="input" type="number" {...register('rent')} placeholder="2500" /></Field>
            <Field label="Deposit ($) *" error={errors.deposit?.message}><input className="input" type="number" {...register('deposit')} placeholder="5000" /></Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Field label="Bedrooms" error={errors.bedrooms?.message}><input className="input" type="number" {...register('bedrooms')} placeholder="2" /></Field>
            <Field label="Bathrooms *" error={errors.bathrooms?.message}><input className="input" type="number" {...register('bathrooms')} placeholder="1" /></Field>
            <Field label="Sq Ft *" error={errors.sqft?.message}><input className="input" type="number" {...register('sqft')} placeholder="850" /></Field>
          </div>
          <Field label="Description"><textarea className="input" {...register('description')} rows={3} placeholder="Describe the property…" style={{ resize: 'vertical' } as React.CSSProperties} /></Field>
          <Field label="Amenities (comma-separated)"><input className="input" {...register('amenities')} placeholder="Parking, Gym, Pool…" /></Field>
          <Field label="Images">
            <input type="file" accept="image/*" multiple onChange={e => setImgFiles(e.target.files)} style={{ fontSize: 13, fontFamily: 'var(--font-body)' }} />
          </Field>
          <button type="submit" disabled={createMut.isPending} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
            {createMut.isPending ? <><Spinner size={15} /> Saving…</> : 'List Property'}
          </button>
        </form>
      </Modal>

      {/* Assign tenant modal */}
      {assignModal && (
        <Modal isOpen title="Assign Tenant" onClose={() => setAssignModal(null)} maxWidth={400}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: 14, color: 'var(--text-3)', margin: 0 }}>Select a registered tenant:</p>
            {tenants.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', padding: 20 }}>No tenants found. They must register first.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
                {tenants.map((t: any) => (
                  <button key={t._id} onClick={async () => {
                    try {
                      if (isMock()) {
                        await mockPropertyOps.assignTenant(assignModal, t._id);
                      } else {
                        await propertyApi.assignTenant(assignModal, t._id);
                      }
                      toast.success(`${t.name} assigned!`);
                      setAssignModal(null);
                      qc.invalidateQueries({ queryKey: ['properties'] });
                    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed'); }
                  }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', cursor: 'pointer', fontFamily: 'var(--font-body)', width: '100%' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--brand)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                      {t.name.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase()}
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <p style={{ fontSize: 13.5, fontWeight: 600, margin: 0 }}>{t.name}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>{t.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default PropertiesPage;
