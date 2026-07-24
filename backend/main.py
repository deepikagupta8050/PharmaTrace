from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from starlette.requests import Request
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from database import engine
import requests as http_requests
from datetime import datetime
import os
import io
import time
import json
import secrets
import joblib
from dotenv import load_dotenv
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib import colors as rl_colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

load_dotenv()


app = FastAPI(title="Clinical Trial Analytics API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc)},
    )

last_sync_time = None

@app.get("/")
def home():
    return {"message": "Clinical Trial Analytics API is running"}

@app.get("/api/analytics/summary-stats")
def summary_stats():
    with engine.connect() as conn:
        total_trials = conn.execute(text("SELECT COUNT(*) FROM trials")).scalar()
        total_sites = conn.execute(text("SELECT COUNT(*) FROM sites")).scalar()
    return {"total_trials": total_trials, "total_sites": total_sites, "last_sync": last_sync_time}

@app.get("/api/analytics/success-rate-by-condition")
def success_rate_by_condition():
    query = text("""
        SELECT 
            t.trial_name,
            COUNT(o.outcome_id) AS total_patients,
            ROUND(AVG(o.efficacy_score), 2) AS avg_efficacy,
            SUM(CASE WHEN o.status = 'Success' THEN 1 ELSE 0 END) AS success_count
        FROM trials t
        JOIN patients p ON t.trial_id = p.trial_id
        JOIN outcomes o ON p.patient_id = o.patient_id
        GROUP BY t.trial_name
        ORDER BY avg_efficacy DESC
        LIMIT 20
    """)
    with engine.connect() as conn:
        result = conn.execute(query)
        return [dict(row._mapping) for row in result]


@app.get("/api/analytics/ranked-trials")
def ranked_trials():
    query = text("""
        SELECT trial_name, avg_efficacy,
            RANK() OVER (ORDER BY avg_efficacy DESC) AS trial_rank
        FROM (
            SELECT t.trial_name, ROUND(AVG(o.efficacy_score), 2) AS avg_efficacy
            FROM trials t
            JOIN patients p ON t.trial_id = p.trial_id
            JOIN outcomes o ON p.patient_id = o.patient_id
            GROUP BY t.trial_name
        ) sub
        LIMIT 20
    """)
    with engine.connect() as conn:
        result = conn.execute(query)
        return [dict(row._mapping) for row in result]

@app.get("/api/analytics/demographics")
def demographics():
    query = text("""
        SELECT gender, COUNT(*) AS total, ROUND(AVG(age), 1) AS avg_age
        FROM patients
        GROUP BY gender
    """)
    with engine.connect() as conn:
        result = conn.execute(query)
        return [dict(row._mapping) for row in result]


@app.get("/api/analytics/status-funnel")
def status_funnel():
    query = text("""
        SELECT status, COUNT(*) AS count
        FROM trials
        GROUP BY status
        ORDER BY count DESC
    """)
    with engine.connect() as conn:
        result = conn.execute(query)
        return [dict(row._mapping) for row in result]


@app.get("/api/analytics/phase-distribution")
def phase_distribution():
    query = text("""
        SELECT phase, COUNT(*) AS count
        FROM trials
        GROUP BY phase
        ORDER BY count DESC
    """)
    with engine.connect() as conn:
        result = conn.execute(query)
        return [dict(row._mapping) for row in result]


@app.get("/api/analytics/top-locations")
def top_locations():
    query = text("""
        SELECT city, COUNT(*) AS site_count
        FROM sites
        WHERE city IS NOT NULL
        GROUP BY city
        ORDER BY site_count DESC
        LIMIT 10
    """)
    with engine.connect() as conn:
        result = conn.execute(query)
        return [dict(row._mapping) for row in result]


@app.get("/api/analytics/enrollment-trend")
def enrollment_trend():
    query = text("""
        SELECT DATE_TRUNC('month', enrollment_date)::date AS month, COUNT(*) AS enrollments
        FROM patients
        GROUP BY month
        ORDER BY month
    """)
    with engine.connect() as conn:
        result = conn.execute(query)
        return [dict(row._mapping) for row in result]


@app.get("/api/analytics/drug-leaderboard")
def drug_leaderboard():
    query = text("""
        SELECT drug_name, COUNT(*) AS trial_count
        FROM trials
        WHERE drug_name IS NOT NULL AND drug_name != 'Unknown'
        GROUP BY drug_name
        ORDER BY trial_count DESC
        LIMIT 10
    """)
    with engine.connect() as conn:
        result = conn.execute(query)
        return [dict(row._mapping) for row in result]


