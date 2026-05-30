import React, { useState } from 'react';
import { BedDouble, Bath, Square, MapPin, Star, CheckCircle, Clock, Wrench, AlertCircle, ExternalLink, Heart } from 'lucide-react';
import { Property } from '../../types';

const statusConfig = {
  available:        { label: 'Available',        cls: 'badge-green',  icon: '🟢' },
  rented:           { label: 'Rented',            cls: 'badge-brand',  icon: '🔵' },
  maintenance:      { label: 'Maintenance',       cls: 'badge-amber',  icon: '🟡' },
  pending_approval: { label: 'Pending Approval',  cls: 'badge-gray',   icon: '⚪' },
};

const avatarInitials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
const avatarColor = (name: string) => {
  const colors = ['#4361ee','#10b981','#8b5cf6','#f59e0b','#ef4444','#06b6d4'];
  return colors[name.charCodeAt(0) % colors.length];
};

interface PropertyCardProps {
  property: Property;
  onApprove?: (id: string) => void;
  onDelete?: (id: string) => void;
  onAssign?: (id: string) => void;
  isAdmin?: boolean;
  isOwner?: boolean;
  onClick?: (p: Property) => void;
}

const PropertyCard: React.FC<PropertyCardProps> = ({ property: p, onApprove, onDelete, onAssign, isAdmin, isOwner, onClick }) => {
  const [liked, setLiked] = useState(false);
  const [imgError, setImgError] = useState(false);
  const st = statusConfig[p.status];
  const canManage = isAdmin || isOwner;

  const scoreColor = p.hazardScore >= 90 ? 'var(--green)' : p.hazardScore >= 70 ? 'var(--amber)' : 'var(--red)';

  return (
    <div className="card card-hover fade-up"
      style={{ overflow: 'hidden', cursor: onClick ? 'pointer' : 'default', display: 'flex', flexDirection: 'column' }}
      onClick={() => onClick?.(p)}
    >
      {/* Image */}
      <div style={{ position: 'relative', height: 196, overflow: 'hidden', background: 'linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 100%)', flexShrink: 0 }}>
        {p.images?.[0] && !imgError ? (
          <img src={p.images[0]} alt={p.title} onError={() => setImgError(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s var(--ease)' }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.04)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>🏠</div>
        )}
        {/* Overlays */}
        <div style={{ position: 'absolute', top: 12, left: 12 }}>
          <span className={`badge ${st.cls}`}>{st.icon} {st.label}</span>
        </div>
        {!p.isApproved && (
          <div style={{ position: 'absolute', top: 12, right: 12 }}>
            <span className="badge badge-amber">⏳ Awaiting Approval</span>
          </div>
        )}
        <button onClick={e => { e.stopPropagation(); setLiked(v => !v); }}
          style={{ position: 'absolute', bottom: 12, right: 12, width: 32, height: 32, borderRadius: 9, background: 'rgba(255,255,255,0.9)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(4px)', color: liked ? '#ef4444' : 'var(--text-3)' }}>
          <Heart size={16} fill={liked ? '#ef4444' : 'none'} />
        </button>
        {/* Hazard score */}
        <div style={{ position: 'absolute', bottom: 12, left: 12, display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(6px)' }}>
          <Star size={12} fill={scoreColor} color={scoreColor} />
          <span style={{ fontSize: 12, fontWeight: 700, color: scoreColor }}>{p.hazardScore}</span>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '16px 18px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15.5, color: 'var(--text-1)', margin: '0 0 5px', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.title}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 13, color: 'var(--text-3)', fontSize: 12.5 }}>
          <MapPin size={12} />
          <span>{p.address}, {p.city}</span>
        </div>

        {/* Specs */}
        <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
          {[
            [BedDouble, `${p.bedrooms === 0 ? 'Studio' : p.bedrooms + ' bd'}`],
            [Bath, `${p.bathrooms} ba`],
            [Square, `${p.sqft.toLocaleString()} ft²`],
          ].map(([Icon, label]: any, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12.5, color: 'var(--text-3)', fontWeight: 500 }}>
              <Icon size={13} />
              {label}
            </div>
          ))}
        </div>

        {/* Price */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 2 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: 'var(--brand)', letterSpacing: '-0.02em' }}>
            ₹{p.rent.toLocaleString()}
          </span>
          <span style={{ fontSize: 12.5, color: 'var(--text-3)', fontWeight: 500 }}>/month</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-4)', marginBottom: 14 }}>Deposit: ₹{p.deposit.toLocaleString()}</div>

        {/* Amenity tags */}
        {p.amenities.length > 0 && (
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 14 }}>
            {p.amenities.slice(0, 3).map(a => <span key={a} className="tag">{a}</span>)}
            {p.amenities.length > 3 && <span className="tag">+{p.amenities.length - 3}</span>}
          </div>
        )}

        <div style={{ flex: 1 }} />

        {/* Owner section */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 13, marginTop: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Owner avatar */}
              {p.owner.avatar ? (
                <img src={p.owner.avatar} alt={p.owner.name} style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', border: '2px solid white', boxShadow: '0 1px 4px rgba(0,0,0,0.12)' }} />
              ) : (
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: avatarColor(p.owner.name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white', border: '2px solid white', boxShadow: '0 1px 4px rgba(0,0,0,0.12)', flexShrink: 0 }}>
                  {avatarInitials(p.owner.name)}
                </div>
              )}
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-1)' }}>{p.owner.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-4)' }}>Property Owner</div>
              </div>
            </div>

            {/* Tenant indicator */}
            {p.tenant && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: 'var(--green)', fontWeight: 600 }}>
                <CheckCircle size={12} />
                <span>Occupied</span>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        {canManage && (
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            {isAdmin && !p.isApproved && (
              <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={e => { e.stopPropagation(); onApprove?.(p._id); }}>
                <CheckCircle size={13} /> Approve
              </button>
            )}
            {!p.tenant && p.status === 'available' && (
              <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={e => { e.stopPropagation(); onAssign?.(p._id); }}>
                Assign Tenant
              </button>
            )}
            <button className="btn btn-danger btn-sm" style={{ padding: '6px 10px' }} onClick={e => { e.stopPropagation(); onDelete?.(p._id); }}>
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyCard;
