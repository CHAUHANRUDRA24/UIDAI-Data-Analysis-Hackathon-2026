import pandas as pd
import json
import os
import sys
from typing import List, Dict, Any

class UIDAIProcessor:
    def __init__(self):
        self.summary = {
            "totalEnrolments": 0,
            "totalUpdates": 0,
            "biometricUpdates": 0,
            "demographicUpdates": 0,
            "genderCounts": {"Male": 0, "Female": 0, "Other": 0},
            "ageCounts": {"0-5": 0, "5-18": 0, "18-45": 0, "45-60": 0, "60+": 0},
            "stateCounts": {},
            "districtCounts": {}
        }

    def detect_file_type(self, df: pd.DataFrame) -> str:
        cols = set(df.columns)
        if 'bio_age_5_17' in cols:
            return 'biometric'
        elif 'demo_age_5_17' in cols:
            return 'demographic'
        elif 'age_0_5' in cols:
            return 'enrolment'
        return 'unknown'

    def process_file(self, file_path: str):
        try:
            print(f"Processing {os.path.basename(file_path)}...")
            df = pd.read_csv(file_path)
            # Normalize column names to lowercase just in case
            df.columns = [c.lower() for c in df.columns]
            
            file_type = self.detect_file_type(df)
            print(f"Type detected: {file_type}")

            if file_type == 'biometric':
                self._process_biometric(df)
            elif file_type == 'demographic':
                self._process_demographic(df)
            elif file_type == 'enrolment':
                self._process_enrolment(df)
            else:
                print(f"Skipping unknown file format: {file_path}")

        except Exception as e:
            print(f"Error processing {file_path}: {str(e)}")

    def _update_counts(self, df, count_col):
        # Group by state and sum the count column
        if 'state' in df.columns:
            state_sums = df.groupby('state')[count_col].sum()
            for state, count in state_sums.items():
                self.summary['stateCounts'][state] = self.summary['stateCounts'].get(state, 0) + int(count)
                
        # Group by state and district for district counts
        if 'state' in df.columns and 'district' in df.columns:
            district_sums = df.groupby(['state', 'district'])[count_col].sum()
            for (state, district), count in district_sums.items():
                if state not in self.summary['districtCounts']:
                    self.summary['districtCounts'][state] = {}
                self.summary['districtCounts'][state][district] = self.summary['districtCounts'][state].get(district, 0) + int(count)

    def _process_biometric(self, df):
        # Columns: bio_age_5_17, bio_age_17_
        # Both count as Biometric Updates
        
        # Fill NaNs
        df = df.fillna(0)
        
        c1 = df['bio_age_5_17'].sum()
        c2 = df['bio_age_17_'].sum()
        total = c1 + c2

        self.summary['totalUpdates'] += int(total)
        self.summary['biometricUpdates'] += int(total)

        self.summary['ageCounts']['5-18'] += int(c1)
        self.summary['ageCounts']['18-45'] += int(c2) # Mapping 17+ to 18-45 bucket for now

        # Update State and District Counts
        df['total_row'] = df['bio_age_5_17'] + df['bio_age_17_']
        self._update_counts(df, 'total_row')

    def _process_demographic(self, df):
        # Columns: demo_age_5_17, demo_age_17_
        
        df = df.fillna(0)
        
        c1 = df['demo_age_5_17'].sum()
        c2 = df['demo_age_17_'].sum()
        total = c1 + c2

        self.summary['totalUpdates'] += int(total)
        self.summary['demographicUpdates'] += int(total)

        self.summary['ageCounts']['5-18'] += int(c1)
        self.summary['ageCounts']['18-45'] += int(c2)

        df['total_row'] = df['demo_age_5_17'] + df['demo_age_17_']
        self._update_counts(df, 'total_row')

    def _process_enrolment(self, df):
        # Columns: age_0_5, age_5_17, age_18_greater
        
        df = df.fillna(0)
        
        c1 = df['age_0_5'].sum()
        c2 = df['age_5_17'].sum()
        c3 = df['age_18_greater'].sum()
        total = c1 + c2 + c3

        self.summary['totalEnrolments'] += int(total)

        self.summary['ageCounts']['0-5'] += int(c1)
        self.summary['ageCounts']['5-18'] += int(c2)
        self.summary['ageCounts']['18-45'] += int(c3)

        df['total_row'] = df['age_0_5'] + df['age_5_17'] + df['age_18_greater']
        self._update_counts(df, 'total_row')

    def save_output(self, output_path='dashboard_data.json'):
        with open(output_path, 'w') as f:
            json.dump(self.summary, f, indent=2)
        print(f"Data saved to {output_path}")

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
                    # Get all CSV files in the ZIP
                    csv_files = [f for f in zip_ref.namelist() 
                                if f.lower().endswith('.csv') and not f.startswith('__MACOSX')]
                    
                    if not csv_files:
                        print(f"No CSV files found in {file_path}")
                        continue
                    
                    # Extract to temp directory
                    import tempfile
                    with tempfile.TemporaryDirectory() as temp_dir:
                        for csv_file in csv_files:
                            zip_ref.extract(csv_file, temp_dir)
                            extracted_path = os.path.join(temp_dir, csv_file)
                            processor.process_file(extracted_path)
            except Exception as e:
                print(f"Error extracting ZIP: {str(e)}")
        elif file_ext == 'csv':
            processor.process_file(file_path)
        else:
            print(f"Unsupported file type: {file_path}")

    processor.save_output()

    # Optional: Print summary to console
    print("\nProcessing Complete. Summary:")
    print(json.dumps(processor.summary, indent=2))

if __name__ == "__main__":
    main()
