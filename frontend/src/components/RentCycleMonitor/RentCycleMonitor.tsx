import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Activity, CheckCircle, XCircle, Clock, AlertTriangle,
  RefreshCw, Play, ChevronDown, ChevronUp, Filter,
  Calendar, Bell, FileText, Zap,
} from 'lucide-react';
import { jobsApi, auditApi, rentApi } from '../../api/services';
import { JobLog, AuditLog, RentNotification } from '../../types';
import { formatDistanceToNow, format } from 'date-fns';
import toast from 'react-hot-toast';

// ── Helpers ────────────────────────────────────────────────────────────────────
const STATUS_STYLE: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
  COMPLETED: { bg: '#ecfdf5', color: '#10b981', icon: <CheckCircle size={14} /> },
  RUNNING:   { bg: '#eff6ff', color: '#2563eb', icon: <Activity    size={14} /> },
  FAILED:    { bg: '#fef2f2', color: '#ef4444', icon: <XCircle     size={14} /> },
  PARTIAL:   { bg: '#fffbeb', color: '#f59e0b', icon: <AlertTriangle size={14} /> },
  QUEUED:    { bg: '#f5f3ff', color: '#8b5cf6', icon: <Clock       size={14} /> },
  RETRYING:  { bg: '#fffbeb', color: '#f59e0b', icon: <RefreshCw   size={14} /> },
  SENT:      { bg: '#ecfdf5', color: '#10b981', icon: <CheckCircle size={14} /> },
  success:   { bg: '#ecfdf5', color: '#10b981', icon: <CheckCircle size={14} /> },
  failure:   { bg: '#fef2f2', color: '#ef4444', icon: <XCircle     size={14} /> },
  skipped:   { bg: '#f5f3ff', color: '#8b5cf6', icon: <Clock       size={14} /> },
};

const JOB_LABELS: Record<string, string> = {
  MONTHLY_RENT_GENERATOR:  '📅 Monthly Rent Generator',
  OVERDUE_DETECTOR:        '🔍 Overdue Detector',
  NOTIFICATION_DISPATCHER: '🔔 Notification Dispatcher',
};

const JOB_API_TYPES: Record<string, 'rent-generator'|'overdue-detector'|'notification-dispatcher'> = {
  MONTHLY_RENT_GENERATOR:  'rent-generator',
  OVERDUE_DETECTOR:        'overdue-detector',
  NOTIFICATION_DISPATCHER: 'notification-dispatcher',
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? { bg: '#f3f4f6', color: '#6b7280', icon: null };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: s.bg, color: s.color,
    }}>
      {s.icon} {status}
    </span>
  );
}

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', padding: '6px 14px', background: '#f9fafb', borderRadius: 10, minWidth: 64 }}>
      <span style={{ fontSize: 18, fontWeight: 700, color }}>{value}</span>
      <span style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
    </span>
  );
}

// ── Latest Job Card ────────────────────────────────────────────────────────────
function LatestJobCard({ job, jobType, onTrigger, triggering }: {
  job?: JobLog; jobType: string;
  onTrigger: () => void; triggering: boolean;
}) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 4 }}>
            {JOB_LABELS[jobType] ?? jobType}
          </div>
          {job ? (
            <div style={{ fontSize: 11, color: 'var(--text-4)' }}>
              Last run: {formatDistanceToNow(new Date(job.startedAt), { addSuffix: true })}
            </div>
          ) : (
            <div style={{ fontSize: 11, color: 'var(--text-4)' }}>Never run</div>
          )}
        </div>
        <button
          onClick={onTrigger}
          disabled={triggering}
          title="Trigger manually"
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
            borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)',
            cursor: triggering ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600,
            color: triggering ? 'var(--text-4)' : 'var(--text-1)',
          }}
        >
          <Play size={12} /> {triggering ? 'Triggering…' : 'Run now'}
        </button>
      </div>
      {job && (
        <>
          <StatusBadge status={job.status} />
          {job.durationMs && (
            <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-4)' }}>
              {(job.durationMs / 1000).toFixed(1)}s
            </span>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <StatPill label="Total"    value={job.stats.processed} color="var(--text-1)" />
            <StatPill label="OK"       value={job.stats.succeeded} color="#10b981" />
            <StatPill label="Skipped"  value={job.stats.skipped}   color="#8b5cf6" />
            <StatPill label="Failed"   value={job.stats.failed}    color="#ef4444" />
          </div>
        </>
      )}
    </div>
  );
}

