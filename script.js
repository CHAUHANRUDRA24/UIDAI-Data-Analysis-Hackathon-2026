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
    const validTypes = ['text/csv', 'application/zip', 'application/x-zip-compressed'];
    // Simple verification (production should be more robust)

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

            // Read file content before redirect
            const reader = new FileReader();
            reader.onload = function (e) {
                const text = e.target.result;
                // Parse CSV
                // Assuming simple CSV structure: State, District, Sub District, Pin Code, Gender, Age, Activity Type (Enrolment/Update), Sub Type (Demographic/Biometric), Status
                // If simple dataset, we'll try to map it. For now, let's just save the raw rows or a structured object.
                // We will limit to first 2000 rows to avoid localStorage quota limits.

                const rows = text.split('\n').slice(0, 2000).map(row => row.split(','));
                const headers = rows[0].map(h => h.trim().toLowerCase());

                const parsedData = rows.slice(1).filter(r => r.length > 1).map(row => {
                    let obj = {};
                    headers.forEach((h, i) => {
                        obj[h] = row[i]?.trim(); // handle potential missing values
                    });
                    return obj;
                });

                try {
                    localStorage.setItem('processedData', JSON.stringify(parsedData));
                    localStorage.setItem('processedFile', file.name);
                    window.location.href = 'dashboard.html';
                } catch (err) {
                    console.error("Storage failed: ", err);
                    alert("File too large for local storage demonstration. Using sample data.");
                    window.location.href = 'dashboard.html';
                }
            };
            reader.readAsText(file);
        }

    }, 150);
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
