import React, { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

// =====================================================
//  EJDER KAYASI UI — TEMİZ, ÇALIŞIR SÜRÜM (React + TSX)
// =====================================================
// Özellikler:
//  • Edit/Oynatma modu
//  • Başlık, isim, sınıf, seviye, CAN (şu an/maks), statlar (0–5), pasif — hepsi düzenlenebilir
//  • Görsel ekleme (DATA URL ile kalıcı), Galeri (kalıcı)
//  • Müzik listesi (DATA URL ile çalabilir + kalıcı)
//  • Zar paneli (D6)
//  • LocalStorage kalıcılık + JSON içe/dışa aktarım
//  • (Opsiyonel) Socket.IO ile canlı senkron — Masa ID & Sunucu ve toggle
//  • Basit runtime "test"ler (şema/doğrulama)

// ---------- Basit runtime test/guard yardımcıları ----------
function assertShape(obj: any, path = "root") {
  if (typeof obj !== "object" || obj === null) {
    console.warn(`[assertShape] ${path} nesne değil`);
    return false;
  }
  return true;
}
function validateChars(chars: any) {
  if (!Array.isArray(chars)) {
    console.warn("[validateChars] chars dizi değil");
    return false;
  }
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (!assertShape(c, `chars[${i}]`)) return false;
    ["ad", "sinif", "pasif"].forEach((k) => {
      if (typeof c[k] !== "string") console.warn(`[validateChars] ${k} string değil @${i}`);
    });
    if (!assertShape(c.can, `chars[${i}].can`)) return false;
    if (!assertShape(c.stats, `chars[${i}].stats`)) return false;
  }
  return true;
}
function isDataUrl(s?: string | null) {
  return !!s && /^data:\\w+\/[a-zA-Z0-9+.-]+;base64,/.test(s);
}

// ======================
//  Ortak Görsel Çerçeve
// ======================
function Frame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={
        "relative rounded-xl border border-amber-800/60 bg-stone-900/80 shadow-[0_0_0_1px_rgba(180,137,61,0.25)_inset] " +
        className
      }
      style={{
        backgroundImage:
          "radial-gradient(1200px_600px at -10% -20%, rgba(255,225,130,0.04), transparent), radial-gradient(800px_400px at 120% 120%, rgba(255,225,130,0.05), transparent)",
      }}
    >
      {/* Köşe izleri */}
      <span className="pointer-events-none absolute -top-px -left-px h-5 w-5 rounded-tl-xl border-l border-t border-amber-800/50" />
      <span className="pointer-events-none absolute -top-px -right-px h-5 w-5 rounded-tr-xl border-r border-t border-amber-800/50" />
      <span className="pointer-events-none absolute -bottom-px -left-px h-5 w-5 rounded-bl-xl border-b border-l border-amber-800/50" />
      <span className="pointer-events-none absolute -bottom-px -right-px h-5 w-5 rounded-br-xl border-b border-r border-amber-800/50" />
      {children}
    </div>
  );
}

// ================
//  Stat Satırı
// ================
function StatRow({ label, value, onChange, editable }:{ label: string; value: number; onChange: (n:number)=>void; editable: boolean; }) {
  const total = 10;
  const v = Math.max(0, Math.min(total, Number(value) || 0));
  return (
    <div className="flex items-center justify-between gap-3 py-0.5">
      <span className="select-none text-amber-200/90">{label}</span>
      <div className="flex items-center gap-2">
        {editable && (
          <button
            className="h-5 w-5 rounded border border-amber-700/70 text-amber-200 hover:bg-stone-800"
            onClick={() => onChange(Math.max(0, v - 1))}
            aria-label={`${label} azalt`}
          >
            −
          </button>
        )}
        <div className="flex max-w-[150px] flex-wrap gap-1">
          {Array.from({ length: total }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => editable && onChange(i + 1)}
              className={
                "h-3 w-3 border border-amber-700/70 " + (i < v ? "bg-amber-700/60" : "bg-transparent")
              }
              aria-label={`${label} ${i + 1}`}
            />
          ))}
        </div>
        {editable && (
          <button
            className="h-5 w-5 rounded border border-amber-700/70 text-amber-200 hover:bg-stone-800"
            onClick={() => onChange(Math.min(total, v + 1))}
            aria-label={`${label} artır`}
          >
            +
          </button>
        )}
        <input
          type="number"
          min={0}
          max={total}
          value={v}
          onChange={(e) => onChange(Math.max(0, Math.min(total, Number(e.target.value) || 0)))}
          disabled={!editable}
          className="w-12 rounded border border-amber-700/70 bg-stone-900 px-1 text-right text-amber-300 disabled:opacity-70"
        />
      </div>
    </div>
  );
}

// ================
//  Can Barı
// ================
function CanBar({ current, max, shield, onChange, editable }:{ current:number; max:number; shield?:number; onChange:(v:{current:number; max:number; shield?:number})=>void; editable:boolean; }) {
  const safeMax = Math.max(1, Number(max) || 1);
  const safeCur = Math.max(0, Math.min(safeMax, Number(current) || 0));
  const safeShield = Math.max(0, Number(shield) || 0);
  const pct = Math.round((safeCur / safeMax) * 100);
  const shieldEnd = Math.min(safeMax, safeCur + safeShield);
  const shieldPct = Math.max(0, Math.round(((shieldEnd - safeCur) / safeMax) * 100));
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[10px] tracking-widest text-amber-200/90">
        <span>CAN {safeMax}{safeShield > 0 ? ` + ${safeShield}` : ''}</span>
        {editable && (
          <div className="flex items-center gap-2 text-[10px]">
            <label className="flex items-center gap-1">
              Şu an:
              <input
                type="number"
                min={0}
                value={safeCur}
                onChange={(e) => onChange({ current: Math.max(0, Math.min(safeMax, Number(e.target.value) || 0)), max: safeMax, shield: safeShield })}
                className="w-12 rounded border border-amber-700/60 bg-stone-900 px-1 text-amber-200"
              />
            </label>
            <label className="flex items-center gap-1">
              Maks:
              <input
                type="number"
                min={1}
                value={safeMax}
                onChange={(e) => {
                  const m = Math.max(1, Number(e.target.value) || 1);
                  onChange({ current: Math.min(safeCur, m), max: m, shield: Math.min(safeShield, m) });
                }}
                className="w-12 rounded border border-amber-700/60 bg-stone-900 px-1 text-amber-200"
              />
            </label>
            <label className="flex items-center gap-1">
              Kalkan:
              <input
                type="number"
                min={0}
                value={safeShield}
                onChange={(e) => {
                  const s = Math.max(0, Number(e.target.value) || 0);
                  onChange({ current: safeCur, max: safeMax, shield: s });
                }}
                className="w-12 rounded border border-amber-700/60 bg-stone-900 px-1 text-amber-200"
              />
            </label>
          </div>
        )}
      </div>
      <div className="relative h-3 w-full rounded-sm border border-amber-700/70 bg-stone-800">
        <div className="h-full rounded-sm bg-emerald-600" style={{ width: pct + "%" }} />
        {shieldPct > 0 && (
          <div className="absolute top-0 h-full rounded-sm bg-white/80" style={{ left: pct + "%", width: shieldPct + "%" }} />
        )}
      </div>
    </div>
  );
}

