import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './LandingPage.css'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function useReveal() {
  const ref = useRef(null)
  const [visible, setVisible] = useState(prefersReducedMotion())
  useEffect(() => {
    if (prefersReducedMotion() || !ref.current) return
    const node = ref.current
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect() } },
      { threshold: 0.15 }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  return [ref, visible]
}

function useScrolled(threshold = 12) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])
  return scrolled
}

function useCountUp(target, active, duration = 1400) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!active) return
    if (prefersReducedMotion()) { setValue(target); return }
    let start = null
    const step = (ts) => {
      if (!start) start = ts
      const progress = Math.min((ts - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.floor(eased * target))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [active, target, duration])
  return value
}

const icons = {
  database: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" /><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></svg>),
  cpu: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="6" width="12" height="12" rx="2" /><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" /></svg>),
  chart: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M4 20V10M12 20V4M20 20v-7" /></svg>),
  target: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="0.6" fill="currentColor" /></svg>),
  document: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h9l3 3v15H6V3z" /><path d="M9 12h6M9 16h6M9 8h3" /></svg>),
  shield: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l7 3v6c0 4.4-3 8-7 9-4-1-7-4.6-7-9V6l7-3z" /><path d="M9 12l2 2 4-4" /></svg>),
  search: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" /></svg>),
  compare: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="18" r="2.5" /><circle cx="18" cy="6" r="2.5" /><path d="M8.5 16.5L15.5 8" /></svg>),
  pin: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s7-6.1 7-11a7 7 0 10-14 0c0 4.9 7 11 7 11z" /><circle cx="12" cy="10" r="2.4" /></svg>),
  users: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3" /><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6" /><circle cx="17" cy="8" r="2.5" /><path d="M17 14c2.8 0 5 2 5 5" /></svg>),
  pulse: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h4l2-7 4 14 2-7h6" /></svg>),
  trend: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l5-5 4 4 8-9" /><path d="M15 7h5v5" /></svg>),
  bolt: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L4 14h7l-1 8 10-13h-7l1-7z" /></svg>),
  flask: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3h6M10 3v6l-6 10a1.5 1.5 0 001.3 2.2h13.4A1.5 1.5 0 0020 19L14 9V3" /></svg>),
  building: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 21V6l8-4 8 4v15" /><path d="M9 21v-6h6v6M9 10h.01M15 10h.01M9 14h.01M15 14h.01" /></svg>),
  clipboard: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="12" height="17" rx="2" /><path d="M9 4V3a1 1 0 011-1h4a1 1 0 011 1v1M9 11h6M9 15h6" /></svg>),
  github: (<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49 0-.24-.01-.87-.01-1.71-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.63.07-.63 1 .07 1.53 1.05 1.53 1.05.9 1.57 2.34 1.12 2.91.86.09-.66.35-1.12.64-1.38-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.32.1-2.75 0 0 .84-.28 2.75 1.05a9.3 9.3 0 015 0c1.9-1.33 2.75-1.05 2.75-1.05.55 1.43.2 2.49.1 2.75.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.79-4.57 5.05.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.6.69.49A10.26 10.26 0 0022 12.25C22 6.58 17.52 2 12 2z" /></svg>),
  arrow: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>),
  menu: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg>),
  close: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>),
}

function RevealBlock({ className = '', children, style, onVisible }) {
  const [ref, visible] = useReveal()
  useEffect(() => { if (visible && onVisible) onVisible() }, [visible])
  return (
    <div ref={ref} className={`${className} ${visible ? 'is-visible' : ''}`} style={style}>
      {children}
    </div>
  )
}

const steps = [
  { n: '01', title: 'Records sync from the source', desc: 'Trial data streams from the ClinicalTrials.gov registry directly into a normalized PostgreSQL warehouse, no manual exports.' },
  { n: '02', title: 'SQL does the heavy lifting', desc: 'Twenty-plus aggregation queries compute efficacy, safety signals, enrollment velocity, and site performance the moment you load the page.' },
  { n: '03', title: 'A trained model scores outcomes', desc: 'A Random Forest classifier, validated with cross-validation and a held-out test set, estimates the probability a trial profile succeeds.' },
  { n: '04', title: "Ask, don't query", desc: "Type a question in plain English. It's turned into a guarded, read-only SQL statement and answered against the live warehouse." },
]

const whyCards = [
  { icon: 'bolt', title: 'Nothing is pre-baked', desc: 'Every number on the dashboard, every chart, every KPI, is computed against the database at request time.' },
  { icon: 'target', title: 'A real model, not a guess', desc: 'Outcome predictions come from a classifier trained on patient-level data, evaluated with accuracy, ROC-AUC, and cross-validation.' },
  { icon: 'cpu', title: 'Plain English in, safe SQL out', desc: 'Natural-language questions are converted to SQL and checked against a denylist before they ever reach the database.' },
  { icon: 'shield', title: 'Read-only by design', desc: "Every generated query is restricted to SELECT statements, there's no path from a question to a write." },
]

