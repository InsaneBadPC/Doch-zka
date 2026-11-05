import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Download,
  RefreshCw,
  CheckCircle2,
  X,
  AlertCircle,
  Zap,
  Layers,
  ArrowUpCircle,
  Loader2,
} from 'lucide-react';
import { updateService, UpdateState } from '../../services/updateService';

export const UpdateNotification: React.FC = () => {
  const [updateState, setUpdateState] = useState<UpdateState>(updateService.getState());
  const [showModal, setShowModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const unsub = updateService.subscribe((state) => {
      setUpdateState(state);
      if (state.hasUpdate && !isDismissed) {
        // Pokud je nová aktualizace, zobrazíme oznámení
      }
    });
    return () => unsub();
  }, [isDismissed]);

  const handleStartDownload = async () => {
    setShowModal(true);
    await updateService.downloadAndInstallUpdate();
  };

  const current = updateState.currentVersion;
  const latest = updateState.latestVersion;

  return (
    <>
      {/* 1. PLOVOUCÍ LIŠTA OZNÁMENÍ NOVÉ VERZE */}
      {updateState.hasUpdate && !isDismissed && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="bg-[#121513] border-2 border-[#D4F73C] p-4 rounded-2xl shadow-[0_0_30px_rgba(212,247,60,0.25)] flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#D4F73C] text-black flex items-center justify-center font-bold shrink-0">
                  <ArrowUpCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white">Nová verze aplikace</span>
                    <span className="px-2 py-0.5 rounded-full bg-[#D4F73C]/20 text-[#D4F73C] text-[10px] font-mono font-bold">
                      {latest?.version || 'nové sestavení'}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/60 mt-0.5">
                    K dispozici je vyšší sestavení #{latest?.buildNumber}.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDismissed(true)}
                className="text-white/40 hover:text-white p-1 rounded-lg transition"
                title="Skrýt"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 pt-1 border-t border-white/10">
              <button
                onClick={() => setShowModal(true)}
                className="flex-1 py-2 px-3 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white rounded-xl text-xs font-semibold transition"
              >
                Podrobnosti
              </button>
              <button
                onClick={handleStartDownload}
                className="flex-1 py-2 px-3 bg-[#D4F73C] hover:bg-[#c2e232] text-black rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition shadow-[0_0_15px_rgba(212,247,60,0.3)]"
              >
                <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Stáhnout & aktualizovat</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. MODAL STAHOVÁNÍ A INSTALACE AKTUALIZACE */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121513] border border-white/10 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#D4F73C]/10 border border-[#D4F73C]/20 flex items-center justify-center text-[#D4F73C]">
                  <RefreshCw className={`w-5 h-5 ${updateState.isDownloading ? 'animate-spin' : ''}`} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {updateState.isDownloading ? 'Aktualizace aplikace' : 'Dostupná nová verze'}
                  </h3>
                  <p className="text-xs text-white/50">
                    Firemní Docházka a Evidence Zakázek
                  </p>
                </div>
              </div>
              {!updateState.isDownloading && (
                <button
                  onClick={() => setShowModal(false)}
                  className="text-white/40 hover:text-white p-1 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Version comparison card */}
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#171A18] border border-white/5 text-xs font-mono">
              <div>
                <span className="text-[10px] text-white/40 uppercase tracking-wider block">Současná verze</span>
                <span className="text-white font-bold text-sm">{current.version}</span>
                <span className="text-white/40 text-[10px] block">Build #{current.buildNumber}</span>
              </div>
              <div className="border-l border-white/5 pl-3">
                <span className="text-[10px] text-[#D4F73C] uppercase tracking-wider block font-bold">Nová verze</span>
                <span className="text-[#D4F73C] font-bold text-sm">{latest?.version || current.version}</span>
                <span className="text-[#D4F73C]/70 text-[10px] block">Build #{latest?.buildNumber || current.buildNumber}</span>
              </div>
            </div>

            {/* Release notes */}
            {latest?.releaseNotes && (
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-white/70">Co přináší toto sestavení:</span>
                <p className="text-xs text-white/80 bg-white/[0.02] border border-white/5 p-3 rounded-xl">
                  {latest.releaseNotes}
                </p>
              </div>
            )}

            {/* Downloading progress bar */}
            {updateState.isDownloading ? (
              <div className="space-y-3 py-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white font-medium flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D4F73C]" />
                    {updateState.downloadStage}
                  </span>
                  <span className="font-mono font-bold text-[#D4F73C]">
                    {updateState.downloadProgress} %
                  </span>
                </div>

                <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/10">
                  <div
                    className="h-full bg-[#D4F73C] rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(212,247,60,0.5)]"
                    style={{ width: `${updateState.downloadProgress}%` }}
                  />
                </div>

                <p className="text-[11px] text-white/40 text-center">
                  Stahování probíhá přímo v prohlížeči. Aplikace se po dokončení sama obnoví.
                </p>
              </div>
            ) : (
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-xl text-xs font-semibold transition"
                >
                  Později
                </button>
                <button
                  type="button"
                  onClick={handleStartDownload}
                  className="px-5 py-2.5 bg-[#D4F73C] hover:bg-[#c2e232] text-black font-extrabold text-xs rounded-xl transition flex items-center gap-2 shadow-[0_0_15px_rgba(212,247,60,0.3)]"
                >
                  <Download className="w-4 h-4" />
                  <span>Stáhnout a instalovat</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

// Pomocné tlačítko pro ruční kontrolu aktualizací (pro vložení do hlavičky / nastavení)
export const CheckForUpdatesButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const [updateState, setUpdateState] = useState<UpdateState>(updateService.getState());
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    const unsub = updateService.subscribe((s) => setUpdateState(s));
    return () => unsub();
  }, []);

  const handleCheck = async () => {
    setFeedback(null);
    const res = await updateService.checkForUpdates();
    if (res.hasUpdate) {
      setFeedback('Nalezena nová verze!');
    } else {
      setFeedback('Aplikace je aktuální');
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleDownload = () => {
    updateService.downloadAndInstallUpdate();
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleCheck}
          disabled={updateState.isChecking}
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition text-xs flex items-center gap-1"
          title={`Verze: ${updateState.currentVersion.version} (Build #${updateState.currentVersion.buildNumber})`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${updateState.isChecking ? 'animate-spin text-[#D4F73C]' : ''}`} />
          <span className="font-mono text-[10px] hidden sm:inline">v{updateState.currentVersion.version}</span>
        </button>

        {updateState.hasUpdate && (
          <button
            type="button"
            onClick={handleDownload}
            className="px-2 py-1 rounded-lg bg-[#D4F73C] text-black text-[10px] font-bold flex items-center gap-1 animate-pulse shadow-[0_0_10px_rgba(212,247,60,0.3)]"
            title="Klikněte pro instalaci nové verze"
          >
            <Download className="w-3 h-3" />
            <span>Aktualizovat</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-[#171A18] border border-white/5 text-xs">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#D4F73C]/10 border border-[#D4F73C]/20 flex items-center justify-center text-[#D4F73C]">
          <RefreshCw className={`w-4 h-4 ${updateState.isChecking ? 'animate-spin' : ''}`} />
        </div>
        <div>
          <div className="font-semibold text-white flex items-center gap-2">
            <span>Verze aplikace: {updateState.currentVersion.version}</span>
            <span className="text-[10px] text-white/40 font-mono">Build #{updateState.currentVersion.buildNumber}</span>
          </div>
          <div className="text-[11px] text-white/50">
            {feedback || (updateState.hasUpdate ? 'K dispozici je nová verze!' : 'Máte nainstalovanou nejnovější verzi')}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {updateState.hasUpdate ? (
          <button
            type="button"
            onClick={handleDownload}
            disabled={updateState.isDownloading}
            className="px-3 py-1.5 bg-[#D4F73C] text-black font-bold text-xs rounded-lg hover:bg-[#c2e232] transition flex items-center gap-1.5 shadow-[0_0_10px_rgba(212,247,60,0.3)]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Stáhnout v aplikaci</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleCheck}
            disabled={updateState.isChecking}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white rounded-lg transition text-xs font-medium flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${updateState.isChecking ? 'animate-spin' : ''}`} />
            <span>Zkontrolovat</span>
          </button>
        )}
      </div>
    </div>
  );
};