// ======================
//  Görsel Ekle (DATA URL) — kırık linkleri önler, kalıcıdır
// ======================
function ImageDrop({ onChange, src, editable }:{ onChange:(u:string)=>void; src?:string|null; editable:boolean; }) {
  const inputRef = useRef<HTMLInputElement|null>(null);
  const handleFile = (f: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      onChange(dataUrl);
    };
    reader.readAsDataURL(f);
  };
  return (
    <button
      type="button"
      onClick={() => editable && inputRef.current?.click()}
      className="group relative grid h-40 w-full place-items-center rounded-md border border-amber-700/60 bg-stone-800/60 text-amber-300/70"
    >
      {src ? (
        <img src={src} alt="Karakter görseli" className="h-full w-full rounded-md object-cover" />
      ) : (
        <span className="text-xs tracking-widest group-hover:text-amber-200">GÖRSEL EKLE</span>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = (e.target.files && e.target.files[0]) || null;
          if (!f) return;
          handleFile(f);
        }}
      />
    </button>
  );
}

// ======================
//  Karakter Kartı
// ======================
interface CharStats { gucl:number; ceviklik:number; zeka:number; irade:number; izcilik:number; }
interface CharCan { current:number; max:number; shield?: number; }
interface CharData { ad:string; sinif:string; seviye:number; img?:string|null; can:CharCan; stats:CharStats; pasif:string; inspiration?: number; extraStats?: Record<string, number>; owner?: string|null; }

function CharacterCard({ data, onChange, onDelete, editable, user, userOwnsAnother }:{ data:CharData; onChange:(d:CharData)=>void; onDelete:()=>void; editable:boolean; user: { username:string; role:'gm'|'player' } | null; userOwnsAnother:boolean; }) {
  const update = (patch: Partial<CharData>) => onChange({ ...data, ...patch });
  const setStat = (key: keyof CharStats, val:number) => update({ stats: { ...data.stats, [key]: Math.max(0, Math.min(10, val)) } });
  const isGM: boolean = user?.role === 'gm';
  const isOwner: boolean = !!(user?.username && data.owner && user.username.toLowerCase() === String(data.owner).toLowerCase());
  const canEditThis: boolean = !!editable && (isGM || isOwner);
  const canEditImage: boolean = isGM || isOwner; // Görsel ekleme oynatma modunda da serbest

  return (
    <Frame className={"p-3 " + ((data.inspiration || 0) > 0 ? "ring-2 ring-amber-400/60" : "") }>
      <div className="mb-2 flex items-center justify-between gap-2">
        {canEditThis ? (
          <input
            value={data.ad}
            onChange={(e) => update({ ad: e.target.value })}
            className="min-w-0 flex-1 rounded border border-amber-700/60 bg-stone-900 px-2 py-1 font-serif text-lg text-amber-300"
          />
        ) : (
          <div className="font-serif text-xl text-amber-300">{data.ad}</div>
        )}
        <div className="flex items-center gap-2">
          <div className="grid h-6 w-6 place-items-center rounded-full border border-amber-700/70 bg-stone-800 text-[10px] text-amber-300">
            {canEditThis ? (
              <input
                type="number"
                min={1}
                value={data.seviye}
                onChange={(e) => update({ seviye: Math.max(1, Number(e.target.value) || 1) })}
                className="h-6 w-6 rounded-full border-0 bg-transparent text-center"
              />
            ) : (
              data.seviye
            )}
          </div>
          {/* Inspiration kontrolü */}
          <div className="flex items-center gap-1 rounded border border-amber-700/70 bg-stone-800 px-1 py-0.5 text-xs text-amber-200">
            <span>INSP</span>
            <span className="font-mono">{data.inspiration || 0}</span>
            {canEditThis && (
              <>
                <button onClick={() => update({ inspiration: Math.max(0, (data.inspiration || 0) - 1) })} className="rounded border border-amber-700/70 px-1 hover:bg-stone-700">−</button>
                <button onClick={() => update({ inspiration: (data.inspiration || 0) + 1 })} className="rounded border border-amber-700/70 px-1 hover:bg-stone-700">+</button>
              </>
            )}
          </div>
          {canEditThis && (
            <button
              onClick={onDelete}
              className="rounded border border-red-800/70 bg-red-900/40 px-2 py-1 text-xs text-red-200 hover:bg-red-900/60"
            >
              Sil
            </button>
          )}
        </div>
      </div>

      <div className="-mt-1 mb-2 text-center text-[11px] tracking-widest text-amber-200/80">
        {canEditThis ? (
          <input
            value={data.sinif}
            onChange={(e) => update({ sinif: e.target.value })}
            className="w-full rounded border border-amber-700/60 bg-stone-900 px-2 py-1 text-center"
          />
        ) : (
          data.sinif.toUpperCase()
        )}
      </div>

      {/* Sahiplik/claim barı */}
      <div className="mb-2 flex items-center justify-between text-xs text-amber-200/80">
        <span>Sahip: {data.owner ? data.owner : '—'}</span>
        {user && (
          data.owner ? (
            (isGM || isOwner) ? (
              <button className="rounded border border-amber-700/70 px-2 py-0.5 hover:bg-stone-800" onClick={() => update({ owner: null })}>Sahipliği bırak</button>
            ) : null
          ) : (
            // Bir kullanıcı bir karta sahipken başka kartı sahiplenemesin (önce bırakmalı)
            <button
              className="rounded border border-amber-700/70 px-2 py-0.5 hover:bg-stone-800 disabled:opacity-60"
              disabled={userOwnsAnother}
              onClick={() => update({ owner: user.username })}
            >Bu kartı sahiplen</button>
          )
        )}
      </div>

      <ImageDrop src={data.img || null} editable={canEditImage} onChange={(url) => update({ img: url })} />

      <div className="mt-3">
        <CanBar current={data.can.current} max={data.can.max} shield={data.can.shield || 0} editable={canEditThis} onChange={(v) => update({ can: { current: v.current, max: v.max, shield: v.shield || 0 } })} />
      </div>

      <div className="mt-3 space-y-1 text-sm">
        {/* Dinamik statlar (yeni sistem) */}
        <StatsEditor
          stats={{
            GÜÇ: data.stats.gucl,
            ÇEVİKLİK: data.stats.ceviklik,
            ZEKA: data.stats.zeka,
            İRADE: data.stats.irade,
            İZCİLİK: data.stats.izcilik,
            ...(data.extraStats || {}),
          }}
          editable={canEditThis}
          onChange={(next) => {
            // Ana statları eşle, geri kalanları extraStats'ta sakla
            const mapBack = {
              gucl: next['GÜÇ'] ?? data.stats.gucl,
              ceviklik: next['ÇEVİKLİK'] ?? data.stats.ceviklik,
              zeka: next['ZEKA'] ?? data.stats.zeka,
              irade: next['İRADE'] ?? data.stats.irade,
              izcilik: next['İZCİLİK'] ?? data.stats.izcilik,
            } as CharStats;
            const coreKeys = new Set(['GÜÇ','ÇEVİKLİK','ZEKA','İRADE','İZCİLİK']);
            const extras: Record<string, number> = {};
            Object.keys(next).forEach((k) => { if (!coreKeys.has(k)) extras[k] = next[k]; });
            update({ stats: mapBack, extraStats: extras });
          }}
        />
      </div>

      <div className="mt-3 border-t border-amber-800/40 pt-2 text-[12px] tracking-wider text-amber-200/90">
        <div className="mb-1 text-[11px] text-amber-300/90">PASİF YETENEKLER</div>
        {canEditThis ? (
          <input
            value={data.pasif}
            onChange={(e) => update({ pasif: e.target.value })}
            className="w-full rounded border border-amber-700/60 bg-stone-900 px-1"
          />
        ) : (
          <div className="text-amber-200">{data.pasif}</div>
        )}
      </div>
    </Frame>
  );
}

