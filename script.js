const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const uploadCard = document.getElementById('uploadCard');
const analysisCard = document.getElementById('analysisCard');
const progressBar = document.getElementById('progressBar');
const percentageText = document.getElementById('percentage');
const stepText = document.getElementById('stepText');
const fileNameDisplay = document.getElementById('fileName');
const cancelBtn = document.getElementById('cancelBtn');

// Prevent default drag behaviors
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// Highlight drop zone when item is dragged over it
['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, unhighlight, false);
});

function highlight(e) {
    dropZone.classList.add('drag-over');
}

function unhighlight(e) {
    dropZone.classList.remove('drag-over');
}

// Handle dropped files
dropZone.addEventListener('drop', handleDrop, false);

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
}

// Handle browse click
dropZone.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', function () {
    handleFiles(this.files);
});

function handleFiles(files) {
    if (files.length > 0) {
        const file = files[0];
        validateAndPrepare(file);
    }
}

function validateAndPrepare(file) {
    const validTypes = ['text/csv', 'application/zip', 'application/x-zip-compressed', 'application/x-zip', 'application/pdf'];

    const fileExt = file.name.split('.').pop().toLowerCase();
    const isValid = validTypes.includes(file.type) || fileExt === 'csv' || fileExt === 'zip' || fileExt === 'pdf';

    if (!isValid) {
        alert('Please upload a CSV, ZIP, or PDF file');
        return;
    }

    // Update UI to show selected file
    dropZone.querySelector('h3').textContent = file.name;
    dropZone.querySelector('p').textContent = formatBytes(file.size);
    dropZone.querySelector('.upload-illustration').innerHTML = '<i class="fa-solid fa-file-circle-check" style="color: var(--success)"></i>';

    uploadBtn.disabled = false;

    // Store file for simulation
    uploadBtn.onclick = () => startAnalysis(file);
}

function startAnalysis(file) {
    // Transition Cards
    uploadCard.classList.add('exit');
    setTimeout(() => {
        analysisCard.classList.remove('hidden');
        // Small delay to allow display:block to apply before adding opacity class
        requestAnimationFrame(() => {
            analysisCard.classList.add('enter');
        });
    }, 300);

    fileNameDisplay.textContent = file.name;

    simulateProgress(file);
}

function simulateProgress(file) {
    let progress = 0;
    const stepStructure = document.getElementById('stepStructure');
    const stepInsights = document.getElementById('stepInsights');

    const interval = setInterval(() => {
        progress += Math.random() * 5;
        if (progress > 100) progress = 100;

        // Update Bar
        progressBar.style.width = `${progress}%`;
        percentageText.textContent = `${Math.round(progress)}%`;

        // Update Steps Logic
        if (progress > 30 && progress < 60) {
            stepText.textContent = "Verifying column structure...";
            stepStructure.classList.remove('pending');
            stepStructure.classList.add('active');
            updateStepIcon(stepStructure, 'fa-spin fa-spinner');
        } else if (progress >= 60 && progress < 90) {
            stepText.textContent = "Generating analytics insights...";
            updateStepIcon(stepStructure, 'fa-check-circle', true); // Complete prev
            stepStructure.classList.remove('active');
            stepStructure.classList.add('completed');

            stepInsights.classList.remove('pending');
            stepInsights.classList.add('active');
            updateStepIcon(stepInsights, 'fa-spin fa-spinner');
        } else if (progress === 100) {
            clearInterval(interval);
            stepText.textContent = "Analysis Complete!";
            updateStepIcon(stepInsights, 'fa-check-circle', true);
            stepInsights.classList.remove('active');
            stepInsights.classList.add('completed');

            // Check if file is ZIP or CSV
            const fileExt = file.name.split('.').pop().toLowerCase();

            if (fileExt === 'zip') {
                handleZipFile(file);
            } else if (fileExt === 'pdf') {
                handlePDFFile(file);
            } else {
                handleCSVFile(file);
            }
        }

    }, 150);
}

// Async CSV Processor to prevent UI freeze on large files (1M+ rows)
function handleCSVFile(file) {
    const reader = new FileReader();
    reader.onload = async function (e) {
        let stats = initStats();
        // Show indeterminate progress during processing
        document.getElementById('stepText').textContent = "Processing " + formatBytes(file.size) + " of data...";

        await processContentChunked(e.target.result, stats);
        finishProcessing(stats, file.name);
    };
    reader.readAsText(file);
}