@app.get("/api/analytics/side-effect-rate")
def side_effect_rate():
    query = text("""
        SELECT t.trial_name, COUNT(o.outcome_id) AS total_patients,
            ROUND(100.0 * SUM(CASE WHEN o.side_effect_reported THEN 1 ELSE 0 END) / COUNT(o.outcome_id), 1) AS side_effect_pct
        FROM trials t
        JOIN patients p ON t.trial_id = p.trial_id
        JOIN outcomes o ON p.patient_id = o.patient_id
        GROUP BY t.trial_name
        HAVING COUNT(o.outcome_id) >= 3
        ORDER BY side_effect_pct DESC
        LIMIT 10
    """)
    with engine.connect() as conn:
        result = conn.execute(query)
        return [dict(row._mapping) for row in result]


@app.get("/api/analytics/age-group-efficacy")
def age_group_efficacy():
    query = text("""
        SELECT 
            CASE 
                WHEN p.age BETWEEN 18 AND 30 THEN '18-30'
                WHEN p.age BETWEEN 31 AND 50 THEN '31-50'
                WHEN p.age BETWEEN 51 AND 70 THEN '51-70'
                ELSE '70+'
            END AS age_group,
            ROUND(AVG(o.efficacy_score), 2) AS avg_efficacy,
            COUNT(*) AS patient_count
        FROM patients p
        JOIN outcomes o ON p.patient_id = o.patient_id
        WHERE p.age IS NOT NULL
        GROUP BY age_group
        ORDER BY age_group
    """)
    with engine.connect() as conn:
        result = conn.execute(query)
        return [dict(row._mapping) for row in result]


@app.get("/api/analytics/dosage-vs-efficacy")
def dosage_vs_efficacy():
    query = text("""
        SELECT tr.dosage_mg, o.efficacy_score
        FROM treatments tr
        JOIN outcomes o ON tr.patient_id = o.patient_id
        LIMIT 300
    """)
    with engine.connect() as conn:
        result = conn.execute(query)
        return [dict(row._mapping) for row in result]


@app.get("/api/analytics/trial-duration")
def trial_duration():
    query = text("""
        SELECT phase, ROUND(AVG(end_date - start_date)) AS avg_duration_days
        FROM trials
        WHERE start_date IS NOT NULL AND end_date IS NOT NULL AND end_date > start_date
        GROUP BY phase
        ORDER BY avg_duration_days DESC
    """)
    with engine.connect() as conn:
        result = conn.execute(query)
        return [dict(row._mapping) for row in result]

@app.get("/api/analytics/site-performance")
def site_performance():
    query = text("""
        SELECT s.site_name, s.city, COUNT(o.outcome_id) AS patient_count,
            ROUND(AVG(o.efficacy_score), 2) AS avg_efficacy
        FROM sites s
        JOIN patients p ON s.site_id = p.site_id
        JOIN outcomes o ON p.patient_id = o.patient_id
        GROUP BY s.site_name, s.city
        HAVING COUNT(o.outcome_id) >= 2
        ORDER BY avg_efficacy DESC
        LIMIT 10
    """)
    with engine.connect() as conn:
        result = conn.execute(query)
        return [dict(row._mapping) for row in result]

@app.get("/api/analytics/all-trials")
def all_trials():
    query = text("""
        SELECT t.trial_name, t.phase, t.status, t.drug_name,
            COUNT(o.outcome_id) AS total_patients,
            ROUND(AVG(o.efficacy_score), 2) AS avg_efficacy
        FROM trials t
        LEFT JOIN patients p ON t.trial_id = p.trial_id
        LEFT JOIN outcomes o ON p.patient_id = o.patient_id
        GROUP BY t.trial_name, t.phase, t.status, t.drug_name
        ORDER BY avg_efficacy DESC NULLS LAST
    """)
    with engine.connect() as conn:
        result = conn.execute(query)
        return [dict(row._mapping) for row in result]


