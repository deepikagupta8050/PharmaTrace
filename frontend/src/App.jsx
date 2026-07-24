import { useState, useEffect, useMemo, useRef } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, ScatterChart, Scatter
} from 'recharts'
import axios from 'axios'
import './App.css'

const API_BASE = import.meta.env.VITE_API_URL;
const colors = { teal: '#FF6600', slate: '#00E676', coral: '#FF5722', grid: '#26302C', text: '#8FA098' }
const PIE_COLORS = ['#FF6600', '#00E676', '#8FA098', '#FF5722']
const ROWS_PER_PAGE = 15
const tooltipStyle = { background: '#161B18', border: '1px solid #26302C', color: '#fff', borderRadius: 8, fontSize: 12 }
const selectStyle = {
  background: '#161B18', border: '1px solid #26302C', color: '#fff',
  fontSize: 13, padding: '10px 12px', borderRadius: 8
}

const Icon = {
  dashboard: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>,
  efficacy: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/></svg>,
  safety: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3z"/></svg>,
  sites: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  demographics: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="8" r="3"/><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6"/><circle cx="17" cy="8" r="2.5"/><path d="M17 14c2.8 0 5 2 5 5"/></svg>,
  explorer: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>,
  advisor: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h7l-1 8 11-13h-7l1-7z"/></svg>,
  finder: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 2a7 7 0 100 14A7 7 0 009 2z"/><path d="M14 14l6 6"/></svg>,
  ml: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8"/></svg>,
}

const NAV_ITEMS = [
  { key: 'efficacy', label: 'Efficacy Analysis', icon: Icon.efficacy },
  { key: 'safety', label: 'Safety Monitoring', icon: Icon.safety },
  { key: 'sites', label: 'Site Performance', icon: Icon.sites },
  { key: 'demographics', label: 'Demographics', icon: Icon.demographics },
  { key: 'advisor', label: 'Trial Advisor', icon: Icon.advisor },
  { key: 'finder', label: 'Patient Matching', icon: Icon.finder },
  { key: 'ml', label: 'Predictive Analytics', icon: Icon.ml },
  { key: 'explorer', label: 'Data Explorer', icon: Icon.explorer },
]

const EMPTY_DATA = {
  summary: {}, trials: [], demographics: [], statusFunnel: [], phaseDist: [],
  locations: [], enrollment: [], drugs: [], sideEffects: [], ageGroups: [],
  dosage: [], duration: [], sites: [], allTrials: [], insights: {}, alerts: [],
  competitive: [], anomalies: {},
}

