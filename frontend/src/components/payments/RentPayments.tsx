import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  DollarSign, CheckCircle, Clock, AlertCircle, Download,
  CreditCard, TrendingUp, IndianRupee, Smartphone, Plus, Trash2, Wrench,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { paymentApi, propertyApi } from '../../api/services';
import { Modal, Field } from '../shared';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

// ── Types ─────────────────────────────────────────────────────────────────────
type PayStatus = 'pending' | 'paid' | 'overdue' | 'partial';
type BillType  = 'rent' | 'maintenance' | 'deposit' | 'other';

interface Payment {
  _id:               string;
  property:          { _id: string; title: string; address: string; city: string; rent: number };
  tenant:            { _id: string; name: string; email: string };
  owner:             { _id: string; name: string; email: string };
  amount:            number;
  dueDate:           string;
  paidDate?:         string;
  status:            PayStatus;
  method?:           string;
  month:             string;
  billType?:         BillType;
  receiptNo?:        string;
  notes?:            string;
  razorpayPaymentId?: string;
}

interface Property {
  _id:    string;
  title:  string;
  rent:   number;
  status: string;
  tenant: { _id: string; name: string; email: string } | null;
  owner:  { _id: string; name: string };
}

// ── Constants ─────────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  padding: '10px 14px', background: 'var(--surface)',
  border: '1px solid var(--border-strong)',
  borderRadius: 'var(--r-sm)', fontSize: 14, color: 'var(--text-1)',
  outline: 'none', fontFamily: 'var(--font-body)',
  width: '100%', boxSizing: 'border-box',
};

const STATUS_CFG: Record<PayStatus, { bg: string; color: string; icon: React.ReactNode; label: string }> = {
  paid:    { bg: '#ecfdf5', color: '#10b981', icon: <CheckCircle size={13} />, label: 'Paid'    },
  pending: { bg: '#fffbeb', color: '#f59e0b', icon: <Clock       size={13} />, label: 'Pending' },
  overdue: { bg: '#fef2f2', color: '#ef4444', icon: <AlertCircle size={13} />, label: 'Overdue' },
  partial: { bg: '#f5f3ff', color: '#8b5cf6', icon: <DollarSign  size={13} />, label: 'Partial' },
};

const BILL_CFG: Record<BillType, { icon: string; color: string; bg: string }> = {
  rent:        { icon: '🏠', color: '#2563eb', bg: '#eff6ff' },
  maintenance: { icon: '🔧', color: '#d97706', bg: '#fffbeb' },
  deposit:     { icon: '💰', color: '#7c3aed', bg: '#f5f3ff' },
  other:       { icon: '📋', color: '#64748b', bg: '#f1f5f9' },
};

