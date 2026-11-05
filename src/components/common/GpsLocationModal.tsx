import React, { useState } from 'react';
import {
  MapPin,
  Navigation,
  ExternalLink,
  Copy,
  Check,
  X,
  Compass,
  Clock,
  Briefcase,
  User,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { GpsLocation, TimeEntry } from '../../types';
import {
  calculateDistanceMeters,
  formatDistance,
  formatGpsCoords,
  getGoogleMapsUrl,
  getMapyCzUrl,
} from '../../utils/geolocation';
import { formatDateCz, formatTimeFromIso } from '../../utils/formatters';

interface GpsLocationModalProps {
  entry: TimeEntry;
  onClose: () => void;
}

export const GpsLocationModal: React.FC<GpsLocationModalProps> = ({ entry, onClose }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'start' | 'end'>('start');

  const startLoc = entry.startLocation;
  const endLoc = entry.endLocation;

  // Primární bod pro zobrazení mapy
  const currentLoc = (activeView === 'end' && endLoc) ? endLoc : startLoc;

  const distanceMeters =
    startLoc && endLoc ? calculateDistanceMeters(startLoc, endLoc) : null;

  const handleCopy = async (loc: GpsLocation, key: string) => {
    const text = `${loc.latitude}, ${loc.longitude}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // Fallback
    }
  };

  // OpenStreetMap embed URL pro interaktivní náhled bez placených API klíčů
  const osmEmbedUrl = currentLoc
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${currentLoc.longitude - 0.005}%2C${currentLoc.latitude - 0.003}%2C${currentLoc.longitude + 0.005}%2C${currentLoc.latitude + 0.003}&layer=mapnik&marker=${currentLoc.latitude}%2C${currentLoc.longitude}`
    : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div className="bg-[#121513] border border-white/10 w-full max-w-2xl max-h-[92vh] rounded-3xl flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/5 flex items-center justify-between bg-[#171A18]/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#D4F73C]/10 border border-[#D4F73C]/20 flex items-center justify-center text-[#D4F73C]">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  GPS Záznam polohy směny
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#D4F73C]/10 text-[#D4F73C] border border-[#D4F73C]/20 font-mono font-bold">
                  Ověřeno
                </span>
              </div>
              <p className="text-xs text-white/50">
                {entry.userName} · {entry.projectName} · {formatDateCz(entry.date)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white p-2 rounded-xl hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Přepínač Zahájení vs Ukončení pokud existují obě */}
          {startLoc && endLoc && (
            <div className="flex items-center gap-2 p-1 bg-[#171A18] border border-white/5 rounded-2xl">
              <button
                type="button"
                onClick={() => setActiveView('start')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  activeView === 'start'
                    ? 'bg-[#D4F73C] text-black shadow-md'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Místo zahájení ({formatTimeFromIso(entry.startTime)})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveView('end')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  activeView === 'end'
                    ? 'bg-[#D4F73C] text-black shadow-md'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Místo ukončení ({formatTimeFromIso(entry.endTime)})</span>
              </button>
            </div>
          )}

          {/* Interaktivní mapa */}
          {currentLoc && osmEmbedUrl ? (
            <div className="relative rounded-2xl overflow-hidden border border-white/10 aspect-video sm:aspect-[21/9] bg-[#0A0D0B] shadow-inner">
              <iframe
                title="GPS Mapa místa směny"
                src={osmEmbedUrl}
                className="w-full h-full border-0 filter contrast-125 brightness-90"
                loading="lazy"
              />
              <div className="absolute top-3 right-3 flex items-center gap-2">
                <a
                  href={getGoogleMapsUrl(currentLoc)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-black/80 hover:bg-black text-white text-[11px] font-semibold rounded-xl border border-white/10 backdrop-blur-md flex items-center gap-1.5 transition shadow-lg"
                >
                  <ExternalLink className="w-3 h-3 text-[#D4F73C]" />
                  <span>Google Mapy</span>
                </a>
                <a
                  href={getMapyCzUrl(currentLoc)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-[#D4F73C] hover:bg-[#c2e232] text-black text-[11px] font-extrabold rounded-xl shadow-lg flex items-center gap-1.5 transition"
                >
                  <ExternalLink className="w-3 h-3 text-black" />
                  <span>Mapy.cz</span>
                </a>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-[#171A18] border border-white/5 text-center text-white/40 text-xs">
              U této směny nebyly automaticky zaznamenány GPS souřadnice (např. nebyla udělena práva k poloze).
            </div>
          )}

          {/* Detaily o polohách */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Karta zahájení */}
            <div
              className={`p-4 rounded-2xl border transition ${
                activeView === 'start'
                  ? 'bg-[#171A18] border-[#D4F73C]/40'
                  : 'bg-[#121513] border-white/5'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#D4F73C] flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5" />
                  Zahájení směny
                </span>
                <span className="text-[11px] font-mono text-white/50">
                  {formatTimeFromIso(entry.startTime)}
                </span>
              </div>

              {startLoc ? (
                <div className="space-y-2">
                  <div className="font-mono text-sm font-bold text-white">
                    {startLoc.latitude.toFixed(6)}, {startLoc.longitude.toFixed(6)}
                  </div>
                  {startLoc.address && (
                    <div className="text-xs text-white/80 font-medium">
                      📍 {startLoc.address}
                    </div>
                  )}
                  <div className="text-[11px] text-white/50 flex items-center justify-between pt-1 border-t border-white/5">
                    <span>Přesnost: ±{startLoc.accuracy || 10} m</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(startLoc, 'start')}
                      className="text-[#D4F73C] hover:underline flex items-center gap-1"
                    >
                      {copiedKey === 'start' ? (
                        <>
                          <Check className="w-3 h-3" /> Zkopírováno
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" /> Kopírovat
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-white/40 italic">
                  GPS poloha nebyla při spuštění zaznamenána.
                </p>
              )}
            </div>

            {/* Karta ukončení */}
            <div
              className={`p-4 rounded-2xl border transition ${
                activeView === 'end'
                  ? 'bg-[#171A18] border-[#D4F73C]/40'
                  : 'bg-[#121513] border-white/5'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                  <Navigation className="w-3.5 h-3.5" />
                  Ukončení směny
                </span>
                <span className="text-[11px] font-mono text-white/50">
                  {formatTimeFromIso(entry.endTime)}
                </span>
              </div>

              {endLoc ? (
                <div className="space-y-2">
                  <div className="font-mono text-sm font-bold text-white">
                    {endLoc.latitude.toFixed(6)}, {endLoc.longitude.toFixed(6)}
                  </div>
                  {endLoc.address && (
                    <div className="text-xs text-white/80 font-medium">
                      🏁 {endLoc.address}
                    </div>
                  )}
                  <div className="text-[11px] text-white/50 flex items-center justify-between pt-1 border-t border-white/5">
                    <span>Přesnost: ±{endLoc.accuracy || 10} m</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(endLoc, 'end')}
                      className="text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      {copiedKey === 'end' ? (
                        <>
                          <Check className="w-3 h-3" /> Zkopírováno
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" /> Kopírovat
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-white/40 italic">
                  {entry.isRunning
                    ? 'Směna stále probíhá.'
                    : 'Při ukončení nebyla GPS poloha zaznamenána.'}
                </p>
              )}
            </div>
          </div>

          {/* Vzdálenost a souhrn */}
          {distanceMeters !== null && (
            <div className="p-3.5 rounded-2xl bg-[#171A18] border border-white/5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#D4F73C]" />
                <span className="text-white/70">
                  Vzdálenost mezi zahájením a ukončením směny:
                </span>
              </div>
              <span className="font-mono font-bold text-white text-sm">
                {formatDistance(distanceMeters)}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-white/5 flex flex-wrap items-center justify-between gap-3 bg-[#171A18]/60">
          <div className="text-[11px] text-white/50">
            GPS data slouží k interní verifikaci pracoviště a zakázky.
          </div>

          <div className="flex items-center gap-2">
            {currentLoc && (
              <a
                href={getMapyCzUrl(currentLoc)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#D4F73C]" />
                <span>Otevřít Mapy.cz</span>
              </a>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#D4F73C] text-black text-xs font-bold rounded-xl hover:bg-[#c2e232] transition"
            >
              Zavřít
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