@app.get("/api/analytics/insights")
def insights():
    results = []
    with engine.connect() as conn:
        avg_all = conn.execute(text("SELECT ROUND(AVG(efficacy_score),2) FROM outcomes")).scalar()

        if avg_all is None:
            return {"insights": ["No trial outcome data available yet. Sync some trials to get started."]}

        top_trial = conn.execute(text("""
            SELECT t.trial_name, ROUND(AVG(o.efficacy_score),2) as avg_eff
            FROM trials t JOIN patients p ON t.trial_id=p.trial_id
            JOIN outcomes o ON p.patient_id=o.patient_id
            GROUP BY t.trial_name HAVING COUNT(*)>=5
            ORDER BY avg_eff DESC LIMIT 1
        """)).fetchone()
        if top_trial:
            results.append(f'"{top_trial[0]}" leads with an average efficacy of {top_trial[1]}, above the platform average of {avg_all}.')

        longest_phase = conn.execute(text("""
            SELECT phase, ROUND(AVG(end_date-start_date)) as d FROM trials
            WHERE start_date IS NOT NULL AND end_date IS NOT NULL AND end_date>start_date
            GROUP BY phase ORDER BY d DESC LIMIT 1
        """)).fetchone()
        if longest_phase:
            results.append(f"{longest_phase[0]} trials run the longest on average, at {int(longest_phase[1])} days.")

        high_se_count = conn.execute(text("""
            SELECT COUNT(*) FROM (
              SELECT p.trial_id, 100.0*SUM(CASE WHEN o.side_effect_reported THEN 1 ELSE 0 END)/COUNT(*) as pct
              FROM patients p JOIN outcomes o ON p.patient_id=o.patient_id
              GROUP BY p.trial_id HAVING COUNT(*)>=3
            ) sub WHERE pct > 80
        """)).scalar()
        results.append(f"{high_se_count} trials report a side-effect rate above 80%, flagged for safety review.")

        best_age = conn.execute(text("""
            SELECT CASE WHEN p.age BETWEEN 18 AND 30 THEN '18-30'
                WHEN p.age BETWEEN 31 AND 50 THEN '31-50'
                WHEN p.age BETWEEN 51 AND 70 THEN '51-70' ELSE '70+' END as grp,
                ROUND(AVG(o.efficacy_score),2) as avg_eff
            FROM patients p JOIN outcomes o ON p.patient_id=o.patient_id
            GROUP BY grp ORDER BY avg_eff DESC LIMIT 1
        """)).fetchone()
        if best_age:
            results.append(f"Patients aged {best_age[0]} show the highest average efficacy at {best_age[1]}.")

    return {"insights": results}


@app.get("/api/analytics/alerts")
def alerts():
    query = text("""
        SELECT t.trial_name,
            ROUND(100.0*SUM(CASE WHEN o.side_effect_reported THEN 1 ELSE 0 END)/COUNT(*),1) as side_effect_pct,
            ROUND(AVG(o.efficacy_score),2) as avg_efficacy,
            COUNT(*) as patient_count
        FROM trials t
        JOIN patients p ON t.trial_id=p.trial_id
        JOIN outcomes o ON p.patient_id=o.patient_id
        GROUP BY t.trial_name
        HAVING COUNT(*) >= 3 AND (
            100.0*SUM(CASE WHEN o.side_effect_reported THEN 1 ELSE 0 END)/COUNT(*) > 85
            OR AVG(o.efficacy_score) < 35
        )
        ORDER BY side_effect_pct DESC
        LIMIT 8
    """)
    with engine.connect() as conn:
        result = conn.execute(query)
        return [dict(row._mapping) for row in result]

@app.get("/api/advisor/risk-score")
def risk_score():
    query = text("""
        SELECT t.trial_name, t.phase, t.status,
            COUNT(o.outcome_id) as patient_count,
            ROUND(AVG(o.efficacy_score), 2) as avg_efficacy,
            ROUND(100.0*SUM(CASE WHEN o.side_effect_reported THEN 1 ELSE 0 END)/COUNT(*), 1) as side_effect_pct
        FROM trials t
        JOIN patients p ON t.trial_id = p.trial_id
        JOIN outcomes o ON p.patient_id = o.patient_id
        GROUP BY t.trial_name, t.phase, t.status
        HAVING COUNT(o.outcome_id) >= 3
    """)
    with engine.connect() as conn:
        rows = [dict(r._mapping) for r in conn.execute(query)]

    for r in rows:
        score = 0
        if r["side_effect_pct"] > 70: score += 40
        elif r["side_effect_pct"] > 40: score += 20
        if r["avg_efficacy"] < 40: score += 35
        elif r["avg_efficacy"] < 60: score += 15
        if r["status"] in ("TERMINATED", "SUSPENDED", "WITHDRAWN"): score += 25
        r["risk_score"] = score
        r["risk_level"] = "High" if score >= 50 else "Medium" if score >= 25 else "Low"

    rows.sort(key=lambda x: x["risk_score"], reverse=True)
    return rows[:15]

