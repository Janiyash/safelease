import React, { useState, useRef } from 'react';
import { FileText, Upload, Download, Trash2, Eye, Search, Lock, File, X, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { EmptyState, Modal } from '../shared';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

type DocCategory = 'lease' | 'id_proof' | 'inspection' | 'insurance' | 'other';

interface Document {
  id: string;
  name: string;
  category: DocCategory;
  property: string;
  uploadedBy: string;
  uploadedAt: string;
  size: string;
  /** text content for text files, or null for binary files */
  content: string | null;
  /** base64 data URL for preview of images/PDFs */
  dataUrl?: string;
  /** original MIME type */
  mimeType?: string;
  isPrivate: boolean;
}

// ─── Sample document contents ─────────────────────────────────────────────────
const SAMPLE_CONTENTS: Record<string, string> = {
  'd1': `RESIDENTIAL LEASE AGREEMENT
══════════════════════════════════════════════════
SafeLease Property Management | www.safelease.com
══════════════════════════════════════════════════

Property  : Sunset Apartments 4B, 1420 Harbor Blvd, San Francisco CA 94105
Landlord  : Sarah Johnson | sarah@example.com | 555-0101
Tenant    : Alex Rivera | alex@example.com | 555-1001

LEASE TERM
Start Date : January 15, 2024
End Date   : January 14, 2025
Monthly Rent: $2,800 (Two Thousand Eight Hundred Dollars)
Security Deposit: $5,600

TERMS & CONDITIONS
1. Rent is due on the 1st of each month. A 5-day grace period applies.
2. Late fee of $150 applies after the grace period.
3. Tenant is responsible for utilities (electricity, internet).
4. No smoking permitted on the premises.
5. Pets allowed with prior written consent and $500 pet deposit.
6. Tenant must provide 30 days written notice before vacating.
7. Landlord will conduct quarterly property inspections.

SIGNATURES
Landlord : Sarah Johnson    Date: January 10, 2024
Tenant   : Alex Rivera      Date: January 12, 2024

This document is legally binding once signed by all parties.`,

  'd2': `PROPERTY INSPECTION REPORT — Q1 2026
══════════════════════════════════════════════════
Inspector : Certified Home Inspector
Property  : Sunset Apartments 4B
Date      : March 1, 2026
══════════════════════════════════════════════════

OVERALL CONDITION: GOOD ✓

SECTION 1 — STRUCTURE
□ Foundation         : No cracks detected           [PASS ✓]
□ Roof               : Minor wear, good for 5+ years [PASS ✓]
□ Walls & Ceilings   : No water damage               [PASS ✓]

SECTION 2 — ELECTRICAL
□ Panel & Breakers   : Updated 2022, compliant       [PASS ✓]
□ Outlets & Switches : All functional                [PASS ✓]
□ Smoke Detectors    : Tested, all working           [PASS ✓]

SECTION 3 — PLUMBING
□ Water Pressure     : 65 PSI — normal range        [PASS ✓]
□ Hot Water Heater   : 3 years old, good condition  [PASS ✓]
□ Drains             : Clear, no clogs              [PASS ✓]

SECTION 4 — HVAC
□ Heating System     : Recent filter replacement     [PASS ✓]
□ Air Conditioning   : Serviced January 2026         [PASS ✓]

HAZARD SCORE: 94 / 100
Next inspection recommended: September 2026`,

  'd3': `TENANT IDENTITY VERIFICATION
══════════════════════════════════════════════════
SafeLease Secure Document | PRIVATE & CONFIDENTIAL
══════════════════════════════════════════════════

Tenant Full Name : Alex Rivera
Date of Birth    : [REDACTED]
Government ID    : Passport No. ****4321 (verified)
Address Proof    : Utility bill — March 2024
Verified By      : Sarah Johnson (Property Owner)
Verification Date: January 10, 2024

KYC STATUS: VERIFIED ✓`,

  'd4': `BUILDING INSURANCE POLICY 2026
══════════════════════════════════════════════════
Policy No : SL-INS-2026-00142
Insurer   : SecureProp Insurance Co.
Insured   : Sarah Johnson (All Properties)
══════════════════════════════════════════════════

COVERAGE PERIOD : January 1, 2026 — December 31, 2026

PROPERTIES COVERED:
• Sunset Apartments 4B    — Coverage: $450,000
• Marina District 1BR     — Coverage: $280,000
• Bay View Condo 3BR      — Coverage: $650,000

COVERAGE TYPES:
✓ Structural Damage (Fire, Flood, Earthquake)
✓ Public Liability — up to $1,000,000
✓ Loss of Rent — up to 12 months
✓ Contents — up to $50,000 per unit

Annual Premium : $4,200
Deductible     : $1,000 per claim`,

  'd5': `RESIDENTIAL LEASE AGREEMENT
══════════════════════════════════════════════════
SafeLease Property Management | www.safelease.com
══════════════════════════════════════════════════

Property  : Marina District 1BR, 55 Chestnut St Apt 3F, San Francisco CA 94123
Landlord  : Sarah Johnson | sarah@example.com
Tenant    : Jordan Kim | jordan@example.com | 555-1002

LEASE TERM
Start Date : February 20, 2024
End Date   : February 19, 2025
Monthly Rent: $2,300 (Two Thousand Three Hundred Dollars)
Security Deposit: $4,600`,
};

const MOCK_DOCS: Document[] = [
  { id: 'd1', name: 'Lease Agreement — Sunset 4B.pdf', category: 'lease', property: 'Sunset Apartments 4B', uploadedBy: 'Sarah Johnson', uploadedAt: '2024-01-15T00:00:00Z', size: '1.2 MB', content: SAMPLE_CONTENTS['d1'], isPrivate: false },
  { id: 'd2', name: 'Property Inspection Report Q1-2026.pdf', category: 'inspection', property: 'Sunset Apartments 4B', uploadedBy: 'Admin', uploadedAt: '2026-03-01T00:00:00Z', size: '3.4 MB', content: SAMPLE_CONTENTS['d2'], isPrivate: false },
  { id: 'd3', name: 'Tenant ID Proof — Alex Rivera.pdf', category: 'id_proof', property: 'Sunset Apartments 4B', uploadedBy: 'Alex Rivera', uploadedAt: '2024-01-10T00:00:00Z', size: '0.8 MB', content: SAMPLE_CONTENTS['d3'], isPrivate: true },
  { id: 'd4', name: 'Building Insurance Policy 2026.pdf', category: 'insurance', property: 'All Properties', uploadedBy: 'Sarah Johnson', uploadedAt: '2026-01-01T00:00:00Z', size: '2.1 MB', content: SAMPLE_CONTENTS['d4'], isPrivate: false },
  { id: 'd5', name: 'Lease Agreement — Marina 1BR.pdf', category: 'lease', property: 'Marina District 1BR', uploadedBy: 'Sarah Johnson', uploadedAt: '2024-02-20T00:00:00Z', size: '1.1 MB', content: SAMPLE_CONTENTS['d5'], isPrivate: false },
];

const CAT_COLOR: Record<DocCategory, { color: string; bg: string; label: string; icon: string }> = {
  lease:      { color: '#2563eb', bg: '#eff6ff',  label: 'Lease',      icon: '📄' },
  id_proof:   { color: '#7c3aed', bg: '#f5f3ff',  label: 'ID Proof',   icon: '🪪' },
  inspection: { color: '#f59e0b', bg: '#fffbeb',  label: 'Inspection', icon: '🔍' },
  insurance:  { color: '#10b981', bg: '#ecfdf5',  label: 'Insurance',  icon: '🛡️' },
  other:      { color: '#64748b', bg: '#f1f5f9',  label: 'Other',      icon: '📎' },
};

// ─── Accepted file types ──────────────────────────────────────────────────────
const ACCEPTED_TYPES = [
  'application/pdf',
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];
const ACCEPTED_EXT  = '.pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.txt';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// ─── Format bytes ─────────────────────────────────────────────────────────────
const formatBytes = (bytes: number): string => {
  if (bytes < 1024)      return `${bytes} B`;
  if (bytes < 1048576)   return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

// ─── Download helper ──────────────────────────────────────────────────────────
const downloadDocument = (doc: Document) => {
  if (doc.dataUrl) {
    // Real uploaded file — use stored data URL
    const a    = document.createElement('a');
    a.href     = doc.dataUrl;
    a.download = doc.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } else if (doc.content) {
    // Sample text content
    const blob = new Blob([doc.content], { type: 'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = doc.name.replace(/\.(pdf|docx?)$/i, '.txt');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  toast.success(`Downloaded: ${doc.name}`);
};

const DocumentVault: React.FC = () => {
  const { user }   = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [docs, setDocs]           = useState<Document[]>(MOCK_DOCS);
  const [search, setSearch]       = useState('');
  const [catFilter, setCatFilter] = useState<string>('all');
  const [showUpload, setShowUpload] = useState(false);
  const [preview, setPreview]     = useState<Document | null>(null);
  const [dragOver, setDragOver]   = useState(false);

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    category: 'lease' as DocCategory,
    property: '',
    isPrivate: false,
  });
  const [pendingFile, setPendingFile]     = useState<File | null>(null);
  const [fileError, setFileError]         = useState('');
  const [uploading, setUploading]         = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const filtered = docs.filter(d => {
    if (user?.role === 'tenant' && d.isPrivate && d.uploadedBy !== user.name) return false;
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase()) || d.property.toLowerCase().includes(search.toLowerCase());
    const matchCat    = catFilter === 'all' || d.category === catFilter;
    return matchSearch && matchCat;
  });

  // ── File validation ──────────────────────────────────────────────────────────
  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) return `File is too large. Maximum size is 10 MB (your file: ${formatBytes(file.size)}).`;
    if (!ACCEPTED_TYPES.includes(file.type) && file.type !== '') {
      return `File type "${file.type}" is not supported. Accepted: PDF, JPG, PNG, WEBP, DOC, DOCX, TXT.`;
    }
    return null;
  };

  // ── Handle file selection (input or drop) ────────────────────────────────────
  const handleFileSelected = (file: File) => {
    setFileError('');
    const err = validateFile(file);
    if (err) { setFileError(err); setPendingFile(null); return; }
    setPendingFile(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelected(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelected(file);
      setShowUpload(true);
    }
  };

  // ── Upload handler — reads file into memory ──────────────────────────────────
  const handleUpload = async () => {
    setFileError('');
    if (!pendingFile) { setFileError('Please select a file to upload.'); return; }
    if (!uploadForm.property.trim()) { setFileError('Please enter the property name.'); return; }

    setUploading(true);
    try {
      // Read file as data URL for download/preview capability
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(pendingFile);
      });

      // For text files also read as text for preview
      let textContent: string | null = null;
      if (pendingFile.type === 'text/plain' || pendingFile.name.endsWith('.txt')) {
        textContent = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload  = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Failed to read text'));
          reader.readAsText(pendingFile);
        });
      }

      const newDoc: Document = {
        id:          `d${Date.now()}`,
        name:        pendingFile.name,
        category:    uploadForm.category,
        property:    uploadForm.property,
        isPrivate:   uploadForm.isPrivate,
        uploadedBy:  user?.name || 'You',
        uploadedAt:  new Date().toISOString(),
        size:        formatBytes(pendingFile.size),
        content:     textContent,
        dataUrl,
        mimeType:    pendingFile.type || 'application/octet-stream',
      };

      setDocs(prev => [newDoc, ...prev]);
      setUploadSuccess(true);
      toast.success('Document uploaded successfully!');

      setTimeout(() => {
        setShowUpload(false);
        setUploadSuccess(false);
        setPendingFile(null);
        setUploadForm({ category: 'lease', property: '', isPrivate: false });
        setFileError('');
      }, 1500);
    } catch (err) {
      setFileError('Failed to read the file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const resetUploadModal = () => {
    setShowUpload(false);
    setUploadSuccess(false);
    setPendingFile(null);
    setUploadForm({ category: 'lease', property: '', isPrivate: false });
    setFileError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const deleteDoc = (id: string) => {
    setDocs(prev => prev.filter(d => d.id !== id));
    toast.success('Document deleted');
  };

  const fieldStyle: React.CSSProperties = {
    padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border-strong)',
    borderRadius: 'var(--r-sm)', fontSize: 14, color: 'var(--text-1)', outline: 'none',
    fontFamily: 'var(--font-body)', width: '100%', boxSizing: 'border-box',
  };

  // ── Preview content resolver ──────────────────────────────────────────────────
  const renderPreviewContent = (doc: Document) => {
    if (doc.mimeType?.startsWith('image/') && doc.dataUrl) {
      return (
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <img src={doc.dataUrl} alt={doc.name} style={{ maxWidth: '100%', maxHeight: 400, borderRadius: 8, border: '1px solid var(--border)' }} />
        </div>
      );
    }
    if (doc.mimeType === 'application/pdf' && doc.dataUrl) {
      return (
        <div style={{ background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <iframe
            src={doc.dataUrl}
            title={doc.name}
            style={{ width: '100%', height: 420, border: 'none' }}
          />
        </div>
      );
    }
    if (doc.content) {
      return (
        <div style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '16px 20px', border: '1px solid var(--border)', maxHeight: 420, overflowY: 'auto', fontFamily: 'var(--font-mono)', fontSize: 12.5, lineHeight: 1.8, color: 'var(--text-2)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {doc.content}
        </div>
      );
    }
    // Binary file with no text content and no image/pdf
    return (
      <div style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '32px', border: '1px solid var(--border)', textAlign: 'center' }}>
        <File size={40} color="var(--text-4)" style={{ marginBottom: 12 }} />
        <p style={{ fontSize: 14, color: 'var(--text-3)', margin: 0 }}>Preview not available for this file type.</p>
        <p style={{ fontSize: 12, color: 'var(--text-4)', margin: '6px 0 0' }}>Download the file to view its contents.</p>
      </div>
    );
  };

  return (
    <div style={{ padding: '24px var(--content-px)' }}>
      {/* Hidden real file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_EXT}
        style={{ display: 'none' }}
        onChange={handleInputChange}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 24, color: 'var(--text-1)', margin: 0 }}>Document Vault</h1>
          <p style={{ color: 'var(--text-3)', fontSize: 14, margin: '4px 0 0' }}>Securely store leases, IDs, and property documents</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowUpload(true)} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Upload size={16} /> Upload Document
        </button>
      </div>

      {/* Category stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 12, marginBottom: 24 }}>
        {Object.entries(CAT_COLOR).map(([cat, cfg]) => {
          const count = docs.filter(d => d.category === cat as DocCategory).length;
          return (
            <div key={cat} className="card" onClick={() => setCatFilter(cat === catFilter ? 'all' : cat)}
              style={{ padding: '14px 16px', cursor: 'pointer', border: `2px solid ${catFilter === cat ? cfg.color : 'var(--border)'}`, background: catFilter === cat ? cfg.bg : 'var(--surface)', transition: 'all 0.15s' }}>
              <p style={{ fontSize: 22, fontWeight: 700, color: cfg.color, margin: 0, fontFamily: 'var(--font-display)' }}>{count}</p>
              <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '2px 0 0' }}>{cfg.icon} {cfg.label}</p>
            </div>
          );
        })}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={16} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)', pointerEvents: 'none' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by document name or property…" style={{ width: '100%', padding: '10px 14px 10px 40px', background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 'var(--r-sm)', fontSize: 14, color: 'var(--text-1)', outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--font-body)' } as React.CSSProperties} />
      </div>

      {/* Drag & Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => { setShowUpload(true); }}
        style={{ border: `2px dashed ${dragOver ? 'var(--brand)' : 'var(--border)'}`, borderRadius: 12, padding: '14px', textAlign: 'center', marginBottom: 20, background: dragOver ? 'var(--brand-light)' : 'transparent', transition: 'all 0.2s', cursor: 'pointer' }}>
        <Upload size={18} color={dragOver ? 'var(--brand)' : 'var(--text-4)'} style={{ marginBottom: 4 }} />
        <p style={{ fontSize: 13, color: dragOver ? 'var(--brand)' : 'var(--text-3)', margin: 0 }}>
          Drag & drop files here or <strong>click to upload</strong>
          <span style={{ display: 'block', fontSize: 11, color: 'var(--text-4)', marginTop: 3 }}>PDF, JPG, PNG, WEBP, DOC, DOCX, TXT — max 10 MB</span>
        </p>
      </div>

      {/* Documents list */}
      {filtered.length === 0 ? (
        <EmptyState title="No documents" message="Upload your first document to get started." icon={<FileText size={28} color="var(--brand)" />} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(doc => {
            const cfg = CAT_COLOR[doc.category];
            return (
              <div key={doc.id} className="card" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16, transition: 'all 0.15s' }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <File size={20} color={cfg.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>{doc.name}</span>
                    {doc.isPrivate && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, color: '#7c3aed', background: '#f5f3ff', padding: '2px 7px', borderRadius: 99, flexShrink: 0 }}>
                        <Lock size={9} /> Private
                      </span>
                    )}
                    <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color, background: cfg.bg, padding: '2px 8px', borderRadius: 99, flexShrink: 0 }}>{cfg.icon} {cfg.label}</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>
                    🏠 {doc.property} · {doc.size} · Uploaded by {doc.uploadedBy} · {format(new Date(doc.uploadedAt), 'MMM d, yyyy')}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button onClick={() => setPreview(doc)} title="View document" style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand)' }}>
                    <Eye size={15} />
                  </button>
                  <button onClick={() => downloadDocument(doc)} title="Download document" style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}>
                    <Download size={15} />
                  </button>
                  {(user?.role === 'owner' || user?.role === 'admin') && (
                    <button onClick={() => deleteDoc(doc.id)} title="Delete document" style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: '#fef2f2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Upload Modal ── */}
      <Modal isOpen={showUpload} onClose={resetUploadModal} title="Upload Document" maxWidth={500}>
        {uploadSuccess ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#ecfdf5', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Check size={30} color="#10b981" />
            </div>
            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>Uploaded successfully!</p>
            <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 6 }}>{pendingFile?.name}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* File picker area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files?.[0];
                if (file) handleFileSelected(file);
              }}
              style={{
                border: `2px dashed ${dragOver ? 'var(--brand)' : pendingFile ? '#10b981' : fileError ? '#ef4444' : 'var(--border)'}`,
                borderRadius: 12, padding: '24px 20px', textAlign: 'center',
                background: pendingFile ? '#ecfdf5' : dragOver ? 'var(--brand-light)' : 'var(--surface-2)',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              {pendingFile ? (
                <div>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: 'white', margin: '0 auto 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #d1fae5' }}>
                    <Check size={24} color="#10b981" />
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#065f46', margin: '0 0 3px' }}>{pendingFile.name}</p>
                  <p style={{ fontSize: 12, color: '#059669', margin: 0 }}>{formatBytes(pendingFile.size)} · Ready to upload</p>
                  <button
                    onClick={e => { e.stopPropagation(); setPendingFile(null); setFileError(''); }}
                    style={{ marginTop: 8, fontSize: 11, fontWeight: 600, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
                  >
                    ✕ Remove file
                  </button>
                </div>
              ) : (
                <div>
                  <Upload size={28} color={dragOver ? 'var(--brand)' : 'var(--text-4)'} style={{ marginBottom: 8 }} />
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-2)', margin: '0 0 4px' }}>
                    Click to select file or drag & drop
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--text-4)', margin: 0 }}>
                    PDF, JPG, PNG, WEBP, DOC, DOCX, TXT — max 10 MB
                  </p>
                </div>
              )}
            </div>

            {/* File error */}
            {fileError && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px' }}>
                <AlertCircle size={15} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 13, color: '#dc2626', margin: 0 }}>{fileError}</p>
              </div>
            )}

            {/* Category & Property */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Document Category</label>
                <select value={uploadForm.category} onChange={e => setUploadForm(p => ({ ...p, category: e.target.value as DocCategory }))} style={fieldStyle}>
                  {Object.entries(CAT_COLOR).map(([val, cfg]) => (
                    <option key={val} value={val}>{cfg.icon} {cfg.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Property *</label>
                <input
                  value={uploadForm.property}
                  onChange={e => setUploadForm(p => ({ ...p, property: e.target.value }))}
                  placeholder="e.g. Sunset Apartments 4B"
                  style={fieldStyle}
                />
              </div>
            </div>

            {/* Privacy toggle */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-2)', fontWeight: 500, background: 'var(--surface-2)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)' }}>
              <input
                type="checkbox"
                checked={uploadForm.isPrivate}
                onChange={e => setUploadForm(p => ({ ...p, isPrivate: e.target.checked }))}
                style={{ width: 15, height: 15, accentColor: 'var(--brand)' }}
              />
              <Lock size={14} color={uploadForm.isPrivate ? '#7c3aed' : 'var(--text-4)'} />
              <span>Mark as private <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-3)' }}>(only owner &amp; admin can see)</span></span>
            </label>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={resetUploadModal} style={{ flex: 1, padding: '10px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-2)', borderRadius: 'var(--r-sm)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600 }}>
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || !pendingFile}
                className="btn btn-primary"
                style={{ flex: 1, padding: '10px', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 6, opacity: !pendingFile ? 0.6 : 1 }}
              >
                {uploading ? (
                  <>
                    <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    Uploading…
                  </>
                ) : (
                  <><Upload size={15} /> Upload</>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Preview Modal ── */}
      <Modal isOpen={!!preview} onClose={() => setPreview(null)} title={preview?.name || ''} maxWidth={660}>
        {preview && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: CAT_COLOR[preview.category].bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <File size={20} color={CAT_COLOR[preview.category].color} />
              </div>
              <div>
                <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>{CAT_COLOR[preview.category].icon} {CAT_COLOR[preview.category].label} · {preview.size}</p>
                <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '2px 0 0' }}>Uploaded by {preview.uploadedBy} on {format(new Date(preview.uploadedAt), 'MMM d, yyyy')}</p>
              </div>
            </div>

            {renderPreviewContent(preview)}

            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={() => setPreview(null)} style={{ flex: 1, padding: '10px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-2)', borderRadius: 'var(--r-sm)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600 }}>Close</button>
              <button onClick={() => downloadDocument(preview)} className="btn btn-primary" style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Download size={15} /> Download
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DocumentVault;