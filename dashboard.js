document.addEventListener('DOMContentLoaded', function () {
    // Initialize Charts
    initUpdatesChart();
    initAgeChart();

    // Check for "processed" data from upload flow (simulated)
    const storedFile = localStorage.getItem('processedFile');
    if (storedFile) {
        // In a real app, we'd parse this.
        // For now, we update the title to show it's live
        console.log("Loaded data for: " + storedFile);
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
