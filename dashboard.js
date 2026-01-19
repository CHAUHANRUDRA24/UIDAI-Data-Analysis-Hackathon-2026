document.addEventListener('DOMContentLoaded', function () {
    // Initialize Charts
    initUpdatesChart();
    initAgeChart();

    // Check for "processed" data from upload flow (simulated)
    // Check for "processed" data from upload flow
    const storedFile = localStorage.getItem('processedFile');
    const storedDataJSON = localStorage.getItem('processedData');


    // Check if we have pre-calculated python data (simulated check, normally fetch)
    fetch('dashboard_data.json')
        .then(response => {
            if (!response.ok) throw new Error("Not found");
            return response.json();
        })
        .then(data => {
            console.log("Loaded dashboard_data.json from server");
            updateDashboardViews(data);
        })
        .catch(err => console.log("No external dashboard_data.json found, using local/demo data"));

    if (storedFile && storedDataJSON) {
        console.log("Loaded data for: " + storedFile);
        try {
            const data = JSON.parse(storedDataJSON);
            // Check if data is already in summary format (from Python script)
            if (data.totalEnrolments !== undefined && data.stateCounts !== undefined) {
                console.log("Detected pre-calculated summary data");
                updateDashboardViews(data);
            } else {
                console.log("Detected raw rows, processing...");
                processRealData(data);
            }
        } catch (e) {
            console.error("Failed to parse stored data", e);
        }
    } else {
        console.log("No stored data found. Initializing with defaults.");
    }

    // Expose function for external calls (e.g. from file upload of JSON)
    window.loadDashboardStats = function (stats) {
        updateDashboardViews(stats);
    };

    function processRealData(data) {
        if (!data || data.length === 0) return;

        // Helper to find key case-insensitive
        const getKey = (obj, keyPart) => Object.keys(obj).find(k => k.toLowerCase().includes(keyPart));

        // Detect data type from first row's column structure
        const firstRow = data[0];
        const hasBioColumns = getKey(firstRow, 'bio_age') !== undefined;
        const hasDemoColumns = getKey(firstRow, 'demo_age') !== undefined;
        const hasEnrolmentColumns = getKey(firstRow, 'age_0_5') !== undefined || getKey(firstRow, 'age_5_17') !== undefined;

        console.log('Data type detection:', { hasBioColumns, hasDemoColumns, hasEnrolmentColumns });

        // 1. Calculate KPI Counts
        let stats = {
            totalEnrolments: 0,
            totalUpdates: 0,
            biometricUpdates: 0,
            demographicUpdates: 0,
            genderCounts: { Male: 0, Female: 0, Other: 0 },
            ageCounts: { '0-5': 0, '5-18': 0, '18-45': 0, '45-60': 0, '60+': 0 },
            stateCounts: {}
        };

        data.forEach(row => {
            // Determine if this row is an update or enrolment based on column structure
            let isBiometric = false;
            let isDemographic = false;
            let isEnrolment = false;
            let rowCount = 0;

            if (hasBioColumns) {
                // Biometric update file
                const bio517 = getKey(row, 'bio_age_5_17');
                const bio17plus = getKey(row, 'bio_age_17_');
                if (bio517) rowCount += parseInt(row[bio517]) || 0;
                if (bio17plus) rowCount += parseInt(row[bio17plus]) || 0;

                if (rowCount > 0) {
                    stats.totalUpdates += rowCount;
                    stats.biometricUpdates += rowCount;
                    isBiometric = true;

                    // Add to age counts
                    if (bio517) stats.ageCounts['5-18'] += parseInt(row[bio517]) || 0;
                    if (bio17plus) stats.ageCounts['18-45'] += parseInt(row[bio17plus]) || 0;
                }
            } else if (hasDemoColumns) {
                // Demographic update file
                const demo517 = getKey(row, 'demo_age_5_17');
                const demo17plus = getKey(row, 'demo_age_17_');
                if (demo517) rowCount += parseInt(row[demo517]) || 0;
                if (demo17plus) rowCount += parseInt(row[demo17plus]) || 0;

                if (rowCount > 0) {
                    stats.totalUpdates += rowCount;
                    stats.demographicUpdates += rowCount;
                    isDemographic = true;

                    // Add to age counts
                    if (demo517) stats.ageCounts['5-18'] += parseInt(row[demo517]) || 0;
                    if (demo17plus) stats.ageCounts['18-45'] += parseInt(row[demo17plus]) || 0;
                }
            } else if (hasEnrolmentColumns) {
                // Enrolment file
                const age05 = getKey(row, 'age_0_5');
                const age517 = getKey(row, 'age_5_17');
                const age18plus = getKey(row, 'age_18_greater');

                if (age05) rowCount += parseInt(row[age05]) || 0;
                if (age517) rowCount += parseInt(row[age517]) || 0;
                if (age18plus) rowCount += parseInt(row[age18plus]) || 0;

                if (rowCount > 0) {
                    stats.totalEnrolments += rowCount;
                    isEnrolment = true;

                    // Add to age counts
                    if (age05) stats.ageCounts['0-5'] += parseInt(row[age05]) || 0;
                    if (age517) stats.ageCounts['5-18'] += parseInt(row[age517]) || 0;
                    if (age18plus) stats.ageCounts['18-45'] += parseInt(row[age18plus]) || 0;
                }
            }

            // State aggregation
            const stateKey = getKey(row, 'state') || getKey(row, 'region');
            if (stateKey && rowCount > 0) {
                const state = row[stateKey].trim();
                if (state) {
                    stats.stateCounts[state] = (stats.stateCounts[state] || 0) + rowCount;
                }
            }
        });

        console.log('Processed stats:', stats);
        updateDashboardViews(stats);
    }

    function updateDashboardViews(stats) {
        // Update UI Elements
        document.querySelector('.kpi-card:nth-child(1) .value').textContent = stats.totalEnrolments.toLocaleString();
        document.querySelector('.kpi-card:nth-child(2) .value').textContent = stats.totalUpdates.toLocaleString();

        // Update Charts
        updateUpdatesChart(stats.biometricUpdates, stats.demographicUpdates);
        updateAgeChart(stats.ageCounts);
        updateGenderStats(stats.genderCounts);
        updateStateStats(stats.stateCounts);

        // Update modal data if function exists
        if (window.updateModalData) {
            window.updateModalData(stats);
        }
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

    // Clickable Cards Modal Handlers
    const clickableCards = document.querySelectorAll('.clickable-card');
    clickableCards.forEach(card => {
        card.addEventListener('click', () => {
            const modalId = card.getAttribute('data-modal');
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.remove('hidden');
                setTimeout(() => modal.classList.add('show'), 10);
            }
        });
    });

    // Close buttons for all modals
    const allCloseButtons = document.querySelectorAll('.modal-close, #closeModalBtn');
    allCloseButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal-overlay');
            if (modal) {
                modal.classList.remove('show');
                setTimeout(() => modal.classList.add('hidden'), 300);
            }
        });
    });

    // Close modal on overlay click
    const allModals = document.querySelectorAll('.modal-overlay');
    allModals.forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
                setTimeout(() => modal.classList.add('hidden'), 300);
            }
        });
    });

    // Store current stats globally for modal access
    window.currentStats = null;

    // Update modal data function
    window.updateModalData = function (stats) {
        if (!stats) return;
        window.currentStats = stats;

        // Enrolment Modal
        const enrolmentTotal = document.getElementById('enrolmentTotal');
        if (enrolmentTotal) {
            enrolmentTotal.textContent = stats.totalEnrolments.toLocaleString();
        }

        const enrolmentAvg = document.getElementById('enrolmentAvg');
        if (enrolmentAvg) {
            enrolmentAvg.textContent = Math.round(stats.totalEnrolments / 30).toLocaleString() + '/day';
        }

        // Age breakdown
        const ageBreakdown = document.getElementById('enrolmentAgeBreakdown');
        if (ageBreakdown && stats.ageCounts) {
            ageBreakdown.innerHTML = Object.entries(stats.ageCounts).map(([age, count]) => `
                <div class="age-breakdown-item">
                    <span>${age} years</span>
                    <strong>${count.toLocaleString()}</strong>
                </div>
            `).join('');
        }

        // Updates Modal
        const updatesTotal = document.getElementById('updatesTotal');
        if (updatesTotal) {
            updatesTotal.textContent = stats.totalUpdates.toLocaleString();
        }

        const updatesBio = document.getElementById('updatesBio');
        if (updatesBio) {
            updatesBio.textContent = stats.biometricUpdates.toLocaleString();
        }

        const updatesDemo = document.getElementById('updatesDemo');
        if (updatesDemo) {
            updatesDemo.textContent = stats.demographicUpdates.toLocaleString();
        }
    };
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

// File Viewer Modal Logic
document.addEventListener('DOMContentLoaded', function () {
    const viewFileBtn = document.getElementById('viewFileBtn');
    const fileModal = document.getElementById('fileModal');
    const closeFileBtn = document.getElementById('closeFileModalBtn');
    const fileTableHead = document.getElementById('fileTableHead');
    const fileTableBody = document.getElementById('fileTableBody');

    if (viewFileBtn && fileModal && closeFileBtn) {
        // Pagination State
        let currentPage = 1;
        const rowsPerPage = 100;
        let tableData = [];

        function renderTable(page) {
            const start = (page - 1) * rowsPerPage;
            const end = start + rowsPerPage;
            const displayData = tableData.slice(start, end);

            // Should already have headers if data > 0
            if (displayData.length > 0) {
                const headers = Object.keys(tableData[0]);
                fileTableBody.innerHTML = displayData.map(row => `
                    <tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>
                `).join('');
            }

            // Update Footer
            const totalPages = Math.ceil(tableData.length / rowsPerPage) || 1;
            document.getElementById('pageInfo').textContent = `Page ${page} of ${totalPages} (${tableData.length} records)`;
            document.getElementById('prevPageBtn').disabled = page === 1;
            document.getElementById('nextPageBtn').disabled = page === totalPages;
        }

        document.getElementById('prevPageBtn').addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderTable(currentPage);
            }
        });

        document.getElementById('nextPageBtn').addEventListener('click', () => {
            const totalPages = Math.ceil(tableData.length / rowsPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                renderTable(currentPage);
            }
        });

        viewFileBtn.addEventListener('click', () => {
            const storedDataJSON = localStorage.getItem('processedData');

            if (!storedDataJSON) {
                alert("No data found to display. Please upload a file first.");
                return;
            }

            try {
                tableData = JSON.parse(storedDataJSON);
                currentPage = 1;

                if (tableData.length > 0) {
                    // Populate Headers Once
                    const headers = Object.keys(tableData[0]);
                    fileTableHead.innerHTML = `<tr>${headers.map(h => `<th>${h.toUpperCase()}</th>`).join('')}</tr>`;

                    // Render First Page
                    renderTable(currentPage);
                }

                fileModal.classList.remove('hidden');
                setTimeout(() => fileModal.classList.add('show'), 10);

            } catch (e) {
                console.error("Error parsing data for table view", e);
                alert("Error displaying data: " + e.message);
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
