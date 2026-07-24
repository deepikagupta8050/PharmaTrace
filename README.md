# PharmaTrace – AI-Powered Clinical Trial Analytics & Decision Intelligence Platform

<div align="center">

![Python](https://img.shields.io/badge/Python-3.12-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-Latest-green)
![React](https://img.shields.io/badge/React-19-blue)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-blue)
![Machine Learning](https://img.shields.io/badge/Machine-Learning-orange)
![License](https://img.shields.io/badge/License-MIT-green)

</div>

---

# Overview

**PharmaTrace** is an AI-powered Clinical Trial Analytics platform designed to help pharmaceutical organizations, research institutions, and healthcare analysts monitor, evaluate, and predict clinical trial performance using real-world trial data.

The platform automatically synchronizes live clinical trial information, performs advanced SQL-based analytics, generates intelligent insights, predicts trial efficacy using Machine Learning, and provides interactive dashboards for data-driven decision making.

Unlike traditional dashboards, PharmaTrace combines **real-time clinical trial analytics, predictive intelligence, automated reporting, anomaly detection, and patient-trial matching** into one unified platform.

---

# Key Features

## Clinical Trial Analytics

- Live Clinical Trial Synchronization
- Trial Success Rate Analysis
- Trial Ranking Engine
- Trial Status Funnel
- Trial Phase Distribution
- Drug Leaderboard
- Trial Duration Analysis
- Site Performance Analysis
- Enrollment Trend Monitoring
- Side Effect Analysis
- Age Group Efficacy Analysis
- Dosage vs Efficacy Correlation

---

## AI Powered Decision Intelligence

- Trial Risk Score Prediction
- Site Selection Advisor
- Enrollment Forecasting
- Competitive Landscape Analysis
- Trial Similarity Finder
- Patient Trial Matching
- Statistical Anomaly Detection
- Auto Generated Insights
- Predictive Trial Success Model

---

## Machine Learning

The platform includes an integrated Machine Learning model capable of predicting expected trial efficacy based on multiple patient and trial parameters.

Prediction Inputs include:

- Patient Age
- Gender
- Trial Phase
- Country
- Dosage

Output

- Predicted Trial Efficacy
- Confidence Analysis
- Recommendation

---

## Clinical Intelligence

PharmaTrace automatically generates intelligent observations such as:

- Highest performing clinical trials
- High risk trials
- Safety alerts
- Side effect monitoring
- Longest running phases
- Patient demographic insights
- Drug performance comparison

These insights are generated automatically from database statistics without manual intervention.

---

# Dashboard Modules

The web dashboard includes:

- Executive Dashboard
- Efficacy Analytics
- Safety Monitoring
- Site Performance
- Demographic Analytics
- Trial Advisor
- Patient Matching
- Predictive Analytics
- Data Explorer

---

# PDF Reporting

Generate production-ready reports containing

- Trial Summary
- KPI Metrics
- Trial Performance
- Drug Statistics
- Efficacy Reports
- Filtered Trial Reports
- Top Performing Trials

Reports are generated dynamically in PDF format.

---

# Public API

PharmaTrace provides secure public APIs with

- API Key Generation
- Rate Limiting
- Secure Access
- Trial Summary API
- Analytics Endpoints

---

# Technology Stack

## Frontend

- React
- JavaScript
- CSS3
- Axios
- Recharts

---

## Backend

- FastAPI
- SQLAlchemy
- Python
- PostgreSQL
- ReportLab
- Joblib

---

## Machine Learning

- Scikit-learn
- NumPy
- Pandas

---

## Database

- PostgreSQL

---

## External APIs

ClinicalTrials.gov API

---

# System Architecture

```
                ClinicalTrials.gov API
                         │
                         ▼
                Data Synchronization
                         │
                         ▼
                  FastAPI Backend
                         │
      ┌──────────────────┼──────────────────┐
      ▼                  ▼                  ▼
 PostgreSQL        Machine Learning     Analytics Engine
      │                  │                  │
      └──────────────┬───┴──────────────────┘
                     ▼
               React Dashboard
                     │
                     ▼
                  End Users
```

---

# Project Structure

```
PharmaTrace
│
├── backend
│   ├── main.py
│   ├── database.py
│   ├── train_model.py
│   ├── fetch_real_trials.py
│   ├── fetch_sites.py
│   ├── regenerate_outcomes.py
│   ├── requirements.txt
│   └── models
│
├── frontend
│   ├── src
│   ├── public
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

---

# Installation

Clone Repository

```bash
git clone https://github.com/yourusername/PharmaTrace.git
```

Backend

```bash
cd backend

python -m venv venv

pip install -r requirements.txt

uvicorn main:app --reload
```

Frontend

```bash
cd frontend

npm install

npm run dev
```

---

# Deployment

Frontend

- Vercel

Backend

- Render

Database

- PostgreSQL

---



