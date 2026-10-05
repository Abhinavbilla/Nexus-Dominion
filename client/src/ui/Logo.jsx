import "./Logo.css";

// NEXUS: DOMINION wordmark with a layered hex crest.
export default function Logo({ size = "lg" }) {
  return (
    <div className={`logo logo-${size}`}>
      <svg className="logo-crest" viewBox="0 0 80 80" aria-hidden="true">
        <defs>
          <linearGradient id="lg-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffe3a0" />
            <stop offset="0.5" stopColor="#e9b44c" />
            <stop offset="1" stopColor="#a8761f" />
          </linearGradient>
        </defs>
        <path d="M40 4 70 21v38L40 76 10 59V21z" fill="rgba(7,9,15,0.7)" stroke="url(#lg-gold)" strokeWidth="2.6" strokeLinejoin="round" />
        <path d="M40 13 62 25.5v29L40 67 18 54.5v-29z" fill="none" stroke="url(#lg-gold)" strokeWidth="1.2" strokeOpacity="0.7" strokeLinejoin="round" />
        <path d="M40 22 54 30v20L40 58 26 50V30z" fill="url(#lg-gold)" />
        <path d="M40 22v36M26 30l28 20M54 30 26 50" stroke="#2b1c05" strokeWidth="1.3" strokeOpacity="0.55" />
      </svg>
      <div className="logo-words">
        <span className="logo-nexus font-title">NEXUS</span>
        <span className="logo-dominion">
          <i />
          DOMINION
          <i />
        </span>
      </div>
    </div>
  );
}
