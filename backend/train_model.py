"""
Trial Success Prediction Model
Trains a Random Forest classifier on historical patient outcomes
to predict the probability of a trial resulting in "Success".
"""

import numpy as np
import pickle
import json
from sqlalchemy import text
from database import engine
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, log_loss, matthews_corrcoef,
    classification_report
)
from sklearn.preprocessing import LabelEncoder


def load_data():
    print("Loading data from database...")
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT p.age, p.gender, tr.dosage_mg, t.phase, s.country, o.status
            FROM patients p
            JOIN treatments tr ON p.patient_id = tr.patient_id
            JOIN outcomes o ON p.patient_id = o.patient_id
            JOIN trials t ON p.trial_id = t.trial_id
            JOIN sites s ON p.site_id = s.site_id
            WHERE p.age IS NOT NULL AND tr.dosage_mg IS NOT NULL AND o.status IS NOT NULL
        """)).fetchall()
    print(f"  {len(rows)} rows loaded")
    return rows


def build_features(rows):
    ages = [r[0] for r in rows]
    genders = [r[1] for r in rows]
    dosages = [float(r[2]) for r in rows]
    phases = [r[3] or "Unknown" for r in rows]
    countries = [r[4] or "Unknown" for r in rows]
    labels = [1 if r[5] == "Success" else 0 for r in rows]

    encoders = {
        "gender": LabelEncoder().fit(genders),
        "phase": LabelEncoder().fit(phases),
        "country": LabelEncoder().fit(countries),
    }

    dosage_bucket = [0 if d < 150 else 1 if d < 350 else 2 for d in dosages]
    age_group = [0 if a <= 30 else 1 if a <= 50 else 2 if a <= 70 else 3 for a in ages]

    X = np.column_stack([
        ages,
        encoders["gender"].transform(genders),
        dosages,
        encoders["phase"].transform(phases),
        encoders["country"].transform(countries),
        dosage_bucket,
        age_group,
    ])
    y = np.array(labels)
    feature_names = ["age", "gender", "dosage_mg", "phase", "country", "dosage_bucket", "age_group"]
    return X, y, encoders, feature_names


def diagnose_fit(train_acc, test_acc):
    gap = train_acc - test_acc
    if gap > 0.15:
        return "Overfitting — model performs much better on training data than test data"
    if train_acc < 0.55 and test_acc < 0.55:
        return "Underfitting — model isn't capturing enough signal from the features"
    return "Good fit — training and test performance are close"


def main():
    rows = load_data()
    print(f"Class balance -> Success: {sum(1 for r in rows if r[5] == 'Success')} "
          f"| Not Success: {sum(1 for r in rows if r[5] != 'Success')}")

    X, y, encoders, feature_names = build_features(rows)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    print("Tuning hyperparameters with GridSearchCV...")
    param_grid = {
        "n_estimators": [100, 200],
        "max_depth": [6, 8, 10],
        "min_samples_split": [2, 5],
        "min_samples_leaf": [1, 2],
    }
    grid = GridSearchCV(
        RandomForestClassifier(random_state=42, class_weight="balanced"),
        param_grid, cv=5, scoring="roc_auc", n_jobs=-1
    )
    grid.fit(X_train, y_train)
    model = grid.best_estimator_
    print(f"  Best params: {grid.best_params_}")

    # --- evaluation on held-out test set ---
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]

    metrics = {
        "train_accuracy": accuracy_score(y_train, model.predict(X_train)),
        "test_accuracy": accuracy_score(y_test, y_pred),
        "precision": precision_score(y_test, y_pred),
        "recall": recall_score(y_test, y_pred),
        "f1_score": f1_score(y_test, y_pred),
        "roc_auc": roc_auc_score(y_test, y_proba),
        "log_loss": log_loss(y_test, y_proba),
        "matthews_corrcoef": matthews_corrcoef(y_test, y_pred),
    }

    cv_scores = cross_val_score(model, X, y, cv=5, scoring="accuracy")
    fit_status = diagnose_fit(metrics["train_accuracy"], metrics["test_accuracy"])

    print(f"\nTrain Accuracy : {metrics['train_accuracy']:.3f}")
    print(f"Test Accuracy  : {metrics['test_accuracy']:.3f}")
    print(f"Precision      : {metrics['precision']:.3f}")
    print(f"Recall         : {metrics['recall']:.3f}")
    print(f"F1 Score       : {metrics['f1_score']:.3f}")
    print(f"ROC-AUC        : {metrics['roc_auc']:.3f}")
    print(f"Log Loss       : {metrics['log_loss']:.3f}  (lower is better)")
    print(f"MCC            : {metrics['matthews_corrcoef']:.3f}  (closer to 1 is better, 0 = random)")
    print(f"5-Fold CV Acc  : {cv_scores.mean():.3f} (+/- {cv_scores.std():.3f})")
    print(f"Fit diagnosis  : {fit_status}\n")
    print(classification_report(y_test, y_pred, target_names=["Not Success", "Success"]))

    with open("efficacy_model.pkl", "wb") as f:
        pickle.dump(model, f)
    for name, enc in encoders.items():
        with open(f"{name}_encoder.pkl", "wb") as f:
            pickle.dump(enc, f)

    report = {
        "trained_on_rows": len(rows),
        "best_params": grid.best_params_,
        **{k: round(float(v), 3) for k, v in metrics.items()},
        "cv_accuracy_mean": round(cv_scores.mean(), 3),
        "cv_accuracy_std": round(cv_scores.std(), 3),
        "confusion_matrix": confusion_matrix(y_test, y_pred).tolist(),
        "fit_diagnosis": fit_status,
        "features": feature_names,
        "feature_importance": {
            name: round(float(imp), 3)
            for name, imp in zip(feature_names, model.feature_importances_)
        },
    }
    with open("training_report.json", "w") as f:
        json.dump(report, f, indent=2)

    print("Saved: efficacy_model.pkl, encoders, training_report.json")


if __name__ == "__main__":
    main()