const features = [
  { icon: 'chart', title: 'Analytics dashboard', desc: 'Efficacy, safety, phase, and enrollment trends across every synced trial.' },
  { icon: 'search', title: 'Trial finder', desc: 'Match trials to a patient profile by age group and condition keyword.' },
  { icon: 'cpu', title: 'Outcome prediction', desc: 'A trained classifier estimates success probability from trial and patient variables.' },
  { icon: 'document', title: 'Natural language query', desc: 'Ask a question in English, get back a table, the SQL is generated and guarded automatically.' },
  { icon: 'pin', title: 'Site performance', desc: 'Rank sites by average outcome quality and patient volume handled.' },
  { icon: 'users', title: 'Demographic breakdowns', desc: 'Age, gender, and outcome cross-sections computed on demand.' },
  { icon: 'shield', title: 'Automated risk scoring', desc: 'A weighted rule engine flags trials on safety rate, efficacy, and status.' },
  { icon: 'compare', title: 'Trial similarity', desc: 'Surface comparable trials by phase and outcome proximity.' },
  { icon: 'trend', title: 'Enrollment forecasting', desc: 'Projects time-to-target from the historical monthly enrollment rate.' },
  { icon: 'pulse', title: 'Anomaly detection', desc: 'Flags statistically unusual efficacy using z-score analysis against the trial population.' },
  { icon: 'document', title: 'PDF & CSV export', desc: 'Filtered or full trial data, exported as a presentation-ready report.' },
  { icon: 'database', title: 'On-demand sync', desc: 'Pull the newest matching trials from ClinicalTrials.gov into the warehouse in one click.' },
]

const stats = [
  { key: 'trials', label: 'Trials synced', value: 400, suffix: '+' },
  { key: 'sites', label: 'Sites tracked', value: 2000, suffix: '+' },
  { key: 'patients', label: 'Patient records', value: 3000, suffix: '+' },
  { key: 'auc', label: 'Model ROC-AUC', value: 95, suffix: '%' },
]

const footerLinks = {
  Product: [
    { label: 'How it works', href: '#how' },
    { label: 'Features', href: '#features' },
    
  ],
  Resources: [
    { label: 'Data source, ClinicalTrials.gov', href: 'https://clinicaltrials.gov' },
  ],
}