function App() {
  const [data, setData] = useState(EMPTY_DATA)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState('avg_efficacy')
  const [sortDir, setSortDir] = useState('desc')
  const [page, setPage] = useState(1)
  const [activeSection, setActiveSection] = useState('efficacy')
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const [syncCondition, setSyncCondition] = useState('')
  const [finderAge, setFinderAge] = useState('')
  const [finderKeyword, setFinderKeyword] = useState('')
  const [finderResults, setFinderResults] = useState(null)
  const [similarityInput, setSimilarityInput] = useState('')
  const [similarityResults, setSimilarityResults] = useState(null)
  const [nlQuestion, setNlQuestion] = useState('')
  const [nlResults, setNlResults] = useState(null)
  const [mlAge, setMlAge] = useState('')
  const [mlDosage, setMlDosage] = useState('')
  const [mlPrediction, setMlPrediction] = useState(null)
  const [mlGender, setMlGender] = useState("Male")
  const [mlPhase, setMlPhase] = useState("PHASE2")
  const [mlCountry, setMlCountry] = useState("")
  const [toolbarOpen, setToolbarOpen] = useState(false)

  const refs = {
    dashboard: useRef(null),
    efficacy: useRef(null),
    safety: useRef(null),
    sites: useRef(null),
    demographics: useRef(null),
    advisor: useRef(null),
    explorer: useRef(null),
    finder: useRef(null),
    ml: useRef(null),
  }

  const loadAllData = () => {
    const endpoints = {
      summary: 'summary-stats',
      trials: 'success-rate-by-condition',
      demographics: 'demographics',
      statusFunnel: 'status-funnel',
      phaseDist: 'phase-distribution',
      locations: 'top-locations',
      enrollment: 'enrollment-trend',
      drugs: 'drug-leaderboard',
      sideEffects: 'side-effect-rate',
      ageGroups: 'age-group-efficacy',
      dosage: 'dosage-vs-efficacy',
      duration: 'trial-duration',
      sites: 'site-performance',
      allTrials: 'all-trials',
      insights: 'insights',
      alerts: 'alerts',
    }
    const requests = Object.entries(endpoints).map(([key, path]) =>
      axios.get(`${API_BASE}/api/analytics/${path}`).then(res => [key, res.data])
    )
    const advisorEndpoints = {
      riskScore: 'risk-score',
      siteSelection: 'site-selection?condition=diabetes',
      forecast: 'forecast?target_patients=200',
      competitive: 'competitive-landscape?condition=cancer',
      anomalies: 'anomalies',
    }
    const advisorRequests = Object.entries(advisorEndpoints).map(([key, path]) =>
      axios.get(`${API_BASE}/api/advisor/${path}`).then(res => [key, res.data])
    )

    setLoadError('')
    return Promise.all([...requests, ...advisorRequests]).then(results => {
      const newData = { ...EMPTY_DATA, ...Object.fromEntries(results) }
      newData.trials = (newData.trials || []).slice(0, 8)
      setData(newData)
      setLoading(false)
    }).catch(err => {
      console.error(err)
      setLoadError('Could not load dashboard data. Please check that the backend server is running and try again.')
      setLoading(false)
    })
  }

  useEffect(() => {
    loadAllData()
  }, [])

  const filteredTrials = useMemo(() => {
    if (!data.allTrials) return []
    let rows = data.allTrials
    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter(t => t.trial_name?.toLowerCase().includes(q) || t.drug_name?.toLowerCase().includes(q))
    }
    rows = [...rows].sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey]
      if (av == null) av = sortDir === 'asc' ? Infinity : -Infinity
      if (bv == null) bv = sortDir === 'asc' ? Infinity : -Infinity
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      return sortDir === 'asc' ? av - bv : bv - av
    })
    return rows
  }, [data.allTrials, search, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filteredTrials.length / ROWS_PER_PAGE))
  const pageRows = filteredTrials.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE)

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
    setPage(1)
  }

  const exportCSV = () => {
    const rows = filteredTrials
    if (!rows.length) return
    const headers = Object.keys(rows[0])
    const escapeCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => escapeCell(r[h])).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'pharmatrace-trials-export.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const runSync = async () => {
    setSyncing(true)
    setSyncMsg('')
    try {
      const res = await axios.post(`${API_BASE}/api/sync/trials?condition=${encodeURIComponent(syncCondition)}`)
      setSyncMsg(`Synced "${res.data.synced_condition}" — ${res.data.new_trials_added} new trials added`)
      await loadAllData()
    } catch (e) {
      setSyncMsg('Sync failed')
    }
    setSyncing(false)
  }

  const runFinder = async () => {
    if (!finderAge || finderAge < 0 || finderAge > 120) {
      setFinderResults({ age_group: '-', matches: [], error: 'Please enter a valid age between 0 and 120.' })
      return
    }
    try {
      const res = await axios.get(`${API_BASE}/api/finder/match`, {
        params: { age: finderAge, keyword: finderKeyword }
      })
      setFinderResults(res.data)
    } catch (e) {
      setFinderResults({ age_group: '-', matches: [], error: e.response?.data?.detail || 'Failed to find matching trials.' })
    }
  }

  const runSimilarity = async () => {
    if (!similarityInput.trim()) return
    try {
      const res = await axios.get(`${API_BASE}/api/advisor/similar-trials`, {
        params: { trial_name: similarityInput }
      })
      setSimilarityResults(res.data)
    } catch (e) {
      setSimilarityResults({ error: e.response?.data?.detail || 'Failed to find similar trials.' })
    }
  }

  const runNlQuery = async () => {
    if (!nlQuestion.trim()) return
    try {
      const res = await axios.get(`${API_BASE}/api/nlquery/ask`, { params: { question: nlQuestion } })
      setNlResults(res.data)
    } catch (e) {
      setNlResults({ error: e.response?.data?.detail || 'Failed to process your question.' })
    }
  }

  const runMlPredict = async () => {
    if (!mlAge || !mlDosage || !mlGender || !mlPhase || !mlCountry) return
    try {
      const res = await axios.get(`${API_BASE}/api/ml/predict-efficacy`, {
        params: { age: mlAge, gender: mlGender, dosage_mg: mlDosage, phase: mlPhase, country: mlCountry }
      })
      setMlPrediction(res.data)
    } catch (e) {
      setMlPrediction({ error: e.response?.data?.detail || 'Prediction failed. Please check your inputs.' })
    }
  }

  const goTo = (key) => {
    setActiveSection(key)
    setToolbarOpen(false)
    refs[key]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (loading) {
    return (
      <div className="boot-screen">
        <div className="boot-mark">Pharma<span>Trace</span></div>
        <div className="boot-status">Loading dashboard data…</div>
      </div>
    )
  }

  const totalPatients = (data.demographics || []).reduce((s, d) => s + (parseInt(d.total) || 0), 0)
  const topTrials = data.trials || []
  const avgEfficacyTop8 = topTrials.length
    ? (topTrials.reduce((s, t) => s + (parseFloat(t.avg_efficacy) || 0), 0) / topTrials.length).toFixed(1)
    : '—'
  const sortArrow = (key) => sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''

  return (
    <div className="app-shell">
      <header className="masthead">
        <div className="masthead-row">
          <div className="logo">Pharma<span>Trace</span></div>

          <button className="toolbar-toggle" onClick={() => setToolbarOpen(o => !o)} aria-label="Toggle actions">
            {Icon.explorer}
            <span>Actions</span>
          </button>

          <div className={`masthead-actions ${toolbarOpen ? 'open' : ''}`}>
            {syncMsg && <span className="sync-msg">{syncMsg}</span>}
            <input
              type="text"
              className="condition-input"
              value={syncCondition}
              onChange={(e) => setSyncCondition(e.target.value)}
              placeholder="condition (e.g. diabetes)"
            />
            <button className="btn btn-ghost" onClick={runSync} disabled={syncing}>
              {syncing ? 'Syncing…' : 'Sync Latest Data'}
            </button>
            <button className="btn btn-ghost" onClick={() => window.open(`${API_BASE}/api/reports/summary-pdf?search=${encodeURIComponent(search)}&report_type=all`, '_blank')}>All Trials Report</button>
            <button className="btn btn-ghost" onClick={() => window.open(`${API_BASE}/api/reports/summary-pdf?search=${encodeURIComponent(search)}&report_type=top`, '_blank')}>Top Trials Report</button>
          </div>
        </div>

        <nav className="tab-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.key}
              className={`tab-item ${activeSection === item.key ? 'active' : ''}`}
              onClick={() => goTo(item.key)}
            >
              <span className="tab-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="content-inner">
        {loadError && (
          <div className="error-banner">
            <span>{loadError}</span>
            <button className="btn btn-ghost" onClick={() => { setLoading(true); loadAllData() }}>Retry</button>
          </div>
        )}

        <div ref={refs.dashboard} className="bento-grid section-anchor">
          <div className="stat-card"><div className="label">Total Trials</div><div className="value">{data.summary?.total_trials?.toLocaleString() ?? '—'}</div></div>
          <div className="stat-card"><div className="label">Trial Sites</div><div className="value">{data.summary?.total_sites?.toLocaleString() ?? '—'}</div></div>
          <div className="stat-card"><div className="label">Patients Tracked</div><div className="value">{totalPatients.toLocaleString()}</div></div>
          <div className="stat-card"><div className="label">Avg Efficacy (Top 8)</div><div className="value">{avgEfficacyTop8}</div></div>
        </div>

        <div className="bento-grid">
          <div className="panel span-8">
            <h2>Key Insights</h2>
            <div className="sub">Auto-generated from live SQL aggregates</div>
            {data.insights?.insights?.map((text, i) => (
              <div key={i} className="insight-item"><span className="insight-dot">●</span>{text}</div>
            ))}
          </div>
          <div className="panel span-4">
            <h2>Attention Needed</h2>
            <div className="sub">Trials flagged for safety or efficacy review</div>
            {data.alerts?.length ? data.alerts.map((a, i) => (
              <div key={i} className="alert-item">
                <span className="name">{a.trial_name.slice(0, 30)}{a.trial_name.length > 30 ? '…' : ''}</span>
                <span className="metric">{a.side_effect_pct}% SE</span>
              </div>
            )) : <div className="sub">No flagged trials.</div>}
          </div>
        </div>

        <div ref={refs.efficacy} className="bento-grid section-anchor">
          <div className="panel span-8">
            <h2>Top Trials by Average Efficacy</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.trials} margin={{ bottom: 70 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                <XAxis dataKey="trial_name" angle={-40} textAnchor="end" interval={0} tick={{ fontSize: 10, fill: colors.text }} height={90} />
                <YAxis tick={{ fontSize: 11, fill: colors.text }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="avg_efficacy" fill={colors.teal} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="panel span-4">
            <h2>Patient Gender Split</h2>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={data.demographics} dataKey="total" nameKey="gender" cx="50%" cy="50%" outerRadius={75} label={(e) => e.gender}>
                  {data.demographics.map((entry, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bento-grid">
          <div className="panel span-4">
            <h2>Trial Status</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.statusFunnel} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                <XAxis type="number" tick={{ fontSize: 10, fill: colors.text }} />
                <YAxis type="category" dataKey="status" tick={{ fontSize: 9, fill: colors.text }} width={100} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill={colors.slate} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="panel span-4">
            <h2>Phase Distribution</h2>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={data.phaseDist} dataKey="count" nameKey="phase" cx="50%" cy="50%" innerRadius={40} outerRadius={70} label={(e) => e.phase}>
                  {data.phaseDist.map((entry, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div ref={refs.demographics} className="panel span-4 section-anchor">
            <h2>Efficacy by Age</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.ageGroups}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                <XAxis dataKey="age_group" tick={{ fontSize: 10, fill: colors.text }} />
                <YAxis tick={{ fontSize: 10, fill: colors.text }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="avg_efficacy" fill={colors.teal} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div ref={refs.sites} className="bento-grid section-anchor">
          <div className="panel span-6">
            <h2>Top 10 Site Locations</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.locations} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                <XAxis type="number" tick={{ fontSize: 11, fill: colors.text }} />
                <YAxis type="category" dataKey="city" tick={{ fontSize: 10, fill: colors.text }} width={80} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="site_count" fill={colors.teal} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="panel span-6">
            <h2>Enrollment Trend</h2>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data.enrollment}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: colors.text }} />
                <YAxis tick={{ fontSize: 11, fill: colors.text }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="enrollments" stroke={colors.teal} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bento-grid">
          <div className="panel span-6">
            <h2>Most Researched Drugs</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.drugs} margin={{ bottom: 70 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                <XAxis dataKey="drug_name" angle={-40} textAnchor="end" interval={0} tick={{ fontSize: 9, fill: colors.text }} height={90} />
                <YAxis tick={{ fontSize: 11, fill: colors.text }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="trial_count" fill={colors.coral} radius={[4, 4, 0, 0]}
                  onClick={(d) => { setSearch(d.drug_name); setPage(1); refs.explorer.current?.scrollIntoView({ behavior: 'smooth' }) }}
                  style={{ cursor: 'pointer' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div ref={refs.safety} className="panel span-6 section-anchor">
            <h2>Side Effect Rate</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.sideEffects} margin={{ bottom: 70 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                <XAxis dataKey="trial_name" angle={-40} textAnchor="end" interval={0} tick={{ fontSize: 9, fill: colors.text }} height={90} />
                <YAxis tick={{ fontSize: 11, fill: colors.text }} unit="%" />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="side_effect_pct" fill={colors.slate} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bento-grid">
          <div className="panel span-6">
            <h2>Avg Trial Duration by Phase (Days)</h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.duration}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                <XAxis dataKey="phase" tick={{ fontSize: 11, fill: colors.text }} />
                <YAxis tick={{ fontSize: 11, fill: colors.text }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="avg_duration_days" fill={colors.coral} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="panel span-6">
            <h2>Dosage vs Efficacy Correlation</h2>
            <div className="sub">Each point = one patient's dosage vs outcome score</div>
            <ResponsiveContainer width="100%" height={200}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                <XAxis type="number" dataKey="dosage_mg" name="Dosage (mg)" tick={{ fontSize: 11, fill: colors.text }} />
                <YAxis type="number" dataKey="efficacy_score" name="Efficacy" tick={{ fontSize: 11, fill: colors.text }} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={tooltipStyle} />
                <Scatter data={data.dosage} fill={colors.teal} opacity={0.6} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bento-grid">
          <div className="panel span-12">
            <h2>Top Performing Sites</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.sites} margin={{ bottom: 90 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                <XAxis dataKey="site_name" angle={-40} textAnchor="end" interval={0} tick={{ fontSize: 9, fill: colors.text }} height={100} />
                <YAxis tick={{ fontSize: 11, fill: colors.text }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="avg_efficacy" fill={colors.teal} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div ref={refs.advisor} className="bento-grid section-anchor">
          <div className="panel span-6">
            <h2>Trial Risk Score</h2>
            <div className="sub">Auto-scored on safety, efficacy, and status signals</div>
            {data.riskScore?.slice(0, 6).map((r, i) => (
              <div key={i} className="alert-item" style={{
                background: r.risk_level === 'High' ? '#241610' : r.risk_level === 'Medium' ? '#221E10' : '#0F1F17',
                borderColor: r.risk_level === 'High' ? '#3E241A' : r.risk_level === 'Medium' ? '#3E3618' : '#1A3E2C'
              }}>
                <span className="name">{r.trial_name.slice(0, 32)}{r.trial_name.length > 32 ? '…' : ''}</span>
                <span className="metric" style={{ color: r.risk_level === 'High' ? '#FF6600' : r.risk_level === 'Medium' ? '#E8B84B' : '#00E676' }}>
                  {r.risk_level} ({r.risk_score})
                </span>
              </div>
            ))}
          </div>
          <div className="panel span-6">
            <h2>Enrollment Forecast</h2>
            <div className="sub">Projected time to reach a target patient count</div>
            {data.forecast && (
              <div>
                <div className="stat-card" style={{ marginBottom: 12 }}>
                  <div className="label">Target Patients</div>
                  <div className="value">{data.forecast.target_patients}</div>
                </div>
                <div className="insight-item"><span className="insight-dot">●</span>Average enrollment rate: {data.forecast.avg_monthly_enrollment_rate} patients/month</div>
                <div className="insight-item"><span className="insight-dot">●</span>Estimated time to reach target: {data.forecast.estimated_completion}</div>
              </div>
            )}
          </div>
        </div>

        <div className="bento-grid">
          <div className="panel span-6">
            <h2>Site Selection Advisor</h2>
            <div className="sub">Best-performing sites for Diabetes trials (example query)</div>
            {data.siteSelection?.slice(0, 6).map((s, i) => (
              <div key={i} className="match-card">
                <div className="top">
                  <span className="name">{s.site_name}</span>
                  <span className="score">{s.avg_efficacy}</span>
                </div>
                <div className="meta">{s.city}, {s.country} · {s.patients_handled} patients handled</div>
              </div>
            ))}
          </div>
          <div className="panel span-6">
            <h2>Competitive Landscape</h2>
            <div className="sub">Drugs being researched for Cancer (example query)</div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.competitive?.slice(0, 8)} margin={{ bottom: 70 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                <XAxis dataKey="drug_name" angle={-40} textAnchor="end" interval={0} tick={{ fontSize: 9, fill: colors.text }} height={90} />
                <YAxis tick={{ fontSize: 11, fill: colors.text }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="trial_count" fill={colors.coral} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div ref={refs.finder} className="bento-grid section-anchor">
          <div className="panel span-12">
            <h2>Trial Finder</h2>
            <div className="sub">Find the best-performing trials for a given patient profile</div>
            <div className="finder-form">
              <input type="number" placeholder="Age" value={finderAge} onChange={(e) => setFinderAge(e.target.value)} />
              <input type="text" placeholder="Condition or drug keyword (optional)" value={finderKeyword} onChange={(e) => setFinderKeyword(e.target.value)} className="grow" />
              <button className="btn btn-primary" onClick={runFinder}>Find Matches</button>
            </div>
            {finderResults?.error && <div className="no-results">{finderResults.error}</div>}
            {finderResults && !finderResults.error && (
              <div>
                <div className="sub">Age group: {finderResults.age_group} · {finderResults.matches.length} matches found</div>
                {finderResults.matches.length === 0 ? (
                  <div className="no-results">No matching trials found for this profile.</div>
                ) : finderResults.matches.map((m, i) => (
                  <div key={i} className="match-card">
                    <div className="top">
                      <span className="name">{m.trial_name}</span>
                      <span className="score">{m.avg_efficacy}</span>
                    </div>
                    <div className="meta">{m.drug_name} · {m.phase} · {m.status} · {m.patients_in_group} similar patients</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bento-grid">
          <div className="panel span-6">
            <h2>Trial Similarity Finder</h2>
            <div className="sub">Type an exact trial name to find similar trials</div>
            <div className="finder-form">
              <input type="text" placeholder="Paste exact trial name..." value={similarityInput}
                onChange={(e) => setSimilarityInput(e.target.value)} className="grow" />
              <button className="btn btn-primary" onClick={runSimilarity}>Find Similar</button>
            </div>
            {similarityResults?.error && <div className="no-results">{similarityResults.error}</div>}
            {similarityResults?.matches && (
              <div>
                <div className="sub">Similar to: {similarityResults.target_trial.slice(0, 50)}...</div>
                {similarityResults.matches.map((m, i) => (
                  <div key={i} className="match-card">
                    <div className="top">
                      <span className="name">{m.trial_name.slice(0, 40)}{m.trial_name.length > 40 ? '…' : ''}</span>
                      <span className="score">{m.similarity_score}</span>
                    </div>
                    <div className="meta">{m.drug_name} · Efficacy: {m.avg_efficacy}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="panel span-6">
            <h2>Anomaly Detection</h2>
            <div className="sub">Trials with statistically unusual efficacy (Z-score based)</div>
            {data.anomalies?.anomalies?.map((a, i) => (
              <div key={i} className="alert-item" style={{
                background: a.direction === 'Unusually High' ? '#0F1F17' : '#241610',
                borderColor: a.direction === 'Unusually High' ? '#1A3E2C' : '#3E241A'
              }}>
                <span className="name">{a.trial_name.slice(0, 32)}{a.trial_name.length > 32 ? '…' : ''}</span>
                <span className="metric" style={{ color: a.direction === 'Unusually High' ? '#00E676' : '#FF6600' }}>
                  {a.avg_efficacy} (z={a.z_score})
                </span>
              </div>
            ))}
          </div>
        </div>

        <div ref={refs.ml} className="bento-grid section-anchor">
          <div className="panel span-6">
            <h2>Natural Language Query</h2>
            <div className="sub">Ask in plain English — try "top trials by efficacy" or "diabetes trials"</div>
            <div className="finder-form">
              <input type="text" placeholder="Ask a question..." value={nlQuestion}
                onChange={(e) => setNlQuestion(e.target.value)} className="grow" />
              <button className="btn btn-primary" onClick={runNlQuery}>Ask</button>
            </div>
            {nlResults?.error && <div className="no-results">{nlResults.error}</div>}
            {nlResults && !nlResults.error && (
              <div>
                <div className="sub">Interpreted as: {nlResults.interpreted_as}</div>
                {(nlResults.results || []).length === 0 ? (
                  <div className="no-results">No results — try a different question.</div>
                ) : nlResults.results.map((r, i) => (
                  <div key={i} className="match-card">
                    <div className="top">
                      <span className="name">{r.trial || r.trial_name || `Result ${i + 1}`}</span>
                      <span className="score">{r.efficacy ?? r.avg_efficacy ?? r.side_effect_pct ?? r.total_trials ?? ''}</span>
                    </div>
                    {r.phase && <div className="meta">{r.phase} · {r.status}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="panel span-6">
            <h2>Predictive Trial Success Model</h2>
            <div className="sub">Random Forest classifier trained on age, gender, dosage, phase &amp; country</div>
            <div className="finder-form">
              <input type="number" placeholder="Age" value={mlAge} onChange={(e) => setMlAge(e.target.value)} />
              <select value={mlGender} onChange={(e) => setMlGender(e.target.value)} style={selectStyle}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
              <input type="number" placeholder="Dosage (mg)" value={mlDosage} onChange={(e) => setMlDosage(e.target.value)} />
              <select value={mlPhase} onChange={(e) => setMlPhase(e.target.value)} style={selectStyle}>
                <option value="PHASE1">Phase 1</option>
                <option value="PHASE2">Phase 2</option>
                <option value="PHASE3">Phase 3</option>
                <option value="PHASE4">Phase 4</option>
              </select>
              <input type="text" placeholder="Country" value={mlCountry} onChange={(e) => setMlCountry(e.target.value)} className="grow-sm" />
              <button className="btn btn-primary" onClick={runMlPredict}>Predict</button>
            </div>
            {mlPrediction && !mlPrediction.error && (
              <div className="stat-card" style={{ marginTop: 12 }}>
                <div className="label">Predicted Outcome</div>
                <div className="value">{mlPrediction.prediction}</div>
                <div className="sub" style={{ marginTop: 6 }}>
                  Confidence: {mlPrediction.confidence}% · {mlPrediction.prediction_time_ms}ms
                </div>
              </div>
            )}
            {mlPrediction?.error && <div className="no-results">{mlPrediction.error}</div>}
          </div>
        </div>

        <div ref={refs.explorer} className="bento-grid section-anchor">
          <div className="panel span-12">
            <h2>Explore All Trials</h2>
            <div className="sub">Search, sort by any column, and export as CSV</div>
            <div className="search-bar">
              <input type="text" placeholder="Search trials or drugs..." value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
              <button className="btn btn-primary" onClick={exportCSV}>Export CSV</button>
              <button className="btn btn-primary" onClick={() => window.open(`${API_BASE}/api/reports/summary-pdf?search=${encodeURIComponent(search)}`, '_blank')}>Download PDF</button>
            </div>
            <div className="table-wrap">
              {pageRows.length === 0 ? (
                <div className="no-results">No trials match your search.</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th onClick={() => handleSort('trial_name')}>Trial Name{sortArrow('trial_name')}</th>
                      <th onClick={() => handleSort('drug_name')}>Drug{sortArrow('drug_name')}</th>
                      <th onClick={() => handleSort('phase')}>Phase{sortArrow('phase')}</th>
                      <th onClick={() => handleSort('status')}>Status{sortArrow('status')}</th>
                      <th onClick={() => handleSort('total_patients')}>Patients{sortArrow('total_patients')}</th>
                      <th onClick={() => handleSort('avg_efficacy')}>Avg Efficacy{sortArrow('avg_efficacy')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((t, i) => (
                      <tr key={i}>
                        <td>{t.trial_name}</td><td>{t.drug_name}</td><td>{t.phase}</td>
                        <td>{t.status}</td><td>{t.total_patients}</td><td>{t.avg_efficacy ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="pagination">
              <span>Page {page} of {totalPages} · {filteredTrials.length} trials</span>
              <div>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App