@app.get("/api/advisor/site-selection")
def site_selection(condition: str = "", phase: str = ""):
    query = text("""
        SELECT s.site_name, s.city, s.country,
            COUNT(o.outcome_id) as patients_handled,
            ROUND(AVG(o.efficacy_score), 2) as avg_efficacy
        FROM sites s
        JOIN patients p ON s.site_id = p.site_id
        JOIN outcomes o ON p.patient_id = o.patient_id
        JOIN trials t ON p.trial_id = t.trial_id
        WHERE (:condition = '' OR t.trial_name ILIKE :cond)
          AND (:phase = '' OR t.phase = :phase)
        GROUP BY s.site_name, s.city, s.country
        HAVING COUNT(o.outcome_id) >= 1
        ORDER BY avg_efficacy DESC, patients_handled DESC
        LIMIT 10
    """)
    with engine.connect() as conn:
        result = conn.execute(query, {"condition": condition, "cond": f"%{condition}%", "phase": phase})
        return [dict(row._mapping) for row in result]

@app.get("/api/advisor/forecast")
def enrollment_forecast(target_patients: int = 200):
    query = text("""
        SELECT DATE_TRUNC('month', enrollment_date)::date as month, COUNT(*) as enrollments
        FROM patients
        GROUP BY month
        ORDER BY month
    """)
    with engine.connect() as conn:
        rows = [dict(r._mapping) for r in conn.execute(query)]

    if not rows:
        return {"error": "No enrollment data available"}

    avg_monthly_rate = sum(r["enrollments"] for r in rows) / len(rows)
    if avg_monthly_rate <= 0:
        avg_monthly_rate = 1
    months_needed = round(target_patients / avg_monthly_rate, 1)

    return {
        "target_patients": target_patients,
        "avg_monthly_enrollment_rate": round(avg_monthly_rate, 1),
        "estimated_months_to_target": months_needed,
        "estimated_completion": f"~{months_needed} months at current enrollment pace"
    }

@app.get("/api/advisor/competitive-landscape")
def competitive_landscape(condition: str = "diabetes"):
    query = text("""
        SELECT drug_name, phase, status, COUNT(*) as trial_count
        FROM trials
        WHERE trial_name ILIKE :cond AND drug_name IS NOT NULL AND drug_name != 'Unknown'
        GROUP BY drug_name, phase, status
        ORDER BY trial_count DESC
        LIMIT 15
    """)
    with engine.connect() as conn:
        result = conn.execute(query, {"cond": f"%{condition}%"})
        return [dict(row._mapping) for row in result]


@app.get("/api/finder/match")
def match_trials(age: int, keyword: str = ""):
    if age < 0 or age > 120:
        raise HTTPException(status_code=400, detail="Age must be between 0 and 120.")

    age_group = "18-30" if 18 <= age <= 30 else "31-50" if 31 <= age <= 50 else "51-70" if 51 <= age <= 70 else "70+"

    query = text("""
        SELECT t.trial_name, t.drug_name, t.phase, t.status,
            COUNT(o.outcome_id) as patients_in_group,
            ROUND(AVG(o.efficacy_score), 2) as avg_efficacy
        FROM trials t
        JOIN patients p ON t.trial_id = p.trial_id
        JOIN outcomes o ON p.patient_id = o.patient_id
        WHERE (
            CASE WHEN p.age BETWEEN 18 AND 30 THEN '18-30'
                 WHEN p.age BETWEEN 31 AND 50 THEN '31-50'
                 WHEN p.age BETWEEN 51 AND 70 THEN '51-70'
                 ELSE '70+' END
        ) = :age_group
        AND (:keyword = '' OR t.trial_name ILIKE :kw OR t.drug_name ILIKE :kw)
        GROUP BY t.trial_name, t.drug_name, t.phase, t.status
        HAVING COUNT(o.outcome_id) >= 1
        ORDER BY avg_efficacy DESC
        LIMIT 10
    """)
    with engine.connect() as conn:
        result = conn.execute(query, {"age_group": age_group, "keyword": keyword, "kw": f"%{keyword}%"})
        return {"age_group": age_group, "matches": [dict(row._mapping) for row in result]}


