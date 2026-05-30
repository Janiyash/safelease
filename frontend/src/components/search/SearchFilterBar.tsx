import React from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { PropertyFilters, PropertyStatus } from '../../types';

interface SearchFilterBarProps {
  filters: PropertyFilters;
  onChange: (filters: PropertyFilters) => void;
  totalResults?: number;
}

const STATUS_OPTIONS: { label: string; value: string }[] = [
  { label: 'All Status', value: '' },
  { label: 'Available', value: 'available' },
  { label: 'Rented', value: 'rented' },
  { label: 'Maintenance', value: 'maintenance' },
  { label: 'Pending Approval', value: 'pending_approval' },
];

const BEDROOM_OPTIONS = [
  { label: 'Any', value: '' },
  { label: 'Studio', value: '0' },
  { label: '1 BD', value: '1' },
  { label: '2 BD', value: '2' },
  { label: '3+ BD', value: '3' },
];

const SearchFilterBar: React.FC<SearchFilterBarProps> = ({ filters, onChange, totalResults }) => {
  const set = (key: keyof PropertyFilters, val: string) => onChange({ ...filters, [key]: val });
  const hasActiveFilters = filters.status || filters.minRent || filters.maxRent || filters.city || filters.bedrooms;
  const clearAll = () => onChange({ search: filters.search, status: '', minRent: '', maxRent: '', city: '', bedrooms: '' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
      {/* Search row */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: 220 }}>
          <Search size={15} color="var(--text-4)" style={{ flexShrink: 0 }} />
          <input value={filters.search} onChange={e => set('search', e.target.value)} placeholder="Search by title, address, city…" />
          {filters.search && (
            <button onClick={() => set('search', '')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', display: 'flex', padding: 2 }}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* City filter */}
        <div className="search-bar" style={{ width: 160 }}>
          <input value={filters.city} onChange={e => set('city', e.target.value)} placeholder="City…" />
        </div>

        {/* Rent range */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className="search-bar" style={{ width: 110 }}>
            <span style={{ fontSize: 12, color: 'var(--text-4)', flexShrink: 0 }}>₹</span>
            <input type="number" value={filters.minRent} onChange={e => set('minRent', e.target.value)} placeholder="Min" />
          </div>
          <span style={{ color: 'var(--text-4)', fontSize: 13 }}>–</span>
          <div className="search-bar" style={{ width: 110 }}>
            <span style={{ fontSize: 12, color: 'var(--text-4)', flexShrink: 0 }}>₹</span>
            <input type="number" value={filters.maxRent} onChange={e => set('maxRent', e.target.value)} placeholder="Max" />
          </div>
        </div>
      </div>

      {/* Filter chips row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-3)', fontSize: 13 }}>
          <SlidersHorizontal size={14} />
          <span style={{ fontWeight: 600 }}>Filter:</span>
        </div>

        {/* Status filter */}
        {STATUS_OPTIONS.map(opt => (
          <button key={opt.value} className={`filter-chip ${filters.status === opt.value ? 'active' : ''}`} onClick={() => set('status', opt.value)}>
            {opt.label}
          </button>
        ))}

        <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }} />

        {/* Bedroom filter */}
        {BEDROOM_OPTIONS.map(opt => (
          <button key={opt.value} className={`filter-chip ${filters.bedrooms === opt.value ? 'active' : ''}`} onClick={() => set('bedrooms', opt.value)}>
            {opt.label}
          </button>
        ))}

        {hasActiveFilters && (
          <>
            <div style={{ flex: 1 }} />
            <button onClick={clearAll} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 600, color: 'var(--red)', background: 'var(--red-bg)', border: 'none', padding: '5px 12px', borderRadius: 99, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              <X size={12} /> Clear filters
            </button>
          </>
        )}
      </div>

      {/* Results count */}
      {totalResults !== undefined && (
        <p style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 500, margin: 0 }}>
          Showing <strong style={{ color: 'var(--text-1)' }}>{totalResults}</strong> {totalResults === 1 ? 'property' : 'properties'}
        </p>
      )}
    </div>
  );
};

export default SearchFilterBar;
