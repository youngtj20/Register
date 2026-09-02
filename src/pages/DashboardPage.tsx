import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, Bell, CalendarDays, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ClipboardCheck, Clock3, Copy, Download, FileSpreadsheet, LayoutDashboard, LogOut, MapPin, Menu, Pencil, Plus, Printer, RefreshCw, Settings2, ShieldCheck, Smartphone, Trash2, Upload, UserCog, Users, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import EventQrCard from '../components/EventQrCard';
import EventQrPoster from '../components/EventQrPoster';
import ImportAttendeesModal from '../components/ImportAttendeesModal';
import Logo from '../components/Logo';
import MarkPresentConfirm from '../components/MarkPresentConfirm';
import PrintAuditModal from '../components/PrintAuditModal';
import { useAuth } from '../contexts/AuthContext';
import { formatEventDate, formatEventTime } from '../lib/datetime';
import { isValidNigerianPhone } from '../lib/phone';
import type { Attendee, Checkin, EventRecord, Profile, Stats } from '../types';

type Tab = 'overview' | 'desk' | 'attendees' | 'history' | 'staff' | 'settings';
type AttendeeForm = Pick<Attendee, 'full_name' | 'phone'> & { email: string; organisation: string };
const emptyForm: AttendeeForm = { full_name: '', phone: '', email: '', organisation: '' };
type EventForm = { name: string; venue: string; starts_at: string; ends_at: string; status: string };
const emptyEventForm: EventForm = { name: '', venue: '', starts_at: '', ends_at: '', status: 'draft' };
const toLocalInput = (value: string) => value ? value.replace(' ', 'T').slice(0, 16) : '';
const formatDate = formatEventDate;
const formatTime = formatEventTime;
const initials = (name: string) => name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();
const HISTORY_PAGE_SIZE = 30;
const greeting = () => { const hour = new Date().getHours(); return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'; };

function Metric({ label, value, detail, icon: Icon, tone = 'green' }: { label: string; value: string | number; detail: string; icon: typeof Users; tone?: 'green' | 'gold' | 'blue' | 'slate' }) {
  return <div className="metric-card"><div className={`metric-icon metric-${tone}`}><Icon size={19} /></div><div className="mt-5 text-[13px] font-medium text-[#68756f]">{label}</div><div className="mt-1 font-display text-3xl font-semibold tracking-[-.04em] text-[#17201d]">{value}</div><div className="mt-2 text-xs text-[#8a9590]">{detail}</div></div>;
}

function StatusPill({ attendee }: { attendee: Attendee }) {
  return attendee.checked_in ? <span className="status-present"><Check size={12} /> Present</span> : <span className="status-pending"><Clock3 size={12} /> Awaiting</span>;
}

export default function DashboardPage() {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [eventId, setEventId] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [sectionLoading, setSectionLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [busyId, setBusyId] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Attendee | null>(null);
  const [form, setForm] = useState<AttendeeForm>(emptyForm);
  const [formError, setFormError] = useState('');
  const [formBusy, setFormBusy] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventRecord | null>(null);
  const [eventForm, setEventForm] = useState<EventForm>(emptyEventForm);
  const [eventFormError, setEventFormError] = useState('');
  const [eventFormBusy, setEventFormBusy] = useState(false);
  const [confirmAttendee, setConfirmAttendee] = useState<Attendee | null>(null);
  const [posterEvent, setPosterEvent] = useState<EventRecord | null>(null);
  const [historyQuery, setHistoryQuery] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [staffForm, setStaffForm] = useState({ email: '', full_name: '', password: '', role: 'receptionist' });
  const [staffFormError, setStaffFormError] = useState('');
  const [staffFormBusy, setStaffFormBusy] = useState(false);
  const [selectedCheckinIds, setSelectedCheckinIds] = useState<Set<string>>(new Set());

  const activeEvent = events.find((item) => item.id === eventId) || null;
  const isAdmin = profile?.role === 'admin';

  const api = useCallback(async (url: string, options: RequestInit = {}) => {
    const response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) } });
    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await response.json() : await response.text();
    if (!response.ok) throw new Error(data.error || 'Request failed');
    return data;
  }, [token]);

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 3200);
  }, []);

  const loadStats = useCallback(async (id: string, silent = false) => {
    if (!id) return;
    if (!silent) setSectionLoading(true);
    try { setStats(await api(`/api/stats?eventId=${encodeURIComponent(id)}`)); }
    catch (err) { if (!silent) setError(err instanceof Error ? err.message : 'Unable to load attendance totals.'); }
    finally { if (!silent) setSectionLoading(false); }
  }, [api]);

  const loadAttendees = useCallback(async (id = eventId, q = search, status = statusFilter) => {
    if (!id) return;
    setSectionLoading(true);
    try { setAttendees(await api(`/api/attendees?eventId=${encodeURIComponent(id)}&q=${encodeURIComponent(q)}&status=${status}`)); setError(''); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to load attendees.'); }
    finally { setSectionLoading(false); }
  }, [api, eventId, search, statusFilter]);

  const loadCheckins = useCallback(async (id = eventId, q = historyQuery, page = historyPage) => {
    if (!id) return;
    setSectionLoading(true);
    try {
      const data = await api(`/api/checkins?eventId=${encodeURIComponent(id)}&q=${encodeURIComponent(q)}&page=${page}&pageSize=${HISTORY_PAGE_SIZE}`);
      setCheckins(data.results);
      setHistoryTotal(data.total);
      setError('');
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load check-in history.'); }
    finally { setSectionLoading(false); }
  }, [api, eventId, historyQuery, historyPage]);

  const loadStaff = useCallback(async () => {
    if (!isAdmin) return;
    setSectionLoading(true);
    try { setStaff(await api('/api/staff')); setError(''); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to load staff.'); }
    finally { setSectionLoading(false); }
  }, [api, isAdmin]);

  const loadEvents = useCallback(async () => {
    try { const data = await api('/api/events'); setEvents(data); setError(''); return data as EventRecord[]; }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to load events.'); return []; }
  }, [api]);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const me = await api('/api/me');
        setProfile(me);
        if (!me.active) return;
        const eventData = await loadEvents();
        const first = eventData.find((item: EventRecord) => item.status === 'active') || eventData[0];
        if (first) { setEventId(first.id); await loadStats(first.id); }
      } catch (err) { setError(err instanceof Error ? err.message : 'Unable to open your workspace.'); }
      finally { setLoading(false); }
    })();
  }, [token, api, loadStats, loadEvents]);

  useEffect(() => {
    if (!eventId || !profile?.active) return;
    loadStats(eventId, true);
  }, [eventId, profile?.active, loadStats]);

  useEffect(() => {
    if (!eventId || !profile?.active) return;
    if (tab === 'desk' || tab === 'attendees') {
      const timer = window.setTimeout(() => loadAttendees(), 260);
      return () => window.clearTimeout(timer);
    }
    if (tab === 'staff' && isAdmin) loadStaff();
    if (tab === 'settings' && isAdmin) loadEvents();
  }, [tab, eventId, search, statusFilter, profile?.active, isAdmin, loadAttendees, loadStaff, loadEvents]);

  useEffect(() => {
    if (!eventId || !profile?.active || tab !== 'history') return;
    const timer = window.setTimeout(() => loadCheckins(eventId, historyQuery, historyPage), 260);
    return () => window.clearTimeout(timer);
  }, [tab, eventId, historyQuery, historyPage, profile?.active, loadCheckins]);

  const switchTab = (next: Tab) => { setTab(next); setMenuOpen(false); setSearch(''); setStatusFilter('all'); setHistoryQuery(''); setHistoryPage(1); setSelectedCheckinIds(new Set()); setError(''); };

  const toggleSelectCheckin = (id: string) => {
    setSelectedCheckinIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const allOnPageSelected = checkins.length > 0 && checkins.every((item) => selectedCheckinIds.has(item.id));
  const toggleSelectAllOnPage = () => {
    setSelectedCheckinIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) checkins.forEach((item) => next.delete(item.id));
      else checkins.forEach((item) => next.add(item.id));
      return next;
    });
  };

  const markPresent = async (attendeeId?: string, registrationCode?: string, method = 'reception') => {
    const key = attendeeId || registrationCode || 'scanner';
    setBusyId(key); setError('');
    try {
      const data = await api('/api/checkins', { method: 'POST', body: JSON.stringify({ attendeeId, registrationCode, method }) });
      notify(`${data.attendee.full_name} is checked in`);
      await Promise.all([loadAttendees(eventId), loadStats(eventId, true)]);
    } catch (err) { setError(err instanceof Error ? err.message : 'Check-in failed.'); }
    finally { setBusyId(''); }
  };

  const openAttendeeModal = (attendee?: Attendee) => {
    setEditing(attendee || null);
    setForm(attendee ? { full_name: attendee.full_name, phone: attendee.phone, email: attendee.email || '', organisation: attendee.organisation || '' } : emptyForm);
    setFormError(''); setModalOpen(true);
  };

  const saveAttendee = async (event: React.FormEvent) => {
    event.preventDefault(); setFormError('');
    if (form.full_name.trim().length < 2) return setFormError('Enter the participant’s full name.');
    if (!isValidNigerianPhone(form.phone)) return setFormError('Enter a valid Nigerian phone number, e.g. 0803 123 4567.');
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) return setFormError('Enter a valid email address.');
    setFormBusy(true);
    try {
      await api('/api/attendees', { method: editing ? 'PUT' : 'POST', body: JSON.stringify(editing ? { id: editing.id, ...form } : { event_id: eventId, ...form }) });
      setModalOpen(false); notify(editing ? 'Attendee updated' : 'Attendee registered'); await loadAttendees(); await loadStats(eventId, true);
    } catch (err) { setFormError(err instanceof Error ? err.message : 'Unable to save attendee.'); }
    finally { setFormBusy(false); }
  };

  const openEventModal = (event?: EventRecord) => {
    setEditingEvent(event || null);
    setEventForm(event ? { name: event.name, venue: event.venue, starts_at: toLocalInput(event.starts_at), ends_at: toLocalInput(event.ends_at), status: event.status } : emptyEventForm);
    setEventFormError(''); setEventModalOpen(true);
  };

  const saveEvent = async (event: React.FormEvent) => {
    event.preventDefault(); setEventFormError('');
    if (eventForm.name.trim().length < 2) return setEventFormError('Enter the event name.');
    if (eventForm.venue.trim().length < 2) return setEventFormError('Enter the venue.');
    if (!eventForm.starts_at || !eventForm.ends_at) return setEventFormError('Enter the start and end date/time.');
    if (new Date(eventForm.ends_at) <= new Date(eventForm.starts_at)) return setEventFormError('End time must be after the start time.');
    setEventFormBusy(true);
    try {
      const saved = await api('/api/events', { method: editingEvent ? 'PUT' : 'POST', body: JSON.stringify(editingEvent ? { id: editingEvent.id, ...eventForm } : eventForm) });
      setEventModalOpen(false);
      notify(editingEvent ? 'Event updated' : 'Event created');
      await loadEvents();
      if (!editingEvent) setEventId(saved.id);
    } catch (err) { setEventFormError(err instanceof Error ? err.message : 'Unable to save event.'); }
    finally { setEventFormBusy(false); }
  };

  const deleteAttendee = async (attendee: Attendee) => {
    if (!window.confirm(`Delete ${attendee.full_name} and their check-in history?`)) return;
    setBusyId(attendee.id);
    try { await api('/api/attendees', { method: 'DELETE', body: JSON.stringify({ id: attendee.id }) }); notify('Attendee deleted'); await loadAttendees(); await loadStats(eventId, true); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to delete attendee.'); }
    finally { setBusyId(''); }
  };

  const exportExcel = async () => {
    if (!eventId || !token) return;
    setBusyId('export');
    try {
      const response = await fetch(`/api/export?eventId=${encodeURIComponent(eventId)}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error); }
      const blob = await response.blob();
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement('a'); anchor.href = href;
      const disposition = response.headers.get('content-disposition');
      anchor.download = disposition?.match(/filename="([^"]+)"/)?.[1] || 'attendance-export.xls';
      anchor.click(); URL.revokeObjectURL(href); notify('Excel report downloaded');
    } catch (err) { setError(err instanceof Error ? err.message : 'Export failed.'); }
    finally { setBusyId(''); }
  };

  const updateStaff = async (member: Profile, changes: Partial<Profile>) => {
    setBusyId(member.id);
    try { await api('/api/staff', { method: 'PUT', body: JSON.stringify({ id: member.id, role: changes.role || member.role, active: typeof changes.active === 'boolean' ? changes.active : member.active }) }); notify('Staff access updated'); await loadStaff(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to update staff.'); }
    finally { setBusyId(''); }
  };

  const openStaffModal = () => {
    setStaffForm({ email: '', full_name: '', password: '', role: 'receptionist' });
    setStaffFormError(''); setStaffModalOpen(true);
  };

  const saveStaffMember = async (event: React.FormEvent) => {
    event.preventDefault(); setStaffFormError('');
    if (staffForm.full_name.trim().length < 2) return setStaffFormError('Enter the team member’s full name.');
    if (!staffForm.email.includes('@')) return setStaffFormError('Enter a valid email address.');
    if (staffForm.password.length < 6) return setStaffFormError('Password must contain at least 6 characters.');
    setStaffFormBusy(true);
    try {
      await api('/api/staff', { method: 'POST', body: JSON.stringify(staffForm) });
      setStaffModalOpen(false); notify('Team member added'); await loadStaff();
    } catch (err) { setStaffFormError(err instanceof Error ? err.message : 'Unable to add team member.'); }
    finally { setStaffFormBusy(false); }
  };

  const togglePrinted = async (record: Checkin) => {
    setBusyId(record.id);
    try {
      await api('/api/checkins-print', { method: 'POST', body: JSON.stringify({ ids: [record.id], printed: !record.printed_at }) });
      await loadCheckins();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to update print status.'); }
    finally { setBusyId(''); }
  };

  const markPageAsPrinted = async () => {
    if (!checkins.length) return;
    setBusyId('mark-page');
    try {
      await api('/api/checkins-print', { method: 'POST', body: JSON.stringify({ ids: checkins.map((item) => item.id), printed: true }) });
      notify('This page was marked as printed');
      await loadCheckins();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to mark this page as printed.'); }
    finally { setBusyId(''); }
  };

  const signOut = () => { logout(); navigate('/login'); };

  const nav = useMemo(() => [
    { id: 'overview' as Tab, label: 'Overview', icon: LayoutDashboard, show: true },
    { id: 'desk' as Tab, label: 'Check-in desk', icon: ClipboardCheck, show: true },
    { id: 'attendees' as Tab, label: 'Attendees', icon: Users, show: isAdmin },
    { id: 'history' as Tab, label: 'Audit log', icon: BarChart3, show: true },
    { id: 'staff' as Tab, label: 'Staff access', icon: UserCog, show: isAdmin },
    { id: 'settings' as Tab, label: 'Event settings', icon: Settings2, show: isAdmin },
  ].filter((item) => item.show), [isAdmin]);

  if (loading) return <div className="min-h-screen bg-[#f1f5f3] grid place-items-center"><div className="flex items-center gap-3 text-[#5e6c67]"><span className="loader" /> Preparing the welcome desk…</div></div>;

  if (profile && !profile.active) return <main className="min-h-screen bg-[#f1f5f3] grid place-items-center p-5"><section className="panel max-w-lg p-8 text-center"><span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-amber-50 text-amber-700"><ShieldCheck size={28} /></span><span className="eyebrow mt-6 block">Account pending</span><h1 className="mt-2 font-display text-3xl font-semibold">Approval is on the way</h1><p className="mt-3 text-sm leading-6 text-[#68756f]">Your account is secure, but an administrator needs to activate staff access before you can manage arrivals.</p><div className="mt-6 rounded-xl bg-[#f5f7f6] px-4 py-3 text-sm font-medium">{profile.auth_email || profile.email}</div><button className="btn-secondary mx-auto mt-6" onClick={signOut}><LogOut size={16} /> Sign out</button></section></main>;

  return <div className="min-h-screen bg-[#f2f5f3] text-[#17201d]">
    <aside className={`fixed inset-y-0 left-0 z-50 w-[264px] transform bg-gradient-to-b from-[#0a4a38] via-[#073d2e] to-[#052a20] text-white shadow-[8px_0_40px_rgba(5,29,21,.18)] transition-transform lg:translate-x-0 ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}><div className="flex h-full flex-col p-5"><div className="flex items-center justify-between"><Logo light /><button className="lg:hidden" onClick={() => setMenuOpen(false)}><X size={20} /></button></div><div className="mt-9 px-3 text-[10px] font-bold uppercase tracking-[.2em] text-emerald-100/40">Workspace</div><nav className="mt-3 space-y-1">{nav.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => switchTab(id)} className={`sidebar-link ${tab === id ? 'sidebar-link-active' : ''}`}><Icon size={18} /> {label}</button>)}</nav><div className="mt-auto"><div className="mb-3 rounded-2xl border border-white/10 bg-white/[.06] p-3"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e9fff6] text-xs font-bold text-[#087f5b]">{initials(profile?.full_name || 'Staff')}</span><div className="min-w-0 flex-1"><b className="block truncate text-xs">{profile?.full_name}</b><span className="block truncate text-[11px] capitalize text-emerald-100/50">{profile?.role}</span></div></div></div><button onClick={signOut} className="sidebar-link w-full"><LogOut size={17} /> Sign out</button></div></div></aside>
    {menuOpen && <button aria-label="Close menu" className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden" onClick={() => setMenuOpen(false)} />}
    <div className="lg:pl-[264px]"><header className="sticky top-0 z-30 border-b border-[#e0e7e3] bg-[#f8faf9]/90 backdrop-blur-xl"><div className="flex h-[72px] items-center gap-4 px-4 sm:px-7"><button className="grid h-10 w-10 place-items-center rounded-xl border border-[#dfe6e2] bg-white lg:hidden" onClick={() => setMenuOpen(true)}><Menu size={19} /></button><div className="min-w-0 flex-1"><h1 className="truncate font-display text-lg font-semibold">{nav.find((item) => item.id === tab)?.label}</h1><p className="hidden truncate text-xs text-[#7a8781] sm:block">Live attendance workspace</p></div>{events.length > 0 && <div className="relative"><CalendarDays className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#728079]" size={15} /><select className="event-select" value={eventId} onChange={(e) => { setEventId(e.target.value); setSearch(''); }} aria-label="Select event">{events.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#728079]" size={14} /></div>}<button className="relative grid h-10 w-10 place-items-center rounded-xl border border-[#dfe6e2] bg-white text-[#68756f]"><Bell size={17} /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#eb8f34]" /></button></div></header>
      <main className="mx-auto max-w-[1440px] p-4 sm:p-7 lg:p-8">{error && <div className="error-banner mb-5"><span>{error}</span><button onClick={() => setError('')}><X size={16} /></button></div>}
        <AnimatePresence mode="wait"><motion.div key={tab} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }} transition={{ duration: .18 }}>
        {tab === 'overview' && <div className="space-y-6"><section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-medium text-[#68756f]">{greeting()}, {profile?.full_name?.split(' ')[0] || 'there'}</p><span className="eyebrow mt-2 block">Live event</span><h2 className="mt-1 font-display text-2xl font-semibold tracking-[-.035em] sm:text-3xl">{activeEvent?.name || 'No active event'}</h2>{activeEvent && <div className="mt-2 flex flex-wrap gap-4 text-xs text-[#75817b]"><span className="flex items-center gap-1.5"><MapPin size={14} />{activeEvent.venue}</span><span className="flex items-center gap-1.5"><CalendarDays size={14} />{formatDate(activeEvent.starts_at)} · {formatTime(activeEvent.starts_at)}</span></div>}</div><div className="flex gap-2">{isAdmin && <button className="btn-secondary" onClick={exportExcel} disabled={busyId === 'export'}>{busyId === 'export' ? <span className="loader-sm" /> : <FileSpreadsheet size={16} />} Export Excel</button>}<button className="btn-ghost" onClick={() => eventId && loadStats(eventId)}><RefreshCw size={16} /> Refresh</button></div></section>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{sectionLoading && !stats ? Array.from({ length: 4 }).map((_, index) => <div className="metric-card skeleton h-44" key={index} />) : <><Metric label="Registered guests" value={stats?.total || 0} detail="Pre-registered attendees" icon={Users} tone="slate" /><Metric label="Checked in" value={stats?.present || 0} detail={`${stats?.rate || 0}% arrival rate`} icon={CheckCircle2} /><Metric label="Awaiting arrival" value={stats?.pending || 0} detail="Not yet present" icon={Clock3} tone="gold" /><Metric label="Self / scanned" value={`${stats?.self || 0} / ${stats?.scanned || 0}`} detail="QR-assisted arrivals" icon={Smartphone} tone="blue" /></>}</div>
          <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]"><section className="panel"><div className="panel-header"><div><span className="eyebrow">Latest activity</span><h2 className="panel-title">Recent arrivals</h2></div><button className="btn-ghost" onClick={() => switchTab('history')}>View audit log</button></div><div className="divide-y divide-[#edf1ef]">{stats?.recent?.length ? stats.recent.map((item) => <div key={item.id} className="flex items-center gap-3 px-5 py-4 sm:px-6"><span className="avatar">{initials(item.attendee?.full_name || 'Guest')}</span><div className="min-w-0 flex-1"><b className="block truncate text-sm">{item.attendee?.full_name || 'Guest'}</b><span className="mt-1 block text-xs text-[#7b8782]">{item.method === 'qr' ? 'Self check-in' : item.method === 'scanner' ? 'QR scanner' : `Assisted by ${item.assistant_name}`}</span></div><time className="text-xs font-medium text-[#7b8782]">{formatTime(item.checked_in_at)}</time></div>) : <div className="empty-state"><ClipboardCheck size={25} /><p>Arrivals will appear here in real time.</p></div>}</div></section>{activeEvent && <EventQrCard event={activeEvent} onNotify={notify} />}</div>
        </div>}
        {tab === 'desk' && <div><section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><span className="eyebrow">Reception mode</span><h2 className="mt-1 font-display text-2xl font-semibold tracking-[-.035em]">Find and welcome guests</h2><p className="mt-2 text-sm text-[#76827d]">Search by name, phone, or registration ID.</p></div><button className="btn-ghost" onClick={() => loadAttendees()} disabled={sectionLoading}><RefreshCw size={16} /> Refresh</button></section><section className="panel overflow-hidden"><div className="border-b border-[#e7ece9] bg-[#fafcfb] p-4 sm:p-5"><div className="relative"><input autoFocus className="input h-14 pr-11 text-base shadow-sm" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Start typing a guest name or phone number…" />{search && <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center rounded-full text-[#9aa5a0] transition hover:bg-[#eef3f0] hover:text-[#4d5854]" onClick={() => setSearch('')} aria-label="Clear search"><X size={15} /></button>}</div><div className="mt-3 flex flex-wrap gap-2"><button className={`filter-pill ${statusFilter === 'all' ? 'filter-pill-active' : ''}`} onClick={() => setStatusFilter('all')}>All <span>{stats?.total ?? 0}</span></button><button className={`filter-pill ${statusFilter === 'pending' ? 'filter-pill-active' : ''}`} onClick={() => setStatusFilter('pending')}>Awaiting <span>{stats?.pending ?? 0}</span></button><button className={`filter-pill ${statusFilter === 'present' ? 'filter-pill-active' : ''}`} onClick={() => setStatusFilter('present')}>Present <span>{stats?.present ?? 0}</span></button></div></div><div className="min-h-[360px]">{sectionLoading ? <div className="grid place-items-center py-24"><span className="loader" /></div> : attendees.length ? <div className="divide-y divide-[#edf1ef]">{attendees.map((attendee) => <div key={attendee.id} className="flex flex-col gap-4 p-4 transition hover:bg-[#fafcfb] sm:flex-row sm:items-center sm:px-6"><span className="avatar h-11 w-11 text-sm">{initials(attendee.full_name)}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><b className="truncate text-sm">{attendee.full_name}</b><StatusPill attendee={attendee} /></div><p className="mt-1 truncate text-xs text-[#7b8782]">{attendee.phone} · {attendee.organisation || 'No union/organisation'} · {attendee.registration_code}</p></div>{attendee.checked_in ? <div className="text-right"><b className="block text-xs text-[#087f5b]">Checked in {formatTime(attendee.checked_in_at!)}</b><span className="mt-1 block text-[11px] text-[#87928d]">{attendee.checkin_method === 'qr' ? 'Self check-in' : `by ${attendee.checked_in_by_name}`}</span></div> : <button className="btn-primary justify-center sm:min-w-36" disabled={busyId === attendee.id} onClick={() => setConfirmAttendee(attendee)}>{busyId === attendee.id ? <span className="loader-sm" /> : <Check size={16} />} Mark present</button>}</div>)}</div> : <div className="empty-state py-24"><p>{search ? 'No attendee matches that search.' : 'No attendees are registered for this event.'}</p></div>}</div></section></div>}
        {tab === 'attendees' && isAdmin && <div><section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><span className="eyebrow">Registration directory</span><h2 className="mt-1 font-display text-2xl font-semibold tracking-[-.035em]">Attendee records</h2><p className="mt-2 text-sm text-[#76827d]">Manage pre-registered guests and export attendance.</p></div><div className="flex flex-wrap gap-2"><button className="btn-ghost" onClick={() => loadAttendees()} disabled={sectionLoading}><RefreshCw size={16} /> Refresh</button><button className="btn-secondary" onClick={() => setImportModalOpen(true)}><Upload size={16} /> Import Excel</button><button className="btn-secondary" onClick={exportExcel} disabled={busyId === 'export'}><Download size={16} /> Export Excel</button><button className="btn-primary" onClick={() => openAttendeeModal()}><Plus size={16} /> Add attendee</button></div></section><div className="mb-5 flex flex-wrap gap-3"><span className="stat-chip"><Users size={14} /> {stats?.total ?? attendees.length} registered</span><span className="stat-chip stat-chip-green"><CheckCircle2 size={14} /> {stats?.present ?? 0} checked in</span><span className="stat-chip stat-chip-gold"><Clock3 size={14} /> {stats?.pending ?? 0} awaiting</span></div><section className="panel overflow-hidden"><div className="flex flex-col gap-3 border-b border-[#e7ece9] bg-[#fafcfb] p-4 sm:p-5"><input className="input h-11" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search directory" /><div className="flex flex-wrap gap-2"><button className={`filter-pill ${statusFilter === 'all' ? 'filter-pill-active' : ''}`} onClick={() => setStatusFilter('all')}>All statuses</button><button className={`filter-pill ${statusFilter === 'present' ? 'filter-pill-active' : ''}`} onClick={() => setStatusFilter('present')}>Present</button><button className={`filter-pill ${statusFilter === 'pending' ? 'filter-pill-active' : ''}`} onClick={() => setStatusFilter('pending')}>Not present</button></div></div><div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Participant</th><th>Contact</th><th>Registration</th><th>Status</th><th>Checked in</th><th className="text-right">Actions</th></tr></thead><tbody>{attendees.map((attendee) => <tr key={attendee.id}><td><div className="flex items-center gap-3"><span className="avatar">{initials(attendee.full_name)}</span><div><b>{attendee.full_name}</b><span>{attendee.organisation || '—'}</span></div></div></td><td><b>{attendee.phone}</b>{attendee.email && <span>{attendee.email}</span>}</td><td><b className="font-mono text-xs">{attendee.registration_code}</b></td><td><StatusPill attendee={attendee} /></td><td>{attendee.checked_in ? <><b>{formatTime(attendee.checked_in_at!)}</b><span>{attendee.checkin_method === 'qr' ? 'Self check-in' : attendee.checked_in_by_name}</span></> : <span className="text-[#a7b0ab]">—</span>}</td><td><div className="flex justify-end gap-1"><button className="table-action" title="Edit attendee" onClick={() => openAttendeeModal(attendee)}><Pencil size={15} /></button><button className="table-action table-action-danger" title="Delete attendee" disabled={busyId === attendee.id} onClick={() => deleteAttendee(attendee)}><Trash2 size={15} /></button></div></td></tr>)}</tbody></table>{!sectionLoading && !attendees.length && <div className="empty-state py-20"><Users size={25} /><p>No attendee records match this view.</p></div>}{sectionLoading && <div className="grid place-items-center py-16"><span className="loader" /></div>}</div></section></div>}
        {tab === 'history' && <div>
          <section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><span className="eyebrow">Compliance trail</span><h2 className="mt-1 font-display text-2xl font-semibold tracking-[-.035em]">Attendance audit log</h2><p className="mt-2 text-sm text-[#76827d]">Full name, phone, union/organisation, and check-in time for every participant.</p></div><div className="flex flex-wrap gap-2"><button className="btn-ghost" onClick={() => loadCheckins()} disabled={sectionLoading}><RefreshCw size={16} /> Refresh</button>{selectedCheckinIds.size > 0 && <button className="btn-ghost" onClick={() => setSelectedCheckinIds(new Set())}>Clear selection</button>}<button className="btn-secondary" disabled={!checkins.length || busyId === 'mark-page'} onClick={markPageAsPrinted}>{busyId === 'mark-page' ? <span className="loader-sm" /> : <Check size={16} />} Mark page as printed</button><button className="btn-primary" onClick={() => setPrintModalOpen(true)}><Printer size={16} /> {selectedCheckinIds.size > 0 ? `Print ${selectedCheckinIds.size} selected` : 'Print'}</button></div></section>
          <section className="panel overflow-hidden">
            <div className="border-b border-[#e7ece9] bg-[#fafcfb] p-4 sm:p-5"><input className="input h-11" value={historyQuery} onChange={(e) => { setHistoryQuery(e.target.value); setHistoryPage(1); setSelectedCheckinIds(new Set()); }} placeholder="Filter by participant name, phone, or organisation" /></div>
            <div className="overflow-x-auto"><table className="data-table"><thead><tr><th className="w-10"><input type="checkbox" checked={allOnPageSelected} onChange={toggleSelectAllOnPage} aria-label="Select all on this page" /></th><th>Full name</th><th>Phone number</th><th>Union/Organisation</th><th>Checked in</th><th>Printed</th></tr></thead><tbody>{checkins.map((item) => <tr key={item.id} className={selectedCheckinIds.has(item.id) ? 'bg-[#f2f8f5]' : ''}><td><input type="checkbox" checked={selectedCheckinIds.has(item.id)} onChange={() => toggleSelectCheckin(item.id)} aria-label={`Select ${item.attendee?.full_name || 'record'}`} /></td><td><div className="flex items-center gap-3"><span className="avatar">{initials(item.attendee?.full_name || 'Guest')}</span><b>{item.attendee?.full_name || 'Unknown guest'}</b></div></td><td><b>{item.attendee?.phone}</b></td><td><b>{item.attendee?.organisation || '—'}</b></td><td><b>{formatTime(item.checked_in_at)}</b><span>{item.method === 'qr' ? 'Self check-in' : item.method === 'scanner' ? 'Badge scan' : `By ${item.assistant_name}`}</span></td><td><button className={`status-${item.printed_at ? 'present' : 'neutral'}`} disabled={busyId === item.id} onClick={() => togglePrinted(item)}>{busyId === item.id ? <span className="loader-sm" /> : item.printed_at ? <Check size={12} /> : <Printer size={12} />} {item.printed_at ? `Printed ${formatTime(item.printed_at)}` : 'Not printed'}</button></td></tr>)}</tbody></table>{!sectionLoading && !checkins.length && <div className="empty-state py-24"><ClipboardCheck size={26} /><p>{historyQuery ? 'No check-ins match that filter.' : 'No attendance has been marked yet.'}</p></div>}{sectionLoading && <div className="grid place-items-center py-16"><span className="loader" /></div>}</div>
            {historyTotal > 0 && <div className="flex flex-col items-center justify-between gap-3 border-t border-[#e7ece9] p-4 sm:flex-row"><span className="text-xs text-[#7b8782]">Showing {(historyPage - 1) * HISTORY_PAGE_SIZE + 1}–{Math.min(historyPage * HISTORY_PAGE_SIZE, historyTotal)} of {historyTotal}</span><div className="flex items-center gap-2"><button className="btn-secondary" disabled={historyPage <= 1} onClick={() => { setHistoryPage((p) => Math.max(1, p - 1)); setSelectedCheckinIds(new Set()); }}><ChevronLeft size={15} /> Prev</button><span className="text-xs font-semibold text-[#4d5854]">Page {historyPage} of {Math.max(1, Math.ceil(historyTotal / HISTORY_PAGE_SIZE))}</span><button className="btn-secondary" disabled={historyPage * HISTORY_PAGE_SIZE >= historyTotal} onClick={() => { setHistoryPage((p) => p + 1); setSelectedCheckinIds(new Set()); }}>Next <ChevronRight size={15} /></button></div></div>}
          </section>
        </div>}
        {tab === 'staff' && isAdmin && <div><section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><span className="eyebrow">Security & permissions</span><h2 className="mt-1 font-display text-2xl font-semibold tracking-[-.035em]">Staff access</h2><p className="mt-2 text-sm text-[#76827d]">Add team members and assign operational roles.</p></div><button className="btn-primary" onClick={openStaffModal}><Plus size={16} /> Add team member</button></section><div className="mb-5 flex flex-wrap gap-3"><span className="stat-chip"><UserCog size={14} /> {staff.length} total</span><span className="stat-chip stat-chip-green"><Check size={14} /> {staff.filter((m) => m.active).length} active</span><span className="stat-chip stat-chip-gold"><Clock3 size={14} /> {staff.filter((m) => !m.active).length} pending</span></div><section className="panel overflow-hidden"><div className="panel-header"><div><h3 className="panel-title">Team members</h3><p className="mt-1 text-xs text-[#7b8782]">Accounts added here have immediate access once activated.</p></div><span className="icon-chip"><UserCog size={18} /></span></div><div className="divide-y divide-[#edf1ef]">{staff.map((member) => <div key={member.id} className="flex flex-col gap-4 px-5 py-4 transition hover:bg-[#fafcfb] sm:flex-row sm:items-center sm:px-6"><span className="avatar h-11 w-11">{initials(member.full_name)}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><b className="truncate text-sm">{member.full_name}</b><span className={`role-badge ${member.role === 'admin' ? 'role-badge-admin' : 'role-badge-staff'}`}>{member.role === 'admin' ? 'Administrator' : 'Receptionist'}</span>{member.id === user?.id && <span className="text-[10px] font-bold uppercase tracking-wide text-[#087f5b]">You</span>}</div><span className="mt-1 block truncate text-xs text-[#7b8782]">{member.email}</span></div><select className="input h-10 sm:w-40" value={member.role} disabled={busyId === member.id} onChange={(e) => updateStaff(member, { role: e.target.value as Profile['role'] })}><option value="receptionist">Receptionist</option><option value="admin">Administrator</option></select><button disabled={busyId === member.id || member.id === user?.id} onClick={() => updateStaff(member, { active: !member.active })} className={`min-w-28 rounded-xl px-3 py-2 text-xs font-bold transition ${member.active ? 'bg-[#edf7f2] text-[#087f5b] hover:bg-[#dff1e8]' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}`}>{busyId === member.id ? 'Updating…' : member.active ? 'Active' : 'Approve'}</button></div>)}{!staff.length && <div className="empty-state py-16"><UserCog size={25} /><p>No team members yet.</p></div>}</div></section></div>}
        {tab === 'settings' && isAdmin && <div><section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><span className="eyebrow">Configuration</span><h2 className="mt-1 font-display text-2xl font-semibold tracking-[-.035em]">Event settings</h2><p className="mt-2 text-sm text-[#76827d]">Create events, edit their details, and manage self check-in links.</p></div><button className="btn-primary" onClick={() => openEventModal()}><Plus size={16} /> New event</button></section><section className="panel overflow-hidden"><div className="divide-y divide-[#edf1ef]">{events.map((item) => <div key={item.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><b className="truncate text-sm">{item.name}</b><span className={item.status === 'active' ? 'status-present' : item.status === 'closed' ? 'status-neutral' : 'status-pending'}>{item.status}</span>{item.id === eventId && <span className="text-[10px] font-bold uppercase tracking-wide text-[#087f5b]">Viewing</span>}</div><p className="mt-1 truncate text-xs text-[#7b8782]">{item.venue} · {formatDate(item.starts_at)} · {formatTime(item.starts_at)}–{formatTime(item.ends_at)}</p><p className="mt-1 truncate font-mono text-[11px] text-[#8a9590]">{window.location.origin}/self/{item.self_checkin_code}</p></div><div className="flex shrink-0 flex-wrap gap-2"><button className="btn-secondary" onClick={() => setPosterEvent(item)}><Printer size={15} /> Poster</button><button className="btn-secondary" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/self/${item.self_checkin_code}`); notify('Self check-in link copied'); }}><Copy size={15} /> Copy link</button><button className="table-action" title="Edit event" onClick={() => openEventModal(item)}><Pencil size={15} /></button></div></div>)}{!events.length && <div className="empty-state py-20"><CalendarDays size={25} /><p>No events yet. Create one to get started.</p></div>}</div></section></div>}
        </motion.div></AnimatePresence>
      </main>
    </div>
    <AnimatePresence>{toast && <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="toast"><CheckCircle2 size={18} />{toast}</motion.div>}</AnimatePresence>
    <AnimatePresence>{modalOpen && <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}><motion.div initial={{ opacity: 0, y: 18, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }} className="modal"><div className="flex items-start justify-between"><div><span className="eyebrow">{editing ? 'Edit record' : 'Pre-registration'}</span><h2 className="mt-1 font-display text-2xl font-semibold">{editing ? 'Update attendee' : 'Add attendee'}</h2></div><button className="table-action" onClick={() => setModalOpen(false)}><X size={18} /></button></div><form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={saveAttendee}><div className="sm:col-span-2"><label className="field-label">Full name</label><input className="input mt-2" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Participant name" /></div><div><label className="field-label">Phone number</label><input className="input mt-2" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0803 123 4567" /></div><div><label className="field-label">Email address (optional)</label><input className="input mt-2" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@example.com" /></div><div className="sm:col-span-2"><label className="field-label">Union/Organisation (optional)</label><input className="input mt-2" value={form.organisation} onChange={(e) => setForm({ ...form, organisation: e.target.value })} placeholder="Union or organisation" /></div>{formError && <div className="error-box sm:col-span-2">{formError}</div>}<div className="mt-2 flex justify-end gap-2 sm:col-span-2"><button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button><button className="btn-primary" disabled={formBusy} type="submit">{formBusy ? <span className="loader-sm" /> : <Check size={16} />} {editing ? 'Save changes' : 'Register attendee'}</button></div></form></motion.div></motion.div>}</AnimatePresence>
    <AnimatePresence>{eventModalOpen && <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => { if (e.target === e.currentTarget) setEventModalOpen(false); }}><motion.div initial={{ opacity: 0, y: 18, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }} className="modal"><div className="flex items-start justify-between"><div><span className="eyebrow">{editingEvent ? 'Edit event' : 'New event'}</span><h2 className="mt-1 font-display text-2xl font-semibold">{editingEvent ? 'Update event' : 'Create event'}</h2></div><button className="table-action" onClick={() => setEventModalOpen(false)}><X size={18} /></button></div><form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={saveEvent}><div className="sm:col-span-2"><label className="field-label">Event name</label><input className="input mt-2" value={eventForm.name} onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })} placeholder="Inauguration of the National Structure" /></div><div className="sm:col-span-2"><label className="field-label">Venue</label><input className="input mt-2" value={eventForm.venue} onChange={(e) => setEventForm({ ...eventForm, venue: e.target.value })} placeholder="Venue address" /></div><div><label className="field-label">Starts</label><input type="datetime-local" className="input mt-2" value={eventForm.starts_at} onChange={(e) => setEventForm({ ...eventForm, starts_at: e.target.value })} /></div><div><label className="field-label">Ends</label><input type="datetime-local" className="input mt-2" value={eventForm.ends_at} onChange={(e) => setEventForm({ ...eventForm, ends_at: e.target.value })} /></div><div><label className="field-label">Status</label><select className="input mt-2" value={eventForm.status} onChange={(e) => setEventForm({ ...eventForm, status: e.target.value })}><option value="draft">Draft</option><option value="active">Active</option><option value="closed">Closed</option></select></div>{eventFormError && <div className="error-box sm:col-span-2">{eventFormError}</div>}<div className="mt-2 flex justify-end gap-2 sm:col-span-2"><button type="button" className="btn-secondary" onClick={() => setEventModalOpen(false)}>Cancel</button><button className="btn-primary" disabled={eventFormBusy} type="submit">{eventFormBusy ? <span className="loader-sm" /> : <Check size={16} />} {editingEvent ? 'Save changes' : 'Create event'}</button></div></form></motion.div></motion.div>}</AnimatePresence>
    <AnimatePresence>{staffModalOpen && <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => { if (e.target === e.currentTarget) setStaffModalOpen(false); }}><motion.div initial={{ opacity: 0, y: 18, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }} className="modal"><div className="flex items-start justify-between"><div><span className="eyebrow">New account</span><h2 className="mt-1 font-display text-2xl font-semibold">Add team member</h2></div><button className="table-action" onClick={() => setStaffModalOpen(false)}><X size={18} /></button></div><form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={saveStaffMember}><div className="sm:col-span-2"><label className="field-label">Full name</label><input className="input mt-2" value={staffForm.full_name} onChange={(e) => setStaffForm({ ...staffForm, full_name: e.target.value })} placeholder="Team member's name" /></div><div className="sm:col-span-2"><label className="field-label">Work email</label><input className="input mt-2" type="email" value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} placeholder="name@example.com" /></div><div><label className="field-label">Temporary password</label><input className="input mt-2" type="text" value={staffForm.password} onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })} placeholder="At least 6 characters" /></div><div><label className="field-label">Role</label><select className="input mt-2" value={staffForm.role} onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}><option value="receptionist">Receptionist</option><option value="admin">Administrator</option></select></div>{staffFormError && <div className="error-box sm:col-span-2">{staffFormError}</div>}<p className="text-xs leading-5 text-[#8a9590] sm:col-span-2">Share this email and password with them directly — they can sign in right away.</p><div className="mt-2 flex justify-end gap-2 sm:col-span-2"><button type="button" className="btn-secondary" onClick={() => setStaffModalOpen(false)}>Cancel</button><button className="btn-primary" disabled={staffFormBusy} type="submit">{staffFormBusy ? <span className="loader-sm" /> : <Check size={16} />} Add team member</button></div></form></motion.div></motion.div>}</AnimatePresence>
    <AnimatePresence>{importModalOpen && <ImportAttendeesModal eventId={eventId} api={api} onClose={() => setImportModalOpen(false)} onImported={() => { loadAttendees(); loadStats(eventId, true); }} />}</AnimatePresence>
    <AnimatePresence>{posterEvent && <EventQrPoster event={posterEvent} checkinUrl={`${window.location.origin}/self/${posterEvent.self_checkin_code}`} onClose={() => setPosterEvent(null)} />}</AnimatePresence>
    <AnimatePresence>{printModalOpen && activeEvent && <PrintAuditModal event={activeEvent} query={historyQuery} total={historyTotal} api={api} selectedRecords={selectedCheckinIds.size > 0 ? checkins.filter((item) => selectedCheckinIds.has(item.id)) : undefined} onClose={() => setPrintModalOpen(false)} onMarked={() => { loadCheckins(); setSelectedCheckinIds(new Set()); }} />}</AnimatePresence>
    <AnimatePresence>{confirmAttendee && <MarkPresentConfirm attendee={confirmAttendee} busy={busyId === confirmAttendee.id} onCancel={() => setConfirmAttendee(null)} onConfirm={async () => { await markPresent(confirmAttendee.id); setConfirmAttendee(null); }} />}</AnimatePresence>
  </div>;
}