def clean_date(d):
    if not d:
        return None
    parts = d.split("-")
    if len(parts) == 1:
        return f"{d}-01-01"
    if len(parts) == 2:
        return f"{d}-01"
    return d

@app.post("/api/sync/trials")
def sync_trials(condition: str = "diabetes"):
    global last_sync_time

    # A blank condition would otherwise be sent through to ClinicalTrials.gov
    # as an unfiltered query.cond='' param, so fall back to the default.
    condition = (condition or "").strip() or "diabetes"

    BASE_URL = "https://clinicaltrials.gov/api/v2/studies"
    try:
        response = http_requests.get(
            BASE_URL, params={"query.cond": condition, "pageSize": 100}, timeout=15
        )
        response.raise_for_status()
    except http_requests.exceptions.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Could not reach ClinicalTrials.gov: {str(e)}")

    try:
        studies = response.json().get("studies", [])
    except ValueError:
        raise HTTPException(status_code=502, detail="ClinicalTrials.gov returned an invalid response.")

    inserted = 0
    skipped = 0
    try:
        with engine.connect() as conn:
            for study in studies:
                protocol = study.get("protocolSection", {})
                identification = protocol.get("identificationModule", {})
                status_module = protocol.get("statusModule", {})
                design_module = protocol.get("designModule", {})
                arms = protocol.get("armsInterventionsModule", {})

                nct_id = identification.get("nctId")
                if not nct_id:
                    skipped += 1
                    continue
                trial_name = identification.get("briefTitle") or f"Untitled Trial ({nct_id})"
                phases = design_module.get("phases", [])
                phase = phases[0] if phases else "Not Applicable"
                interventions = arms.get("interventions", [])
                drug_name = interventions[0].get("name") if interventions else "Unknown"
                status = status_module.get("overallStatus", "Unknown")
                start_date = clean_date(status_module.get("startDateStruct", {}).get("date"))
                end_date = clean_date(status_module.get("completionDateStruct", {}).get("date"))

                result = conn.execute(text("""
                    INSERT INTO trials (nct_id, trial_name, drug_name, phase, status, start_date, end_date)
                    VALUES (:nct_id, :trial_name, :drug_name, :phase, :status, :start_date, :end_date)
                    ON CONFLICT (nct_id) DO NOTHING
                """), {"nct_id": nct_id, "trial_name": trial_name, "drug_name": drug_name,
                       "phase": phase, "status": status, "start_date": start_date, "end_date": end_date})
                if result.rowcount > 0:
                    inserted += 1
            conn.commit()
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=f"Database error during sync: {str(e)}")

    last_sync_time = datetime.now().isoformat()
    return {
        "synced_condition": condition,
        "new_trials_added": inserted,
        "total_fetched": len(studies),
        "skipped": skipped,
        "synced_at": last_sync_time,
    }



@app.get("/api/advisor/similar-trials")
def similar_trials(trial_name: str):
    trial_name = (trial_name or "").strip()
    if not trial_name:
        return {"error": "Please provide a trial name."}

    with engine.connect() as conn:
        target = conn.execute(text("""
            SELECT t.trial_id, t.phase, ROUND(AVG(o.efficacy_score),2) as avg_eff
            FROM trials t
            JOIN patients p ON t.trial_id = p.trial_id
            JOIN outcomes o ON p.patient_id = o.patient_id
            WHERE t.trial_name = :name
            GROUP BY t.trial_id, t.phase
            ORDER BY t.trial_id
            LIMIT 1
        """), {"name": trial_name}).fetchone()

        if not target:
            return {"error": "Trial not found or has no outcome data. Please check the exact trial name and try again."}

        target_phase, target_eff = target[1], float(target[2])

        query = text("""
            SELECT t.trial_name, t.phase, t.drug_name,
                ROUND(AVG(o.efficacy_score),2) as avg_efficacy,
                COUNT(*) as patient_count
            FROM trials t
            JOIN patients p ON t.trial_id = p.trial_id
            JOIN outcomes o ON p.patient_id = o.patient_id
            WHERE t.phase = :phase AND t.trial_name != :name
            GROUP BY t.trial_name, t.phase, t.drug_name
            HAVING COUNT(*) >= 2
        """)
        rows = [dict(r._mapping) for r in conn.execute(query, {"phase": target_phase, "name": trial_name})]

        for r in rows:
            r["similarity_score"] = round(100 - abs(float(r["avg_efficacy"]) - target_eff), 1)

        rows.sort(key=lambda x: x["similarity_score"], reverse=True)
        return {"target_trial": trial_name, "target_phase": target_phase, "matches": rows[:6]}