// ======================
//  Müzik Paneli (DATA URL) — tarayıcıda çalınır ve kalıcıdır
// ======================
type Track = { name: string; dataUrl: string };
function MusicPanel({ live, tableId, socketRef, userRole }:{ live:boolean; tableId:string; socketRef: React.MutableRefObject<Socket|null>; userRole: 'gm'|'player' }) {
  const [tracks, setTracks] = useJsonPersistence<Track[]>("ejk_tracks", []);
  const [current, setCurrent] = useState<number>(-1);
  const fileRef = useRef<HTMLInputElement|null>(null);
  const audioRef = useRef<HTMLAudioElement|null>(null);

  const addFile = (f: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      setTracks((prev) => [...prev, { name: f.name, dataUrl }]);
      if (current === -1) setCurrent(0);
    };
    reader.readAsDataURL(f);
  };

  useEffect(() => {
    if (audioRef.current && current >= 0 && tracks[current]) {
      audioRef.current.load();
      audioRef.current.play().catch(() => {});
      // GM çalınca yayınla
      if (live && userRole === 'gm' && socketRef.current) {
        socketRef.current.emit('music:control', { tableId, payload: { action: 'play', track: tracks[current] } });
      }
    }
  }, [current, tracks]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onPlay = () => { if (live && userRole === 'gm' && socketRef.current && current >= 0 && tracks[current]) socketRef.current.emit('music:control', { tableId, payload: { action: 'play', track: tracks[current] } }); };
    const onPause = () => { if (live && userRole === 'gm' && socketRef.current) socketRef.current.emit('music:control', { tableId, payload: { action: 'pause' } }); };
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    return () => {
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
    };
  }, [live, userRole, socketRef, tableId, current, tracks]);

  return (
    <Frame className="flex h-full flex-col p-3">
      <div className="mb-2 font-serif text-lg text-amber-300">Müzik</div>
      {tracks.length === 0 ? (
        <div className="mb-2 text-xs text-amber-300/80">Liste boş. MP3 ekleyin.</div>
      ) : (
        <ul className="mb-2 max-h-32 space-y-1 overflow-auto pr-1 text-sm">
          {tracks.map((t, i) => (
            <li key={i} className="flex items-center justify-between gap-3 text-amber-200">
              <button onClick={() => setCurrent(i)} className={"truncate text-left " + (current === i ? "underline" : "")}>{t.name}</button>
              <button onClick={() => setTracks((prev) => prev.filter((_, idx) => idx !== i))} className="rounded border border-amber-700/60 px-2 py-0.5 text-xs hover:bg-stone-800">Sil</button>
            </li>
          ))}
        </ul>
      )}

      <audio ref={audioRef} controls className="w-full">
        {current >= 0 && tracks[current] ? <source src={tracks[current].dataUrl} /> : null}
        Tarayıcı ses çaları desteklemiyor.
      </audio>

      <div className="mt-2">
        <button className="w-full rounded-md border border-amber-700/70 bg-stone-800 px-3 py-2 text-sm text-amber-200 hover:bg-stone-700" onClick={() => fileRef.current?.click()}>
          Mp3 ekle
        </button>
        <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={(e) => { const f = (e.target.files && e.target.files[0]) || null; if (!f) return; addFile(f); }} />
      </div>
    </Frame>
  );
}

// ======================
//  Zar Paneli (D6)
// ======================
function ZarPanel({ user, chars, socketRef, tableId, clientId }:{ user: { username:string; role:'gm'|'player' } | null; chars: CharData[]; socketRef: React.MutableRefObject<Socket|null>; tableId: string; clientId: string }) {
  const [isim, setIsim] = useState("");
  const [sonuc, setSonuc] = useState<number>(4);
  const [rolling, setRolling] = useState(false);
  const [dice, setDice] = useState<number>(6);
  const [logs, setLogs] = useState<{name:string; dice:number; result:number; ts:number}[]>([]);

  // Sahip olduğu karakter varsa adı otomatik kullanılsın
  const owned = React.useMemo(() => {
    if (!user?.username) return null;
    const u = user.username.toLowerCase();
    return chars.find((c) => (c.owner || '')?.toLowerCase() === u) || null;
  }, [user?.username, chars]);
  const effectiveName = owned?.ad?.trim() || (isim || 'Bilinmeyen');

  const at = () => {
    if (rolling) return;
    setRolling(true);
    let ticks = 0;
    const spin = setInterval(() => {
      setSonuc(1 + Math.floor(Math.random() * dice));
      ticks++;
    }, 80);
    setTimeout(() => {
      clearInterval(spin);
      const final = 1 + Math.floor(Math.random() * dice);
      setSonuc(final);
      setRolling(false);
      // Yerelde logla
      const entry = { name: effectiveName, dice, result: final, ts: Date.now() };
      setLogs((l) => [entry, ...l].slice(0, 8));
      // Sokete yayınla
      if (socketRef.current) {
        try { socketRef.current.emit('dice:roll', { tableId, payload: entry, originClientId: clientId }); } catch {}
      }
      // Yerel toast için event
      try { window.dispatchEvent(new CustomEvent('dice:roll-local', { detail: entry })); } catch {}
    }, 800);
  };
  const pipMap: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };

  useEffect(() => {
    const ok = [1,2,3,4,5,6].every((k) => Array.isArray(pipMap[k]));
    if (!ok) console.warn("[ZarPanel] pipMap eksik veya hatalı");
  }, []);

  // Soketten gelen zar atışlarını dinle
  useEffect(() => {
    const s: Socket | null = socketRef.current;
    if (!s) return;
    const handler = ({ payload }: { payload: { name:string; dice:number; result:number; ts:number } }) => {
      setLogs((l) => [payload, ...l].slice(0, 8));
    };
    s.on('dice:roll', handler);
    return () => { s.off('dice:roll', handler); };
  }, [socketRef, tableId]);

  return (
    <Frame className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm text-amber-200">Zar atan oyuncunun adı</div>
        <select
          value={dice}
          onChange={(e) => setDice(Number(e.target.value) || 6)}
          className="rounded border border-amber-700/60 bg-stone-900 px-2 py-1 text-xs text-amber-200"
          aria-label="Zar tipi"
        >
          {[4,6,8,10,12,20,100].map((d) => (
            <option key={d} value={d}>{"d"+d}</option>
          ))}
        </select>
      </div>
      {owned ? (
        <div className="mb-3 w-full rounded-md border border-amber-700/60 bg-stone-800 px-3 py-2 text-amber-200">
          Karakter: <span className="font-semibold">{owned.ad}</span>
        </div>
      ) : (
        <input
          value={isim}
          onChange={(e) => setIsim(e.target.value)}
          placeholder="İsim yaz"
          className="mb-3 w-full rounded-md border border-amber-700/60 bg-stone-800 px-3 py-2 text-amber-200 outline-none focus:ring-1 focus:ring-amber-600"
        />
      )}
      {dice === 6 ? (
        <div className={"mx-auto mb-3 grid h-28 w-28 place-items-center rounded-md border border-amber-700/70 bg-stone-800 " + (rolling ? "animate-spin" : "")}> 
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 9 }).map((_, i) => (
              <span
                key={i}
                className={"h-3 w-3 rounded-full " + (pipMap[sonuc].includes(i) ? "bg-amber-300" : "bg-transparent")}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className={"mx-auto mb-3 grid h-28 w-28 place-items-center rounded-md border border-amber-700/70 bg-stone-800 text-3xl " + (rolling ? "animate-spin" : "")}> 
          <span className="font-mono text-amber-200">{sonuc}</span>
        </div>
      )}
      <button
        onClick={at}
        disabled={rolling}
        className="w-full rounded-md border border-amber-700/70 bg-stone-800 px-3 py-2 text-amber-200 hover:bg-stone-700 disabled:opacity-60"
      >
        {rolling ? "Zar atılıyor..." : `d${dice} at`}
      </button>

      {logs.length > 0 && (
        <div className="mt-3 border-t border-amber-800/40 pt-2 text-xs text-amber-200/90">
          <div className="mb-1 text-amber-300/90">Son Zarlar</div>
          <ul className="space-y-1">
            {logs.map((l, i) => (
              <li key={i} className="truncate">{l.name} {`d${l.dice}`} → <span className="font-mono">{l.result}</span></li>
            ))}
          </ul>
        </div>
      )}
    </Frame>
  );
}