// ── Receipt downloader ────────────────────────────────────────────────────────
const downloadReceipt = (p: Payment) => {
  const lines = [
    '══════════════════════════════════════════',
    '          SAFELEASE — PAYMENT RECEIPT     ',
    '══════════════════════════════════════════',
    `Receipt No  : ${p.receiptNo || 'N/A'}`,
    `Date        : ${p.paidDate ? format(new Date(p.paidDate), 'dd MMM yyyy') : 'N/A'}`,
    '──────────────────────────────────────────',
    `Tenant      : ${p.tenant?.name  || ''}`,
    `Property    : ${p.property?.title || ''}`,
    `             ${p.property?.address || ''}, ${p.property?.city || ''}`,
    `Bill Type   : ${(p.billType || 'rent').toUpperCase()}`,
    `Amount      : ₹${p.amount.toLocaleString('en-IN')}`,
    `Month       : ${p.month}`,
    `Method      : ${p.method || ''}`,
    `Status      : PAID ✓`,
    ...(p.razorpayPaymentId ? [`Razorpay ID : ${p.razorpayPaymentId}`] : []),
    '──────────────────────────────────────────',
    'Thank you for your payment!',
    'SafeLease Property Management',
    'support@safelease.com',
    '══════════════════════════════════════════',
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `${p.receiptNo || 'receipt'}.txt`; a.click();
  URL.revokeObjectURL(url);
};

// ── Razorpay test checkout modal ──────────────────────────────────────────────
const RazorpayModal: React.FC<{
  payment:   Payment;
  onSuccess: (razorpayPaymentId: string) => void;
  onClose:   () => void;
}> = ({ payment, onSuccess, onClose }) => {
  type Step = 'method' | 'upi' | 'card' | 'processing' | 'done';
  const [step,   setStep]   = useState<Step>('method');
  const [upiId,  setUpiId]  = useState('');
  const [cardNo, setCardNo] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv,    setCvv]    = useState('');

  const simulatePay = async () => {
    setStep('processing');
    await new Promise(r => setTimeout(r, 2000));
    const fakeId = `pay_test_${Date.now()}`;
    setStep('done');
    setTimeout(() => onSuccess(fakeId), 800);
  };

  if (step === 'processing') return (
    <Modal isOpen title="Processing Payment…" onClose={() => {}} maxWidth={360}>
      <div style={{ textAlign: 'center', padding: '32px 0' }}>
        <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#eff6ff', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 26, height: 26, border: '3px solid rgba(37,99,235,0.2)', borderTop: '3px solid #2563eb', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
        <p style={{ fontWeight: 600, margin: 0 }}>Verifying payment…</p>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 8 }}>Please do not close this window</p>
      </div>
    </Modal>
  );

  if (step === 'done') return (
    <Modal isOpen title="" onClose={onClose} maxWidth={360}>
      <div style={{ textAlign: 'center', padding: '24px 0' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#ecfdf5', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CheckCircle size={32} color="#10b981" />
        </div>
        <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px' }}>Payment Successful! 🎉</p>
        <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Your payment has been processed. Receipt generated.</p>
      </div>
    </Modal>
  );

  const billCfg = BILL_CFG[payment.billType || 'rent'];

  return (
    <Modal isOpen title="" onClose={onClose} maxWidth={400}>
      <div style={{ background: '#2563eb', margin: '-22px -22px 20px', padding: '20px 22px', borderRadius: '18px 18px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', margin: 0 }}>SafeLease · {billCfg.icon} {(payment.billType || 'rent').toUpperCase()}</p>
          <p style={{ fontSize: 24, fontWeight: 700, color: 'white', margin: '3px 0 0', fontFamily: 'var(--font-display)' }}>
            ₹{payment.amount.toLocaleString('en-IN')}
          </p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', margin: '3px 0 0' }}>
            {payment.property?.title} · {payment.month}
          </p>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80' }} />
          <span style={{ fontSize: 11, color: 'white', fontWeight: 600 }}>TEST MODE</span>
        </div>
      </div>

      {step === 'method' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' as const, margin: '0 0 4px' }}>SELECT PAYMENT METHOD</p>
          {[
            { id: 'upi',  icon: <Smartphone size={18} color="#6366f1" />, label: 'UPI',                 desc: 'GPay, PhonePe, Paytm, BHIM' },
            { id: 'card', icon: <CreditCard  size={18} color="#2563eb" />, label: 'Credit / Debit Card', desc: 'Visa, Mastercard, RuPay' },
          ].map(opt => (
            <button key={opt.id} onClick={() => setStep(opt.id as Step)}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, cursor: 'pointer', fontFamily: 'var(--font-body)', textAlign: 'left' as const, width: '100%', transition: 'border-color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#2563eb'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'white', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{opt.icon}</div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>{opt.label}</p>
                <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>{opt.desc}</p>
              </div>
              <span style={{ marginLeft: 'auto', fontSize: 18, color: 'var(--text-4)' }}>›</span>
            </button>
          ))}
          <div style={{ background: '#fffbeb', borderRadius: 8, padding: '10px 14px', border: '1px solid #fde68a' }}>
            <p style={{ fontSize: 12, color: '#92400e', margin: 0 }}>⚠️ <strong>Test Mode</strong> — No real charges. Use <code>success@razorpay</code> or card <code>4111 1111 1111 1111</code>.</p>
          </div>
          <button onClick={onClose} style={{ padding: '10px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-3)', borderRadius: 'var(--r-sm)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600 }}>Cancel</button>
        </div>
      )}

      {step === 'upi' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <button onClick={() => setStep('method')} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: 600, fontFamily: 'var(--font-body)', padding: 0 }}>← Back</button>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Enter UPI ID</label>
            <input value={upiId} onChange={e => setUpiId(e.target.value)} placeholder="yourname@upi" style={inputStyle} />
            <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>Test UPI: <code style={{ background: 'var(--surface-3)', padding: '1px 5px', borderRadius: 4 }}>success@razorpay</code></p>
          </div>
          <button onClick={simulatePay} disabled={!upiId.trim()} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px', opacity: upiId.trim() ? 1 : 0.5 }}>
            Pay ₹{payment.amount.toLocaleString('en-IN')}
          </button>
        </div>
      )}

      {step === 'card' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <button onClick={() => setStep('method')} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: 600, fontFamily: 'var(--font-body)', padding: 0 }}>← Back</button>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Card Number</label>
            <input value={cardNo} onChange={e => setCardNo(e.target.value.replace(/\D/g,'').slice(0,16).replace(/(.{4})/g,'$1 ').trim())} placeholder="4111 1111 1111 1111" style={inputStyle} maxLength={19} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Expiry (MM/YY)</label>
              <input value={expiry} onChange={e => setExpiry(e.target.value)} placeholder="12/27" style={inputStyle} maxLength={5} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>CVV</label>
              <input value={cvv} onChange={e => setCvv(e.target.value.replace(/\D/g,'').slice(0,3))} placeholder="•••" style={inputStyle} maxLength={3} type="password" />
            </div>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-3)', margin: '-4px 0' }}>Test: <code style={{ background: 'var(--surface-3)', padding: '1px 5px', borderRadius: 4 }}>4111 1111 1111 1111</code> / any future date / any 3-digit CVV</p>
          <button onClick={simulatePay} disabled={cardNo.replace(/\s/g,'').length < 16 || !expiry || cvv.length < 3}
            className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
            Pay ₹{payment.amount.toLocaleString('en-IN')}
          </button>
        </div>
      )}
    </Modal>
  );
};

