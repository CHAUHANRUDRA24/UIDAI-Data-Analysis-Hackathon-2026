# UIDAI Analytics Dashboard - Production Grade

A **government-ready analytics dashboard** for UIDAI (Unique Identification Authority of India) data with bilingual support, automated insights, and robust validation.

## 🎯 Production Features

### ✨ Core Capabilities
- **3-State Validation System**: PASS / PASS_WITH_WARNINGS / FAIL
- **District Service Readiness Scoring**: 0-100 scale for prioritization
- **Automated Insight Generation**: Data-backed recommendations
- **Bilingual Support**: English/Hindi with mandatory fallbacks
- **Real-time Data Processing**: CSV and ZIP file support
- **Interactive Analytics**: Click-through modals for deep insights

### 🌐 Bilingual Interface
- **English/Hindi Toggle**: Instant language switching
- **Smart Fallback System**: Triple-layer fallback prevents broken UI
- **Government Standard**: Logic in English, presentation bilingual
- **Accessibility**: Icon + text indicators

### 📊 Data Validation
- **Mandatory Fields**: State, district, pincode checking
- **Pincode Validation**: 6-digit numeric format enforcement
- **State Normalization**: Automatic spelling corrections
- **Invalid Row Tracking**: Detailed issue reporting

### 🎯 Analytics Features
- **District Readiness Score**: (Enrolment × 0.4) + (Bio Stability × 0.4) + (Anomaly × 0.2)
- **Executive Summary**: Auto-generated high-level overview
- **Key Findings**: Metric-backed observations
- **Recommendations**: Actionable items (e.g., "Increase child enrolment camps")
- **Cross-Dataset Analysis**: Bio/demo ratios, enrolment gaps

## 📁 Supported File Types

The system auto-detects three CSV formats:

1. **Biometric Data**: `date`, `state`, `district`, `pincode`, `bio_age_5_17`, `bio_age_17_`
2. **Demographic Data**: `date`, `state`, `district`, `pincode`, `demo_age_5_17`, `demo_age_17_`
3. **Enrolment Data**: `date`, `state`, `district`, `pincode`, `age_0_5`, `age_5_17`, `age_18_greater`

## 🚀 Quick Start

### Prerequisites
```bash
# Python 3.9+ required
python3 --version

# Install dependencies
pip3 install pandas
```

### Running Locally

1. **Start the server**:
```bash
python3 -m http.server 8000
```

2. **Access the application**:
- Upload: [http://localhost:8000/](http://localhost:8000/)
- Dashboard: [http://localhost:8000/dashboard.html](http://localhost:8000/dashboard.html)

## 📖 Usage

### Method 1: Python Processing (Recommended)

**Single CSV:**
```bash
python3 data_processor.py enrolment_data.csv
```

**Multiple Files:**
```bash
python3 data_processor.py bio.csv demo.csv enrol.csv
```

**ZIP Archive:**
```bash
python3 data_processor.py data_archive.zip
```

**Output:** `dashboard_data.json` (auto-loaded by dashboard)

### Method 2: Web Upload

1. Navigate to [http://localhost:8000/](http://localhost:8000/)
2. Drag & drop CSV or ZIP file
3. Click "Upload & Analyze"
4. View results on dashboard

### Dashboard Features

**Executive Summary:**
- Total enrolments and authentications
- Biometric vs demographic split
- Auto-generated narrative

**District Readiness:**
- Top 5 districts by readiness score
- Color-coded priorities (High/Medium/Low)
- Actionable ranking

**Key Findings:**
- Metric-backed observations
- Threshold-based alerts
- Device adoption indicators

**Recommendations:**
- Child enrolment campaigns
- Device connectivity issues
- Service access gaps

**Language Toggle:**
- Click **हिंदी** button to switch
- All labels update instantly
- Data remains in English

## 🏗️ Architecture

### File Structure

```
UIDAI2/
├── index.html              # Upload page
├── dashboard.html          # Analytics dashboard (538 lines)
├── styles.css             # Global styles
├── dashboard.css          # Dashboard styles (889 lines)
├── script.js              # Upload handling
├── dashboard.js           # Dashboard logic (817 lines)
├── translations.json      # English/Hindi dictionary (71 lines)
├── data_processor.py      # Data validation & insights (304 lines)
├── dashboard_data.json    # Generated analytics (auto-created)
├── README.md             # This file
└── FEATURES.md           # Feature details
```

### Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Charts**: Chart.js for visualizations
- **Data Processing**: Python 3.9+ with Pandas
- **Bilingual**: JSON-based translation system
- **Design**: Glassmorphism UI with Font Awesome icons

## 📊 Data Output Format

```json
{
  "validation": {
    "status": "PASS_WITH_WARNINGS",
    "issues": [
      "[WARNING] 3 districts normalized",
      "[WARNING] 2 invalid pincodes"
    ]
  },
  "totalEnrolments": 1234567,
  "totalUpdates": 9876543,
  "biometricUpdates": 7111111,
  "demographicUpdates": 2765432,
  "district_scores": {
    "Mumbai": 87.5,
    "Delhi": 65.2
  },
  "insights": {
    "executive_summary": "Processed 1.2M enrolments...",
    "key_findings": ["High dependency on biometric updates (72%)..."],
    "recommendations": ["Increase child enrolment camps..."]
  }
}
```

## 🎨 Dashboard Sections

### 1. Overview (Default)
- KPI cards: Enrolments, Updates, Authentications
- Update composition chart (Bio vs Demo)
- Age distribution chart
- Gender split statistics
- Regional hotspots (top 3 states)
- **NEW**: Executive Summary panel
- **NEW**: District Readiness Scores
- **NEW**: Key Findings list
- **NEW**: Recommendations panel

### 2. Trends (Planned)
- Historical data visualization
- Forecasting analytics

### 3. Geospatial (Planned)
- India map with state-wise heatmaps

### 4. Reports (Planned)
- PDF/CSV export functionality

## 🔒 Data Privacy

All processing happens **locally**. No data sent to external servers.

## 🌍 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 📝 License

MIT License

## 👥 Created By

UIDAI Data Analysis Team - 2026

---

**Status:** ✅ Production Ready  
**Last Updated:** January 19, 2026
 