@app.get("/api/advisor/anomalies")
def detect_anomalies():
    with engine.connect() as conn:
        rows = [dict(r._mapping) for r in conn.execute(text("""
            SELECT t.trial_name, ROUND(AVG(o.efficacy_score),2) as avg_efficacy, COUNT(*) as patient_count
            FROM trials t
            JOIN patients p ON t.trial_id = p.trial_id
            JOIN outcomes o ON p.patient_id = o.patient_id
            GROUP BY t.trial_name
            HAVING COUNT(*) >= 3
        """))]

        if not rows:
            return {"anomalies": [], "mean": 0, "std_dev": 0}

        values = [float(r["avg_efficacy"]) for r in rows]
        mean = sum(values) / len(values)
        variance = sum((v - mean) ** 2 for v in values) / len(values)
        std_dev = variance ** 0.5

        anomalies = []
        for r in rows:
            z_score = (float(r["avg_efficacy"]) - mean) / std_dev if std_dev > 0 else 0
            if abs(z_score) > 1.5:
                r["z_score"] = round(z_score, 2)
                r["direction"] = "Unusually High" if z_score > 0 else "Unusually Low"
                anomalies.append(r)

        anomalies.sort(key=lambda x: abs(x["z_score"]), reverse=True)
        return {"anomalies": anomalies[:8], "mean": round(mean, 2), "std_dev": round(std_dev, 2)}




@app.get("/api/reports/summary-pdf")
def generate_pdf_report(search: str = "", report_type: str = "all"):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch)
    styles = getSampleStyleSheet()
    elements = []

    title_style = ParagraphStyle('Title', parent=styles['Title'], textColor=rl_colors.HexColor('#0F6B5C'))
    elements.append(Paragraph("PharmaTrace — Clinical Trial Report", title_style))
    elements.append(Spacer(1, 0.1*inch))
    report_label = "Top 20 Trials by Efficacy" if report_type == "top" else "All Trials"
    subtitle = f"{report_label} — Filtered: '{search}'" if search else report_label
    elements.append(Paragraph(f"{subtitle} — Generated: {datetime.now().strftime('%B %d, %Y %H:%M')}", styles['Normal']))
    elements.append(Spacer(1, 0.3*inch))

    try:
        with engine.connect() as conn:
            total_trials = conn.execute(text("SELECT COUNT(*) FROM trials")).scalar()
            total_sites = conn.execute(text("SELECT COUNT(*) FROM sites")).scalar()
            total_patients = conn.execute(text("SELECT COUNT(*) FROM patients")).scalar()
            avg_eff = conn.execute(text("SELECT ROUND(AVG(efficacy_score),2) FROM outcomes")).scalar()

            query = text("""
                SELECT t.trial_name, t.drug_name, t.phase, t.status,
                    COUNT(o.outcome_id) as patients,
                    ROUND(AVG(o.efficacy_score), 2) as avg_efficacy
                FROM trials t
                LEFT JOIN patients p ON t.trial_id = p.trial_id
                LEFT JOIN outcomes o ON p.patient_id = o.patient_id
                WHERE (:search = '' OR t.trial_name ILIKE :s OR t.drug_name ILIKE :s)
                GROUP BY t.trial_name, t.drug_name, t.phase, t.status
                ORDER BY avg_efficacy DESC NULLS LAST
            """)
            all_rows = conn.execute(query, {"search": search, "s": f"%{search}%"}).fetchall()

            if report_type == "top":
                all_rows = [r for r in all_rows if r[5] is not None]
                all_rows = sorted(all_rows, key=lambda r: r[5], reverse=True)[:20]
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")

    elements.append(Paragraph("Key Metrics", styles['Heading2']))
    kpi_data = [
        ["Total Trials", "Trial Sites", "Patients Tracked", "Avg Efficacy"],
        [str(total_trials or 0), str(total_sites or 0), str(total_patients or 0), str(avg_eff) if avg_eff is not None else "N/A"]
    ]
    kpi_table = Table(kpi_data, colWidths=[1.5*inch]*4)
    kpi_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), rl_colors.HexColor('#12232E')),
        ('TEXTCOLOR', (0,0), (-1,0), rl_colors.white),
        ('FONTSIZE', (0,0), (-1,-1), 10),
        ('GRID', (0,0), (-1,-1), 0.5, rl_colors.grey),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
    ]))
    elements.append(kpi_table)
    elements.append(Spacer(1, 0.3*inch))

    elements.append(Paragraph(f"Trial Data ({len(all_rows)} trials)", styles['Heading2']))

    if not all_rows:
        elements.append(Paragraph("No trials match the current filter.", styles['Normal']))
    else:
        table_data = [["Trial Name", "Phase", "Status", "Patients", "Avg Efficacy"]]
        for row in all_rows:
            trial_name = row[0] or "Untitled Trial"
            name = trial_name[:45] + "..." if len(trial_name) > 45 else trial_name
            table_data.append([name, row[2] or "-", row[3] or "-", str(row[4] or 0), str(row[5]) if row[5] is not None else "-"])

        trials_table = Table(table_data, colWidths=[2.8*inch, 0.9*inch, 1.1*inch, 0.8*inch, 1*inch], repeatRows=1)
        trials_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), rl_colors.HexColor('#0F6B5C')),
            ('TEXTCOLOR', (0,0), (-1,0), rl_colors.white),
            ('FONTSIZE', (0,0), (-1,-1), 7),
            ('GRID', (0,0), (-1,-1), 0.5, rl_colors.grey),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [rl_colors.white, rl_colors.HexColor('#F5F7FA')]),
        ]))
        elements.append(trials_table)

    doc.build(elements)
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=pharmatrace_report.pdf"})