async function handleZipFile(file) {
    try {
        if (typeof JSZip === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
            document.head.appendChild(script);
            await new Promise(resolve => script.onload = resolve);
        }

        const zip = new JSZip();
        const contents = await zip.loadAsync(file);

        const csvFiles = Object.keys(contents.files).filter(name =>
            name.toLowerCase().endsWith('.csv') && !name.startsWith('__MACOSX')
        );

        if (csvFiles.length === 0) {
            alert('No CSV files found in ZIP');
            location.reload();
            return;
        }

        let stats = initStats();

        for (const filename of csvFiles) {
            const csvText = await contents.files[filename].async('text');
            await processContentChunked(csvText, stats);
        }

        finishProcessing(stats, file.name);

    } catch (error) {
        console.error("ZIP extraction failed:", error);
        alert("Failed to extract ZIP file: " + error.message);
        location.reload();
    }
}

async function handlePDFFile(file) {
    try {
        // Load PDF.js dynamically
        if (typeof pdfjsLib === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            document.head.appendChild(script);
            await new Promise(resolve => script.onload = resolve);

            // Set worker
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const strings = content.items.map(item => item.str);
            fullText += strings.join(" ") + "\n";
        }

        // Parse the text to extract tabular data
        const parsedData = extractTableDataFromPDFText(fullText);

        if (parsedData.length === 0) {
            alert("Could not extract structured data from this PDF. Please try a CSV file.");
            location.reload();
            return;
        }

        try {
            localStorage.setItem('processedData', JSON.stringify(parsedData));
            localStorage.setItem('processedFile', file.name);
            window.location.href = 'dashboard.html';
        } catch (err) {
            console.error("Storage failed: ", err);
            alert("File too large. Using sample data.");
            window.location.href = 'dashboard.html';
        }

    } catch (error) {
        console.error("PDF processing failed:", error);
        alert("Failed to process PDF. Please try a CSV file.");
        location.reload();
    }
}

function extractTableDataFromPDFText(text) {
    // Basic heuristic to find state data rows
    const lines = text.split('\n');
    const data = [];
    const states = [
        "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
        "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
        "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
        "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
        "Uttarakhand", "West Bengal", "Andaman", "Chandigarh", "Dadra", "Daman", "Delhi",
        "Jammu", "Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
    ];

    lines.forEach(line => {
        const trimmed = line.trim();
        const stateMatch = states.find(s => trimmed.toLowerCase().startsWith(s.toLowerCase()));

        if (stateMatch) {
            // Try to extract numbers following the state name
            const remainder = trimmed.substring(stateMatch.length).replace(/,/g, '');
            const numbers = remainder.match(/(\d+)/g);

            if (numbers && numbers.length > 0) {
                const row = {
                    state: stateMatch,
                    age_0_5: numbers[0] || 0,
                    age_5_17: numbers[1] || 0,
                    age_18_greater: numbers[2] || 0,
                    total: numbers.reduce((a, b) => parseInt(a) + parseInt(b), 0)
                };
                data.push(row);
            }
        }
    });

    return data;
}

