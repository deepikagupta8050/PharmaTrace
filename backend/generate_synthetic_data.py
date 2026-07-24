import random
from faker import Faker
from sqlalchemy import text
from database import engine

fake = Faker()

NUM_PATIENTS = 3000

def get_all_ids(table_name, id_column):
    """Trials aur sites ki saari IDs nikalta hai, taaki randomly assign kar sakein"""
    query = text(f"SELECT {id_column} FROM {table_name}")
    with engine.connect() as conn:
        result = conn.execute(query)
        return [row[0] for row in result]

def insert_patient(trial_id, site_id):
    """Ek fake patient insert karta hai, aur uski generated ID wapas deta hai"""
    query = text("""
        INSERT INTO patients (age, gender, trial_id, site_id, enrollment_date)
        VALUES (:age, :gender, :trial_id, :site_id, :enrollment_date)
        RETURNING patient_id
    """)
    params = {
        "age": random.randint(18, 85),
        "gender": random.choice(["Male", "Female"]),
        "trial_id": trial_id,
        "site_id": site_id,
        "enrollment_date": fake.date_between(start_date="-3y", end_date="today")
    }
    with engine.connect() as conn:
        result = conn.execute(query, params)
        conn.commit()
        return result.fetchone()[0]

def insert_treatment(patient_id):
    query = text("""
        INSERT INTO treatments (patient_id, dosage_mg, treatment_start_date, treatment_end_date)
        VALUES (:patient_id, :dosage_mg, :start_date, :end_date)
    """)
    start = fake.date_between(start_date="-3y", end_date="-6m")
    end = fake.date_between(start_date=start, end_date="today")
    params = {
        "patient_id": patient_id,
        "dosage_mg": round(random.uniform(5, 500), 2),
        "start_date": start,
        "end_date": end
    }
    with engine.connect() as conn:
        conn.execute(query, params)
        conn.commit()

def insert_outcome(patient_id):
    query = text("""
        INSERT INTO outcomes (patient_id, efficacy_score, side_effect_reported, status)
        VALUES (:patient_id, :efficacy_score, :side_effect, :status)
    """)
    efficacy = round(random.uniform(20, 100), 2)
    # Zyada efficacy = zyada chance "Success" hone ka (realistic pattern)
    status = "Success" if efficacy > 60 else random.choice(["Failure", "Ongoing"])
    params = {
        "patient_id": patient_id,
        "efficacy_score": efficacy,
        "side_effect": random.choice([True, False]),
        "status": status
    }
    with engine.connect() as conn:
        conn.execute(query, params)
        conn.commit()

if __name__ == "__main__":
    print("Trials aur sites ki IDs load ho rahi hain...")
    trial_ids = get_all_ids("trials", "trial_id")
    site_ids = get_all_ids("sites", "site_id")

    print(f"{NUM_PATIENTS} synthetic patients generate ho rahe hain...")
    for i in range(NUM_PATIENTS):
        trial_id = random.choice(trial_ids)
        site_id = random.choice(site_ids)

        patient_id = insert_patient(trial_id, site_id)
        insert_treatment(patient_id)
        insert_outcome(patient_id)

        if (i + 1) % 500 == 0:
            print(f"  {i + 1}/{NUM_PATIENTS} patients ho gaye...")

    print(f"{NUM_PATIENTS} patients + treatments + outcomes sab insert ho gaye!")