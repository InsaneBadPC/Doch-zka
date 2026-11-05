import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storage';
import { firebaseAuthService } from '../services/firebase';
import { ShareAppModal } from './common/ShareAppModal';
import {
  Clock,
  Shield,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  Check,
  TrendingUp,
  Lock,
  Zap,
  Share2,
  Cloud,
  CheckCircle2,
  Briefcase,
  Layers,
  Sparkles,
} from 'lucide-react';

export const AuthScreen: React.FC = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [hourlyRate, setHourlyRate] = useState(250);
  const [error, setError] = useState<string | null>(null);

  // Živý ticker pro demonstraci v levém panelu
  const [tickerSeconds, setTickerSeconds] = useState(15128); // 04:12:08
  useEffect(() => {
    const timer = setInterval(() => {
      setTickerSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTicker = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setError(null);
    try {
      const appUser = await firebaseAuthService.signInWithGoogle();
      storageService.setCurrentUser(appUser);
      // Synchronizujeme také do lokálních uživatelů
      const existing = storageService.getUsers().find((u) => u.id === appUser.id);
      if (!existing) {
        storageService.addUser(
          appUser.name,
          appUser.email,
          appUser.role,
          appUser.defaultHourlyRate,
          appUser.allowCustomRate
        );
      }
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'Nepodařilo se přihlásit přes Google.');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Zadejte platnou e-mailovou adresu.');
      return;
    }

    if (!password || password.length < 4) {
      setError('Heslo musí mít alespoň 4 znaky.');
      return;
    }

    if (isRegister) {
      if (!name.trim()) {
        setError('Zadejte své celé jméno a příjmení.');
        return;
      }
      try {
        storageService.register(name, cleanEmail, 'worker', hourlyRate, password);
      } catch (err: any) {
        setError(err.message || 'Chyba při registraci.');
      }
    } else {
      try {
        const logged = storageService.login(cleanEmail, password);
        if (!logged) {
          setError('Uživatel s tímto e-mailem nebyl nalezen. Zaregistrujte se prosím.');
        }
      } catch (err: any) {
        setError(err.message || 'Nesprávné přihlašovací údaje.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#090B0A] text-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-12 relative overflow-hidden font-sans">
      {/* Ambient background glow effects */}
      <div className="absolute top-10 left-10 w-[480px] h-[480px] bg-[#D4F73C]/5 rounded-full blur-[130px] pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-[420px] h-[420px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
        {/* LEVÝ PANEL: Showcase & Informační vizitka */}
        <div className="lg:col-span-7 space-y-6">
          {/* Status pill & Cloud databáze indikátor */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#131713] border border-[#232A23] text-xs">
              <span className="w-2 h-2 rounded-full bg-[#D4F73C] animate-pulse"></span>
              <span className="font-mono text-[11px] text-[#D4F73C] font-bold">Cloud Firestore & Auth</span>
              <span className="text-slate-500">·</span>
              <span className="text-slate-400 text-[11px]">Spark 0 Kč</span>
            </div>

            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#131713] border border-[#232A23] text-[11px] font-mono text-slate-400">
              <Cloud className="w-3.5 h-3.5 text-[#D4F73C]" />
              <span>Offline synchronizace</span>
            </div>
          </div>

          {/* Hlavní titulek */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#D4F73C] text-[#090B0A] flex items-center justify-center font-black shadow-lg shadow-[#D4F73C]/20 shrink-0">
                <Clock className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-widest font-mono text-[#D4F73C] font-bold">
                  Firemní Docházka & Zakázky
                </span>
                <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                  Chytrá evidence s živými stopkami.
                </h1>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 max-w-lg leading-relaxed">
              Mějte dokonalý přehled o odpracovaných směnách a mzdových nákladech zakázek.
              Přihlašujte se jedním kliknutím přes Google účet nebo firemní e-mail.
            </p>
          </div>

          {/* Interaktivní ukázková karta se živým chronometrem (Fintech Dribbble style) */}
          <div className="bg-[#121513] border border-[#232A23] hover:border-[#D4F73C]/40 rounded-[28px] p-5 shadow-xl transition space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-[#1C251C] border border-[#2A372A] text-[#D4F73C] flex items-center justify-center font-bold text-xs">
                  <Briefcase className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Elektroinstalace a FVE</div>
                  <div className="text-[10px] text-slate-400 font-mono">Energo Solar a.s.</div>
                </div>
              </div>

              {/* Živé stopky */}
              <div className="flex items-center gap-2 bg-[#0A0D0B] px-3 py-1.5 rounded-xl border border-[#222922]">
                <span className="w-2 h-2 rounded-full bg-[#D4F73C] animate-ping"></span>
                <span className="font-mono text-xs font-bold text-[#D4F73C] tabular-nums">
                  {formatTicker(tickerSeconds)}
                </span>
              </div>
            </div>

            {/* Metriky a sparkline */}
            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-[#1C231C] text-xs font-mono">
              <div>
                <div className="text-[10px] text-slate-500">Sazba</div>
                <div className="font-bold text-white">350 Kč/h</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500">Naskakuje</div>
                <div className="font-bold text-[#D4F73C]">1 470 Kč</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-slate-500">Rozpočet</div>
                <div className="font-bold text-slate-300">80 000 Kč</div>
              </div>
            </div>
          </div>

          {/* Tři klíčové výhody */}
          <div className="space-y-2 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#D4F73C] shrink-0" />
              <span>100% bezplatný provoz na Firebase Spark plánu (0 Kč poplatky)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#D4F73C] shrink-0" />
              <span>Automatická kontrola překryvu směn a podpora nočních směn (+1 den)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#D4F73C] shrink-0" />
              <span>Export měsíční uzávěrky pro český Excel s oddělovačem středník (;)</span>
            </div>
          </div>
        </div>

        {/* PRAVÝ PANEL: Autentizační formulář v tmavém OLED stylu */}
        <div className="lg:col-span-5">
          <div className="bg-[#121513] border border-[#232A23] rounded-[32px] p-6 sm:p-8 shadow-2xl relative">
            {/* Header karty formuláře */}
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-[#1E251E]">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                  {isRegister ? 'Registrace' : 'Vstup do systému'}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isRegister ? 'Vytvoření nového profilu' : 'Přihlaste se ke svému účtu'}
                </p>
              </div>

              {/* Přepínač režimu Přihlásit / Registrovat */}
              <div className="flex bg-[#0A0D0B] p-1 rounded-xl border border-[#222922]">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(false);
                    setError(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    !isRegister
                      ? 'bg-[#D4F73C] text-[#090B0A] shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Přihlásit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(true);
                    setError(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    isRegister
                      ? 'bg-[#D4F73C] text-[#090B0A] shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Registrovat
                </button>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-2xl bg-[#2A1516] border border-[#FF5B65]/40 text-[#FF5B65] text-xs font-medium animate-in fade-in">
                {error}
              </div>
            )}

            {/* HLAVNÍ TLAČÍTKO: PŘIHLÁŠENÍ PŘES GOOGLE (ONLINE FIREBASE) */}
            <div className="mb-5 space-y-3">
              <button
                type="button"
                disabled={isGoogleLoading}
                onClick={handleGoogleSignIn}
                className="w-full min-h-[48px] py-3 px-4 bg-white hover:bg-slate-100 active:scale-[0.99] text-slate-900 font-extrabold rounded-2xl transition flex items-center justify-center gap-3 shadow-lg shadow-white/10 text-xs sm:text-sm group cursor-pointer"
              >
                {/* Oficiální 4-barevné Google logo */}
                <svg className="w-5 h-5 shrink-0 transition group-hover:scale-105" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>
                  {isGoogleLoading
                    ? 'Probíhá přihlašování přes Google...'
                    : 'Přihlásit se přes Google'}
                </span>
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 border-t border-[#1E251E]"></div>
                <span className="text-[10px] uppercase tracking-wider font-mono text-slate-500">
                  nebo e-mailem
                </span>
                <div className="flex-1 border-t border-[#1E251E]"></div>
              </div>
            </div>

            {/* Formulář s e-mailem a heslem */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegister && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Jméno a příjmení *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="např. Tomáš Dvořák"
                    className="w-full px-4 py-3 bg-[#0A0D0B] border border-[#232A23] focus:border-[#D4F73C] rounded-2xl text-white text-sm focus:outline-none transition"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  E-mailová adresa *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vas.email@firma.cz"
                  className="w-full px-4 py-3 bg-[#0A0D0B] border border-[#232A23] focus:border-[#D4F73C] rounded-2xl text-white text-sm font-mono focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Heslo *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-[#0A0D0B] border border-[#232A23] focus:border-[#D4F73C] rounded-2xl text-white text-sm focus:outline-none transition pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {isRegister && (
                <div className="pt-1">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Výchozí hodinová sazba (Kč/h)
                  </label>
                  <input
                    type="number"
                    value={hourlyRate}
                    min={50}
                    onChange={(e) => setHourlyRate(Number(e.target.value))}
                    className="w-full px-3 py-3 bg-[#0A0D0B] border border-[#232A23] focus:border-[#D4F73C] rounded-2xl text-white text-xs font-mono focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-1 font-mono">
                    Každý nový profil je registrován s rolí Pracovník.
                  </p>
                </div>
              )}

              {/* Tlačítko v neonově limetkové barvě */}
              <button
                type="submit"
                className="w-full mt-2 min-h-[48px] py-3.5 bg-[#D4F73C] hover:bg-[#c6eb2d] active:scale-[0.99] text-[#090B0A] font-extrabold rounded-2xl transition flex items-center justify-center gap-2 shadow-lg shadow-[#D4F73C]/20 text-xs sm:text-sm cursor-pointer"
              >
                <span>{isRegister ? 'Vytvořit účet' : 'Vstoupit do aplikace'}</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </form>

            {/* Spodní lišta s bezpečností a odkazem na stažení APK / sdílení */}
            <div className="mt-5 pt-4 border-t border-[#1E251E] flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#D4F73C]" /> Zabezpečené spojení
              </span>
              <button
                type="button"
                onClick={() => setIsShareModalOpen(true)}
                className="text-xs font-mono text-[#D4F73C] hover:underline flex items-center gap-1.5 transition"
              >
                <Share2 className="w-3.5 h-3.5" /> Sdílet aplikaci / APK
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal pro sdílení */}
      <ShareAppModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />
    </div>
  );
};
