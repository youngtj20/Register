import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Eye, EyeOff, ShieldCheck, Sparkles } from 'lucide-react';
import Logo from '../components/Logo';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) navigate((location.state as { from?: { pathname?: string } })?.from?.pathname || '/dashboard', { replace: true });
  }, [user, navigate, location.state]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!email.includes('@')) return setError('Enter a valid email address.');
    if (password.length < 6) return setError('Password must contain at least 6 characters.');
    setBusy(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return <main className="min-h-screen bg-[#eff4f1] lg:grid lg:grid-cols-[1.05fr_.95fr]">
    <section className="relative hidden overflow-hidden bg-[#063d2e] p-12 text-white lg:flex lg:flex-col">
      <div className="absolute -right-36 -top-32 h-96 w-96 rounded-full border border-emerald-300/15" /><div className="absolute -right-14 -top-10 h-72 w-72 rounded-full border border-emerald-300/15" /><div className="absolute bottom-[-130px] left-[-80px] h-80 w-80 rounded-full bg-[#0b5d46] blur-2xl" />
      <Logo light />
      <div className="relative my-auto max-w-xl"><span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-emerald-100"><Sparkles size={14} /> Wheels of progress: moving Nigeria forward</span><h1 className="mt-7 font-display text-5xl font-semibold leading-[1.05] tracking-[-0.045em]">Inauguration of the National Structure.</h1><p className="mt-6 max-w-lg text-lg leading-8 text-emerald-50/65">Attendance and check-in for Transporters for Tinubu/Shettima 2027 — every delegate accounted for, in real time.</p><div className="mt-10 grid gap-4 sm:grid-cols-2"><div className="glass-stat"><CheckCircle2 size={18} /><div><b>One-tap attendance</b><span>Instant audit trail</span></div></div><div className="glass-stat"><ShieldCheck size={18} /><div><b>Secure staff access</b><span>Role-based controls</span></div></div></div></div>
      <p className="relative text-xs text-emerald-100/40">Transporters for Tinubu/Shettima 2027 · Wheels of progress: moving Nigeria forward</p>
    </section>
    <section className="flex min-h-screen items-center justify-center p-5 sm:p-10"><div className="w-full max-w-md"><div className="mb-10 lg:hidden"><Logo /></div><span className="eyebrow">Staff workspace</span><h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.035em] text-[#17201d]">Welcome back</h2><p className="mt-2 text-sm leading-6 text-[#697670]">Sign in to manage arrivals and attendance.</p>
      <form className="mt-8 space-y-4" onSubmit={submit}><div><label className="field-label" htmlFor="email">Work email</label><input className="input mt-2" id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" /></div><div><label className="field-label" htmlFor="password">Password</label><div className="relative mt-2"><input className="input pr-12" id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#78847f]">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>{error && <div className="error-box">{error}</div>}<button className="btn-primary h-12 w-full justify-center" disabled={busy} type="submit">{busy ? <span className="loader-sm" /> : <>Sign in <ArrowRight size={17} /></>}</button></form>
      <p className="mt-7 text-center text-xs text-[#8a9590]">Staff accounts are added by an administrator. Contact your admin if you need access.</p></div></section>
  </main>;
}
