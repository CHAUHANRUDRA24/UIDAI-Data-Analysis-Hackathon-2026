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

            // Check if file is ZIP or CSV or PDF
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

async function handleZipFile(file) {
    try {
        // Load JSZip dynamically if not already loaded
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

        // Process and aggregate stats instead of storing all rows
        let stats = {
            totalEnrolments: 0,
            totalUpdates: 0,
            biometricUpdates: 0,
            demographicUpdates: 0,
            genderCounts: { Male: 0, Female: 0, Other: 0 },
            ageCounts: { '0-5': 0, '5-18': 0, '18-45': 0, '45-60': 0, '60+': 0 },
            stateCounts: {}
        };

        for (const filename of csvFiles) {
            const csvText = await contents.files[filename].async('text');
            const rows = csvText.split('\n').map(row => row.split(','));
            const headers = rows[0].map(h => h.trim().toLowerCase());

            const hasBio = headers.some(h => h.includes('bio_age'));
            const hasDemo = headers.some(h => h.includes('demo_age'));
            const hasEnrol = headers.some(h => h.includes('age_0_5') || h.includes('age_5_17'));

            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (row.length <= 1) continue;

                let rowData = {};
                headers.forEach((h, idx) => {
                    rowData[h] = row[idx]?.trim();
                });

                let count = 0;

                if (hasBio) {
                    const bio517 = parseInt(rowData['bio_age_5_17']) || 0;
                    const bio17 = parseInt(rowData['bio_age_17_']) || 0;
                    count = bio517 + bio17;
                    stats.totalUpdates += count;
                    stats.biometricUpdates += count;
                    stats.ageCounts['5-18'] += bio517;
                    stats.ageCounts['18-45'] += bio17;
                } else if (hasDemo) {
                    const demo517 = parseInt(rowData['demo_age_5_17']) || 0;
                    const demo17 = parseInt(rowData['demo_age_17_']) || 0;
                    count = demo517 + demo17;
                    stats.totalUpdates += count;
                    stats.demographicUpdates += count;
                    stats.ageCounts['5-18'] += demo517;
                    stats.ageCounts['18-45'] += demo17;
                } else if (hasEnrol) {
                    const age05 = parseInt(rowData['age_0_5']) || 0;
                    const age517 = parseInt(rowData['age_5_17']) || 0;
                    const age18 = parseInt(rowData['age_18_greater']) || 0;
                    count = age05 + age517 + age18;
                    stats.totalEnrolments += count;
                    stats.ageCounts['0-5'] += age05;
                    stats.ageCounts['5-18'] += age517;
                    stats.ageCounts['18-45'] += age18;
                }

                const state = rowData['state'];
                if (state && count > 0) {
                    stats.stateCounts[state] = (stats.stateCounts[state] || 0) + count;
                }
            }
        }

        // Store only aggregated stats (much smaller - no quota issues)
        localStorage.setItem('processedData', JSON.stringify(stats));
        localStorage.setItem('processedFile', file.name);
        localStorage.setItem('uploadTimestamp', Date.now().toString());
        // Force refresh by adding timestamp to URL
        window.location.href = 'dashboard.html?t=' + Date.now();

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
    // Looks for lines that look like: "StateName Number Number ..."
    const lines = text.split('\n');
    const data = [];

    // Common state names to look for (start of line)
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
        // Check if line starts with a state name
        const stateMatch = states.find(s => trimmed.toLowerCase().startsWith(s.toLowerCase()));

        if (stateMatch) {
            // Try to extract numbers following the state name
            // Remove the state name and commas
            const remainder = trimmed.substring(stateMatch.length).replace(/,/g, '');
            const numbers = remainder.match(/(\d+)/g);

            if (numbers && numbers.length > 0) {
                // Construct a data object
                // We assume the first number is Total Enrolment, second is Updates, etc.
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

function handleCSVFile(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
        const text = e.target.result;
        const rows = text.split('\n').map(row => row.split(','));
        const headers = rows[0].map(h => h.trim().toLowerCase());

        const hasBio = headers.some(h => h.includes('bio_age'));
        const hasDemo = headers.some(h => h.includes('demo_age'));
        const hasEnrol = headers.some(h => h.includes('age_0_5') || h.includes('age_5_17'));

        let stats = {
            totalEnrolments: 0,
            totalUpdates: 0,
            biometricUpdates: 0,
            demographicUpdates: 0,
            genderCounts: { Male: 0, Female: 0, Other: 0 },
            ageCounts: { '0-5': 0, '5-18': 0, '18-45': 0, '45-60': 0, '60+': 0 },
            stateCounts: {}
        };

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (row.length <= 1) continue;

            let rowData = {};
            headers.forEach((h, idx) => {
                rowData[h] = row[idx]?.trim();
            });

            let count = 0;

            if (hasBio) {
                const bio517 = parseInt(rowData['bio_age_5_17']) || 0;
                const bio17 = parseInt(rowData['bio_age_17_']) || 0;
                count = bio517 + bio17;
                stats.totalUpdates += count;
                stats.biometricUpdates += count;
                stats.ageCounts['5-18'] += bio517;
                stats.ageCounts['18-45'] += bio17;
            } else if (hasDemo) {
                const demo517 = parseInt(rowData['demo_age_5_17']) || 0;
                const demo17 = parseInt(rowData['demo_age_17_']) || 0;
                count = demo517 + demo17;
                stats.totalUpdates += count;
                stats.demographicUpdates += count;
                stats.ageCounts['5-18'] += demo517;
                stats.ageCounts['18-45'] += demo17;
            } else if (hasEnrol) {
                const age05 = parseInt(rowData['age_0_5']) || 0;
                const age517 = parseInt(rowData['age_5_17']) || 0;
                const age18 = parseInt(rowData['age_18_greater']) || 0;
                count = age05 + age517 + age18;
                stats.totalEnrolments += count;
                stats.ageCounts['0-5'] += age05;
                stats.ageCounts['5-18'] += age517;
                stats.ageCounts['18-45'] += age18;
            }

            const state = rowData['state'];
            if (state && count > 0) {
                stats.stateCounts[state] = (stats.stateCounts[state] || 0) + count;
            }
        }

        // Store only aggregated stats - no quota issues!
        localStorage.setItem('processedData', JSON.stringify(stats));
        localStorage.setItem('processedFile', file.name);
        localStorage.setItem('uploadTimestamp', Date.now().toString());
        window.location.href = 'dashboard.html?t=' + Date.now();
    };
    reader.readAsText(file);
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
