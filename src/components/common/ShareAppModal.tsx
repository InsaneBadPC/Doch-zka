import React, { useState } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  Download,
  Smartphone,
  Globe,
  QrCode,
  ExternalLink,
  Apple,
} from 'lucide-react';
import { CheckForUpdatesButton } from './UpdateNotification';

interface ShareAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShareAppModal: React.FC<ShareAppModalProps> = ({ isOpen, onClose }) => {
  const [copiedType, setCopiedType] = useState<'web' | 'apk' | null>(null);

  if (!isOpen) return null;

  // URL webové aplikace (prioritně aktuální doména nebo GitHub Pages fallback)
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : 'https://dochazka.app';
  const webAppUrl = currentOrigin.replace(/\/+$/, '');

  // Odkaz na nejnovější stažení Android APK z GitHub Releases
  const apkDownloadUrl = 'https://github.com/InsaneBadPC/Doch-zka/releases/latest/download/app-release.apk';

  const handleCopy = async (text: string, type: 'web' | 'apk') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2500);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2500);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Firemní Docházka a Evidence Zakázek',
          text: 'Připoj se k firemní docházce. Webová verze i Android aplikace ke stažení:',
          url: webAppUrl,
        });
      } catch (err) {
        // User cancelled or not supported
      }
    } else {
      handleCopy(webAppUrl, 'web');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-lg bg-[#121513] border border-[#232A23] rounded-[32px] p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4F73C]/10 rounded-full blur-[80px] pointer-events-none"></div>

        {/* Hlavička */}
        <div className="flex items-center justify-between border-b border-[#1E251E] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#D4F73C] text-[#090B0A] flex items-center justify-center font-black">
              <Share2 className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">Sdílet aplikaci Docházka</h2>
              <p className="text-xs text-slate-400 mt-0.5">Odkazy pro zaměstnance a kolegy</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#1A221A] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Karta Webové aplikace (PWA / GitHub Pages) */}
        <div className="p-4 bg-[#0A0D0B] border border-[#232A23] rounded-2xl space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#D4F73C]" />
              <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Webová verze (PC, iPhone & Android)
              </span>
            </div>
            <span className="text-[10px] font-mono text-[#D4F73C] bg-[#1C251C] px-2 py-0.5 rounded-full border border-[#2B392B]">
              PWA Online
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Funguje v libovolném prohlížeči. Na iPhonu (iOS) stačí v Safari zvolit <strong>Sdílet → Přidat na plochu</strong> pro fullscreen režim.
          </p>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              readOnly
              value={webAppUrl}
              className="flex-1 px-3.5 py-2 bg-[#121513] border border-[#232A23] rounded-xl text-xs text-slate-300 font-mono focus:outline-none select-all truncate"
            />
            <button
              type="button"
              onClick={() => handleCopy(webAppUrl, 'web')}
              className="px-3.5 py-2 bg-[#1C251C] hover:bg-[#D4F73C] text-[#D4F73C] hover:text-black font-bold rounded-xl text-xs transition border border-[#2E3C2E] flex items-center gap-1.5 shrink-0"
            >
              {copiedType === 'web' ? (
                <>
                  <Check className="w-3.5 h-3.5" /> Zkopírováno
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" /> Kopírovat
                </>
              )}
            </button>
          </div>
        </div>

        {/* 2. Karta Android APK (Nativní instalátor) */}
        <div className="p-4 bg-[#0A0D0B] border border-[#232A23] rounded-2xl space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-[#D4F73C]" />
              <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Nativní Android aplikace (.apk)
              </span>
            </div>
            <span className="text-[10px] font-mono text-[#D4F73C] bg-[#161B16] px-2 py-0.5 rounded-full border border-[#232A23]">
              Nejnovější APK
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Přímo instalovatelný APK soubor vygenerovaný přes GitHub Actions. V mobilu povolte instalaci z neznámých zdrojů.
          </p>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              readOnly
              value={apkDownloadUrl}
              className="flex-1 px-3.5 py-2 bg-[#121513] border border-[#232A23] rounded-xl text-xs text-slate-300 font-mono focus:outline-none select-all truncate"
            />
            <button
              type="button"
              onClick={() => handleCopy(apkDownloadUrl, 'apk')}
              className="px-3.5 py-2 bg-[#1C251C] hover:bg-[#D4F73C] text-[#D4F73C] hover:text-black font-bold rounded-xl text-xs transition border border-[#2E3C2E] flex items-center gap-1.5 shrink-0"
            >
              {copiedType === 'apk' ? (
                <>
                  <Check className="w-3.5 h-3.5" /> Zkopírováno
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" /> Kopírovat
                </>
              )}
            </button>
          </div>
        </div>

        {/* 3. Stav verze a detekce aktualizací */}
        <CheckForUpdatesButton />

        {/* 4. Tlačítko nativního sdílení pro mobily */}
        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={handleNativeShare}
            className="w-full sm:flex-1 py-3 bg-[#D4F73C] hover:bg-[#c4e92a] text-[#090B0A] font-extrabold rounded-2xl text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-[#D4F73C]/20"
          >
            <Share2 className="w-4 h-4 stroke-[2.5]" />
            Sdílet přes mobil (WhatsApp, SMS, E-mail)
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-3 bg-[#1A221A] hover:bg-[#253225] text-slate-300 font-semibold rounded-2xl text-xs transition border border-[#2A372A]"
          >
            Zavřít
          </button>
        </div>
      </div>
    </div>
  );
};
