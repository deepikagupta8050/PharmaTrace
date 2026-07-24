import requests
import time
from sqlalchemy import text
from database import engine

BASE_URL = "https://clinicaltrials.gov/api/v2/studies"

CONDITIONS = [
    "diabetes", "cancer", "heart disease", "alzheimer",
    "depression", "asthma", "obesity", "arthritis",
    "hypertension", "chronic kidney disease"
]

def fetch_trials_for_condition(condition, limit=50):
    params = {"query.cond": condition, "pageSize": limit}
    response = requests.get(BASE_URL, params=params)
    return response.json().get("studies", [])

def extract_sites(study):
    """Ek trial ke andar jitni bhi locations hain, unko nikalta hai"""
    protocol = study.get("protocolSection", {})
    contacts = protocol.get("contactsLocationsModule", {})
    locations = contacts.get("locations", [])

    sites = []
    for loc in locations:
        site_name = loc.get("facility")
        city = loc.get("city")
        country = loc.get("country")
        if site_name:  # sirf valid naam wale hi lete hain
            sites.append({
                "site_name": site_name,
                "city": city,
                "country": country
            })
    return sites

def insert_site(site):
    query = text("""
        INSERT INTO sites (site_name, city, country)
        VALUES (:site_name, :city, :country)
    """)
    with engine.connect() as conn:
        conn.execute(query, site)
        conn.commit()

if __name__ == "__main__":
    total_inserted = 0
    seen = set()  # duplicate sites avoid karne ke liye

    for condition in CONDITIONS:
        print(f"Fetching sites for: {condition}...")
        studies = fetch_trials_for_condition(condition, limit=50)

        for study in studies:
            sites = extract_sites(study)
            for site in sites:
                key = (site["site_name"], site["city"])
                if key not in seen:
                    seen.add(key)
                    insert_site(site)
                    total_inserted += 1

        time.sleep(1)

    print(f"Total {total_inserted} unique sites database me daal diye gaye!")