// ── Create Payment Request Modal ──────────────────────────────────────────────
const createSchema = z.object({
  propertyId:      z.string().optional(),
  isAllProperties: z.boolean().default(false),
  billType:        z.enum(['rent', 'maintenance', 'deposit', 'other']).default('rent'),
  amount:          z.coerce.number().positive('Enter a valid amount').optional(),
  dueDate:         z.string().min(1, 'Select due date'),
  notes:           z.string().optional(),
});
type CreateForm = z.infer<typeof createSchema>;

const CreatePaymentModal: React.FC<{
  isOpen:     boolean;
  onClose:    () => void;
  properties: Property[];
  isAdmin:    boolean;
}> = ({ isOpen, onClose, properties, isAdmin }) => {
  const qc = useQueryClient();
  const [serverErr, setServerErr] = useState('');

  const rentedProps = properties.filter(p => p.tenant && p.status === 'rented');

  const today = new Date();
  const defaultDue = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2,'0')}-01`;

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { billType: 'rent', isAllProperties: false, dueDate: defaultDue },
  });

  const billType        = watch('billType');
  const isAllProperties = watch('isAllProperties');
  const selectedId      = watch('propertyId');
  const selectedProp    = rentedProps.find(p => p._id === selectedId);

  // When switching to maintenance + all, clear propertyId
  const handleBillTypeChange = (val: BillType) => {
    setValue('billType', val);
    if (val !== 'rent') setValue('isAllProperties', false);
  };

  const mut = useMutation({
    mutationFn: (d: CreateForm) => {
      const payload: Record<string, any> = {
        billType:        d.billType,
        dueDate:         d.dueDate,
        amount:          d.amount,
        notes:           d.notes,
        isAllProperties: d.isAllProperties,
      };
      if (!d.isAllProperties) payload.propertyId = d.propertyId;
      return paymentApi.create(payload);
    },
    onSuccess: (res: any) => {
      const msg = res.data?.message || '✅ Payment request created!';
      toast.success(msg);
      reset();
      setServerErr('');
      onClose();
      qc.invalidateQueries({ queryKey: ['payments'] });
    },
    onError: (e: any) => {
      const msg = e.response?.data?.message || 'Failed to create payment request';
      setServerErr(msg);
      toast.error(msg);
    },
  });

  const billTypes: { value: BillType; label: string; icon: string; desc: string }[] = [
    { value: 'rent',        label: 'Rent',        icon: '🏠', desc: 'Monthly rent payment' },
    { value: 'maintenance', label: 'Maintenance',  icon: '🔧', desc: 'Maintenance / repair charges' },
    { value: 'deposit',     label: 'Deposit',      icon: '💰', desc: 'Security deposit' },
    { value: 'other',       label: 'Other',        icon: '📋', desc: 'Other charges' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={() => { onClose(); setServerErr(''); reset(); }} title="📤 New Payment Request" maxWidth={520}>
      {rentedProps.length === 0 && !isAdmin ? (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏠</div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 8 }}>No tenants assigned</h3>
          <p style={{ fontSize: 14, color: 'var(--text-3)', lineHeight: 1.6 }}>
            Assign a tenant to a property first via the <strong>Properties</strong> page.
          </p>
          <button onClick={onClose} className="btn btn-primary" style={{ marginTop: 16, padding: '10px 24px' }}>Got it</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(d => mut.mutate(d))} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {serverErr && (
            <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, color: '#dc2626', fontSize: 13 }}>
              ⚠️ {serverErr}
            </div>
          )}

          {/* Bill type selector */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 8 }}>Bill Type *</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {billTypes.map(bt => (
                <button key={bt.value} type="button" onClick={() => handleBillTypeChange(bt.value)}
                  style={{
                    padding: '12px 14px', borderRadius: 'var(--r-sm)', cursor: 'pointer',
                    textAlign: 'left' as const, fontFamily: 'var(--font-body)',
                    border: `2px solid ${billType === bt.value ? BILL_CFG[bt.value].color : 'var(--border)'}`,
                    background: billType === bt.value ? BILL_CFG[bt.value].bg : 'var(--surface-2)',
                    transition: 'all 0.15s',
                  }}>
                  <div style={{ fontSize: 18, marginBottom: 3 }}>{bt.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: billType === bt.value ? BILL_CFG[bt.value].color : 'var(--text-1)' }}>{bt.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{bt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Admin: option to raise maintenance for ALL rented properties at once */}
          {isAdmin && billType === 'maintenance' && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '12px 14px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" {...register('isAllProperties')}
                  style={{ width: 16, height: 16, accentColor: '#d97706', cursor: 'pointer' }} />
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#92400e' }}>
                    🔧 Raise for ALL rented properties
                  </div>
                  <div style={{ fontSize: 12, color: '#a16207', marginTop: 2 }}>
                    Creates a maintenance bill for every property that has a tenant assigned. Amount is required.
                  </div>
                </div>
              </label>
            </div>
          )}

          {/* Property selector (hidden when isAllProperties is checked) */}
          {!isAllProperties && (
            <Field label="Property & Tenant *" error={errors.propertyId?.message}>
              <select style={inputStyle} {...register('propertyId')}>
                <option value="">Select property…</option>
                {rentedProps.map(p => (
                  <option key={p._id} value={p._id}>
                    {p.title} — {p.tenant!.name} (₹{p.rent?.toLocaleString('en-IN')}/mo)
                  </option>
                ))}
              </select>
              {rentedProps.length === 0 && (
                <p style={{ fontSize: 12, color: 'var(--red)', marginTop: 4 }}>
                  No rented properties with assigned tenants found.
                </p>
              )}
            </Field>
          )}

          {/* Selected tenant info */}
          {!isAllProperties && selectedProp && (
            <div style={{ background: '#eff6ff', borderRadius: 8, padding: '10px 14px', border: '1px solid #bfdbfe', fontSize: 13 }}>
              <div><strong>Tenant:</strong> {selectedProp.tenant!.name} · {selectedProp.tenant!.email}</div>
              <div style={{ marginTop: 4 }}><strong>Default rent:</strong> ₹{selectedProp.rent?.toLocaleString('en-IN')}/mo</div>
            </div>
          )}

          {/* All-properties maintenance info */}
          {isAllProperties && (
            <div style={{ background: '#eff6ff', borderRadius: 8, padding: '10px 14px', border: '1px solid #bfdbfe', fontSize: 13 }}>
              <strong>ℹ️</strong> A maintenance bill will be created for each rented property. Properties that already have a maintenance bill for the selected month will be skipped automatically.
            </div>
          )}

          {/* Amount */}
          <Field label={`Amount ₹${billType === 'rent' && !isAllProperties && selectedProp ? ' (leave blank for default rent)' : ' *'}`} error={errors.amount?.message}>
            <input type="number" style={inputStyle} {...register('amount')}
              placeholder={
                isAllProperties ? 'e.g. 2000 (applied to all properties)'
                : selectedProp && billType === 'rent' ? `Default: ₹${selectedProp.rent?.toLocaleString('en-IN')}`
                : 'Enter amount'
              }
            />
          </Field>

          {/* Due date */}
          <Field label="Due Date *" error={errors.dueDate?.message}>
            <input type="date" style={inputStyle} {...register('dueDate')} />
          </Field>

          {/* Notes */}
          <Field label="Notes (optional)">
            <textarea style={{ ...inputStyle, resize: 'vertical' } as React.CSSProperties}
              {...register('notes')} rows={2}
              placeholder={
                billType === 'maintenance'
                  ? 'e.g. Common area cleaning, elevator repair…'
                  : 'e.g. May 2026 rent, includes parking'
              }
            />
          </Field>

          <button type="submit" disabled={mut.isPending} className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '12px', gap: 8 }}>
            {mut.isPending ? 'Creating…' : isAllProperties
              ? `🔧 Raise Maintenance Bill for All Properties`
              : `📤 Send ${billType.charAt(0).toUpperCase() + billType.slice(1)} Request`}
          </button>
        </form>
      )}
    </Modal>
  );
};

// ── Main component ─────────────────────────────────────────────────────────────
const RentPayments: React.FC = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [filter,        setFilter]        = useState<string>('all');
  const [billFilter,    setBillFilter]    = useState<string>('all');
  const [markPaidModal, setMarkPaidModal] = useState<Payment | null>(null);
  const [razorpayModal, setRazorpayModal] = useState<Payment | null>(null);
  const [createModal,   setCreateModal]   = useState(false);
  const [payMethod,     setPayMethod]     = useState('Bank Transfer');

  const isOwnerOrAdmin = user?.role === 'owner' || user?.role === 'admin';
  const isAdmin        = user?.role === 'admin';
  const isTenant       = user?.role === 'tenant';

  // ── Fetch payments — backend filters by role automatically ──────────────────
  // TENANT: only sees query.tenant = their own ID (fixed in controller)
  // OWNER: only sees their properties
  // ADMIN: sees all
  const { data: payData, isLoading: payLoading } = useQuery({
    queryKey: ['payments'],
    staleTime: 0,
    queryFn: async () => {
      const res = await paymentApi.getAll();
      return res.data.data as { payments: Payment[]; total: number };
    },
  });

  // ── Fetch properties for create modal ───────────────────────────────────────
  const { data: propData } = useQuery({
    queryKey: ['properties'],
    staleTime: 30_000,
    enabled: isOwnerOrAdmin,
    queryFn: async () => {
      const res = await propertyApi.getAll();
      return res.data.data as { properties: Property[] };
    },
  });

  const payments:   Payment[]  = payData?.payments ?? [];
  const properties: Property[] = propData?.properties ?? [];

  // Client-side filtering
  const filtered = payments.filter(p => {
    if (filter    !== 'all' && p.status                     !== filter)    return false;
    if (billFilter !== 'all' && (p.billType || 'rent') !== billFilter) return false;
    return true;
  });

  const totalCollected = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const totalPending   = payments.filter(p => p.status !== 'paid').reduce((s, p) => s + p.amount, 0);
  const collectionRate = payments.length > 0
    ? Math.round((payments.filter(p => p.status === 'paid').length / payments.length) * 100) : 0;
  const overdueCount = payments.filter(p => p.status === 'overdue').length;

  // ── Mutations ───────────────────────────────────────────────────────────────
  const markPaidMut = useMutation({
    mutationFn: ({ id, method }: { id: string; method: string }) => paymentApi.markPaid(id, method),
    onSuccess: () => { toast.success('Payment marked as paid!'); setMarkPaidModal(null); qc.invalidateQueries({ queryKey: ['payments'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => paymentApi.delete(id),
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['payments'] }); },
    onError: () => toast.error('Failed to delete'),
  });

  const payOnlineMut = useMutation({
    mutationFn: ({ id, razorpayPaymentId }: { id: string; razorpayPaymentId: string }) =>
      paymentApi.payOnline(id, { razorpayPaymentId, method: 'Razorpay' }),
    onSuccess: () => { toast.success('🎉 Payment successful! Receipt generated.'); setRazorpayModal(null); qc.invalidateQueries({ queryKey: ['payments'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Payment failed'),
  });

  return (
    <div style={{ padding: '24px var(--content-px)' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, color: 'var(--text-1)', margin: 0 }}>Rent Payments</h1>
          <p style={{ color: 'var(--text-3)', fontSize: 14, margin: '4px 0 0' }}>
            {isOwnerOrAdmin ? 'Manage rent & maintenance collection' : 'Your payment history'}
          </p>
        </div>
        {isOwnerOrAdmin && (
          <button className="btn btn-primary" onClick={() => setCreateModal(true)}>
            <Plus size={16} /> New Payment Request
          </button>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(155px,1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Collected',         value: `₹${totalCollected.toLocaleString('en-IN')}`, icon: <CheckCircle size={20} />, color: '#10b981', bg: '#ecfdf5' },
          { label: 'Pending / Overdue', value: `₹${totalPending.toLocaleString('en-IN')}`,   icon: <Clock       size={20} />, color: '#f59e0b', bg: '#fffbeb' },
          { label: 'Collection Rate',   value: `${collectionRate}%`,                           icon: <TrendingUp  size={20} />, color: '#2563eb', bg: '#eff6ff' },
          { label: 'Overdue',           value: String(overdueCount),                           icon: <AlertCircle size={20} />, color: '#ef4444', bg: '#fef2f2' },
        ].map(c => (
          <div key={c.label} className="card" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.color, flexShrink: 0 }}>{c.icon}</div>
            <div>
              <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-1)', margin: 0, fontFamily: 'var(--font-display)' }}>{c.value}</p>
              <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tenant banner */}
      {isTenant && (
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <IndianRupee size={18} color="#2563eb" style={{ flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 13.5, fontWeight: 600, color: '#1d4ed8', margin: 0 }}>Razorpay Test Mode Active</p>
            <p style={{ fontSize: 12, color: '#3b82f6', margin: '2px 0 0' }}>
              No real charges. Test UPI: <code>success@razorpay</code> · Test card: <code>4111 1111 1111 1111</code>
            </p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!payLoading && payments.length === 0 && (
        <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>💳</div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
            {isOwnerOrAdmin ? 'No payment requests yet' : 'No payments yet'}
          </h3>
          <p style={{ fontSize: 14, color: 'var(--text-3)', margin: '0 auto 20px', maxWidth: 360, lineHeight: 1.6 }}>
            {isOwnerOrAdmin
              ? 'Click "New Payment Request" to send a rent or maintenance bill to your tenant.'
              : 'Your landlord has not sent any payment requests yet.'}
          </p>
          {isOwnerOrAdmin && (
            <button className="btn btn-primary" onClick={() => setCreateModal(true)}>
              <Plus size={15} /> Create First Payment Request
            </button>
          )}
        </div>
      )}

      {/* Filters + table */}
      {payments.length > 0 && (
        <>
          {/* Status filter */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginRight: 4 }}>Status:</span>
            {(['all','paid','pending','overdue'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ padding: '5px 14px', borderRadius: 99, border: '1px solid', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', borderColor: filter === f ? '#2563eb' : 'var(--border)', background: filter === f ? '#2563eb' : 'var(--surface)', color: filter === f ? 'white' : 'var(--text-2)', transition: 'all 0.15s' }}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          {/* Bill type filter */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginRight: 4 }}>Type:</span>
            {(['all','rent','maintenance','deposit','other'] as const).map(f => (
              <button key={f} onClick={() => setBillFilter(f)} style={{ padding: '5px 14px', borderRadius: 99, border: '1px solid', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', borderColor: billFilter === f ? '#d97706' : 'var(--border)', background: billFilter === f ? '#d97706' : 'var(--surface)', color: billFilter === f ? 'white' : 'var(--text-2)', transition: 'all 0.15s' }}>
                {f === 'all' ? 'All Types' : `${BILL_CFG[f as BillType]?.icon || ''} ${f.charAt(0).toUpperCase() + f.slice(1)}`}
              </button>
            ))}
            <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-3)' }}>{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
          </div>

          {payLoading ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-3)' }}>Loading payments…</div>
          ) : (
            <div className="card" style={{ overflow: 'auto', padding: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 950 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                    {[
                      ...(isOwnerOrAdmin ? ['Tenant'] : []),
                      'Property', 'Bill Type', 'Amount', 'Month', 'Due Date', 'Paid Date', 'Method', 'Status', 'Notes', 'Actions',
                    ].map(h => (
                      <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-3)', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={11} style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>
                        No payments match the selected filters
                      </td>
                    </tr>
                  ) : filtered.map((p, i) => {
                    const st   = STATUS_CFG[p.status];
                    const bt   = BILL_CFG[p.billType || 'rent'];
                    return (
                      <tr key={p._id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none', background: p.status === 'overdue' ? 'rgba(239,68,68,0.02)' : 'transparent' }}>
                        {isOwnerOrAdmin && (
                          <td style={{ padding: '14px 14px' }}>
                            <div style={{ fontSize: 13.5, fontWeight: 600 }}>{p.tenant?.name || '—'}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{p.tenant?.email}</div>
                          </td>
                        )}
                        <td style={{ padding: '14px 14px', fontSize: 13, color: 'var(--text-2)', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.property?.title || '—'}
                        </td>
                        {/* Bill type badge */}
                        <td style={{ padding: '14px 14px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 99, fontSize: 11.5, fontWeight: 700, background: bt.bg, color: bt.color, whiteSpace: 'nowrap' }}>
                            {bt.icon} {(p.billType || 'rent').charAt(0).toUpperCase() + (p.billType || 'rent').slice(1)}
                          </span>
                        </td>
                        <td style={{ padding: '14px 14px', fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap' }}>₹{p.amount.toLocaleString('en-IN')}</td>
                        <td style={{ padding: '14px 14px', fontSize: 13, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{p.month}</td>
                        <td style={{ padding: '14px 14px', fontSize: 13, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                          {p.dueDate ? format(new Date(p.dueDate), 'dd MMM yyyy') : '—'}
                        </td>
                        <td style={{ padding: '14px 14px', fontSize: 13, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                          {p.paidDate ? format(new Date(p.paidDate), 'dd MMM yyyy') : '—'}
                        </td>
                        <td style={{ padding: '14px 14px', fontSize: 13, color: 'var(--text-3)' }}>{p.method || '—'}</td>
                        <td style={{ padding: '14px 14px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600, background: st.bg, color: st.color, whiteSpace: 'nowrap' }}>
                            {st.icon} {st.label}
                          </span>
                        </td>
                        <td style={{ padding: '14px 14px', width: 180, minWidth: 140 }}>
                          {p.notes ? (
                            <span title={p.notes} style={{
                              display: 'block', fontSize: 12.5, color: 'var(--text-2)',
                              lineHeight: 1.5, whiteSpace: 'nowrap', overflow: 'hidden',
                              textOverflow: 'ellipsis', maxWidth: 160,
                              background: 'var(--surface-2)', border: '1px solid var(--border)',
                              borderRadius: 6, padding: '5px 8px', cursor: 'help',
                            }}>
                              {p.notes}
                            </span>
                          ) : (
                            <span style={{ fontSize: 12, color: 'var(--text-4)' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '14px 14px' }}>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {p.status === 'paid' ? (
                              <button onClick={() => downloadReceipt(p)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, padding: '6px 10px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 7, cursor: 'pointer', color: 'var(--text-2)', fontFamily: 'var(--font-body)', fontWeight: 600 }}>
                                <Download size={12} /> Receipt
                              </button>
                            ) : isOwnerOrAdmin ? (
                              <>
                                <button onClick={() => setMarkPaidModal(p)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, padding: '6px 10px', background: '#2563eb', border: 'none', borderRadius: 7, cursor: 'pointer', color: 'white', fontFamily: 'var(--font-body)', fontWeight: 600 }}>
                                  <CheckCircle size={12} /> Mark Paid
                                </button>
                                <button onClick={() => { if (window.confirm('Delete this payment request?')) deleteMut.mutate(p._id); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, padding: '6px 8px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7, cursor: 'pointer', color: '#dc2626', fontFamily: 'var(--font-body)', fontWeight: 600 }}>
                                  <Trash2 size={12} />
                                </button>
                              </>
                            ) : (
                              <button onClick={() => setRazorpayModal(p)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, padding: '6px 12px', background: p.status === 'overdue' ? '#ef4444' : '#2563eb', border: 'none', borderRadius: 7, cursor: 'pointer', color: 'white', fontFamily: 'var(--font-body)', fontWeight: 600 }}>
                                <IndianRupee size={12} /> {p.status === 'overdue' ? 'Pay Now (Overdue!)' : 'Pay Now'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <CreatePaymentModal isOpen={createModal} onClose={() => setCreateModal(false)} properties={properties} isAdmin={isAdmin} />

      <Modal isOpen={!!markPaidModal} onClose={() => setMarkPaidModal(null)} title="Record Manual Payment" maxWidth={420}>
        {markPaidModal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'var(--surface-2)', borderRadius: 10, padding: 16, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 18 }}>{BILL_CFG[markPaidModal.billType || 'rent'].icon}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: BILL_CFG[markPaidModal.billType || 'rent'].color, textTransform: 'capitalize' as const }}>
                  {markPaidModal.billType || 'rent'}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--text-2)' }}>
                <strong>{markPaidModal.tenant?.name}</strong> — {markPaidModal.property?.title}
              </p>
              <p style={{ margin: '6px 0 0', fontSize: 26, fontWeight: 700, color: 'var(--text-1)', fontFamily: 'var(--font-display)' }}>
                ₹{markPaidModal.amount.toLocaleString('en-IN')}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-3)' }}>
                Month: {markPaidModal.month} · Due: {format(new Date(markPaidModal.dueDate), 'dd MMM yyyy')}
              </p>
            </div>
            <Field label="Payment Method">
              <select value={payMethod} onChange={e => setPayMethod(e.target.value)} style={inputStyle}>
                {['Bank Transfer','Cash','Online','Cheque','UPI','Razorpay'].map(m => <option key={m}>{m}</option>)}
              </select>
            </Field>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setMarkPaidModal(null)} style={{ flex: 1, padding: '11px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-2)', borderRadius: 'var(--r-sm)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600 }}>Cancel</button>
              <button onClick={() => markPaidMut.mutate({ id: markPaidModal._id, method: payMethod })} disabled={markPaidMut.isPending}
                className="btn btn-primary" style={{ flex: 1, padding: '11px', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 6 }}>
                <CreditCard size={15} /> {markPaidMut.isPending ? 'Saving…' : 'Confirm Paid'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {razorpayModal && (
        <RazorpayModal
          payment={razorpayModal}
          onSuccess={razorpayPaymentId => payOnlineMut.mutate({ id: razorpayModal._id, razorpayPaymentId })}
          onClose={() => setRazorpayModal(null)}
        />
      )}
    </div>
  );
};

export default RentPayments;