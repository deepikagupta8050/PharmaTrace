import random
from sqlalchemy import text
from database import engine

print("Fetching patients and their dosage...")
with engine.connect() as conn:
    rows = conn.execute(text("""
        SELECT p.patient_id, p.age, tr.dosage_mg
        FROM patients p
        JOIN treatments tr ON p.patient_id = tr.patient_id
    """)).fetchall()

print(f"Updating efficacy for {len(rows)} patients with a realistic pattern...")

with engine.connect() as conn:
    for patient_id, age, dosage_mg in rows:
        dosage_mg = float(dosage_mg)
        # Realistic-ish formula: higher dosage -> higher efficacy (with a ceiling),
        # younger patients respond slightly better, plus random noise
        base = 30 + (dosage_mg / 500) * 40          # dosage contributes 0-40 points
        age_factor = max(0, (70 - age) / 70) * 15     # younger -> up to +15 points
        noise = random.uniform(-10, 10)               # natural variation
        efficacy = base + age_factor + noise
        efficacy = round(max(5, min(98, efficacy)), 2)  # clip to sensible range

        side_effect = random.random() < (0.15 + (dosage_mg / 1000) * 0.3)  # higher dose -> more side effects
        status = "Success" if efficacy > 60 else random.choice(["Failure", "Ongoing"])

        conn.execute(text("""
            UPDATE outcomes SET efficacy_score = :eff, side_effect_reported = :se, status = :st
            WHERE patient_id = :pid
        """), {"eff": efficacy, "se": side_effect, "st": status, "pid": patient_id})
    conn.commit()

print("Done! Outcomes updated with realistic dosage/age-based pattern.")