function LandingPage() {
  const navigate = useNavigate()
  const scrolled = useScrolled()
  const [heroLoaded, setHeroLoaded] = useState(prefersReducedMotion())
  const [menuOpen, setMenuOpen] = useState(false)
  const [statsActive, setStatsActive] = useState(false)

  useEffect(() => {
    if (prefersReducedMotion()) return
    const id = requestAnimationFrame(() => setHeroLoaded(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const goDashboard = () => { setMenuOpen(false); navigate('/dashboard') }

  return (
    <div className="lp-root">
      <header className={`lp-nav ${scrolled ? 'lp-nav--scrolled' : ''}`}>
        <div className="lp-nav__brand">Pharma<span>Trace</span></div>
        <nav className="lp-nav__links" aria-label="Primary">
          <a href="#how"><span>How it works</span></a>
          <a href="#features"><span>Features</span></a>
        </nav>
        <button className="lp-btn lp-btn--primary lp-btn--sm lp-nav__cta" onClick={goDashboard}>
          Enter dashboard
        </button>
        <button className="lp-nav__burger" aria-label="Toggle menu" onClick={() => setMenuOpen((v) => !v)}>
          {menuOpen ? icons.close : icons.menu}
        </button>
      </header>

      <div className={`lp-mobile-menu ${menuOpen ? 'is-open' : ''}`}>
        <a href="#how" onClick={() => setMenuOpen(false)}>How it works</a>
        <a href="#features" onClick={() => setMenuOpen(false)}>Features</a>
        <button className="lp-btn lp-btn--primary" onClick={goDashboard}>Enter dashboard</button>
      </div>

      <main>
        <section className={`lp-hero ${heroLoaded ? 'is-loaded' : ''}`}>
          <div className="lp-hero__bg" aria-hidden="true">
            <div className="lp-grid-pattern" />
            <span className="lp-orb lp-orb--a" />
            <span className="lp-orb lp-orb--b" />
          </div>

          <div className="lp-hero__inner">
            <div className="lp-hero__copy">
              <span className="lp-badge lp-hero__in lp-hero__in--1">
                <span className="lp-badge__dot" />
                Real-time data &middot; predictive scoring &middot; AI-powered search
              </span>
              <h1 className="lp-hero__title lp-hero__in lp-hero__in--2">
                Clinical trial data,<br />read in seconds<span className="lp-hero__accent">.</span>
              </h1>
              <p className="lp-hero__desc lp-hero__in lp-hero__in--3">
                PharmaTrace pulls trial records straight from ClinicalTrials.gov into a live
                warehouse, then scores risk, predicts outcomes, and answers plain-English
                questions, every number computed on the fly, nothing pre-baked.
              </p>
              <div className="lp-hero__actions lp-hero__in lp-hero__in--4">
                <button className="lp-btn lp-btn--primary lp-btn--shine" onClick={goDashboard}>
                  Enter dashboard {icons.arrow}
                </button>
                <a className="lp-btn lp-btn--ghost" href="#how">See how it works</a>
              </div>
            </div>

            <div className="lp-hero__in lp-hero__in--4 lp-preview">
              <div className="lp-preview__frame">
                <div className="lp-preview__bar">
                  <span /><span /><span />
                  <span className="lp-preview__url">pharmatrace.app/dashboard</span>
                </div>
                <div className="lp-preview__body">
                  <div className="lp-preview__row">
                    <div className="lp-preview__card">
                      <span className="lp-preview__kpi-label">Total trials</span>
                      <span className="lp-preview__kpi-value">400</span>
                    </div>
                    <div className="lp-preview__card">
                      <span className="lp-preview__kpi-label">Avg efficacy</span>
                      <span className="lp-preview__kpi-value lp-preview__kpi-value--green">60.0</span>
                    </div>
                  </div>
                  <div className="lp-preview__chart">
                    {[62, 88, 54, 71, 96, 48, 80, 66, 90, 58].map((h, i) => (
                      <span key={i} style={{ height: `${h}%`, animationDelay: `${i * 0.06}s` }} />
                    ))}
                  </div>
                  <div className="lp-preview__lines">
                    <span className="lp-preview__line" style={{ width: '86%' }} />
                    <span className="lp-preview__line" style={{ width: '64%' }} />
                    <span className="lp-preview__line" style={{ width: '74%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <RevealBlock className="lp-stats" onVisible={() => setStatsActive(true)}>
          {stats.map((s) => {
            const val = useCountUp(s.value, statsActive)
            return (
              <div className="lp-stats__item" key={s.key}>
                <span className="lp-stats__value">{val.toLocaleString()}{s.suffix}</span>
                <span className="lp-stats__label">{s.label}</span>
              </div>
            )
          })}
        </RevealBlock>

        <section className="lp-section" id="how">
          <p className="lp-eyebrow lp-eyebrow--center">How it works</p>
          <h2 className="lp-section__title">From raw trial data to a decision in four steps.</h2>
          <div className="lp-steps">
            {steps.map((s, i) => (
              <RevealBlock className="lp-step" key={s.n} style={{ transitionDelay: `${i * 90}ms` }}>
                <span className="lp-step__n">{s.n}</span>
                <h3 className="lp-step__title">{s.title}</h3>
                <p className="lp-step__desc">{s.desc}</p>
              </RevealBlock>
            ))}
          </div>
        </section>

        <section className="lp-section lp-section--muted">
          <p className="lp-eyebrow lp-eyebrow--center">Why PharmaTrace</p>
          <h2 className="lp-section__title">Every number is computed live, never cached.</h2>
          <div className="lp-why-grid">
            {whyCards.map((c, i) => (
              <RevealBlock className="lp-why" key={c.title} style={{ transitionDelay: `${i * 80}ms` }}>
                <span className="lp-why__icon">{icons[c.icon]}</span>
                <h3 className="lp-why__title">{c.title}</h3>
                <p className="lp-why__desc">{c.desc}</p>
              </RevealBlock>
            ))}
          </div>
        </section>

        <section className="lp-section" id="features">
          <p className="lp-eyebrow lp-eyebrow--center">Key features</p>
          <h2 className="lp-section__title">Everything you need in one dashboard.</h2>
          <div className="lp-feature-grid">
            {features.map((f, i) => (
              <RevealBlock className="lp-feature" key={f.title} style={{ transitionDelay: `${(i % 4) * 70}ms` }}>
                <span className="lp-feature__icon">{icons[f.icon]}</span>
                <h3 className="lp-feature__title">{f.title}</h3>
                <p className="lp-feature__desc">{f.desc}</p>
              </RevealBlock>
            ))}
          </div>
        </section>

        <section className="lp-cta">
          <div className="lp-cta__glow" aria-hidden="true" />
          <h2>Open the warehouse.</h2>
          <p>Every chart, score, and prediction is computed live, no signup, no sample data.</p>
          <button className="lp-btn lp-btn--primary lp-btn--shine" onClick={goDashboard}>
            Enter dashboard {icons.arrow}
          </button>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-footer__top">
          <div className="lp-footer__brand">
            <div className="lp-nav__brand">Pharma<span>Trace</span></div>
            <p>
              A modern analytics platform for clinical trial data, built to
              surface risk, outcomes, and enrollment insights in real time.
            </p>
            <a className="lp-footer__icon-btn" href="https://github.com/deepikagupta8050/PharmaTrace" target="_blank" rel="noreferrer" aria-label="View source on GitHub">
              {icons.github}
            </a>
          </div>

          {Object.entries(footerLinks).map(([group, links]) => (
            <div className="lp-footer__col" key={group}>
              <h4>{group}</h4>
              <ul>
                {links.map((l) => (
                  <li key={l.label}>
                    {l.action === 'dashboard' ? (
                      <button className="lp-footer__link-btn" onClick={goDashboard}>{l.label}</button>
                    ) : (
                      <a href={l.href} target={l.href?.startsWith('http') ? '_blank' : undefined} rel="noreferrer">{l.label}</a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="lp-footer__bottom">
          <span>&copy; {new Date().getFullYear()} PharmaTrace. All rights reserved. For research and informational use only.</span>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage