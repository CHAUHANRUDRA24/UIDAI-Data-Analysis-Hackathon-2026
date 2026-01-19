document.addEventListener('DOMContentLoaded', function () {
    // Initialize Charts
    initUpdatesChart();
    initAgeChart();

    // Check for "processed" data from upload flow (simulated)
    // Check for "processed" data from upload flow
    const storedFile = localStorage.getItem('processedFile');
    const storedDataJSON = localStorage.getItem('processedData');

    if (storedFile && storedDataJSON) {
        console.log("Loaded real data for: " + storedFile);
        try {
            const data = JSON.parse(storedDataJSON);
            processRealData(data);
        } catch (e) {
            console.error("Failed to parse stored data", e);
        }
    } else {
        console.log("No real data found, using demo data.");
    }

    function processRealData(data) {
        if (!data || data.length === 0) return;

        // Helper to find key case-insensitive
        const getKey = (obj, keyPart) => Object.keys(obj).find(k => k.toLowerCase().includes(keyPart));

        // 1. Calculate KPI Counts
        let totalEnrolments = 0;
        let totalUpdates = 0;
        let biometricUpdates = 0;
        let demographicUpdates = 0;
        let genderCounts = { Male: 0, Female: 0, Other: 0 };
        let ageCounts = { '0-5': 0, '5-18': 0, '18-45': 0, '45-60': 0, '60+': 0 };
        let stateCounts = {};

        data.forEach(row => {
            // Activity Type Detection (looking for 'type', 'activity', or assuming based on 'update' keyword existence)
            const typeKey = getKey(row, 'type') || getKey(row, 'activity');
            const typeVal = typeKey ? row[typeKey].toLowerCase() : '';

            // Subtype
            const subTypeKey = getKey(row, 'sub') || getKey(row, 'category');
            const subTypeVal = subTypeKey ? row[subTypeKey].toLowerCase() : '';

            // Logic: If explicitly "Update" or subtype has bio/demo, count as update. Else Enrolment.
            if (typeVal.includes('update') || subTypeVal.includes('biometric') || subTypeVal.includes('demographic')) {
                totalUpdates++;
                if (subTypeVal.includes('biometric') || typeVal.includes('biometric')) biometricUpdates++;
                else demographicUpdates++; // default to demographic if not bio
            } else {
                totalEnrolments++;
            }

            // Gender
            const genderKey = getKey(row, 'gender') || getKey(row, 'sex');
            if (genderKey) {
                const g = row[genderKey].trim().toLowerCase();
                if (g.startsWith('m')) genderCounts.Male++;
                else if (g.startsWith('f')) genderCounts.Female++;
                else genderCounts.Other++;
            }

            // Age
            const ageKey = getKey(row, 'age');
            if (ageKey) {
                const age = parseInt(row[ageKey]);
                if (!isNaN(age)) {
                    if (age <= 5) ageCounts['0-5']++;
                    else if (age <= 18) ageCounts['5-18']++;
                    else if (age <= 45) ageCounts['18-45']++;
                    else if (age <= 60) ageCounts['45-60']++;
                    else ageCounts['60+']++;
                }
            }

            // State
            const stateKey = getKey(row, 'state') || getKey(row, 'region');
            if (stateKey) {
                const state = row[stateKey].trim();
                if (state) {
                    stateCounts[state] = (stateCounts[state] || 0) + 1;
                }
            }
        });

        // Update UI Elements
        document.querySelector('.kpi-card:nth-child(1) .value').textContent = totalEnrolments.toLocaleString();
        document.querySelector('.kpi-card:nth-child(2) .value').textContent = totalUpdates.toLocaleString();

        // Update Charts
        updateUpdatesChart(biometricUpdates, demographicUpdates);
        updateAgeChart(ageCounts);
        updateGenderStats(genderCounts);
        updateStateStats(stateCounts);
    }

    function updateUpdatesChart(bioBytes, demoBytes) {
        const chart = Chart.getChart("updatesChart");
        if (chart) {
            // Recalculate percentages? Chart displays raw usually, handled by tooltips. 
            // The labels in HTML (legend) are static 65%/35%, we should update them too theoretically or just the chart.
            // For hackathon, updating chart visual is key.
            chart.data.datasets[0].data = [bioBytes, demoBytes];
            chart.update();

            // Update Legend Text if strictly needed (simple version)
            const total = bioBytes + demoBytes;
            if (total > 0) {
                const bioP = Math.round((bioBytes / total) * 100);
                const demoP = 100 - bioP;
                // Try to find legend items - this depends on DOM structure matching exactly
                const legends = document.querySelectorAll('.chart-legend .l-val');
                if (legends.length >= 2) {
                    legends[0].textContent = bioP + "%";
                    legends[1].textContent = demoP + "%";
                }
            }
        }
    }

    function updateAgeChart(counts) {
        const chart = Chart.getChart("ageChart");
        if (chart) {
            chart.data.datasets[0].data = Object.values(counts);
            chart.update();
        }
    }

    function updateGenderStats(counts) {
        const total = counts.Male + counts.Female + counts.Other || 1;
        const mp = Math.round((counts.Male / total) * 100);
        const fp = Math.round((counts.Female / total) * 100);
        const op = 100 - mp - fp; // Reminder

        // Update DOM
        const rows = document.querySelectorAll('.gender-row');
        if (rows.length >= 2) {
            rows[0].querySelector('.g-bar-fill').style.width = `${mp}%`;
            rows[0].querySelector('.g-val').textContent = `${mp}%`;

            rows[1].querySelector('.g-bar-fill').style.width = `${fp}%`;
            rows[1].querySelector('.g-val').textContent = `${fp}%`;
        }
    }

    function updateStateStats(counts) {
        // Sort states by count desc
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        const top3 = sorted.slice(0, 3);

        const listContainer = document.querySelector('.region-list');
        // Clear current static list
        if (listContainer) {
            listContainer.innerHTML = '';
            top3.forEach((item, index) => {
                const name = item[0];
                const val = item[1];
                const maxVal = sorted[0][1];
                const width = Math.round((val / maxVal) * 100);

                const html = `
                <div class="region-item">
                    <div class="rank">${index + 1}</div>
                    <div class="region-info">
                        <h4>${name}</h4>
                        <div class="bar-bg">
                            <div class="bar-fill" style="width: ${width}%"></div>
                        </div>
                    </div>
                    <div class="region-stats">
                        <span class="r-val">${val.toLocaleString()}</span>
                        <span class="r-trend up">
                            <i class="fa-solid fa-sync"></i> Real
                        </span>
                    </div>
                </div>`;
                listContainer.insertAdjacentHTML('beforeend', html);
            });
        }

        // Update Modal Global Data (stateData variable from previous edit)
        // We need to re-generate the stateData array that the "View All" button uses.
        // Since stateData was defined locally in the previous scope, we might need a global way or re-attach listener.
        // Actually, we can just update the `stateData` if we make it accessible or re-write the View All logic slightly.
        // For now, let's just make the View All button re-generate the list based on this new data.

        // Quick fix: Update the click listener or rely on a global. 
        // Simplest: Replace the "View All" listener logic here if we can't access `stateData`.
        const viewAllBtn = document.getElementById('viewAllStatesBtn');
        if (viewAllBtn) {
            // Clone to remove old listener
            const newBtn = viewAllBtn.cloneNode(true);
            viewAllBtn.parentNode.replaceChild(newBtn, viewAllBtn);

            newBtn.addEventListener('click', () => {
                const modal = document.getElementById('statesModal');
                const tableBody = document.getElementById('statesTableBody');

                const allStatesStats = sorted.map((item, index) => {
                    return `
                    <tr>
                        <td>#${index + 1}</td>
                        <td>${item[0]}</td>
                        <td>${item[1].toLocaleString()}</td>
                        <td class="r-trend neutral">
                            Real Data
                        </td>
                    </tr>`;
                }).join('');

                tableBody.innerHTML = allStatesStats;
                modal.classList.remove('hidden');
                setTimeout(() => modal.classList.add('show'), 10);
            });
        }
    }

    // Navigation Logic
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view-section');

    console.log("Nav Items found:", navItems.length);
    console.log("Views found:", views.length);

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            console.log("Nav clicked:", item.id);

            // Remove active class from all nav items
            navItems.forEach(nav => nav.classList.remove('active'));
            // Add active class to clicked item
            item.classList.add('active');

            // Hide all views
            views.forEach(view => view.classList.add('hidden'));

            // Show target view
            const targetId = item.id.replace('nav-', 'view-');
            const targetView = document.getElementById(targetId);
            if (targetView) {
                console.log("Switching to view:", targetId);
                targetView.classList.remove('hidden');
            } else {
                console.error("Target view not found:", targetId);
            }
        });
    });

    // State Modal Logic
    const viewAllBtn = document.getElementById('viewAllStatesBtn');
    const modal = document.getElementById('statesModal');
    const closeBtn = document.getElementById('closeModalBtn');
    const tableBody = document.getElementById('statesTableBody');

    // Dummy Data for States
    const stateData = [
        { rank: 1, name: 'Uttar Pradesh', enrolments: '854k', trend: '+5%', trendClass: 'up', icon: 'fa-arrow-up' },
        { rank: 2, name: 'Maharashtra', enrolments: '721k', trend: '+8%', trendClass: 'up', icon: 'fa-arrow-up' },
        { rank: 3, name: 'Bihar', enrolments: '640k', trend: '-2%', trendClass: 'down', icon: 'fa-arrow-down' },
        { rank: 4, name: 'West Bengal', enrolments: '512k', trend: '+1%', trendClass: 'up', icon: 'fa-arrow-up' },
        { rank: 5, name: 'Madhya Pradesh', enrolments: '498k', trend: '+12%', trendClass: 'up', icon: 'fa-arrow-up' },
        { rank: 6, name: 'Tamil Nadu', enrolments: '445k', trend: '0%', trendClass: 'neutral', icon: 'fa-minus' },
        { rank: 7, name: 'Rajasthan', enrolments: '410k', trend: '-1%', trendClass: 'down', icon: 'fa-arrow-down' },
        { rank: 8, name: 'Karnataka', enrolments: '389k', trend: '+4%', trendClass: 'up', icon: 'fa-arrow-up' },
        { rank: 9, name: 'Gujarat', enrolments: '376k', trend: '+3%', trendClass: 'up', icon: 'fa-arrow-up' },
        { rank: 10, name: 'Andhra Pradesh', enrolments: '320k', trend: '+2%', trendClass: 'up', icon: 'fa-arrow-up' }
    ];

    if (viewAllBtn && modal && closeBtn) {
        console.log("View All States elements found, attaching listeners.");
        viewAllBtn.addEventListener('click', () => {
            // Populate table
            tableBody.innerHTML = stateData.map(state => `
                <tr>
                    <td>#${state.rank}</td>
                    <td>${state.name}</td>
                    <td>${state.enrolments}</td>
                    <td class="r-trend ${state.trendClass}" style="text-align: left; justify-content: flex-start;">
                        <i class="fa-solid ${state.icon}"></i> ${state.trend}
                    </td>
                </tr>
            `).join('');

            modal.classList.remove('hidden');
            // Small timeout to allow display:block to apply before opacity transition
            setTimeout(() => modal.classList.add('show'), 10);
        });

        const closeModal = () => {
            modal.classList.remove('show');
            setTimeout(() => modal.classList.add('hidden'), 300);
        };

        closeBtn.addEventListener('click', closeModal);

        // Close on click outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    } else {
        console.error("View All States elements NOT found:", { viewAllBtn, modal, closeBtn });
    }

    // File Viewer Modal Logic
    const viewFileBtn = document.getElementById('viewFileBtn');
    const fileModal = document.getElementById('fileModal');
    const closeFileBtn = document.getElementById('closeFileModalBtn');
    const fileTableHead = document.getElementById('fileTableHead');
    const fileTableBody = document.getElementById('fileTableBody');

    if (viewFileBtn && fileModal && closeFileBtn) {
        viewFileBtn.addEventListener('click', () => {
            const storedDataJSON = localStorage.getItem('processedData');

            if (!storedDataJSON) {
                alert("No data found to display.");
                return;
            }

            try {
                const data = JSON.parse(storedDataJSON);
                if (data.length > 0) {
                    // Populate Headers
                    const headers = Object.keys(data[0]);
                    fileTableHead.innerHTML = `<tr>${headers.map(h => `<th>${h.toUpperCase()}</th>`).join('')}</tr>`;

                    // Populate Body
                    fileTableBody.innerHTML = data.map(row => `
                        <tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>
                    `).join('');
                }

                fileModal.classList.remove('hidden');
                setTimeout(() => fileModal.classList.add('show'), 10);

            } catch (e) {
                console.error("Error parsing data for table view", e);
                alert("Error displaying data.");
            }
        });

        const closeFileModal = () => {
            fileModal.classList.remove('show');
            setTimeout(() => fileModal.classList.add('hidden'), 300);
        };

        closeFileBtn.addEventListener('click', closeFileModal);

        fileModal.addEventListener('click', (e) => {
            if (e.target === fileModal) {
                closeFileModal();
            }
        });
    }
});

function initUpdatesChart() {
    const ctx = document.getElementById('updatesChart').getContext('2d');

    // Gradient for fills
    let gradientBiometric = ctx.createLinearGradient(0, 0, 0, 140);
    gradientBiometric.addColorStop(0, '#a855f7');
    gradientBiometric.addColorStop(1, '#9333ea');

    let gradientDemo = ctx.createLinearGradient(0, 0, 0, 140);
    gradientDemo.addColorStop(0, '#4f46e5');
    gradientDemo.addColorStop(1, '#4338ca');

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Biometric', 'Demographic'],
            datasets: [{
                data: [65, 35],
                backgroundColor: [
                    '#a855f7',
                    '#4f46e5'
                ],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: {
                legend: {
                    display: false // Custom legend built in HTML
                },
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    titleColor: '#1e293b',
                    bodyColor: '#475569',
                    borderColor: '#e2e8f0',
                    borderWidth: 1,
                    padding: 10,
                    displayColors: true,
                    callbacks: {
                        label: function (context) {
                            return ' ' + context.label + ': ' + context.parsed + '%';
                        }
                    }
                }
            },
            animation: {
                animateScale: true,
                animateRotate: true
            }
        }
    });
}

function initAgeChart() {
    const ctx = document.getElementById('ageChart').getContext('2d');

    // Gradient
    let gradientFill = ctx.createLinearGradient(0, 0, 0, 400);
    gradientFill.addColorStop(0, 'rgba(79, 70, 229, 0.5)');
    gradientFill.addColorStop(1, 'rgba(79, 70, 229, 0.05)');

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['0-5', '5-18', '18-45', '45-60', '60+'],
            datasets: [{
                label: 'Enrolments',
                data: [120, 250, 450, 180, 90], // Demo data
                backgroundColor: gradientFill,
                borderColor: '#4f46e5',
                borderWidth: 1,
                borderRadius: 4,
                barThickness: 30,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    titleColor: '#1e293b',
                    bodyColor: '#475569',
                    borderColor: '#e2e8f0',
                    borderWidth: 1,
                    padding: 10,
                    callbacks: {
                        label: function (context) {
                            return ' ' + context.parsed.y + 'k';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                        drawBorder: false,
                    },
                    ticks: {
                        font: {
                            family: "'Inter', sans-serif",
                            size: 11
                        },
                        color: '#94a3b8'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            family: "'Inter', sans-serif",
                            size: 11
                        },
                        color: '#64748b'
                    }
                }
            }
        }
    });
}