// GM Zar Paneli (çoklu zar türü + animasyon)
function GmZarPanel({ socketRef, tableId, clientId }:{ socketRef: React.MutableRefObject<Socket|null>; tableId:string; clientId:string }) {
  const [dice, setDice] = useState<number>(20);
  const [result, setResult] = useState<number | null>(null);
  const [rolling, setRolling] = useState(false);

  const roll = () => {
    if (rolling) return;
    setRolling(true);
    let temp = 1 + Math.floor(Math.random() * dice);
    const spin = setInterval(() => {
      temp = 1 + Math.floor(Math.random() * dice);
      setResult(temp);
    }, 60);
    setTimeout(() => {
      clearInterval(spin);
      const final = 1 + Math.floor(Math.random() * dice);
      setResult(final);
      setRolling(false);
      // GM ismi sabit: 'GM'
      const entry = { name: 'GM', dice, result: final, ts: Date.now() };
      const s: Socket | null = socketRef.current;
      if (s) s.emit('dice:roll', { tableId, payload: entry, originClientId: clientId });
      try { window.dispatchEvent(new CustomEvent('dice:roll-local', { detail: entry })); } catch {}
    }, 900);
  };

  return (
    <Frame className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="font-serif text-lg text-amber-300">GM Zar</div>
        <select
          value={dice}
          onChange={(e) => setDice(Number(e.target.value) || 20)}
          className="rounded border border-amber-700/60 bg-stone-900 px-2 py-1 text-sm text-amber-200"
        >
          {[4,6,8,10,12,20,100].map((d) => (
            <option key={d} value={d}>{"d"+d}</option>
          ))}
        </select>
      </div>

      <div className={"mx-auto mb-3 grid h-24 w-24 place-items-center rounded-md border border-amber-700/70 bg-stone-800 text-3xl " + (rolling ? "animate-spin" : "")}> 
        <span className="font-mono text-amber-200">{result ?? "-"}</span>
      </div>

      <button onClick={roll} disabled={rolling} className="w-full rounded-md border border-amber-700/70 bg-stone-800 px-3 py-2 text-amber-200 hover:bg-stone-700 disabled:opacity-60">
        {rolling ? "Atılıyor..." : `d${dice} at`}
      </button>
    </Frame>
  );
}

// ======================
//  Galeri Paneli (DATA URL + kalıcı)
// ======================
function GaleriPanel() {
  const [large, setLarge] = useJsonPersistence<string | null>("ejk_gallery_large", null);
  const [thumbs, setThumbs] = useJsonPersistence<string[]>("ejk_gallery_thumbs", []);
  const fileRef = useRef<HTMLInputElement|null>(null);
  const [modal, setModal] = useState<{open:boolean; src:string|null}>({open:false, src:null});
  const [user, setUserState] = useState<{username:string; role:'gm'|'player'} | null>(() => {
    try { const raw = localStorage.getItem('ejk_user'); return raw ? JSON.parse(raw) : null; } catch { return null; }
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModal((m) => ({ ...m, open:false }));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const openModal = (src:string|null) => {
    if (!src) return;
    setModal({ open: true, src });
  };

  const addImages = (files: File[]) => {
    const readers = files.map((f) => new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.readAsDataURL(f);
    }));
    Promise.all(readers).then((urls) => {
      setThumbs((prev) => {
        const next = [...prev, ...urls].slice(0, 16);
        if (!large && next[0]) setLarge(next[0]);
        return next;
      });
    });
  };

  return (
    <Frame className="flex h-full flex-col p-4">
      <div className="mb-3 h-[28rem] w-full cursor-zoom-in rounded-md border border-amber-700/60 bg-stone-800/70" onClick={() => openModal(large)}>
        {large && <img src={large} className="h-full w-full rounded-md object-cover" />}
      </div>
      {user?.role === 'gm' && (
        <div className="grid grid-cols-6 gap-3">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="relative h-16 w-full rounded-md border border-amber-700/60 bg-stone-900/60">
              {thumbs[i] && (
                <>
                  <img
                    src={thumbs[i]}
                    className="h-full w-full cursor-pointer rounded-md object-cover"
                    onClick={() => { setLarge(thumbs[i]); openModal(thumbs[i]); }}
                  />
                  <button
                    onClick={() => setThumbs((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute right-1 top-1 rounded bg-red-900/70 px-1 text-[10px] text-red-100 hover:bg-red-900"
                    aria-label={`Görsel ${i+1} sil`}
                  >
                    Sil
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
      <button
        onClick={() => fileRef.current?.click()}
        className="mt-3 w-full rounded-md border border-amber-700/70 bg-stone-800 px-3 py-2 text-amber-200 hover:bg-stone-700"
        disabled={!user || user.role !== 'gm'}
      >
        {user?.role === 'gm' ? 'Galeriye görsel ekle' : 'Sadece GM ekleyebilir'}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          addImages(files);
        }}
      />

      {modal.open && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/80 p-4" onClick={() => setModal({open:false, src:null})}>
          <div className="max-h-[90vh] max-w-[90vw]">
            {modal.src && <img src={modal.src} className="max-h-[90vh] max-w-[90vw] rounded-md object-contain" />}
          </div>
        </div>
      )}
    </Frame>
  );
}

// ======================
//  JSON İçe/Dışa Aktarım Hook'u
// ======================
function useJsonPersistence<T>(key:string, initial:T) {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {}
  }, [key, state]);
  return [state, setState] as const;
}

// ----------------------
//  JSON aktarım butonları
// ----------------------
function ExportImportButtons({ onReset, chars, title, editMode, setFromJson }:{ onReset:()=>void; chars:CharData[]; title:string; editMode:boolean; setFromJson:(obj:any)=>void; }) {
  const importRef = useRef<HTMLInputElement|null>(null);
  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ title, editMode, chars }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ejder-kayasi-ui.json";
    a.click();
    URL.revokeObjectURL(url);
  };
  const importJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = (e.target.files && e.target.files[0]) || null;
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        setFromJson(parsed);
      } catch (err) {
        console.warn("JSON okunamadı", err);
      }
    };
    reader.readAsText(f);
  };
  return (
    <>
      <button onClick={exportJson} className="rounded-md border border-amber-700/70 bg-stone-800 px-3 py-2 text-amber-200 hover:bg-stone-700">JSON Dışa Aktar</button>
      <button onClick={() => importRef.current?.click()} className="rounded-md border border-amber-700/70 bg-stone-800 px-3 py-2 text-amber-200 hover:bg-stone-700">JSON İçe Aktar</button>
      <input ref={importRef} type="file" accept="application/json" className="hidden" onChange={importJson} />
      <button onClick={onReset} className="rounded-md border border-red-800/70 bg-red-900/40 px-3 py-2 text-red-200 hover:bg-red-900/60">Sıfırla</button>
    </>
  );
}

