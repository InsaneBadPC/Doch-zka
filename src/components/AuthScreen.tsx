import React, { useState } from 'react';
import { storageService, BOSS_NAME } from '../services/storage';
import { firebaseAuthService } from '../services/firebase';
import { ShareAppModal } from './common/ShareAppModal';
import {
  Clock,
  Shield,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Share2,
} from 'lucide-react';

export const AuthScreen: React.FC = () => {
  // Zaměstnanec stavy
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [hourlyRate, setHourlyRate] = useState(250);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isWorkerSubmitting, setIsWorkerSubmitting] = useState(false);
  const [workerError, setWorkerError] = useState<string | null>(null);

  // Vedení (Šéf) stavy
  const [bossName, setBossName] = useState(BOSS_NAME);
  const [bossPassword, setBossPassword] = useState('');
  const [showBossPassword, setShowBossPassword] = useState(false);
  const [isBossSubmitting, setIsBossSubmitting] = useState(false);
  const [bossError, setBossError] = useState<string | null>(null);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setWorkerError(null);
    try {
      const appUser = await firebaseAuthService.signInWithGoogle();
      storageService.setCurrentUser(appUser);
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
      if (err.code === 'auth/unauthorized-domain') {
        setWorkerError(
          'Doména insanebadpc.github.io zatím není povolena ve Firebase Console. Přihlaste se prosím e-mailem a heslem.'
        );
      } else if (err.code !== 'auth/popup-closed-by-user') {
        setWorkerError(err.message || 'Nepodařilo se přihlásit přes Google.');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleWorkerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWorkerError(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setWorkerError('Zadejte platnou e-mailovou adresu.');
      return;
    }

    if (!password || password.length < 4) {
      setWorkerError('Heslo musí mít alespoň 4 znaky.');
      return;
    }

    setIsWorkerSubmitting(true);
    try {
      if (isRegister) {
        if (!name.trim()) {
          setWorkerError('Zadejte své celé jméno a příjmení.');
          setIsWorkerSubmitting(false);
          return;
        }

        let fbUser: any = null;
        try {
          fbUser = await firebaseAuthService.registerWithEmail(name, cleanEmail, password, hourlyRate);
        } catch (fbErr: any) {
          console.warn('Firebase register note (offline fallback):', fbErr.message);
        }

        try {
          storageService.register(name, cleanEmail, 'worker', hourlyRate, password);
        } catch (localErr: any) {
          if (!fbUser) throw localErr;
        }

        if (fbUser) {
          storageService.setCurrentUser(fbUser);
        }
      } else {
        let fbUser: any = null;
        try {
          fbUser = await firebaseAuthService.signInWithEmail(cleanEmail, password);
        } catch (fbErr: any) {
          console.warn('Firebase login note (offline fallback):', fbErr.message);
        }

        const localUser = storageService.login(cleanEmail, password);
        if (fbUser) {
          storageService.setCurrentUser(fbUser);
        } else if (!localUser) {
          setWorkerError('Zaměstnanec s tímto e-mailem nebyl nalezen nebo heslo nesouhlasí.');
        }
      }
    } catch (err: any) {
      setWorkerError(err.message || 'Chyba při přihlašování.');
    } finally {
      setIsWorkerSubmitting(false);
    }
  };

  const handleBossSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBossError(null);

    if (!bossPassword) {
      setBossError('Zadejte heslo vedení.');
      return;
    }

    setIsBossSubmitting(true);
    try {
      try {
        await firebaseAuthService.signInBoss(bossPassword);
      } catch (fbErr: any) {
        console.warn('Firebase boss login note (offline fallback):', fbErr.message);
      }
      storageService.loginBoss(bossPassword, bossName);
    } catch (err: any) {
      setBossError(err.message || 'Nesprávné heslo pro přístup správce.');
    } finally {
      setIsBossSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090B0A] text-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans relative overflow-hidden">
      {/* Decentní pozadí */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#D4F73C]/5 rounded-full blur-[160px] pointer-events-none"></div>

      <div className="w-full max-w-4xl relative z-10 space-y-6">
        {/* Pouze název aplikace a ikona v záhlaví */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#D4F73C] text-[#090B0A] flex items-center justify-center font-black shadow-lg shadow-[#D4F73C]/20">
              <Clock className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight uppercase">
                DOCHÁZKA
              </h1>
              <p className="text-xs text-slate-400 font-mono">
                Evidence zakázek a směn
              </p>
            </div>
          </div>
        </div>

        {/* 2 oddělené formuláře: Zvlášť pro pracovníka a zvlášť pro šéfa */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* ================= 1. KARTA: ZAMĚSTNANEC ================= */}
          <div className="bg-[#121513] border border-[#232A23] rounded-[28px] p-6 sm:p-7 shadow-2xl flex flex-col justify-between">
            <div>
              {/* Záhlaví karty pracovníka */}
              <div className="flex items-center justify-between pb-4 border-b border-[#1E251E] mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#1C251C] border border-[#2B392B] text-[#D4F73C] flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white">Přihlášení pracovníka</h2>
                    <p className="text-[11px] text-slate-400 font-mono">Záznam práce a směn</p>
                  </div>
                </div>

                <div className="flex bg-[#0A0D0B] p-1 rounded-xl border border-[#222922]">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegister(false);
                      setWorkerError(null);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      !isRegister
                        ? 'bg-[#D4F73C] text-[#090B0A] shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Vstup
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegister(true);
                      setWorkerError(null);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      isRegister
                        ? 'bg-[#D4F73C] text-[#090B0A] shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Registrace
                  </button>
                </div>
              </div>

              {workerError && (
                <div className="mb-4 p-3 rounded-2xl bg-[#2A1516] border border-[#FF5B65]/40 text-[#FF5B65] text-xs font-medium">
                  {workerError}
                </div>
              )}

              {/* Google přihlášení */}
              <div className="mb-4 space-y-3">
                <button
                  type="button"
                  disabled={isGoogleLoading}
                  onClick={handleGoogleSignIn}
                  className="w-full min-h-[44px] py-2 px-3 bg-white hover:bg-slate-100 active:scale-[0.99] text-slate-900 font-extrabold rounded-2xl transition flex items-center justify-center gap-2.5 shadow-md text-xs cursor-pointer group"
                >
                  <svg className="w-4 h-4 shrink-0 transition group-hover:scale-105" viewBox="0 0 24 24">
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
                    {isGoogleLoading ? 'Přihlašuji...' : 'Přihlásit se přes Google'}
                  </span>
                </button>

                <div className="flex items-center gap-2">
                  <div className="flex-1 border-t border-[#1E251E]"></div>
                  <span className="text-[10px] uppercase tracking-wider font-mono text-slate-500">
                    nebo e-mailem a heslem
                  </span>
                  <div className="flex-1 border-t border-[#1E251E]"></div>
                </div>
              </div>

              {/* Formulář pro pracovníka */}
              <form onSubmit={handleWorkerSubmit} className="space-y-3.5">
                {isRegister && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Jméno a příjmení *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jméno a příjmení"
                      className="w-full px-3.5 py-2.5 bg-[#0A0D0B] border border-[#232A23] focus:border-[#D4F73C] rounded-xl text-white text-xs sm:text-sm focus:outline-none transition"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    E-mailová adresa *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vas@email.cz"
                    className="w-full px-3.5 py-2.5 bg-[#0A0D0B] border border-[#232A23] focus:border-[#D4F73C] rounded-xl text-white text-xs sm:text-sm font-mono focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Heslo *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 bg-[#0A0D0B] border border-[#232A23] focus:border-[#D4F73C] rounded-xl text-white text-xs sm:text-sm focus:outline-none transition pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {isRegister && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Hodinová sazba (Kč/h)
                    </label>
                    <input
                      type="number"
                      value={hourlyRate}
                      min={50}
                      onChange={(e) => setHourlyRate(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-[#0A0D0B] border border-[#232A23] focus:border-[#D4F73C] rounded-xl text-white text-xs sm:text-sm font-mono focus:outline-none"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isWorkerSubmitting}
                  className="w-full mt-2 min-h-[44px] py-2.5 bg-[#D4F73C] hover:bg-[#c6eb2d] active:scale-[0.99] disabled:opacity-50 text-[#090B0A] font-extrabold rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-[#D4F73C]/20 text-xs sm:text-sm cursor-pointer"
                >
                  <span>{isWorkerSubmitting ? 'Zpracovávám...' : isRegister ? 'Vytvořit účet' : 'Přihlásit se'}</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              </form>
            </div>

            <div className="pt-4 mt-4 border-t border-[#1E251E] flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-[#D4F73C]" /> Zaměstnanecký portál
              </span>
            </div>
          </div>

          {/* ================= 2. KARTA: VEDENÍ (ŠÉF) ================= */}
          <div className="bg-[#121513] border border-amber-500/30 rounded-[28px] p-6 sm:p-7 shadow-2xl flex flex-col justify-between">
            <div>
              {/* Záhlaví karty šéfa */}
              <div className="flex items-center justify-between pb-4 border-b border-[#1E251E] mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#2E2812] border border-amber-500/40 text-amber-400 flex items-center justify-center">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-amber-300">Vedení firmy (Šéf)</h2>
                    <p className="text-[11px] text-slate-400 font-mono">Správa zakázek a schvalování</p>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#2E2812] text-amber-300 border border-amber-500/30">
                  ADMIN
                </span>
              </div>

              {bossError && (
                <div className="mb-4 p-3 rounded-2xl bg-[#2A1516] border border-[#FF5B65]/40 text-[#FF5B65] text-xs font-medium">
                  {bossError}
                </div>
              )}

              {/* Formulář pro šéfa */}
              <form onSubmit={handleBossSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Jméno správce
                  </label>
                  <input
                    type="text"
                    required
                    value={bossName}
                    onChange={(e) => setBossName(e.target.value)}
                    placeholder="Marek Dubina"
                    className="w-full px-3.5 py-2.5 bg-[#0A0D0B] border border-[#232A23] focus:border-amber-400 rounded-xl text-white text-xs sm:text-sm focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Heslo vedení *
                  </label>
                  <div className="relative">
                    <input
                      type={showBossPassword ? 'text' : 'password'}
                      required
                      value={bossPassword}
                      onChange={(e) => setBossPassword(e.target.value)}
                      placeholder="Heslo vedení"
                      className="w-full px-3.5 py-2.5 bg-[#0A0D0B] border border-[#232A23] focus:border-amber-400 rounded-xl text-white text-xs sm:text-sm focus:outline-none transition pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowBossPassword(!showBossPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                    >
                      {showBossPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isBossSubmitting}
                    className="w-full min-h-[44px] py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 active:scale-[0.99] disabled:opacity-50 text-slate-950 font-extrabold rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 text-xs sm:text-sm cursor-pointer"
                  >
                    <Shield className="w-4 h-4 stroke-[2.5]" />
                    <span>{isBossSubmitting ? 'Ověřuji vedení...' : 'Vstoupit do administrace'}</span>
                  </button>
                </div>
              </form>
            </div>

            <div className="pt-4 mt-4 border-t border-[#1E251E] flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span className="flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-amber-400" /> Přístup pouze pro vedení
              </span>
            </div>
          </div>
        </div>

        {/* Spodní lišta se sdílením / stažením APK */}
        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={() => setIsShareModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#121513] hover:bg-[#1A221A] text-slate-400 hover:text-[#D4F73C] border border-[#232A23] text-xs font-mono transition cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Sdílet aplikaci / Stáhnout Android APK</span>
          </button>
        </div>
      </div>

      <ShareAppModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />
    </div>
  );
};