// ── Job History Row ────────────────────────────────────────────────────────────
function JobRow({ job }: { job: JobLog }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr
        onClick={() => setOpen(o => !o)}
        style={{ cursor: 'pointer', transition: 'background 0.1s' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <td style={td}><StatusBadge status={job.status} /></td>
        <td style={td}><span style={{ fontSize: 12 }}>{JOB_LABELS[job.jobType] ?? job.jobType}</span></td>
        <td style={td}><span style={{ fontSize: 12 }}>{format(new Date(job.startedAt), 'dd MMM yyyy HH:mm')}</span></td>
        <td style={td}><span style={{ fontSize: 12 }}>{job.durationMs ? `${(job.durationMs/1000).toFixed(1)}s` : '—'}</span></td>
        <td style={td}>
          <div style={{ display: 'flex', gap: 6 }}>
            <StatPill label="OK"     value={job.stats.succeeded} color="#10b981" />
            <StatPill label="Failed" value={job.stats.failed}    color="#ef4444" />
          </div>
        </td>
        <td style={td}>{open ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}</td>
      </tr>
      {open && (
        <tr>
          <td colSpan={6} style={{ padding: '8px 16px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
            <pre style={{ fontSize: 11, color: 'var(--text-3)', margin: 0, whiteSpace: 'pre-wrap' }}>
              {JSON.stringify({ jobId: job.jobId, stats: job.stats, meta: job.meta, errorMsg: job.errorMsg }, null, 2)}
            </pre>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Audit Log Row ──────────────────────────────────────────────────────────────
function AuditRow({ log }: { log: AuditLog }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr onClick={() => setOpen(o => !o)} style={{ cursor: 'pointer' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
        <td style={td}><StatusBadge status={log.status} /></td>
        <td style={td}><span style={{ fontSize: 11, fontFamily: 'monospace', background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>{log.eventType}</span></td>
        <td style={td}><span style={{ fontSize: 12 }}>{log.entityType}</span></td>
        <td style={td}><span style={{ fontSize: 11, color: 'var(--text-4)' }}>{formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}</span></td>
        <td style={td}>{open ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}</td>
      </tr>
      {open && (
        <tr>
          <td colSpan={5} style={{ padding: '8px 16px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
            <pre style={{ fontSize: 11, color: 'var(--text-3)', margin: 0, whiteSpace: 'pre-wrap' }}>
              {JSON.stringify({ entityId: log.entityId, jobId: log.jobId, payload: log.payload, errorMsg: log.errorMsg }, null, 2)}
            </pre>
          </td>
        </tr>
      )}
    </>
  );
}

const td: React.CSSProperties = { padding: '10px 12px', borderBottom: '1px solid var(--border)', verticalAlign: 'middle' };
const thStyle: React.CSSProperties = { padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.05em', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' };

type Tab = 'overview' | 'jobs' | 'audit' | 'notifications';

// ── Main Component ─────────────────────────────────────────────────────────────
const RentCycleMonitor: React.FC = () => {
  const qc = useQueryClient();
  const [tab, setTab]       = useState<Tab>('overview');
  const [jobFilter, setJobFilter] = useState('all');
  const [auditFilter, setAuditFilter] = useState('all');

  const { data: jobData, isLoading: jobsLoading } = useQuery({
    queryKey: ['jobStatus'],
    queryFn: () => jobsApi.getStatus({ limit: 30 }).then(r => r.data.data),
    refetchInterval: 15_000,
  });

  const { data: auditData, isLoading: auditLoading } = useQuery({
    queryKey: ['auditLogs', auditFilter],
    queryFn: () => auditApi.getLogs({ limit: 50, ...(auditFilter !== 'all' ? { status: auditFilter } : {}) }).then(r => r.data.data),
    enabled: tab === 'audit',
    refetchInterval: 30_000,
  });

  const { data: notifData } = useQuery({
    queryKey: ['rentNotifications'],
    queryFn: () => rentApi.getNotifications({ limit: 30 }).then(r => r.data.data),
    enabled: tab === 'notifications',
    refetchInterval: 30_000,
  });

  const triggerMutation = useMutation({
    mutationFn: (type: 'rent-generator'|'overdue-detector'|'notification-dispatcher') =>
      jobsApi.trigger(type).then(r => r.data),
    onSuccess: (_, type) => {
      toast.success(`Job '${type}' triggered successfully`);
      setTimeout(() => qc.invalidateQueries({ queryKey: ['jobStatus'] }), 2000);
    },
    onError: () => toast.error('Failed to trigger job'),
  });

  const filteredJobs = (jobData?.jobs ?? []).filter((j: JobLog) =>
    jobFilter === 'all' || j.status === jobFilter || j.jobType === jobFilter
  );

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview',      label: 'Overview',      icon: <Activity  size={14}/> },
    { id: 'jobs',          label: 'Job History',   icon: <Calendar  size={14}/> },
    { id: 'audit',         label: 'Audit Logs',    icon: <FileText  size={14}/> },
    { id: 'notifications', label: 'Notifications', icon: <Bell      size={14}/> },
  ];

  const latest = jobData?.latest ?? {};

  return (
    <div className="page" style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }} className="fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28, color: 'var(--text-1)', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
              <Zap size={22} style={{ color: '#f59e0b', verticalAlign: 'middle', marginRight: 8 }} />
              Rent Cycle Monitor
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>
              Automated scheduler · live status · updates every 15s
            </p>
          </div>
          <button
            onClick={() => qc.invalidateQueries({ queryKey: ['jobStatus'] })}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Tab Nav */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: '8px 8px 0 0',
              border: '1px solid', borderBottom: 'none',
              borderColor: tab === t.id ? 'var(--border)' : 'transparent',
              background: tab === t.id ? 'var(--surface)' : 'transparent',
              cursor: 'pointer', fontSize: 13, fontWeight: tab === t.id ? 600 : 400,
              color: tab === t.id ? 'var(--brand)' : 'var(--text-3)',
              marginBottom: tab === t.id ? -1 : 0,
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {tab === 'overview' && (
        <div className="fade-in">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
            {([
              ['MONTHLY_RENT_GENERATOR',  latest.latestGenerator],
              ['OVERDUE_DETECTOR',        latest.latestDetector],
              ['NOTIFICATION_DISPATCHER', latest.latestDispatcher],
            ] as [string, JobLog|undefined][]).map(([type, job]) => (
              <LatestJobCard
                key={type}
                job={job}
                jobType={type}
                onTrigger={() => triggerMutation.mutate(JOB_API_TYPES[type])}
                triggering={triggerMutation.isPending}
              />
            ))}
          </div>

          {/* Schedule info */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 14px', color: 'var(--text-1)' }}>Cron Schedule</h3>
            {[
              { job: '📅 Monthly Rent Generator',   schedule: '0 6 1 * *',    desc: '1st of every month at 06:00 IST' },
              { job: '🔍 Overdue Detector',         schedule: '0 7 * * *',    desc: 'Every day at 07:00 IST' },
              { job: '🔔 Notification Dispatcher',  schedule: '*/15 * * * *', desc: 'Every 15 minutes' },
            ].map(row => (
              <div key={row.job} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{row.job}</span>
                <code style={{ fontSize: 11, background: '#f3f4f6', padding: '2px 8px', borderRadius: 6, fontFamily: 'monospace' }}>{row.schedule}</code>
                <span style={{ fontSize: 12, color: 'var(--text-4)', minWidth: 200 }}>{row.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* JOB HISTORY TAB */}
      {tab === 'jobs' && (
        <div className="fade-in">
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {['all','COMPLETED','PARTIAL','FAILED','RUNNING','MONTHLY_RENT_GENERATOR','OVERDUE_DETECTOR','NOTIFICATION_DISPATCHER'].map(f => (
              <button
                key={f}
                onClick={() => setJobFilter(f)}
                style={{
                  padding: '4px 12px', borderRadius: 20, border: '1px solid var(--border)', cursor: 'pointer',
                  fontSize: 11, fontWeight: jobFilter === f ? 600 : 400,
                  background: jobFilter === f ? 'var(--brand)' : 'var(--surface)',
                  color:      jobFilter === f ? '#fff' : 'var(--text-2)',
                }}
              >
                {f === 'all' ? 'All' : f.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
            {jobsLoading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-4)' }}>Loading…</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Status','Job','Started','Duration','Results',''].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.length === 0 ? (
                    <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: 'var(--text-4)', padding: 32 }}>No jobs found</td></tr>
                  ) : (
                    filteredJobs.map((j: JobLog) => <JobRow key={j._id} job={j} />)
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* AUDIT TAB */}
      {tab === 'audit' && (
        <div className="fade-in">
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {['all','success','failure','skipped'].map(f => (
              <button key={f} onClick={() => setAuditFilter(f)}
                style={{ padding: '4px 12px', borderRadius: 20, border: '1px solid var(--border)', cursor: 'pointer',
                  fontSize: 11, fontWeight: auditFilter === f ? 600 : 400,
                  background: auditFilter === f ? 'var(--brand)' : 'var(--surface)',
                  color: auditFilter === f ? '#fff' : 'var(--text-2)' }}>
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
            {auditLoading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-4)' }}>Loading…</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Status','Event','Entity','When',''].map(h => <th key={h} style={thStyle}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {(auditData?.logs ?? []).length === 0 ? (
                    <tr><td colSpan={5} style={{ ...td, textAlign: 'center', color: 'var(--text-4)', padding: 32 }}>No audit logs found</td></tr>
                  ) : (
                    (auditData?.logs ?? []).map((l: AuditLog) => <AuditRow key={l._id} log={l} />)
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* NOTIFICATIONS TAB */}
      {tab === 'notifications' && (
        <div className="fade-in">
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Status','Type','Tenant','Message','Retries','Created'].map(h => <th key={h} style={thStyle}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {(notifData?.notifications ?? []).length === 0 ? (
                  <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: 'var(--text-4)', padding: 32 }}>No notifications found</td></tr>
                ) : (
                  (notifData?.notifications ?? []).map((n: RentNotification) => (
                    <tr key={n._id}>
                      <td style={td}><StatusBadge status={n.status} /></td>
                      <td style={td}><span style={{ fontSize: 11, fontFamily: 'monospace', background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>{n.type}</span></td>
                      <td style={td}><span style={{ fontSize: 12 }}>{typeof n.tenantId === 'object' ? (n.tenantId as any)?.name ?? '—' : n.tenantId}</span></td>
                      <td style={td}><span style={{ fontSize: 12, color: 'var(--text-2)' }}>{n.message.slice(0, 60)}…</span></td>
                      <td style={td}><span style={{ fontSize: 12 }}>{n.retryCount}/{n.maxRetries}</span></td>
                      <td style={td}><span style={{ fontSize: 11, color: 'var(--text-4)' }}>{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default RentCycleMonitor;