// ======================
//  SAYFA (App)
// ======================
export default function App() {
  // === Basit kullanıcı girişi / rol yönetimi ===
  type UserRole = 'gm' | 'player';
  type User = { username: string; role: UserRole } | null;
  const [clientId] = useState<string>(() => {
    const k = 'ejk_client_id';
    const ex = localStorage.getItem(k);
    if (ex) return ex;
    const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(k, id);
    return id;
  });
  const [user, setUser] = useState<User>(() => {
    try {
      const raw = localStorage.getItem('ejk_user');
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  });
  const [loginU, setLoginU] = useState('');
  const [loginP, setLoginP] = useState('');
  const [loginErr, setLoginErr] = useState('');
  const tryLogin = () => {
    const players = Array.from({ length: 10 }).map((_, i) => {
      const n = i + 1;
      const u = `kullanıcı${n}`;
      return { u, p: u, role: 'player' as UserRole };
    });
    const known = [
      { u: 'gm', p: 'gm123', role: 'gm' as UserRole },
      ...players,
    ];
    const found = known.find((k) => k.u === loginU.trim() && k.p === loginP);
    if (!found) {
      setLoginErr('Kullanıcı adı veya şifre hatalı');
      return;
    }

    // 1) Optimistik giriş (socket bağlantısına bağımlı değil)
    const next: User = { username: found.u, role: found.role };
    setUser(next);
    localStorage.setItem('ejk_user', JSON.stringify(next));
    setLoginErr('');

    // 2) Socket bağlanınca kullanıcı kilidini talep et; red gelirse geri al
    const s = socketRef.current;
    const sendAuth = () => {
      if (!socketRef.current) return;
      socketRef.current.emit('auth:login', { username: found.u });
      socketRef.current.once('auth:result', ({ ok, reason }: { ok:boolean; reason?:string }) => {
        if (!ok) {
          setLoginErr(reason || 'Bu kullanıcı adı kullanımda');
          setUser(null);
          localStorage.removeItem('ejk_user');
        }
      });
    };
    if (s?.connected) {
      sendAuth();
    } else if (s) {
      const onConnect = () => {
        sendAuth();
        s.off('connect', onConnect);
      };
      s.on('connect', onConnect);
    }
  };
  const logout = () => {
    setUser(null);
    localStorage.removeItem('ejk_user');
    if (socketRef.current && socketRef.current.connected) socketRef.current.emit('auth:logout');
  };

  // === Canlı eşitleme (Socket.IO) ayarları ===
  const [live, setLive] = useState(true); // Netlify için varsayılan AÇIK
  const [tableId, setTableId] = useState<string>(() => localStorage.getItem("ejk_table") || "bolum-3");
  const [socketBase, setSocketBase] = useState<string>(() => {
    const saved = localStorage.getItem("ejk_socket_url");
    if (saved) return saved;
    try {
      if (typeof window !== 'undefined' && window.location && window.location.origin) {
        return window.location.origin;
      }
    } catch {}
    return "https://ejder-kayasi-socket.herokuapp.com";
  });
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const socketRef = useRef<Socket | null>(null);

  // === Normal UI durumları ===
  const [title, setTitle] = useJsonPersistence("ejk_title", "EJDER KAYASI : BÖLÜM 3");
  const [editMode, setEditMode] = useJsonPersistence("ejk_edit", true);
  const [chars, setChars] = useJsonPersistence<CharData[]>("ejk_chars", [
    { ad: "Muhammed", sinif: "Suikastçı", seviye: 1, img: null, can: { current: 10, max: 10, shield: 0 }, stats: { gucl: 2, ceviklik: 5, zeka: 4, irade: 2, izcilik: 2 }, pasif: "Gölgeye Karış", inspiration: 0, extraStats: {}, owner: null },
    { ad: "Cemal", sinif: "Savaşçı", seviye: 1, img: null, can: { current: 10, max: 10, shield: 0 }, stats: { gucl: 4, ceviklik: 2, zeka: 2, irade: 3, izcilik: 1 }, pasif: "Güç Darbesi", inspiration: 0, extraStats: {}, owner: null },
    { ad: "Ebru", sinif: "Büyücü", seviye: 1, img: null, can: { current: 8, max: 10, shield: 0 }, stats: { gucl: 1, ceviklik: 2, zeka: 5, irade: 4, izcilik: 2 }, pasif: "Alev Püskürt", inspiration: 0, extraStats: {}, owner: null },
    { ad: "Meryem", sinif: "Rahip", seviye: 1, img: null, can: { current: 10, max: 10, shield: 0 }, stats: { gucl: 2, ceviklik: 1, zeka: 3, irade: 5, izcilik: 2 }, pasif: "Tanrının Eli", inspiration: 0, extraStats: {}, owner: null },
    { ad: "Fatma", sinif: "İzci", seviye: 1, img: null, can: { current: 10, max: 10, shield: 0 }, stats: { gucl: 3, ceviklik: 4, zeka: 2, irade: 3, izcilik: 5 }, pasif: "Keskin Duyular", inspiration: 0, extraStats: {}, owner: null },
    { ad: "Kaan", sinif: "Avcı", seviye: 1, img: null, can: { current: 9, max: 10, shield: 0 }, stats: { gucl: 3, ceviklik: 4, zeka: 3, irade: 2, izcilik: 3 }, pasif: "Nefesini Tut", inspiration: 0, extraStats: {}, owner: null },
  ]);

  // Basit testler
  useEffect(() => { validateChars(chars); }, []);
  useEffect(() => {
    // Görseller data URL değilse uyarı ver (kırık görsel sebebini tespit için)
    chars.forEach((c, i) => { if (c.img && !isDataUrl(c.img) && !/^https?:\/\//.test(c.img)) console.warn(`[image] chars[${i}].img data: değil`); });
  }, [chars]);

  // === Socket bağlantısı yönetimi ===
  useEffect(() => {
    if (!live) {
      if (socketRef.current) { 
        socketRef.current.disconnect(); 
        socketRef.current = null; 
        setConnectionStatus('disconnected');
      }
      return;
    }

    setConnectionStatus('connecting');
    const socket = io(socketBase, { 
      transports: ["websocket", "polling"], 
      autoConnect: true,
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    
    socketRef.current = socket;
    localStorage.setItem("ejk_socket_url", socketBase);
    localStorage.setItem("ejk_table", tableId);

    socket.on("connect", () => {
      console.log("Socket.IO bağlantısı kuruldu:", socket.id);
      setConnectionStatus('connected');
      socket.emit("join", { tableId });
      socket.emit("state:update", { tableId, payload: { title, editMode, chars }, originClientId: clientId });
    });

    socket.on("disconnect", (reason) => {
      console.log("Socket.IO bağlantısı kesildi:", reason);
      setConnectionStatus('disconnected');
    });

    socket.on("connect_error", (error) => {
      console.error("Socket.IO bağlantı hatası:", error);
      setConnectionStatus('disconnected');
      alert(`Sunucuya bağlanılamadı: ${error.message}\nLütfen sunucu URL'ini kontrol edin.`);
    });

    socket.on("state:patch", ({ payload, originClientId }: { payload:any; originClientId?:string }) => {
      if (originClientId && originClientId === clientId) return;
      if (payload.title !== undefined) setTitle(payload.title);
      if (payload.editMode !== undefined) setEditMode(payload.editMode);
      if (payload.chars !== undefined) setChars(payload.chars);
      if (payload.tableId !== undefined && typeof payload.tableId === 'string') setTableId(payload.tableId);
    });

    socket.on("user:joined", ({ userId, tableId: joinedTableId }) => {
      if (joinedTableId === tableId) {
        console.log(`Yeni oyuncu katıldı: ${userId}`);
      }
    });

    socket.on("user:left", ({ userId, tableId: leftTableId }) => {
      if (leftTableId === tableId) {
        console.log(`Oyuncu ayrıldı: ${userId}`);
      }
    });

    return () => { 
      socket.disconnect(); 
      socketRef.current = null; 
      setConnectionStatus('disconnected');
    };
  }, [live, socketBase, tableId]);

  // Yerel değişiklikleri sokete yayınla (patch mantığı)
  useEffect(() => { if (socketRef.current && live) socketRef.current.emit("state:patch", { tableId, payload: { title }, originClientId: clientId }); }, [title, live, tableId]);
  useEffect(() => { if (socketRef.current && live) socketRef.current.emit("state:patch", { tableId, payload: { editMode }, originClientId: clientId }); }, [editMode, live, tableId]);
  // ÖNEMLİ: chars'ı komple yayınlamayı kaldırdık; granular olaylar kullanılıyor
  // Masa ID değişimini yayınla (diğer istemciler yeni masaya otomatik geçsin)
  useEffect(() => { if (socketRef.current && live) socketRef.current.emit("state:patch", { tableId, payload: { tableId }, originClientId: clientId }); }, [tableId, live]);

  const setChar = (idx:number, patch:CharData) => setChars((prev) => {
    const current = prev[idx];
    const next = [...prev];
    // Tek kart sahipliği kuralı: owner değişiyorsa düzenle
    if (patch.owner !== current.owner) {
      const newOwner = patch.owner || null;
      if (newOwner) {
        // Aynı kullanıcıya ait diğer kartların sahipliğini kaldır
        for (let i = 0; i < next.length; i++) {
          if (i !== idx && (next[i].owner || '').toLowerCase() === newOwner.toLowerCase()) {
            next[i] = { ...next[i], owner: null };
          }
        }
      }
    }
    next[idx] = patch;
    // Socket'e granular update yayınla
    if (socketRef.current && live) {
      socketRef.current.emit('char:update', { tableId, payload: { index: idx, value: patch }, originClientId: clientId });
    }
    return next;
  });

  const addChar = () => setChars((prev) => [
    ...prev,
    { ad: "Yeni Karakter", sinif: "Sınıf", seviye: 1, img: null, can: { current: 10, max: 10, shield: 0 }, stats: { gucl: 0, ceviklik: 0, zeka: 0, irade: 0, izcilik: 0 }, pasif: "", inspiration: 0, extraStats: {}, owner: null },
  ]);
  // add sonrası socket yayınla
  useEffect(() => {
    // Basit yaklaşımla addChar çağrısı sonrası son öğeyi algılamak yerine doğrudan addChar içinde yayınlamak daha iyi; ama burada basit tutuyoruz.
  }, []);

  const delChar = (idx:number) => setChars((prev) => {
    const next = prev.filter((_, i) => i !== idx);
    if (socketRef.current && live) socketRef.current.emit('char:delete', { tableId, payload: { index: idx }, originClientId: clientId });
    return next;
  });

  const resetAll = () => {
    localStorage.removeItem("ejk_title");
    localStorage.removeItem("ejk_edit");
    localStorage.removeItem("ejk_chars");
    localStorage.removeItem("ejk_table");
    localStorage.removeItem("ejk_socket_url");
    localStorage.removeItem("ejk_gallery_large");
    localStorage.removeItem("ejk_gallery_thumbs");
    localStorage.removeItem("ejk_tracks");
    window.location.reload();
  };

  // Socket referansını window'a köprüle (dice log yayınları için basit erişim)
  useEffect(() => {
    (window as any).__socketRef = socketRef.current;
    (window as any).__tableId = tableId;
  }, [socketRef.current, tableId]);

  // Granular socket olaylarını dinle ve local state'e uygula
  useEffect(() => {
    if (!socketRef.current) return;
    const s = socketRef.current;
    const onCharUpdate = ({ payload, originClientId }: { payload:{ index:number; value:CharData }; originClientId?:string }) => {
      if (originClientId && originClientId === clientId) return;
      setChars((prev) => prev.map((c, i) => (i === payload.index ? payload.value : c)));
    };
    const onCharDelete = ({ payload, originClientId }: { payload:{ index:number }; originClientId?:string }) => {
      if (originClientId && originClientId === clientId) return;
      setChars((prev) => prev.filter((_, i) => i !== payload.index));
    };
    const onCharAdd = ({ payload, originClientId }: { payload:{ value:CharData }; originClientId?:string }) => {
      if (originClientId && originClientId === clientId) return;
      setChars((prev) => [...prev, payload.value]);
    };
    s.on('char:update', onCharUpdate);
    s.on('char:delete', onCharDelete);
    s.on('char:add', onCharAdd);
    return () => {
      s.off('char:update', onCharUpdate);
      s.off('char:delete', onCharDelete);
      s.off('char:add', onCharAdd);
    };
  }, [socketRef, clientId]);

  return (
    <div className="min-h-screen bg-[#1b140e] p-6 text-amber-200">
      <div className="mx-auto max-w-[1600px]">
        {/* Login Overlay */}
        {!user && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/70">
            <div className="w-[360px] rounded-lg border border-amber-800/60 bg-stone-900 p-5 shadow-xl">
              <div className="mb-3 text-center font-serif text-2xl text-amber-300">Giriş Yap</div>
              <div className="space-y-2">
                <label className="block text-sm text-amber-200/90">Kullanıcı adı</label>
                <input value={loginU} onChange={(e)=>setLoginU(e.target.value)} className="w-full rounded border border-amber-700/60 bg-stone-800 px-3 py-2 text-amber-200" placeholder="gm / kullanıcı1 .. kullanıcı10" />
                <label className="block text-sm text-amber-200/90">Şifre</label>
                <input type="password" value={loginP} onChange={(e)=>setLoginP(e.target.value)} className="w-full rounded border border-amber-700/60 bg-stone-800 px-3 py-2 text-amber-200" placeholder="gm123 / kullanıcı1 .. kullanıcı10" />
                {loginErr && <div className="text-sm text-red-300">{loginErr}</div>}
                <button onClick={tryLogin} className="mt-2 w-full rounded-md border border-amber-700/70 bg-stone-800 px-3 py-2 text-amber-200 hover:bg-stone-700">Giriş</button>
              </div>
              <div className="mt-3 text-center text-xs text-amber-300/70">GM müzik panelini görebilir. Oyuncular göremez.</div>
            </div>
          </div>
        )}

        {/* Başlık + Araç Çubuğu */}
        <div className="mb-5 flex flex-col items-center gap-3">
          {editMode ? (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full max-w-[860px] rounded border border-amber-700/60 bg-stone-900 px-3 py-2 text-center font-serif text-3xl text-amber-300 md:text-4xl"
            />
          ) : (
            <div className="text-center font-serif text-4xl tracking-wider text-amber-300 md:text-5xl">{title}</div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-2">
            {user?.role === 'gm' ? (
              <button onClick={() => setEditMode((s:boolean) => !s)} className="rounded-md border border-amber-700/70 bg-stone-800 px-3 py-2 text-amber-200 hover:bg-stone-700">
                {editMode ? "Oynatma Moduna Geç" : "Düzenle"}
              </button>
            ) : (
              <span className="rounded-md border border-amber-700/70 bg-stone-800 px-3 py-2 text-amber-200 text-sm">
                Mod: {editMode ? 'Düzenleme' : 'Oynatma'} (GM kontrolünde)
              </span>
            )}
            <button onClick={addChar} className="rounded-md border border-amber-700/70 bg-stone-800 px-3 py-2 text-amber-200 hover:bg-stone-700">Yeni Karakter</button>

            {/* Masa ID — herkes görebilir/değiştirebilir */}
            <div className="flex items-center gap-2 rounded-md border border-amber-700/70 bg-stone-800 px-2 py-1">
              <label className="text-sm">Masa ID</label>
              <input 
                value={tableId} 
                onChange={(e) => { 
                  setTableId(e.target.value); 
                  localStorage.setItem("ejk_table", e.target.value); 
                }} 
                className="w-28 rounded border border-amber-700/60 bg-stone-900 px-2 py-1 text-sm" 
                placeholder="masa-adi"
              />
            </div>

            {/* Sunucu ve bağlantı durumu — sadece GM */}
            {user?.role === 'gm' && (
              <div className="flex items-center gap-2 rounded-md border border-amber-700/70 bg-stone-800 px-2 py-1">
                <label className="text-sm">Sunucu</label>
                <input 
                  value={socketBase} 
                  onChange={(e) => setSocketBase(e.target.value)} 
                  className="w-44 rounded border border-amber-700/60 bg-stone-900 px-2 py-1 text-sm"
                  placeholder="https://sunucu-adi.com"
                />
                <span className={`rounded px-2 py-1 text-sm ${
                  connectionStatus === 'connected' 
                    ? "border border-emerald-700 bg-emerald-900/40 text-emerald-200" 
                    : connectionStatus === 'connecting' 
                    ? "border border-yellow-700 bg-yellow-900/40 text-yellow-200"
                    : "border border-amber-700/70 bg-stone-800 text-amber-200"
                }`}>
                  {connectionStatus === 'connected' ? 'Canlı: BAĞLI' : connectionStatus === 'connecting' ? 'Canlı: BAĞLANIYOR...' : 'Canlı: BAĞLANTI YOK'}
                </span>
              </div>
            )}

            {/* JSON aktarım & reset */}
            <ExportImportButtons onReset={resetAll} chars={chars} title={title} editMode={editMode} setFromJson={(obj) => { if (obj.title) setTitle(obj.title); if (typeof obj.editMode === "boolean") setEditMode(obj.editMode); if (Array.isArray(obj.chars)) setChars(obj.chars); }} />
          </div>
        </div>

        {/* Ana Izgara */}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-7">
            <div className="grid grid-cols-3 gap-4">
              {chars.map((c, i) => {
                const userOwnsAnother = Boolean(
                  user?.username && chars.some((cc, j) => j !== i && (cc.owner || '').toLowerCase() === user.username.toLowerCase())
                );
                return (
                  <CharacterCard
                    key={i}
                    data={c}
                    editable={editMode}
                    user={user}
                    userOwnsAnother={userOwnsAnother}
                    onChange={(patch) => setChar(i, patch)}
                    onDelete={() => delChar(i)}
                  />
                );
              })}
            </div>
          </div>
          <div className="col-span-2 flex flex-col gap-4">
            {user?.role === 'gm' && <MusicPanel live={live} tableId={tableId} socketRef={socketRef} userRole={user.role} />}
            <ZarPanel user={user} chars={chars} socketRef={socketRef} tableId={tableId} clientId={clientId} />
            <GmZarPanel socketRef={socketRef} tableId={tableId} clientId={clientId} />
          </div>
          <div className="col-span-3">
            <GaleriPanel />
          </div>
        </div>

        {/* Oyuncular için gizli müzik dinleyici */}
        {user?.role === 'player' && (
          <HiddenMusicListener live={live} tableId={tableId} socketRef={socketRef} />
        )}

        {/* Global Son Zarlar barı (max 3) */}
        <DiceToasts socketRef={socketRef} />
      </div>
    </div>
  );
}

// Global dice toast bar
function DiceToasts({ socketRef }:{ socketRef: React.MutableRefObject<Socket|null> }) {
  const [rolls, setRolls] = useState<{name:string; dice:number; result:number; ts:number}[]>([]);

  useEffect(() => {
    const s = socketRef.current;
    const onSocket = ({ payload }: { payload: {name:string; dice:number; result:number; ts:number} }) => {
      setRolls((r) => [payload, ...r].slice(0, 3));
      // 5 sn sonra bu kaydı kaldır
      setTimeout(() => {
        setRolls((r) => r.filter((x) => x.ts !== payload.ts));
      }, 5000);
    };
    s?.on('dice:roll', onSocket);
    const onLocal = (e: any) => {
      const d = e.detail as {name:string; dice:number; result:number; ts:number};
      setRolls((r) => [d, ...r].slice(0, 3));
      setTimeout(() => {
        setRolls((r) => r.filter((x) => x.ts !== d.ts));
      }, 5000);
    };
    window.addEventListener('dice:roll-local', onLocal as any);
    return () => {
      s?.off('dice:roll', onSocket);
      window.removeEventListener('dice:roll-local', onLocal as any);
    };
  }, [socketRef]);

  if (rolls.length === 0) return null;
  return (
    <div className="pointer-events-none fixed left-1/2 top-2 z-50 -translate-x-1/2">
      <div className="rounded-md border border-amber-800/60 bg-stone-900/90 px-3 py-2 shadow-xl">
        <div className="mb-1 text-center text-xs uppercase tracking-wider text-amber-300/90">Son Zarlar</div>
        <ul className="space-y-0.5 text-sm text-amber-200">
          {rolls.map((r, i) => (
            <li key={r.ts} className="whitespace-nowrap">
              <span className="font-semibold">{r.name}</span> d{r.dice} → <span className="font-mono">{r.result}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// Oyuncuların GM'den gelen müziği çalması için gizli dinleyici
function HiddenMusicListener({ live, tableId, socketRef }:{ live:boolean; tableId:string; socketRef: React.MutableRefObject<Socket|null> }) {
  const audioRef = useRef<HTMLAudioElement|null>(null);
  const [track, setTrack] = useState<Track | null>(null);
  const [action, setAction] = useState<'play'|'pause'|'idle'>('idle');
  const [interacted, setInteracted] = useState<boolean>(false);
  const [pendingPlay, setPendingPlay] = useState<boolean>(false);

  useEffect(() => {
    const onInteract = () => setInteracted(true);
    window.addEventListener('pointerdown', onInteract, { once: true });
    return () => window.removeEventListener('pointerdown', onInteract as any);
  }, []);

  useEffect(() => {
    if (!live || !socketRef.current) return;
    const s = socketRef.current;
    const handler = ({ payload }: { payload: { action:'play'|'pause'; track?: Track } }) => {
      if (payload.track) setTrack(payload.track);
      setAction(payload.action);
    };
    s.on('music:control', handler);
    return () => { s.off('music:control', handler); };
  }, [live, socketRef, tableId]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    // Kaynağı değiştirmeden önce durdur
    if (track) {
      try { el.pause(); } catch {}
      try { el.load(); } catch {}
    }

    if (action === 'play' && track) {
      if (!interacted) {
        setPendingPlay(true);
        return;
      }
      try {
        el.load();
        el.play().catch(() => {
          // Otomatik çalma yine engellenirse kullanıcıdan etkileşim iste
          setPendingPlay(true);
        });
      } catch {
        setPendingPlay(true);
      }
    } else if (action === 'pause') {
      try { el.pause(); } catch {}
      setPendingPlay(false);
    }
  }, [action, track, interacted]);

  return (
    <>
      <audio ref={audioRef} className="hidden">
        {track ? <source src={track.dataUrl} /> : null}
      </audio>
      {pendingPlay && !interacted && (
        <div className="fixed bottom-4 left-1/2 z-30 -translate-x-1/2">
          <button
            onClick={() => { setInteracted(true); setPendingPlay(false); }}
            className="rounded-md border border-amber-700/70 bg-stone-800 px-3 py-2 text-amber-200 shadow hover:bg-stone-700"
          >
            GM müziğini çalmak için dokunun/tıklayın
          </button>
        </div>
      )}
    </>
  );
}

// Stat konfigürasyonu (dinamik)
const defaultStatKeys = ['GÜÇ','ÇEVİKLİK','ZEKA','İRADE','İZCİLİK'];
function StatsEditor({ stats, onChange, editable }:{ stats: Record<string, number>; onChange:(s:Record<string,number>)=>void; editable:boolean; }) {
  const [local, setLocal] = React.useState<Record<string, number>>({ ...stats });
  React.useEffect(() => { setLocal({ ...stats }); }, [JSON.stringify(stats)]);

  const emit = (next: Record<string, number>) => {
    setLocal(next);
    onChange(next);
  };
  const setVal = (k:string, v:number) => emit({ ...local, [k]: Math.max(0, Math.min(20, v)) });
  const rename = (oldK:string, newKRaw:string) => {
    const newK = newKRaw.trim().toUpperCase();
    if (!newK || newK === oldK) return;
    const { [oldK]: oldVal, ...rest } = local as any;
    emit({ ...rest, [newK]: typeof oldVal === 'number' ? oldVal : 0 });
  };
  const remove = (k:string) => {
    const { [k]: _, ...rest } = local as any;
    emit(rest);
  };
  const add = () => {
    let i = 1;
    let name = `STAT ${i}`;
    const existing = new Set(Object.keys(local));
    while (existing.has(name)) { i++; name = `STAT ${i}`; }
    emit({ ...local, [name]: 0 });
  };
  const keys = Object.keys(local);
  return (
    <div className="space-y-2">
      {keys.map((k) => (
        <div key={k} className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            {editable ? (
              <input defaultValue={k} onBlur={(e) => rename(k, e.target.value)} className="w-40 rounded border border-amber-700/60 bg-stone-900 px-2 py-1 text-xs text-amber-200" />
            ) : (
              <span className="text-amber-200/90">{k}</span>
            )}
            {editable && (
              <button type="button" onClick={() => remove(k)} className="rounded border border-red-800/70 bg-red-900/40 px-2 py-0.5 text-xs text-red-200 hover:bg-red-900/60">Sil</button>
            )}
          </div>
          <input type="range" min={0} max={20} value={local[k] ?? 0} onChange={(e) => setVal(k, Number(e.target.value) || 0)} disabled={!editable} className="w-full" />
          <div className="flex items-center justify-between text-xs text-amber-200/80">
            <span>0</span>
            <span className="font-mono">{local[k] ?? 0}</span>
            <span>20</span>
          </div>
        </div>
      ))}
      {editable && (
        <button type="button" onClick={add} className="mt-1 rounded border border-amber-700/70 bg-stone-800 px-2 py-1 text-xs text-amber-200 hover:bg-stone-700">Yeni Stat Ekle</button>
      )}
    </div>
  );
}