API_KEYS = {}  

@app.post("/api/keys/generate")
def generate_api_key():
    key = "pk_" + secrets.token_hex(16)
    API_KEYS[key] = {"created": datetime.now().isoformat(), "requests": []}
    return {"api_key": key, "rate_limit": "100 requests per hour"}

def check_rate_limit(x_api_key: str = Header(None)):
    if not x_api_key or x_api_key not in API_KEYS:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")
    now = time.time()
    reqs = API_KEYS[x_api_key]["requests"]
    reqs[:] = [t for t in reqs if now - t < 3600]
    if len(reqs) >= 100:
        raise HTTPException(status_code=429, detail="Rate limit exceeded: 100 requests/hour")
    reqs.append(now)
    return x_api_key

@app.get("/api/public/trials-summary")
def public_trials_summary(api_key: str = Depends(check_rate_limit)):
    with engine.connect() as conn:
        total = conn.execute(text("SELECT COUNT(*) FROM trials")).scalar()
        avg_eff = conn.execute(text("SELECT ROUND(AVG(efficacy_score),2) FROM outcomes")).scalar()
    remaining = 100 - len(API_KEYS[api_key]["requests"])
    return {"total_trials": total, "avg_efficacy": avg_eff, "requests_remaining": remaining}



MODEL_DIR = ""

MODEL_PATH = os.path.join(MODEL_DIR, "efficacy_model.pkl")
GENDER_ENCODER_PATH = os.path.join(MODEL_DIR, "gender_encoder.pkl")
PHASE_ENCODER_PATH = os.path.join(MODEL_DIR, "phase_encoder.pkl")
COUNTRY_ENCODER_PATH = os.path.join(MODEL_DIR, "country_encoder.pkl")
REPORT_PATH = os.path.join(MODEL_DIR, "training_report.json")

_ml_model = None
gender_encoder = None
phase_encoder = None
country_encoder = None


def load_ml_model():
    global _ml_model
    global gender_encoder
    global phase_encoder
    global country_encoder

    if not os.path.exists(MODEL_PATH):
        print("ML Model not found.")
        return

    _ml_model = joblib.load(MODEL_PATH)
    gender_encoder = joblib.load(GENDER_ENCODER_PATH)
    phase_encoder = joblib.load(PHASE_ENCODER_PATH)
    country_encoder = joblib.load(COUNTRY_ENCODER_PATH)

    


load_ml_model()



