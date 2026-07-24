import requests
import time
from sqlalchemy import text
from database import engine

# 10 medical conditions jinke trials fetch karenge
CONDITIONS = [
    "diabetes", "cancer", "heart disease", "alzheimer",
    "depression", "asthma", "obesity", "arthritis",
    "hypertension", "chronic kidney disease"
]

BASE_URL = "https://clinicaltrials.gov/api/v2/studies"

def fetch_trials_for_condition(condition, limit=50):
    """Ek condition ke liye ClinicalTrials.gov se data mangwata hai"""
    params = {
        "query.cond": condition,
        "pageSize": limit
    }
    response = requests.get(BASE_URL, params=params)
    data = response.json()
    return data.get("studies", [])

def clean_date(date_str):
    """Adhoore dates (jaise '2014-08') ko pura date bana deta hai"""
    if not date_str:
        return None
    parts = date_str.split("-")
    if len(parts) == 1:  # sirf saal hai, jaise "2014"
        return f"{date_str}-01-01"
    elif len(parts) == 2:  # saal-mahina hai, jaise "2014-08"
        return f"{date_str}-01"
    return date_str  # already pura date hai


def extract_trial_info(study):
    """Ek trial ke JSON se sirf zaroori fields nikalta hai"""
    protocol = study.get("protocolSection", {})
    identification = protocol.get("identificationModule", {})
    status_module = protocol.get("statusModule", {})
    design_module = protocol.get("designModule", {})
    arms = protocol.get("armsInterventionsModule", {})

    nct_id = identification.get("nctId")
    trial_name = identification.get("briefTitle")

    # Phase nikalna (agar available hai)
    phases = design_module.get("phases", [])
    phase = phases[0] if phases else "Not Applicable"

    # Drug/intervention ka naam nikalna (pehla wala le lete hain)
    interventions = arms.get("interventions", [])
    drug_name = interventions[0].get("name") if interventions else "Unknown"

    status = status_module.get("overallStatus", "Unknown")
    start_date = clean_date(status_module.get("startDateStruct", {}).get("date"))
    end_date = clean_date(status_module.get("completionDateStruct", {}).get("date"))

    return {
        "nct_id": nct_id,
        "trial_name": trial_name,
        "drug_name": drug_name,
        "phase": phase,
        "status": status,
        "start_date": start_date,
        "end_date": end_date
    }

def insert_trial(trial):
    """Ek trial record ko database me insert karta hai"""
    query = text("""
        INSERT INTO trials (nct_id, trial_name, drug_name, phase, status, start_date, end_date)
        VALUES (:nct_id, :trial_name, :drug_name, :phase, :status, :start_date, :end_date)
        ON CONFLICT (nct_id) DO NOTHING
    """)
    with engine.connect() as conn:
        conn.execute(query, trial)
        conn.commit()

if __name__ == "__main__":
    total_inserted = 0
    for condition in CONDITIONS:
        print(f"Fetching trials for: {condition}...")
        studies = fetch_trials_for_condition(condition, limit=50)

        for study in studies:
            trial_info = extract_trial_info(study)
            if trial_info["nct_id"]:  # sirf valid NCT ID wale hi insert karo
                insert_trial(trial_info)
                total_inserted += 1

        time.sleep(1)  # API ko thoda rest dene ke liye (rate limit se bachne)

    print(f"Total {total_inserted} trials database me daal diye gaye!")