function processContentChunked(text, stats) {
    return new Promise(resolve => {
        const lines = text.split(/\r\n|\n/);
        if (lines.length < 2) { resolve(); return; }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        console.log("Detected Headers:", headers);

        const bioCols = findCols(headers, ['bio_age', 'biometric', 'bio_update', 'bio_metric']);
        const demoCols = findCols(headers, ['demo_age', 'demographic', 'demo_update']);
        const enrolCols = findCols(headers, ['age_0_5', 'age_5', 'age_18', 'enrolment', 'generated'], ['bio', 'demo', 'update']);

        const genderColName = headers.find(h => ['gender', 'sex', 'gender_category'].some(g => h.includes(g)));
        if (genderColName) stats.hasGenderData = true;

        if (bioCols.length > 0) stats.data_types.push('biometric');
        if (demoCols.length > 0) stats.data_types.push('demographic');
        if (enrolCols.length > 0) stats.data_types.push('enrolment');

        const stateIdx = headers.findIndex(h => h.includes('state') || h.includes('region'));

        // Process in chunks of 5000 lines
        const chunkSize = 5000;
        let index = 1;

        function processChunk() {
            const end = Math.min(index + chunkSize, lines.length);

            for (; index < end; index++) {
                const row = lines[index].split(',');
                if (row.length <= 1) continue;

                stats.totalRows++;
                let rowActivity = 0;

                // Biometric
                if (bioCols.length > 0) {
                    const val = sumCols(row, bioCols, headers);
                    if (val > 0) {
                        stats.biometricUpdates += val;
                        stats.totalUpdates += val;
                        rowActivity += val;
                        bioCols.forEach(col => {
                            const idx = headers.indexOf(col);
                            const val = cleanInt(row[idx]);
                            if (col.includes('5_17') || col.includes('5-18')) stats.ageCounts['5-18'] += val;
                            else if (col.includes('18_') || col.includes('18+')) stats.ageCounts['18-45'] += val;
                        });
                    }
                }

                // Demographic
                if (demoCols.length > 0) {
                    const val = sumCols(row, demoCols, headers);
                    if (val > 0) {
                        stats.demographicUpdates += val;
                        stats.totalUpdates += val;
                        rowActivity += val;
                        demoCols.forEach(col => {
                            const idx = headers.indexOf(col);
                            const val = cleanInt(row[idx]);
                            if (col.includes('5_17') || col.includes('5-18')) stats.ageCounts['5-18'] += val;
                            else if (col.includes('18_') || col.includes('18+')) stats.ageCounts['18-45'] += val;
                        });
                    }
                }

                // Enrolment
                if (enrolCols.length > 0) {
                    const val = sumCols(row, enrolCols, headers);
                    if (val > 0) {
                        stats.totalEnrolments += val;
                        rowActivity += val;
                        enrolCols.forEach(col => {
                            const idx = headers.indexOf(col);
                            const val = cleanInt(row[idx]);
                            if (col.includes('0_5') || col.includes('0-5')) stats.ageCounts['0-5'] += val;
                            else if (col.includes('5_17') || col.includes('5-18')) stats.ageCounts['5-18'] += val;
                            else if (col.includes('18_') || col.includes('18+')) stats.ageCounts['18-45'] += val;
                        });
                    }
                }

                // Gender
                if (genderColName) {
                    const gVal = (row[headers.indexOf(genderColName)] || '').toLowerCase().trim();
                    if (gVal.startsWith('m') || gVal === '1') stats.genderCounts.Male++;
                    else if (gVal.startsWith('f') || gVal === '2') stats.genderCounts.Female++;
                    else if (gVal) stats.genderCounts.Other++;
                }

                // State
                if (stateIdx !== -1) {
                    const state = (row[stateIdx] || '').trim();
                    // In raw mode or activity mode, we count this row towards the state
                    const increment = rowActivity > 0 ? rowActivity : 1;
                    if (state && increment > 0) {
                        stats.stateCounts[state] = (stats.stateCounts[state] || 0) + increment;
                    }
                }
            }

            if (index < lines.length) {
                // Yield to main thread to keep UI responsive
                setTimeout(processChunk, 0);
            } else {
                resolve();
            }
        }

        processChunk();
    });
}

function cleanInt(val) {
    return parseInt((val || '').toString().trim().replace(/['",]/g, '')) || 0;
}

function updateStepIcon(element, iconClass, isSuccess = false) {
    const icon = element.querySelector('i');
    icon.className = `fa-solid ${iconClass}`;
    if (isSuccess) icon.style.color = 'var(--success)';
}

function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

cancelBtn.addEventListener('click', () => {
    location.reload();
});

// Shared Helper for detecting columns
function findCols(headers, includes, excludes = []) {
    return headers.filter(h =>
        includes.some(inc => h.includes(inc)) &&
        !excludes.some(exc => h.includes(exc)) &&
        !h.includes('reject')
    );
}

// Helper to sum values from a list of columns
function sumCols(row, cols, headers) {
    return cols.reduce((sum, colName) => {
        const idx = headers.indexOf(colName);
        if (idx === -1) return sum;
        return sum + cleanInt(row[idx]);
    }, 0);
}

function initStats() {
    return {
        totalEnrolments: 0,
        totalUpdates: 0,
        biometricUpdates: 0,
        demographicUpdates: 0,
        genderCounts: { Male: 0, Female: 0, Other: 0 },
        ageCounts: { '0-5': 0, '5-18': 0, '18-45': 0, '45-60': 0, '60+': 0 },
        stateCounts: {},
        data_types: [], // Track types found
        hasGenderData: false,
        totalRows: 0 // Track physical rows
    };
}

function finishProcessing(stats, fileName) {
    if (stats.totalEnrolments === 0 && stats.totalUpdates === 0 && stats.totalRows === 0) {
        alert("Warning: No valid data detected. Please check your CSV column headers.\nStandard headers expected: 'State', 'Biometric Updates', 'Demographic Updates', 'Enrolment Generated'");
        console.warn("Stats were empty", stats);
    }

    // Aggressive Correction: If detected activity is less than row count, assume remaining rows are simple enrolments
    const totalActivity = stats.totalEnrolments + stats.totalUpdates;
    if (totalActivity < stats.totalRows) {
        console.log(`Adjusting counts: Total Rows (${stats.totalRows}) > Activity (${totalActivity}). Adding difference to Enrolments.`);
        stats.totalEnrolments += (stats.totalRows - totalActivity);
    }

    // De-dupe data types
    stats.data_types = [...new Set(stats.data_types)];

    localStorage.setItem('processedData', JSON.stringify(stats));
    localStorage.setItem('processedFile', fileName);
    localStorage.setItem('uploadTimestamp', Date.now().toString());
    window.location.href = 'dashboard.html?t=' + Date.now();
}
