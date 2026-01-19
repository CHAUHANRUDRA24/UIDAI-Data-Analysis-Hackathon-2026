import pandas as pd
import json
import os
import sys
import math
from typing import List, Dict, Any, Tuple
from datetime import datetime

class UIDAIProcessor:
    def __init__(self):
        self.summary = {
            "validation": {
                "status": "PASS",
                "issues": []
            },
            "totalEnrolments": 0,
            "totalUpdates": 0,
            "biometricUpdates": 0,
            "demographicUpdates": 0,
            "genderCounts": {"Male": 0, "Female": 0, "Other": 0},
            "ageCounts": {"0-5": 0, "5-18": 0, "18-45": 0, "45-60": 0, "60+": 0},
            "stateCounts": {},
            "districtCounts": {},
            "district_scores": {},
            "trends": {
                "weekly": {},
                "growth_rate": {},
                "anomalies": []
            },
            "insights": {
                "executive_summary": "",
                "key_findings": [],
                "district_insights": {},
                "cross_dataset": {},
                "recommendations": []
            }
        }
        
        # State normalization mapping
        self.state_mapping = {
            "andaman & nicobar islands": "Andaman and Nicobar Islands",
            "dadra & nagar haveli": "Dadra and Nagar Haveli and Daman and Diu",
            "daman & diu": "Dadra and Nagar Haveli and Daman and Diu",
            "jammu & kashmir": "Jammu and Kashmir",
            "orissa": "Odisha",
            "pondicherry": "Puducherry",
            "uttaranchal": "Uttarakhand",
            "west bengal": "West Bengal",
            "chhatisgarh": "Chhattisgarh"
        }

        self.district_data = {} # Stores normalized district data for scoring

    def _add_validation_issue(self, message: str, severity: str = "WARNING"):
        self.summary["validation"]["issues"].append(f"[{severity}] {message}")
        if severity == "CRITICAL" or self.summary["validation"]["status"] == "FAIL":
            self.summary["validation"]["status"] = "FAIL"
        elif severity == "WARNING" and self.summary["validation"]["status"] != "FAIL":
            self.summary["validation"]["status"] = "PASS_WITH_WARNINGS"

    def detect_file_type(self, df: pd.DataFrame) -> str:
        cols = set(c.lower() for c in df.columns)
        if any('bio_age' in c for c in cols): return 'biometric'
        if any('demo_age' in c for c in cols): return 'demographic'
        if any('age_0_5' in c for c in cols): return 'enrolment'
        return 'unknown'

    def normalize_location(self, df: pd.DataFrame) -> pd.DataFrame:
        if 'state' in df.columns:
            df['state'] = df['state'].astype(str).str.lower().str.strip()
            df['state'] = df['state'].replace(self.state_mapping)
            # Capitalize each word for display
            df['state'] = df['state'].apply(lambda x: x.title() if isinstance(x, str) else x)
            
        if 'district' in df.columns:
            df['district'] = df['district'].astype(str).str.title().str.strip()
            
        return df

    def validate_schema(self, df: pd.DataFrame, file_type: str) -> bool:
        required = ['state', 'district', 'pincode']
        missing = [c for c in required if c.lower() not in [col.lower() for col in df.columns]]
        
        if missing:
            self._add_validation_issue(f"Missing mandatory columns: {', '.join(missing)}", "CRITICAL")
            return False

        # Validate Pincode
        if 'pincode' in [c.lower() for c in df.columns]:
            pincode_col = [c for c in df.columns if c.lower() == 'pincode'][0]
            invalid_pincodes = df[~df[pincode_col].astype(str).str.match(r'^\d{6}$')]
            if len(invalid_pincodes) > 0:
                self._add_validation_issue(f"{len(invalid_pincodes)} records have invalid pincodes (must be 6 digits)", "WARNING")

        return True

    def process_file(self, file_path: str):
        try:
            print(f"Processing {os.path.basename(file_path)}...")
            df = pd.read_csv(file_path)
            # Normalize column names
            df.columns = [c.lower().strip() for c in df.columns]
            
            file_type = self.detect_file_type(df)
            print(f"Type detected: {file_type}")
            
            if not self.validate_schema(df, file_type):
                print(f"Validation failed for {file_path}")
                return

            df = self.normalize_location(df)
            
            if file_type == 'biometric':
                self._process_biometric(df)
            elif file_type == 'demographic':
                self._process_demographic(df)
            elif file_type == 'enrolment':
                self._process_enrolment(df)
            else:
                self._add_validation_issue(f"Unknown file format: {os.path.basename(file_path)}", "WARNING")

        except Exception as e:
            self._add_validation_issue(f"Error processing {file_path}: {str(e)}", "CRITICAL")
            print(f"Error: {e}")

    def _update_district_data(self, df, data_type, value_col):
        # Aggregate logic for readiness score
        if 'district' not in df.columns: return
        
        sums = df.groupby('district')[value_col].sum()
        for district, val in sums.items():
            if district not in self.district_data:
                self.district_data[district] = {'biometric': 0, 'demographic': 0, 'enrolment': 0}
            self.district_data[district][data_type] += int(val)

    def _process_biometric(self, df):
        df = df.fillna(0)
        c1, c2 = df['bio_age_5_17'].sum(), df['bio_age_17_'].sum()
        total = c1 + c2
        
        self.summary['totalUpdates'] += int(total)
        self.summary['biometricUpdates'] += int(total)
        self.summary['ageCounts']['5-18'] += int(c1)
        self.summary['ageCounts']['18-45'] += int(c2)
        
        df['total_bio'] = df['bio_age_5_17'] + df['bio_age_17_']
        self._update_state_counts(df, 'total_bio')
        self._update_district_data(df, 'biometric', 'total_bio')

    def _process_demographic(self, df):
        df = df.fillna(0)
        c1, c2 = df['demo_age_5_17'].sum(), df['demo_age_17_'].sum()
        total = c1 + c2
        
        self.summary['totalUpdates'] += int(total)
        self.summary['demographicUpdates'] += int(total)
        self.summary['ageCounts']['5-18'] += int(c1)
        self.summary['ageCounts']['18-45'] += int(c2)
        
        df['total_demo'] = df['demo_age_5_17'] + df['demo_age_17_']
        self._update_state_counts(df, 'total_demo')
        self._update_district_data(df, 'demographic', 'total_demo')

    def _process_enrolment(self, df):
        df = df.fillna(0)
        c1, c2, c3 = df['age_0_5'].sum(), df['age_5_17'].sum(), df['age_18_greater'].sum()
        total = c1 + c2 + c3
        
        self.summary['totalEnrolments'] += int(total)
        self.summary['ageCounts']['0-5'] += int(c1)
        self.summary['ageCounts']['5-18'] += int(c2)
        self.summary['ageCounts']['18-45'] += int(c3)
        
        df['total_enrol'] = df['age_0_5'] + df['age_5_17'] + df['age_18_greater']
        self._update_state_counts(df, 'total_enrol')
        self._update_district_data(df, 'enrolment', 'total_enrol')

    def _update_state_counts(self, df, count_col):
        if 'state' in df.columns:
            sums = df.groupby('state')[count_col].sum()
            for state, count in sums.items():
                self.summary['stateCounts'][state] = self.summary['stateCounts'].get(state, 0) + int(count)

    def calculate_readiness_scores(self):
        # District Service Readiness Score Calculation
        # Formula: (Enrolment * 0.4) + (Bio Stability * 0.4) + (Low Anomaly * 0.2)
        # For simplicity in this version, we map volume to 0-100 scores relative to max
        
        if not self.district_data: return

        max_enrol = max((d['enrolment'] for d in self.district_data.values()), default=1)
        max_bio = max((d['biometric'] for d in self.district_data.values()), default=1)
        
        scores = {}
        for district, data in self.district_data.items():
            enrol_score = (data['enrolment'] / max_enrol) * 100
            bio_score = (data['biometric'] / max_bio) * 100
            
            # Simplified Anomaly Logic (Assume higher bio failures = anomaly, but we lack failure data)
            # Using placeholder anomaly score of 100 (perfect) for now
            anomaly_score = 100 
            
            final_score = (enrol_score * 0.4) + (bio_score * 0.4) + (anomaly_score * 0.2)
            scores[district] = round(final_score, 1)
            
        self.summary['district_scores'] = dict(sorted(scores.items(), key=lambda x: x[1], reverse=True))

    def generate_insights(self):
        # Executive Summary
        total_auth = self.summary['biometricUpdates'] + self.summary['demographicUpdates']
        self.summary['insights']['executive_summary'] = (
            f"Processed {self.summary['totalEnrolments']:,} enrolments and {total_auth:,} authentications. "
            f"Biometric authentication accounts for {round(self.summary['biometricUpdates']/total_auth*100 if total_auth else 0)}% of updates."
        )

        # Key Findings
        if total_auth > 0:
            bio_ratio = self.summary['biometricUpdates'] / total_auth
            if bio_ratio < 0.4:
                self.summary['insights']['key_findings'].append(
                    f"Low biometric usage ({round(bio_ratio*100)}%) compared to demographic updates, indicating potential device availability issues."
                )
            elif bio_ratio > 0.8:
                self.summary['insights']['key_findings'].append(
                    f"High dependency on biometric updates ({round(bio_ratio*100)}%), indicating strong device adoption."
                )

        # District Insights based on Scoring
        if self.summary['district_scores']:
            top_district = list(self.summary['district_scores'].keys())[0]
            bottom_district = list(self.summary['district_scores'].keys())[-1]
            
            self.summary['insights']['district_insights'] = {
                "top_performer": f"{top_district} leads with a Readiness Score of {self.summary['district_scores'][top_district]}, driven by high enrolment coverage.",
                "attention_needed": f"{bottom_district} requires attention (Score: {self.summary['district_scores'][bottom_district]}) due to low relative activity levels."
            }

        # Recommendations
        if self.summary['ageCounts']['0-5'] < self.summary['totalEnrolments'] * 0.1:
            self.summary['insights']['recommendations'].append(
                f"Increase child enrolment camps: 0-5 age group constitutes only {round(self.summary['ageCounts']['0-5']/self.summary['totalEnrolments']*100)}% of total enrolments."
            )
        
        # Check specific district gaps
        for district, data in list(self.district_data.items())[:5]: # Sample check top 5 processed
            if data['enrolment'] > 0 and data['biometric'] == 0:
                 self.summary['insights']['recommendations'].append(
                    f"District {district} shows zero biometric activity despite valid enrolments. Verify device connectivity."
                )

    def save_output(self, output_path='dashboard_data.json'):
        self.calculate_readiness_scores()
        self.generate_insights()
        
        with open(output_path, 'w') as f:
            json.dump(self.summary, f, indent=2)
        print(f"Data saved to {output_path}")
        print(f"Validation Status: {self.summary['validation']['status']}")
        if self.summary['validation']['issues']:
             print("Issues Found:")
             for issue in self.summary['validation']['issues']:
                 print(f" - {issue}")

