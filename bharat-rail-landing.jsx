import React, { useState, useEffect, useRef } from "react";
import { Train, MapPin, ShieldCheck, Zap, Clock, Ticket, ArrowRight, Star, ChevronRight, Wallet, Bell, Smartphone } from "lucide-react";

// ---------- Fonts ----------
const FontLoader = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
    .f-display { font-family: 'Oswald', sans-serif; }
    .f-body { font-family: 'IBM Plex Sans', sans-serif; }
    .f-mono { font-family: 'IBM Plex Mono', monospace; }
    * { box-sizing: border-box; }
    ::selection { background: #C9A227; color: #0A1E33; }
  `}</style>
);

// ---------- Tokens ----------
const T = {
  navy: "#0F2A47",
  navyLight: "#1C3F63",
  navyDeep: "#0A1E33",
  brass: "#C9A227",
  brassLight: "#E0C158",
  paper: "#F3EEDD",
  paperDark: "#E8DFC3",
  charcoal: "#2A2620",
  ink: "#5A5546",
  signal: "#B23A2E",
  go: "#3F7D52",
};

// ---------- Split-flap board (signature element, reused from app) ----------
const FLAP_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ".split("");
function Flap({ target }) {
  const [display, setDisplay] = useState(" ");
  const iter = useRef(0);
  useEffect(() => {
    iter.current = 0;
    const steps = 6 + Math.floor(Math.random() * 10);
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
      style={{ display: "inline-block", width: "1ch", background: T.navyDeep, color: T.brassLight, textAlign: "center", borderRadius: 2 }}
    >
      {display}
    </span>
  );
}
function FlapRow({ text, width }) {
  const padded = text.toUpperCase().padEnd(width, " ").slice(0, width);
  return (
    <div style={{ display: "flex", gap: 2, justifyContent: "center" }}>
      {padded.split("").map((c, i) => (
        <Flap key={i} target={c} />
      ))}
    </div>
  );
}

// ---------- Reusable bits ----------
function SectionLabel({ children }) {
  return (
    <div className="f-mono" style={{ fontSize: 12, letterSpacing: 3, color: T.brass, fontWeight: 600, marginBottom: 10 }}>
      {children}
    </div>
  );
}

function FeatureCard({ icon: Icon, title, text }) {
  return (
    <div
      style={{
        background: "white",
        border: `1px solid ${T.paperDark}`,
        borderRadius: 12,
        padding: 22,
        boxShadow: "0 6px 18px rgba(15,42,71,0.06)",
      }}
    >
      <div style={{ width: 40, height: 40, borderRadius: 9, background: T.paper, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
        <Icon size={20} color={T.navy} />
      </div>
      <div className="f-display" style={{ fontSize: 18, color: T.charcoal, marginBottom: 6 }}>{title}</div>
      <div className="f-body" style={{ fontSize: 13.5, color: T.ink, lineHeight: 1.55 }}>{text}</div>
    </div>
  );
}

function StepRow({ n, title, text, last }) {
  return (
    <div style={{ display: "flex", gap: 16 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div
          className="f-mono"
          style={{
            width: 34, height: 34, borderRadius: "50%", border: `2px solid ${T.brass}`, color: T.navy,
            display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, flexShrink: 0,
          }}
        >
          {n}
        </div>
        {!last && <div style={{ width: 2, flex: 1, background: T.paperDark, marginTop: 4 }} />}
      </div>
      <div style={{ paddingBottom: 30 }}>
        <div className="f-display" style={{ fontSize: 18, color: T.charcoal, marginBottom: 4 }}>{title}</div>
        <div className="f-body" style={{ fontSize: 13.5, color: T.ink, lineHeight: 1.55, maxWidth: 420 }}>{text}</div>
      </div>
    </div>
  );
}

function StatBlock({ value, label }) {
  return (
    <div>
      <div className="f-mono" style={{ fontSize: "clamp(26px,4vw,36px)", fontWeight: 600, color: T.brassLight }}>{value}</div>
      <div className="f-body" style={{ fontSize: 12.5, color: "#C9D6E3", marginTop: 4 }}>{label}</div>
    </div>
  );
}

// ---------- Page ----------
export default function BharatRailLanding() {
  const [email, setEmail] = useState("");
  const [joined, setJoined] = useState(false);

  return (
    <div className="f-body" style={{ minHeight: "100%", background: T.paper, color: T.charcoal, overflowX: "hidden" }}>
      <FontLoader />

      {/* Nav */}
      <div style={{ position: "sticky", top: 0, zIndex: 10, background: T.navy, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${T.navyLight}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Train size={20} color={T.brassLight} />
          <span className="f-display" style={{ color: T.paper, fontSize: 18, letterSpacing: 1 }}>BHARAT RAIL</span>
        </div>
        <div className="hidden sm:flex" style={{ gap: 22, alignItems: "center" }}>
          <a href="#features" className="f-body" style={{ color: "#C9D6E3", fontSize: 13, textDecoration: "none" }}>Features</a>
          <a href="#how" className="f-body" style={{ color: "#C9D6E3", fontSize: 13, textDecoration: "none" }}>How it works</a>
          <a href="#faq" className="f-body" style={{ color: "#C9D6E3", fontSize: 13, textDecoration: "none" }}>FAQ</a>
          <button className="f-body" style={{ background: T.brass, color: T.navyDeep, border: "none", borderRadius: 7, padding: "8px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            Book now
          </button>
        </div>
      </div>

      {/* Hero */}
      <div style={{ background: `linear-gradient(180deg, ${T.navy}, ${T.navyLight})`, padding: "64px 20px 70px", position: "relative" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto", display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 40, alignItems: "center" }}>
          <div>
            <div className="f-mono" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: T.brassLight, fontSize: 12, letterSpacing: 2, border: `1px solid ${T.navyLight}`, borderRadius: 20, padding: "5px 12px", marginBottom: 20 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.go, display: "inline-block" }} />
              LIVE ACROSS 7,300+ STATIONS
            </div>
            <div className="f-display" style={{ color: T.paper, fontSize: "clamp(32px,5vw,52px)", lineHeight: 1.08, marginBottom: 16 }}>
              Every route.<br />One confirmed ticket.
            </div>
            <div className="f-body" style={{ color: "#C9D6E3", fontSize: 16, lineHeight: 1.6, maxWidth: 460, marginBottom: 28 }}>
              Search real-time seat availability, lock in your class, and walk away with a PNR — before the whistle blows.
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button className="f-body" style={{ background: T.signal, color: "white", border: "none", borderRadius: 9, padding: "13px 22px", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                Search trains <ArrowRight size={16} />
              </button>
              <button className="f-body" style={{ background: "transparent", color: T.paper, border: `1px solid ${T.navyLight}`, borderRadius: 9, padding: "13px 22px", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
                See how it works
              </button>
            </div>
          </div>

          <div
            className="f-mono"
            style={{ background: T.navyDeep, border: `3px solid ${T.brass}`, borderRadius: 8, padding: "16px 18px", boxShadow: "0 25px 60px rgba(0,0,0,0.4)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, color: T.brassLight, fontSize: 10, letterSpacing: 2 }}>
              <span>TRAIN</span><span>DEP</span><span>STATUS</span>
            </div>
            {[
              { t: "12951 RAJDHANI", time: "16:35", s: "ON TIME" },
              { t: "22119 TEJAS EXP", time: "06:10", s: "ON TIME" },
              { t: "12621 TN EXP", time: "22:30", s: "CONFIRMED" },
            ].map((r, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
                <FlapRow text={r.t} width={15} />
                <FlapRow text={r.time} width={5} />
                <FlapRow text={r.s} width={9} />
              </div>
            ))}
          </div>
        </div>

        {/* Stats band */}
        <div style={{ maxWidth: 1040, margin: "50px auto 0", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, borderTop: `1px solid ${T.navyLight}`, paddingTop: 30 }}>
          <StatBlock value="7,300+" label="Stations connected" />
          <StatBlock value="1.4Cr" label="Tickets booked / month" />
          <StatBlock value="99.9%" label="Booking uptime" />
          <StatBlock value="<8s" label="Avg. PNR confirmation" />
        </div>
      </div>

      {/* Features */}
      <div id="features" style={{ maxWidth: 1040, margin: "0 auto", padding: "70px 20px 20px" }}>
        <SectionLabel>WHY BHARAT RAIL</SectionLabel>
        <div className="f-display" style={{ fontSize: "clamp(24px,3vw,32px)", color: T.charcoal, marginBottom: 34, maxWidth: 560 }}>
          Built for the way India actually travels
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
          <FeatureCard icon={Zap} title="Real-time availability" text="Live seat counts pulled straight from the reservation system — no stale caches, no surprises at checkout." />
          <FeatureCard icon={ShieldCheck} title="Secure by design" text="Encrypted payments, OTP-verified bookings, and no card details ever stored on our servers." />
          <FeatureCard icon={Bell} title="Waitlist tracking" text="Get notified the moment your WL or RAC ticket moves to confirmed — no refreshing PNR status all day." />
          <FeatureCard icon={Wallet} title="Transparent fares" text="Base fare, quota, and convenience charges shown upfront. What you see at search is what you pay." />
          <FeatureCard icon={Clock} title="Tatkal-ready" text="A booking flow tuned for the 10am rush — pre-filled passenger lists and one-tap seat class selection." />
          <FeatureCard icon={Smartphone} title="Ticket on the go" text="Your confirmed ticket and barcode are ready offline the moment it's booked — no signal needed at the platform." />
        </div>
      </div>

      {/* How it works */}
      <div id="how" style={{ maxWidth: 1040, margin: "0 auto", padding: "70px 20px" }}>
        <SectionLabel>HOW IT WORKS</SectionLabel>
        <div className="f-display" style={{ fontSize: "clamp(24px,3vw,32px)", color: T.charcoal, marginBottom: 30 }}>
          From search to seat, in three stops
        </div>
        <div>
          <StepRow n={1} title="Search your route" text="Pick your stations and travel date. We check every class across every train running that route, instantly." />
          <StepRow n={2} title="Choose class & add passengers" text="Compare SL, 3A, 2A and 1A side by side, see live seat status, and fill in passenger details in one screen." />
          <StepRow n={3} title="Get your PNR" text="Pay securely and receive a confirmed ticket with PNR, seat numbers, and a scannable barcode — ready to travel." last />
        </div>
      </div>

      {/* Testimonial */}
      <div style={{ background: T.navy, padding: "60px 20px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", gap: 3, marginBottom: 16 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={16} fill={T.brassLight} color={T.brassLight} />
            ))}
          </div>
          <div className="f-display" style={{ color: T.paper, fontSize: "clamp(19px,2.6vw,24px)", lineHeight: 1.5, marginBottom: 16 }}>
            "Booked a Tatkal 3A ticket in under a minute during the morning rush — the seat map loaded faster than any app I've used before."
          </div>
          <div className="f-mono" style={{ color: T.brassLight, fontSize: 12 }}>— Frequent traveller, Mumbai–Delhi route</div>
        </div>
      </div>

      {/* CTA / newsletter */}
      <div id="faq" style={{ maxWidth: 720, margin: "0 auto", padding: "70px 20px", textAlign: "center" }}>
        <Ticket size={30} color={T.brass} style={{ marginBottom: 14 }} />
        <div className="f-display" style={{ fontSize: "clamp(24px,3.4vw,34px)", color: T.charcoal, marginBottom: 10 }}>
          Your next platform is one search away
        </div>
        <div className="f-body" style={{ fontSize: 14.5, color: T.ink, marginBottom: 26 }}>
          Get fare-drop alerts and Tatkal reminders for your saved routes.
        </div>
        {!joined ? (
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="f-body"
              style={{ padding: "12px 14px", borderRadius: 8, border: `1px solid ${T.paperDark}`, fontSize: 14, minWidth: 240 }}
            />
            <button
              onClick={() => email.includes("@") && setJoined(true)}
              className="f-body"
              style={{ background: T.navy, color: T.paper, border: "none", borderRadius: 8, padding: "12px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
            >
              Notify me <ChevronRight size={15} />
            </button>
          </div>
        ) : (
          <div className="f-mono" style={{ color: T.go, fontSize: 13 }}>You're on the list — we'll ping {email}.</div>
        )}
      </div>

      {/* Footer */}
      <div style={{ background: T.navyDeep, padding: "26px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Train size={16} color={T.brassLight} />
          <span className="f-mono" style={{ color: "#C9D6E3", fontSize: 12 }}>© 2026 Bharat Rail · Demo landing page</span>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          <MapPin size={14} color="#7A8CA3" />
          <span className="f-mono" style={{ color: "#7A8CA3", fontSize: 12 }}>Fares, stats and testimonials are illustrative</span>
        </div>
      </div>
    </div>
  );
}
