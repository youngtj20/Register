import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, Check, CalendarDays, CheckCircle2, MapPin, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from '../components/Logo';
import SelfCheckInConfirm from '../components/SelfCheckInConfirm';
import { formatEventDateTime, formatEventTime } from '../lib/datetime';
import type { Attendee, EventRecord } from '../types';

const initials = (name: string) => name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();
const avatarTones = ['bg-[#edf5f1] text-[#087f5b]', 'bg-[#eef4fb] text-[#2563a8]', 'bg-[#fdf1e7] text-[#b3661a]', 'bg-[#f3eefb] text-[#7449b3]'];
const toneFor = (name: string) => avatarTones[name.charCodeAt(0) % avatarTones.length];

export default function SelfCheckInPage() {
  const { code = '' } = useParams();
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Attendee[]>([]);
  const [selected, setSelected] = useState<Attendee | null>(null);
  const [checkedIn, setCheckedIn] = useState<Attendee | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState('');

  useEffect(() => {
    fetch(`/api/public-event?code=${encodeURIComponent(code)}`).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEvent(data);
    }).catch((err) => setError(err.message || 'Unable to open this check-in.')).finally(() => setLoading(false));
  }, [code]);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    const timer = window.setTimeout(async () => {
      setSearching(true); setError('');
      try {
        const res = await fetch(`/api/public-attendees?code=${encodeURIComponent(code)}&q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setResults(data);
      } catch (err) { setError(err instanceof Error ? err.message : 'Search failed.'); }
      finally { setSearching(false); }
    }, 320);
    return () => window.clearTimeout(timer);
  }, [query, code]);

  const matchingCount = useMemo(() => results.length, [results]);

  const openConfirm = () => { setConfirmError(''); setConfirming(true); };
  const closeConfirm = () => { setConfirming(false); setConfirmError(''); };

  const markPresent = async (phone: string) => {
    if (!selected) return;
    setBusy(true); setConfirmError('');
    try {
      const res = await fetch('/api/checkins', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ attendeeId: selected.id, eventCode: code, method: 'qr', phone }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCheckedIn(data.attendee);
      setSelected(null);
      setConfirming(false);
    } catch (err) { setConfirmError(err instanceof Error ? err.message : 'Could not complete check-in.'); }
    finally { setBusy(false); }
  };

  if (loading) return <div className="min-h-screen bg-[#f1f6f3] grid place-items-center"><div className="flex items-center gap-3 text-[#5e6c67]"><span className="loader" /> Opening check-in…</div></div>;
  if (!event) return <main className="min-h-screen bg-[#f1f6f3] grid place-items-center p-5"><div className="panel max-w-md p-8 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-red-50 text-red-600"><ShieldCheck /></span><h1 className="mt-5 font-display text-2xl font-semibold">Check-in unavailable</h1><p className="mt-2 text-sm leading-6 text-[#6c7873]">{error}</p></div></main>;

  return <main className="min-h-screen bg-[#f1f6f3]">
    <header className="border-b border-[#e1e9e4] bg-white/85 backdrop-blur-xl"><div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5 sm:px-5 sm:py-4"><Logo /><span className="hidden rounded-full bg-[#ecf8f2] px-3 py-1.5 text-xs font-bold text-[#087f5b] sm:inline-flex"><span className="mr-2 mt-1 h-1.5 w-1.5 rounded-full bg-[#19a974]" /> Self check-in open</span></div></header>
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-5 sm:py-12">
      {!checkedIn && <section className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-[#0b5b46] to-[#052c22] p-5 text-white shadow-[0_20px_60px_rgba(6,61,46,.22)] sm:rounded-[28px] sm:p-9">
        <div className="absolute -right-14 -top-20 h-60 w-60 rounded-full border border-white/10" /><div className="absolute right-8 top-5 h-32 w-32 rounded-full border border-white/10" /><div className="absolute -bottom-16 -left-10 h-40 w-40 rounded-full border border-white/[0.06]" />
        <span className="relative text-[11px] font-bold uppercase tracking-[.18em] text-emerald-200/80 sm:text-xs">You're invited</span>
        <h1 className="relative mt-2.5 max-w-2xl font-display text-2xl font-semibold leading-tight tracking-[-.03em] sm:mt-3 sm:text-4xl">{event.name}</h1>
        <div className="relative mt-4 flex flex-col gap-2 text-xs text-emerald-50/70 sm:mt-6 sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-3 sm:text-sm"><span className="flex items-center gap-2"><CalendarDays size={15} /> {formatEventDateTime(event.starts_at)}</span><span className="flex items-center gap-2"><MapPin size={15} /> {event.venue}</span></div>
      </section>}
      <AnimatePresence mode="wait">{checkedIn ? <motion.section key="success" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto mt-0 max-w-xl overflow-hidden rounded-[26px] bg-white shadow-[0_20px_60px_rgba(6,61,46,.12)] sm:mt-0">
        <div className="relative overflow-hidden bg-gradient-to-br from-[#0b5b46] to-[#052c22] px-6 py-9 text-center text-white sm:px-10 sm:py-12">
          <div className="absolute -right-14 -top-16 h-44 w-44 rounded-full border border-white/10" /><div className="absolute -bottom-14 -left-10 h-32 w-32 rounded-full border border-white/[0.06]" />
          <motion.span initial={{ scale: .5, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }} className="relative mx-auto grid h-16 w-16 place-items-center rounded-full bg-white text-[#07805b] shadow-lg sm:h-20 sm:w-20"><CheckCircle2 size={36} strokeWidth={2} /></motion.span>
          <span className="relative mt-5 block text-[11px] font-bold uppercase tracking-[.2em] text-emerald-200/80 sm:mt-6">Attendance confirmed</span>
          <h2 className="relative mt-2 font-display text-2xl font-semibold tracking-[-.03em] sm:text-3xl">Welcome, {checkedIn.full_name.split(' ')[0]}!</h2>
        </div>
        <div className="p-6 text-center sm:p-8">
          <p className="mx-auto max-w-md text-sm leading-6 text-[#64716c]">Your attendance for <b className="text-[#17201d]">{event.name}</b> has been securely recorded.</p>
          <div className="mx-auto mt-5 grid max-w-sm grid-cols-2 gap-2.5 text-left">
            <div className="rounded-2xl bg-[#f5f8f6] p-3.5"><span className="block text-[10px] font-bold uppercase tracking-[.1em] text-[#8a9590]">Checked in</span><b className="mt-1 block text-sm text-[#17201d]">{formatEventTime(checkedIn.checked_in_at || new Date().toISOString())}</b></div>
            <div className="rounded-2xl bg-[#f5f8f6] p-3.5"><span className="block text-[10px] font-bold uppercase tracking-[.1em] text-[#8a9590]">Registration</span><b className="mt-1 block truncate font-mono text-sm text-[#17201d]">{checkedIn.registration_code}</b></div>
          </div>
          <button className="btn-secondary mx-auto mt-7" onClick={() => { setCheckedIn(null); setQuery(''); setResults([]); }}><ArrowLeft size={16} /> Check in another guest</button>
        </div>
      </motion.section> : <motion.section key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto mt-6 max-w-2xl sm:mt-8">
        <div className="text-center"><span className="eyebrow">Find your registration</span><h2 className="mt-2 font-display text-xl font-semibold sm:text-3xl">Let's get you checked in</h2><p className="mt-2 text-sm text-[#6c7873]">Search with your full name or phone number.</p></div>
        <div className="mt-6 sm:mt-7"><input autoFocus className="input h-13 px-4 text-base shadow-sm sm:h-14" value={query} onChange={(e) => { setQuery(e.target.value); setSelected(null); setError(''); }} placeholder="Name or phone number" />{searching && <div className="mt-2 flex justify-center"><span className="loader-sm" /></div>}</div>
        {error && <div className="error-box mt-4">{error}</div>}
        <div className="mt-4 space-y-2 pb-28 sm:pb-2">{query.trim().length >= 2 && !searching && matchingCount === 0 && !error && <div className="panel p-8 text-center text-sm text-[#6b7873]">No matching registration found. Try your full name or the last digits of your phone.</div>}{results.map((attendee) => <button key={attendee.id} onClick={() => !attendee.checked_in && setSelected(attendee)} disabled={attendee.checked_in} className={`flex w-full items-center gap-3 rounded-2xl border bg-white p-3.5 text-left shadow-[0_1px_2px_rgba(21,49,39,.03)] transition sm:gap-4 sm:p-4 ${attendee.checked_in ? 'cursor-default border-[#e1e8e4] opacity-65' : selected?.id === attendee.id ? 'border-[#07805b] ring-2 ring-[#07805b]/10' : 'border-[#e1e8e4] hover:-translate-y-px hover:border-[#a9c9bc] hover:shadow-[0_6px_18px_rgba(21,49,39,.07)]'}`}><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-bold sm:h-11 sm:w-11 ${toneFor(attendee.full_name)}`}>{initials(attendee.full_name)}</span><span className="min-w-0 flex-1"><b className="block truncate text-sm text-[#1b2521]">{attendee.full_name}</b><span className="mt-1 block truncate text-xs text-[#75817c]">{attendee.phone}{attendee.organisation ? ` · ${attendee.organisation}` : ''}</span></span>{attendee.checked_in ? <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-[#087f5b]"><Check size={15} /> Present</span> : <span className={`h-5 w-5 shrink-0 rounded-full border-2 ${selected?.id === attendee.id ? 'border-[#087f5b] bg-[#087f5b] shadow-[inset_0_0_0_4px_white]' : 'border-[#cbd5d0]'}`} />}</button>)}</div>
        {selected && <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="fixed inset-x-4 bottom-4 z-40 mx-auto max-w-2xl rounded-[20px] border border-[#dce7e1] bg-white/95 p-4 shadow-[0_18px_45px_rgba(20,53,42,.16)] backdrop-blur sm:sticky sm:inset-x-auto sm:bottom-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}><div className="flex items-center justify-between gap-4"><div className="min-w-0"><span className="text-xs text-[#74817c]">Checking in as</span><b className="block truncate text-sm">{selected.full_name}</b></div><button className="btn-primary shrink-0" disabled={busy} onClick={openConfirm}>{busy ? <span className="loader-sm" /> : <Check size={17} />} Mark me present</button></div></motion.div>}
      </motion.section>}</AnimatePresence>
    </div>
    <AnimatePresence>{confirming && selected && <SelfCheckInConfirm attendee={selected} busy={busy} error={confirmError} onCancel={closeConfirm} onConfirm={markPresent} />}</AnimatePresence>
    <footer className="pb-8 text-center text-xs text-[#89948f]">Transporters for Tinubu/Shettima 2027 · Wheels of progress: moving Nigeria forward</footer>
  </main>;
}
