# UIDAI Data Analysis Dashboard

A modern, interactive analytics dashboard for UIDAI (Unique Identification Authority of India) data visualization and analysis.

## Features

### 📊 Core Functionality
- **Real-time Data Processing**: Upload CSV or ZIP files containing multiple CSVs
- **Python Backend**: Efficient data processing with Pandas for large datasets
- **Interactive Dashboard**: Beautiful, modern UI with glassmorphism effects
- **Detailed Analytics**: Click any KPI card to view in-depth breakdowns
- **Multi-view Navigation**: Overview, Trends, Geospatial, and Reports sections

### 📁 Supported File Types
The system recognizes three specific CSV formats:
1. **Biometric Data** - Columns: `date`, `state`, `district`, `pincode`, `bio_age_5_17`, `bio_age_17_`
2. **Demographic Data** - Columns: `date`, `state`, `district`, `pincode`, `demo_age_5_17`, `demo_age_17_`
3. **Enrolment Data** - Columns: `date`, `state`, `district`, `pincode`, `age_0_5`, `age_5_17`, `age_18_greater`

### ✨ Interactive Features
- **Clickable KPI Cards**: View detailed breakdowns for:
  - Total Enrolments (age distribution, daily averages)
  - Total Updates (biometric vs demographic split)
  - Authentication Stats (success rates, methods)
- **State-wise Analytics**: View all states with rankings and trends
- **Dynamic Charts**: Real-time Chart.js visualizations
- **Responsive Design**: Works seamlessly on all screen sizes
- **🗺️ Advanced Geospatial Visualization**:
  - **Drill-down Capability**: Click states to view district-level data
  - **Time-Slider**: Visualize changes over weeks, months, or years with playback controls
  - **Toggle Layers**: Switch between Heatmap, Bubble Map, and Choropleth views
  - **Interactive Controls**: Real-time metric selection and regional statistics
  - See [GEOSPATIAL_FEATURES.md](GEOSPATIAL_FEATURES.md) for detailed documentation

## Installation & Setup

### Prerequisites
```bash
# Python 3.9+ required
python3 --version

# Install Pandas
pip3 install pandas
```

### Running Locally

1. **Start the local server**:
```bash
python3 -m http.server 8000
```

2. **Access the application**:
- Upload Page: [http://localhost:8000/](http://localhost:8000/)
- Dashboard: [http://localhost:8000/dashboard.html](http://localhost:8000/dashboard.html)

## Usage

### Option 1: Web Upload
1. Open `http://localhost:8000/`
2. Drag & drop your CSV or ZIP file
3. Click "Upload & Analyze"
4. View results on the dashboard

### Option 2: Python Processing
Process files directly with Python for faster handling of large datasets:

```bash
# Single CSV file
python3 data_processor.py your_data.csv

# Multiple CSV files
python3 data_processor.py file1.csv file2.csv file3.csv

# ZIP file (automatically extracts and processes all CSVs)
python3 data_processor.py your_archive.zip
```

This generates `dashboard_data.json` which the dashboard automatically loads.

## File Structure

```
UIDAI2/
├── index.html              # Upload page
├── dashboard.html          # Main analytics dashboard
├── styles.css             # Global styles
├── dashboard.css          # Dashboard-specific styles
├── script.js              # Upload handling & ZIP support
├── dashboard.js           # Dashboard logic & charts
├── data_processor.py      # Python data processing script
├── dashboard_data.json    # Generated analytics (auto-created)
└── README.md             # This file
```

## Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Charts**: Chart.js
- **Data Processing**: Python 3, Pandas
- **File Handling**: JSZip (for browser-based ZIP extraction)
- **Design**: Custom glassmorphism UI, Font Awesome icons

## Features Detail

### Dashboard Sections

1. **Overview** (Active by default)
   - Total Enrolments with trend indicators
   - Total Updates (Biometric vs Demographic split)
   - Total Authentications
   - Age distribution charts
   - Gender split statistics
   - Top regional hotspots

2. **Trends** (Placeholder)
   - Historical data visualization
   - Forecasting analytics

3. **Geospatial** (Placeholder)
   - India map with state-wise heatmaps

4. **Reports** (Placeholder)
   - PDF/CSV export functionality

### Modal Details
Click any KPI card to open detailed analytics:
- **Enrolments**: Age group breakdown, growth rate, daily averages
- **Updates**: Biometric/Demographic split, success rates, update reasons
- **Authentications**: Success rates, response times, authentication methods

## Data Privacy
All data processing happens locally. No data is sent to external servers.

## Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License
MIT License - Feel free to use and modify for your needs.

## Created By
UIDAI Data Analysis Team - 2026