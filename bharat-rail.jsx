import React, { useState, useEffect, useRef } from "react";
import { Train, MapPin, Calendar, Search, ArrowRight, CheckCircle2, Ticket, Plus, Trash2, ChevronLeft, User, Clock, IndianRupee, X } from "lucide-react";

// ---------- Fonts ----------
const FontLoader = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
    .f-display { font-family: 'Oswald', sans-serif; }
    .f-body { font-family: 'IBM Plex Sans', sans-serif; }
    .f-mono { font-family: 'IBM Plex Mono', monospace; }
  `}</style>
);

// ---------- Design tokens ----------
const T = {
  navy: "#0F2A47",
  navyLight: "#1C3F63",
  navyDeep: "#0A1E33",
  brass: "#C9A227",
  brassLight: "#E0C158",
  paper: "#F3EEDD",
  paperDark: "#E8DFC3",
  charcoal: "#2A2620",
  ink: "#4A4638",
  signal: "#B23A2E",
  go: "#3F7D52",
  amber: "#B8791A",
};

// ---------- Mock data ----------
const STATIONS = [
  { code: "CSMT", name: "Mumbai CSMT" },
  { code: "NDLS", name: "New Delhi" },
  { code: "MAS", name: "Chennai Central" },
  { code: "HWH", name: "Howrah Jn" },
  { code: "SBC", name: "Bengaluru City" },
  { code: "PUNE", name: "Pune Jn" },
  { code: "ADI", name: "Ahmedabad Jn" },
  { code: "JP", name: "Jaipur Jn" },
];

const CLASS_LABELS = {
  SL: "Sleeper",
  "3A": "AC 3 Tier",
  "2A": "AC 2 Tier",
  "1A": "AC First",
};

function seedTrains(from, to) {
  const base = [
    { no: "12951", name: "Rajdhani Express", dep: "16:35", arr: "08:15", dur: "15h 40m", classes: { "3A": { fare: 1845, seats: 42, status: "AVL" }, "2A": { fare: 2670, seats: 12, status: "AVL" }, "1A": { fare: 4510, seats: 3, status: "AVL" } } },
    { no: "12953", name: "August Kranti Rajdhani", dep: "17:10", arr: "09:55", dur: "16h 45m", classes: { SL: { fare: 545, seats: 0, status: "WL 12" }, "3A": { fare: 1920, seats: 0, status: "RAC 4" }, "2A": { fare: 2755, seats: 18, status: "AVL" } } },
    { no: "22119", name: "Tejas Express", dep: "06:10", arr: "14:05", dur: "7h 55m", classes: { "3A": { fare: 1340, seats: 56, status: "AVL" }, "2A": { fare: 1980, seats: 20, status: "AVL" } } },
    { no: "16031", name: "Andaman Express", dep: "20:45", arr: "16:20", dur: "19h 35m", classes: { SL: { fare: 480, seats: 84, status: "AVL" }, "3A": { fare: 1275, seats: 6, status: "AVL" } } },
    { no: "12621", name: "Tamil Nadu Express", dep: "22:30", arr: "07:40", dur: "9h 10m", classes: { SL: { fare: 510, seats: 0, status: "WL 27" }, "3A": { fare: 1360, seats: 9, status: "AVL" }, "2A": { fare: 1990, seats: 0, status: "RAC 2" } } },
  ];
  return base.map((t, i) => ({ ...t, id: `${from}-${to}-${i}`, from, to }));
}

// ---------- Split-flap board (signature element) ----------
const FLAP_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ".split("");
function Flap({ target }) {
  const [display, setDisplay] = useState(" ");
  const iter = useRef(0);
  useEffect(() => {
    iter.current = 0;
    const steps = 6 + Math.floor(Math.random() * 8);
    const id = setInterval(() => {
      iter.current += 1;
      if (iter.current >= steps) {
        setDisplay(target);
        clearInterval(id);
      } else {
        setDisplay(FLAP_CHARS[Math.floor(Math.random() * FLAP_CHARS.length)]);
      }
    }, 45);
    return () => clearInterval(id);
  }, [target]);
  return (
    <span
      className="f-mono"
      style={{
        display: "inline-block",
        width: "1ch",
        background: T.navyDeep,
        color: T.brassLight,
        textAlign: "center",
        borderRadius: 2,
      }}
    >
      {display}
    </span>
  );
}
function FlapRow({ text, width }) {
  const padded = text.toUpperCase().padEnd(width, " ").slice(0, width);
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {padded.split("").map((c, i) => (
        <Flap key={i} target={c} />
      ))}
    </div>
  );
}

const BOARD_ROUTES = [
  { train: "12951 RAJDHANI EXP", dest: "NEW DELHI", time: "16:35", status: "ON TIME" },
  { train: "22119 TEJAS EXP", dest: "MUMBAI CSMT", time: "06:10", status: "ON TIME" },
  { train: "12621 TN EXPRESS", dest: "CHENNAI CTL", time: "22:30", status: "DELAY 10M" },
  { train: "16031 ANDAMAN EXP", dest: "HOWRAH JN", time: "20:45", status: "ON TIME" },
];

function DepartureBoard() {
  return (
    <div
      className="f-mono"
      style={{
        background: T.navyDeep,
        border: `3px solid ${T.brass}`,
        borderRadius: 8,
        padding: "18px 20px",
        boxShadow: "0 20px 50px rgba(0,0,0,0.45)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, color: T.brassLight, fontSize: 11, letterSpacing: 2 }}>
        <span>TRAIN</span>
        <span className="hidden sm:inline">DESTINATION</span>
        <span>DEP</span>
        <span>STATUS</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {BOARD_ROUTES.map((r, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <div style={{ flex: "0 0 auto" }}>
              <FlapRow text={r.train} width={19} />
            </div>
            <div className="hidden sm:block" style={{ flex: "0 0 auto" }}>
              <FlapRow text={r.dest} width={12} />
            </div>
            <div style={{ flex: "0 0 auto" }}>
              <FlapRow text={r.time} width={5} />
            </div>
            <div style={{ flex: "0 0 auto" }}>
              <FlapRow text={r.status} width={10} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Ticket stub card ----------
function Perforation() {
  const dots = new Array(14).fill(0);
  return (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "center", padding: "10px 0" }}>
      {dots.map((_, i) => (
        <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: T.navy, opacity: 0.15, margin: "2px 0" }} />
      ))}
    </div>
  );
}

function StatusPill({ status }) {
  const wl = status.startsWith("WL");
  const rac = status.startsWith("RAC");
  const color = wl ? T.signal : rac ? T.amber : T.go;
  return (
    <span
      className="f-mono"
      style={{ fontSize: 11, fontWeight: 600, color, border: `1px solid ${color}`, borderRadius: 4, padding: "2px 6px" }}
    >
      {status}
    </span>
  );
}

function TrainCard({ train, onBook }) {
  const [openClass, setOpenClass] = useState(null);
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "24px 1fr",
        background: T.paper,
        border: `1px solid ${T.paperDark}`,
        borderRadius: 10,
        overflow: "hidden",
        boxShadow: "0 4px 14px rgba(15,42,71,0.08)",
      }}
    >
      <div style={{ background: T.paperDark }}>
        <Perforation />
      </div>
      <div style={{ padding: "16px 18px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
          <div>
            <span className="f-display" style={{ fontSize: 19, fontWeight: 600, color: T.charcoal }}>
              {train.name}
            </span>
            <span className="f-mono" style={{ marginLeft: 8, fontSize: 12, color: T.ink }}>
              #{train.no}
            </span>
          </div>
          <span className="f-mono" style={{ fontSize: 12, color: T.ink }}>
            {train.dur}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 10, color: T.charcoal }}>
          <div>
            <div className="f-mono" style={{ fontSize: 20, fontWeight: 600 }}>{train.dep}</div>
            <div className="f-body" style={{ fontSize: 12, color: T.ink }}>{train.from}</div>
          </div>
          <div style={{ flex: 1, position: "relative", height: 1, background: T.brass, minWidth: 40 }}>
            <ArrowRight size={14} color={T.brass} style={{ position: "absolute", right: -2, top: -7 }} />
          </div>
          <div>
            <div className="f-mono" style={{ fontSize: 20, fontWeight: 600 }}>{train.arr}</div>
            <div className="f-body" style={{ fontSize: 12, color: T.ink }}>{train.to}</div>
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
          {Object.entries(train.classes).map(([cls, info]) => (
            <button
              key={cls}
              onClick={() => setOpenClass(openClass === cls ? null : cls)}
              className="f-body"
              style={{
                cursor: "pointer",
                border: `1.5px solid ${openClass === cls ? T.navy : T.paperDark}`,
                background: openClass === cls ? T.navy : "white",
                color: openClass === cls ? T.paper : T.charcoal,
                borderRadius: 8,
                padding: "8px 12px",
                textAlign: "left",
                minWidth: 108,
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 13 }}>{cls} · {CLASS_LABELS[cls]}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                <span className="f-mono" style={{ fontSize: 12 }}>₹{info.fare}</span>
                {info.status === "AVL" ? (
                  <span className="f-mono" style={{ fontSize: 11, color: openClass === cls ? T.brassLight : T.go, fontWeight: 600 }}>
                    AVL {info.seats}
                  </span>
                ) : (
                  <StatusPill status={info.status} />
                )}
              </div>
            </button>
          ))}
        </div>

        {openClass && (
          <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={() => onBook(train, openClass)}
              className="f-body"
              style={{
                cursor: "pointer",
                background: T.brass,
                color: T.navyDeep,
                fontWeight: 700,
                border: "none",
                borderRadius: 8,
                padding: "10px 18px",
                fontSize: 13,
              }}
            >
              Book {openClass} · ₹{train.classes[openClass].fare}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Passenger form ----------
function emptyPax() {
  return { id: Math.random().toString(36).slice(2), name: "", age: "", gender: "M" };
}

function BookingPanel({ train, cls, from, to, date, onCancel, onConfirm }) {
  const [pax, setPax] = useState([emptyPax()]);
  const fare = train.classes[cls].fare;
  const total = fare * pax.length;
  const canSubmit = pax.every((p) => p.name.trim() && p.age && Number(p.age) > 0);

  const update = (id, field, value) =>
    setPax((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));

  return (
    <div
      style={{
        background: "white",
        border: `1px solid ${T.paperDark}`,
        borderRadius: 12,
        padding: 20,
        boxShadow: "0 10px 30px rgba(15,42,71,0.12)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <button onClick={onCancel} className="f-body" style={{ display: "flex", alignItems: "center", gap: 4, color: T.ink, background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>
          <ChevronLeft size={16} /> Back to results
        </button>
        <span className="f-mono" style={{ fontSize: 12, color: T.ink }}>
          {train.no} · {cls} · {date}
        </span>
      </div>

      <div className="f-display" style={{ fontSize: 20, color: T.navy, marginBottom: 4 }}>
        {train.name} — {from} <ArrowRight size={14} style={{ display: "inline", verticalAlign: "middle" }} /> {to}
      </div>
      <div className="f-body" style={{ fontSize: 13, color: T.ink, marginBottom: 16 }}>
        Departs {train.dep} · Arrives {train.arr} · {CLASS_LABELS[cls]}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {pax.map((p, idx) => (
          <div key={p.id} style={{ display: "grid", gridTemplateColumns: "1fr 90px 110px 34px", gap: 8, alignItems: "center" }}>
            <input
              placeholder={`Passenger ${idx + 1} full name`}
              value={p.name}
              onChange={(e) => update(p.id, "name", e.target.value)}
              className="f-body"
              style={{ padding: "9px 10px", borderRadius: 6, border: `1px solid ${T.paperDark}`, fontSize: 13 }}
            />
            <input
              placeholder="Age"
              type="number"
              min="1"
              value={p.age}
              onChange={(e) => update(p.id, "age", e.target.value)}
              className="f-body"
              style={{ padding: "9px 10px", borderRadius: 6, border: `1px solid ${T.paperDark}`, fontSize: 13 }}
            />
            <select
              value={p.gender}
              onChange={(e) => update(p.id, "gender", e.target.value)}
              className="f-body"
              style={{ padding: "9px 10px", borderRadius: 6, border: `1px solid ${T.paperDark}`, fontSize: 13 }}
            >
              <option value="M">Male</option>
              <option value="F">Female</option>
              <option value="O">Other</option>
            </select>
            <button
              onClick={() => setPax((prev) => (prev.length > 1 ? prev.filter((x) => x.id !== p.id) : prev))}
              style={{ background: "none", border: "none", cursor: "pointer", color: T.signal, opacity: pax.length > 1 ? 1 : 0.3 }}
              disabled={pax.length <= 1}
              aria-label="Remove passenger"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={() => pax.length < 6 && setPax((prev) => [...prev, emptyPax()])}
        className="f-body"
        style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, background: "none", border: `1px dashed ${T.brass}`, color: T.amber, borderRadius: 6, padding: "7px 10px", cursor: "pointer", fontSize: 13 }}
      >
        <Plus size={14} /> Add passenger
      </button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20, paddingTop: 16, borderTop: `1px dashed ${T.paperDark}` }}>
        <div className="f-body" style={{ fontSize: 13, color: T.ink }}>
          {pax.length} passenger{pax.length > 1 ? "s" : ""} × ₹{fare}
        </div>
        <div className="f-mono" style={{ fontSize: 20, fontWeight: 600, color: T.navy }}>₹{total}</div>
      </div>

      <button
        disabled={!canSubmit}
        onClick={() => onConfirm(pax, total)}
        className="f-body"
        style={{
          marginTop: 14,
          width: "100%",
          background: canSubmit ? T.navy : T.paperDark,
          color: canSubmit ? T.paper : T.ink,
          border: "none",
          borderRadius: 8,
          padding: "12px 0",
          fontWeight: 700,
          fontSize: 14,
          cursor: canSubmit ? "pointer" : "not-allowed",
        }}
      >
        Confirm & pay ₹{total}
      </button>
    </div>
  );
}

// ---------- Confirmation ticket ----------
function genPNR() {
  return Array.from({ length: 10 }, () => Math.floor(Math.random() * 10)).join("");
}

function Barcode() {
  const bars = Array.from({ length: 46 }, () => 1 + Math.floor(Math.random() * 3));
  return (
    <svg width="100%" height="34" viewBox={`0 0 ${bars.length * 3} 34`} preserveAspectRatio="none">
      {bars.map((w, i) => (
        <rect key={i} x={i * 3} y={0} width={w} height={34} fill={T.charcoal} />
      ))}
    </svg>
  );
}

function TicketConfirmation({ train, cls, from, to, date, pax, total, pnr, onNewSearch }) {
  return (
    <div
      style={{
        background: T.paper,
        border: `2px solid ${T.navy}`,
        borderRadius: 14,
        padding: 0,
        overflow: "hidden",
        boxShadow: "0 18px 45px rgba(15,42,71,0.2)",
      }}
    >
      <div style={{ background: T.navy, padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: T.paper }}>
          <Train size={18} color={T.brassLight} />
          <span className="f-display" style={{ fontSize: 16, letterSpacing: 1 }}>BHARAT RAIL</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: T.go }}>
          <CheckCircle2 size={16} />
          <span className="f-mono" style={{ fontSize: 12, fontWeight: 600 }}>CONFIRMED</span>
        </div>
      </div>

      <div style={{ padding: "20px 22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div className="f-body" style={{ fontSize: 11, color: T.ink, letterSpacing: 1 }}>PNR NUMBER</div>
            <div className="f-mono" style={{ fontSize: 22, fontWeight: 600, color: T.navy }}>{pnr}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="f-body" style={{ fontSize: 11, color: T.ink }}>TRAIN</div>
            <div className="f-display" style={{ fontSize: 16, color: T.charcoal }}>{train.name} ({train.no})</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 18 }}>
          <div>
            <div className="f-mono" style={{ fontSize: 22, fontWeight: 600 }}>{train.dep}</div>
            <div className="f-body" style={{ fontSize: 12, color: T.ink }}>{from} · {date}</div>
          </div>
          <div style={{ flex: 1, height: 1, background: T.brass, position: "relative" }}>
            <Train size={14} color={T.brass} style={{ position: "absolute", left: "50%", top: -7, transform: "translateX(-50%)" }} />
          </div>
          <div>
            <div className="f-mono" style={{ fontSize: 22, fontWeight: 600 }}>{train.arr}</div>
            <div className="f-body" style={{ fontSize: 12, color: T.ink }}>{to}</div>
          </div>
        </div>

        <div style={{ marginTop: 20, borderTop: `1px dashed ${T.paperDark}`, paddingTop: 14 }}>
          <div className="f-body" style={{ fontSize: 11, color: T.ink, letterSpacing: 1, marginBottom: 8 }}>PASSENGERS · {CLASS_LABELS[cls]}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {pax.map((p, i) => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }} className="f-body">
                <span>{i + 1}. {p.name} ({p.age}, {p.gender})</span>
                <span className="f-mono" style={{ color: T.ink }}>Seat {cls}-{20 + i}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18 }}>
          <span className="f-body" style={{ fontSize: 12, color: T.ink }}>Total fare paid</span>
          <span className="f-mono" style={{ fontSize: 18, fontWeight: 600, color: T.navy }}>₹{total}</span>
        </div>

        <div style={{ marginTop: 18 }}>
          <Barcode />
        </div>
      </div>

      <div style={{ padding: "14px 22px", background: T.paperDark, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="f-body" style={{ fontSize: 12, color: T.ink }}>Carry a valid photo ID during the journey.</span>
        <button
          onClick={onNewSearch}
          className="f-body"
          style={{ background: T.brass, color: T.navyDeep, border: "none", borderRadius: 6, padding: "8px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}
        >
          Book another
        </button>
      </div>
    </div>
  );
}

// ---------- Search form ----------
function SearchForm({ onSearch }) {
  const [from, setFrom] = useState("Mumbai CSMT");
  const [to, setTo] = useState("New Delhi");
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });

  return (
    <div
      style={{
        background: "white",
        borderRadius: 12,
        padding: 18,
        boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
        border: `1px solid ${T.paperDark}`,
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <label className="f-body" style={{ fontSize: 11, color: T.ink, letterSpacing: 1 }}>
          FROM
          <div style={{ display: "flex", alignItems: "center", gap: 6, border: `1px solid ${T.paperDark}`, borderRadius: 8, padding: "9px 10px", marginTop: 4 }}>
            <MapPin size={15} color={T.navy} />
            <select value={from} onChange={(e) => setFrom(e.target.value)} className="f-body" style={{ border: "none", outline: "none", width: "100%", fontSize: 13, background: "transparent" }}>
              {STATIONS.map((s) => (
                <option key={s.code} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>
        </label>
        <label className="f-body" style={{ fontSize: 11, color: T.ink, letterSpacing: 1 }}>
          TO
          <div style={{ display: "flex", alignItems: "center", gap: 6, border: `1px solid ${T.paperDark}`, borderRadius: 8, padding: "9px 10px", marginTop: 4 }}>
            <MapPin size={15} color={T.signal} />
            <select value={to} onChange={(e) => setTo(e.target.value)} className="f-body" style={{ border: "none", outline: "none", width: "100%", fontSize: 13, background: "transparent" }}>
              {STATIONS.map((s) => (
                <option key={s.code} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>
        </label>
      </div>

      <label className="f-body" style={{ fontSize: 11, color: T.ink, letterSpacing: 1, display: "block", marginTop: 10 }}>
        DATE OF JOURNEY
        <div style={{ display: "flex", alignItems: "center", gap: 6, border: `1px solid ${T.paperDark}`, borderRadius: 8, padding: "9px 10px", marginTop: 4 }}>
          <Calendar size={15} color={T.navy} />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="f-body" style={{ border: "none", outline: "none", width: "100%", fontSize: 13 }} />
        </div>
      </label>

      <button
        onClick={() => from !== to && onSearch(from, to, date)}
        disabled={from === to}
        className="f-body"
        style={{
          marginTop: 14,
          width: "100%",
          background: from === to ? T.paperDark : T.signal,
          color: from === to ? T.ink : "white",
          border: "none",
          borderRadius: 8,
          padding: "12px 0",
          fontWeight: 700,
          fontSize: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          cursor: from === to ? "not-allowed" : "pointer",
        }}
      >
        <Search size={16} /> Search trains
      </button>
      {from === to && (
        <div className="f-body" style={{ fontSize: 11, color: T.signal, marginTop: 6 }}>Origin and destination cannot be the same.</div>
      )}
    </div>
  );
}

// ---------- App ----------
export default function BharatRail() {
  const [stage, setStage] = useState("home"); // home | results | booking | confirmed
  const [query, setQuery] = useState(null); // {from,to,date}
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null); // {train, cls}
  const [confirmation, setConfirmation] = useState(null);

  const handleSearch = (from, to, date) => {
    setQuery({ from, to, date });
    setResults(seedTrains(from, to));
    setStage("results");
  };

  const handleBook = (train, cls) => {
    setSelected({ train, cls });
    setStage("booking");
  };

  const handleConfirm = (pax, total) => {
    setConfirmation({ pax, total, pnr: genPNR() });
    setStage("confirmed");
  };

  const handleNewSearch = () => {
    setStage("home");
    setQuery(null);
    setResults([]);
    setSelected(null);
    setConfirmation(null);
  };

  return (
    <div className="f-body" style={{ minHeight: "100%", background: T.paper, color: T.charcoal }}>
      <FontLoader />

      {/* Header */}
      <div style={{ background: T.navy, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={handleNewSearch}>
          <Train size={22} color={T.brassLight} />
          <span className="f-display" style={{ color: T.paper, fontSize: 20, letterSpacing: 1 }}>BHARAT RAIL</span>
        </div>
        <span className="f-mono" style={{ color: T.brassLight, fontSize: 12 }}>e-Ticketing Demo</span>
      </div>

      {/* Hero (home only) */}
      {stage === "home" && (
        <div style={{ background: `linear-gradient(180deg, ${T.navy}, ${T.navyLight})`, padding: "40px 20px 60px" }}>
          <div style={{ maxWidth: 980, margin: "0 auto" }}>
            <div className="f-display" style={{ color: T.paper, fontSize: "clamp(28px, 5vw, 44px)", lineHeight: 1.1, marginBottom: 10 }}>
              Book train tickets across Bharat
            </div>
            <div className="f-body" style={{ color: "#C9D6E3", fontSize: 15, marginBottom: 26, maxWidth: 520 }}>
              Search live availability, reserve your class, and get a confirmed PNR in seconds.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 380px) 1fr", gap: 26, alignItems: "start" }}>
              <SearchForm onSearch={handleSearch} />
              <div className="hidden md:block">
                <DepartureBoard />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Body */}
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "26px 20px 60px" }}>
        {stage === "results" && query && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
              <div>
                <div className="f-display" style={{ fontSize: 22 }}>{query.from} <ArrowRight size={16} style={{ display: "inline", verticalAlign: "middle" }} /> {query.to}</div>
                <div className="f-mono" style={{ fontSize: 12, color: T.ink }}>{query.date} · {results.length} trains found</div>
              </div>
              <button onClick={handleNewSearch} className="f-body" style={{ background: "none", border: `1px solid ${T.paperDark}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, cursor: "pointer", color: T.ink }}>
                Modify search
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {results.map((t) => (
                <TrainCard key={t.id} train={t} onBook={handleBook} />
              ))}
            </div>
          </>
        )}

        {stage === "booking" && selected && query && (
          <BookingPanel
            train={selected.train}
            cls={selected.cls}
            from={query.from}
            to={query.to}
            date={query.date}
            onCancel={() => setStage("results")}
            onConfirm={handleConfirm}
          />
        )}

        {stage === "confirmed" && confirmation && selected && query && (
          <TicketConfirmation
            train={selected.train}
            cls={selected.cls}
            from={query.from}
            to={query.to}
            date={query.date}
            pax={confirmation.pax}
            total={confirmation.total}
            pnr={confirmation.pnr}
            onNewSearch={handleNewSearch}
          />
        )}
      </div>

      <div style={{ textAlign: "center", padding: "14px 20px", color: T.ink, fontSize: 11 }} className="f-mono">
        Demo booking system · fares, seats and PNRs are simulated
      </div>
    </div>
  );
}