@app.get("/api/ml/predict-efficacy")
def predict_efficacy(
    age: int,
    gender: str,
    dosage_mg: float,
    phase: str,
    country: str,
):

    if _ml_model is None:
        raise HTTPException(
            status_code=500,
            detail="ML Model is not available."
        )

    if age < 18 or age > 100:
        raise HTTPException(
            status_code=400,
            detail="Age must be between 18 and 100."
        )

    if dosage_mg <= 0:
        raise HTTPException(
            status_code=400,
            detail="Dosage must be greater than 0."
        )

    try:

        gender_value = gender_encoder.transform([gender])[0]
        phase_value = phase_encoder.transform([phase])[0]
        country_value = country_encoder.transform([country])[0]

    except ValueError:

        raise HTTPException(
            status_code=400,
            detail="Invalid Gender, Phase or Country."
        )

    dosage_bucket = (
        0 if dosage_mg < 150
        else 1 if dosage_mg < 350
        else 2
    )

    age_group = (
        0 if age <= 30
        else 1 if age <= 50
        else 2 if age <= 70
        else 3
    )

    features = [[
        age,
        gender_value,
        dosage_mg,
        phase_value,
        country_value,
        dosage_bucket,
        age_group
    ]]

    start = time.perf_counter()

    prediction = _ml_model.predict(features)[0]
    probability = _ml_model.predict_proba(features)[0]

    end = time.perf_counter()

    confidence = round(max(probability) * 100, 2)

    return {
        "prediction": "Success" if prediction == 1 else "Not Success",
        "confidence": confidence,
        "prediction_time_ms": round((end - start) * 1000, 2),
        "features_used": {
            "age": age,
            "gender": gender,
            "dosage_mg": dosage_mg,
            "phase": phase,
            "country": country
        }
    }


@app.get("/api/ml/model-info")
def model_info():

    if _ml_model is None:
        return {
            "trained": False
        }

    report = {}

    if os.path.exists(REPORT_PATH):

        with open(REPORT_PATH, "r") as file:
            report = json.load(file)

    return {
        "trained": True,
        "algorithm": "Random Forest Classifier",
        "training_report": report
    }

from groq import Groq
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

SCHEMA_INFO = """
Tables:
- trials(trial_id, nct_id, trial_name, drug_name, phase, status, start_date, end_date)
- sites(site_id, site_name, city, country)
- patients(patient_id, age, gender, trial_id, site_id, enrollment_date)
- treatments(treatment_id, patient_id, dosage_mg, treatment_start_date, treatment_end_date)
- outcomes(outcome_id, patient_id, efficacy_score, side_effect_reported, status)
"""

@app.get("/api/nlquery/ask")
def nl_query(question: str):
    question = (question or "").strip()
    if not question:
        return {"error": "Please enter a question."}

    if not os.getenv("GROQ_API_KEY"):
        return {"error": "Natural language query is not configured on the server (missing GROQ_API_KEY)."}

    prompt = f"""You are a PostgreSQL expert. Given this schema:
{SCHEMA_INFO}

Convert this question into a single safe PostgreSQL SELECT query. Only return the raw SQL, nothing else. Never use DELETE, UPDATE, INSERT, or DROP. Always add LIMIT 10.

Question: {question}
SQL:"""

    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            max_tokens=300,
        )
    except Exception as e:
        return {"error": f"AI service is currently unavailable: {str(e)}"}

    sql = response.choices[0].message.content.strip()
    sql = sql.replace("```sql", "").replace("```", "").strip()
    sql_lower = sql.lower().strip()

    if not sql_lower.startswith("select"):
        return {"error": "Only read-only questions can be answered.", "generated_sql": sql}

    # Reject stacked statements (e.g. "SELECT 1; DROP TABLE ...")
    if ";" in sql.rstrip(";"):
        return {"error": "Only a single query is allowed.", "generated_sql": sql}

    forbidden = ["delete", "update", "insert", "drop", "alter", "truncate", "create", "grant", "revoke", "--", "/*"]
    if any(word in sql_lower for word in forbidden):
        return {"error": "Unsafe query blocked", "generated_sql": sql}

    # Enforce a row cap server-side rather than trusting the model to add it.
    if "limit" not in sql_lower:
        sql = sql.rstrip(";") + " LIMIT 10"

    try:
        with engine.connect() as conn:
            result = conn.execute(text(sql))
            rows = [dict(row._mapping) for row in result]
    except SQLAlchemyError as e:
        return {"error": f"That question couldn't be turned into a valid query: {str(e)}", "generated_sql": sql}

    return {"question": question, "generated_sql": sql, "interpreted_as": sql, "results": rows}