def main():
    if len(sys.argv) < 2:
        print("Usage: python data_processor.py <file1.csv|file.zip> [file2.csv ...]")
        return

    processor = UIDAIProcessor()
    
    for file_path in sys.argv[1:]:
        if not os.path.exists(file_path):
            print(f"File not found: {file_path}")
            continue
            
        file_ext = file_path.lower().split('.')[-1]
        
        if file_ext == 'zip':
            import zipfile
            print(f"Extracting ZIP file: {file_path}")
            try:
                with zipfile.ZipFile(file_path, 'r') as zip_ref:
                    csv_files = [f for f in zip_ref.namelist() if f.lower().endswith('.csv') and not f.startswith('__MACOSX')]
                    if not csv_files:
                        print(f"No CSV files found in {file_path}")
                        continue
                    
                    import tempfile
                    with tempfile.TemporaryDirectory() as temp_dir:
                        for csv_file in csv_files:
                            zip_ref.extract(csv_file, temp_dir)
                            processor.process_file(os.path.join(temp_dir, csv_file))
            except Exception as e:
                processor._add_validation_issue(f"ZIP Extraction Error: {str(e)}", "CRITICAL")
        elif file_ext == 'csv':
            processor.process_file(file_path)
        else:
            print(f"Unsupported file type: {file_path}")

    processor.save_output()

if __name__ == "__main__":
    main()
