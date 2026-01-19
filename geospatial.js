// Geospatial Visualization Module
// Advanced Interactive Map with Drill-down, Time-slider, and Layer Toggle

class GeospatialVisualization {
    constructor() {
        this.currentLayer = 'heatmap';
        this.currentMetric = 'total';
        this.currentView = 'india'; // 'india' or 'state'
        this.currentDemographic = 'all'; // 'all', '0-5', '5-18', '18+'
        this.showInfrastructure = false;

        this.selectedState = null;
        this.isPlaying = false;
        this.playInterval = null;

        // Real data from uploaded files
        this.realData = null;
        this.processedStats = null;
        this.timelineData = [];
        this.currentTimeIndex = 0;

        // Infrastructure Data
        this.serviceCenters = [];

        // Sample India states data with coordinates (simplified. In production use TopoJSON)
        this.indiaStates = this.getIndiaStatesData();
        this.districtData = this.getDistrictData();

        this.generateServiceCenters();
        this.loadRealData();
    }

    loadRealData() {
        // Prioritize Local Storage (Uploaded Data)
        const storedDataJSON = localStorage.getItem('processedData');

        if (storedDataJSON) {
            console.log("Geospatial: Found local session data, using it.");
            this.loadFromLocalStorage();
        } else {
            console.log("Geospatial: No local data, fetching server data.");
            // Try to load from dashboard_data.json from server
            fetch('dashboard_data.json')
                .then(response => {
                    if (!response.ok) throw new Error("Not found");
                    return response.json();
                })
                .then(data => {
                    console.log("Geospatial: Loaded dashboard_data.json", data);
                    this.processedStats = data;
                    this.extractTimelineFromStats();
                    this.init();
                })
                .catch(err => {
                    console.log("Geospatial: No server data either, using fallback");
                    this.useFallbackData();
                });
        }
    }

    loadFromLocalStorage() {
        const storedDataJSON = localStorage.getItem('processedData');

        if (storedDataJSON) {
            try {
                this.realData = JSON.parse(storedDataJSON);
                console.log("Geospatial: Loaded data from localStorage", this.realData);

                // Process the raw data to extract stats
                this.processRawData();
                this.extractTimelineFromRawData();
                this.init();
            } catch (e) {
                console.error("Geospatial: Failed to parse stored data", e);
                this.useFallbackData();
            }
        } else {
            console.log("Geospatial: No stored data, using fallback");
            this.useFallbackData();
        }
    }

    useFallbackData() {
        // Use sample data as fallback
        this.timelineData = this.generateTimelineData();
        this.init();
    }

    processRawData() {
        if (!this.realData || this.realData.length === 0) {
            this.useFallbackData();
            return;
        }

        const getKey = (obj, keyPart) => Object.keys(obj).find(k => k.toLowerCase().includes(keyPart));
        const firstRow = this.realData[0];

        // Detect data type
        const hasBioColumns = getKey(firstRow, 'bio_age') !== undefined;
        const hasDemoColumns = getKey(firstRow, 'demo_age') !== undefined;
        const hasEnrolmentColumns = getKey(firstRow, 'age_0_5') !== undefined || getKey(firstRow, 'age_5_17') !== undefined;

        let stats = {
            totalEnrolments: 0,
            totalUpdates: 0,
            biometricUpdates: 0,
            demographicUpdates: 0,
            stateCounts: {}, // Will store objects: { total: X, age_0_5: Y, ... }
            districtCounts: {}
        };

        this.realData.forEach(row => {
            let rowCount = 0;
            let currentAge05 = 0;
            let currentAge518 = 0;
            let currentAge18Plus = 0;

            if (hasBioColumns) {
                const bio517 = getKey(row, 'bio_age_5_17');
                const bio17plus = getKey(row, 'bio_age_17_');
                if (bio517) rowCount += parseInt(row[bio517]) || 0;
                if (bio17plus) rowCount += parseInt(row[bio17plus]) || 0;
                stats.biometricUpdates += rowCount;
                stats.totalUpdates += rowCount;
            } else if (hasDemoColumns) {
                const demo517 = getKey(row, 'demo_age_5_17');
                const demo17plus = getKey(row, 'demo_age_17_');
                if (demo517) rowCount += parseInt(row[demo517]) || 0;
                if (demo17plus) rowCount += parseInt(row[demo17plus]) || 0;
                stats.demographicUpdates += rowCount;
                stats.totalUpdates += rowCount;
            } else if (hasEnrolmentColumns) {
                const age05 = getKey(row, 'age_0_5');
                const age517 = getKey(row, 'age_5_17');
                const age18plus = getKey(row, 'age_18_greater');

                if (age05) currentAge05 = parseInt(row[age05]) || 0;
                if (age517) currentAge518 = parseInt(row[age517]) || 0;
                if (age18plus) currentAge18Plus = parseInt(row[age18plus]) || 0;

                rowCount = currentAge05 + currentAge518 + currentAge18Plus;
                stats.totalEnrolments += rowCount;
            }

            // State aggregation
            const stateKey = getKey(row, 'state') || getKey(row, 'region');
            if (stateKey && rowCount > 0) {
                const state = row[stateKey].trim();
                if (state) {
                    if (!stats.stateCounts[state]) {
                        stats.stateCounts[state] = { total: 0, age_0_5: 0, age_5_18: 0, age_18_plus: 0 };
                    }
                    stats.stateCounts[state].total += rowCount;
                    stats.stateCounts[state].age_0_5 += currentAge05;
                    stats.stateCounts[state].age_5_18 += currentAge518;
                    stats.stateCounts[state].age_18_plus += currentAge18Plus;
                }
            }

            // District aggregation
            const districtKey = getKey(row, 'district');
            if (districtKey && stateKey && rowCount > 0) {
                const state = row[stateKey].trim();
                const district = row[districtKey].trim();
                if (state && district) {
                    if (!stats.districtCounts[state]) {
                        stats.districtCounts[state] = {};
                    }
                    if (!stats.districtCounts[state][district]) {
                        stats.districtCounts[state][district] = { total: 0, age_0_5: 0, age_5_18: 0, age_18_plus: 0 };
                    }
                    stats.districtCounts[state][district].total += rowCount;
                    stats.districtCounts[state][district].age_0_5 += currentAge05;
                    stats.districtCounts[state][district].age_5_18 += currentAge518;
                    stats.districtCounts[state][district].age_18_plus += currentAge18Plus;
                }
            }
        });

        this.processedStats = stats;
        console.log("Geospatial: Processed granular stats", stats);
    }

    extractTimelineFromRawData() {
        if (!this.realData || this.realData.length === 0) {
            this.timelineData = this.generateTimelineData();
            return;
        }

        const getKey = (obj, keyPart) => Object.keys(obj).find(k => k.toLowerCase().includes(keyPart));
        const dateKey = getKey(this.realData[0], 'date');

        if (!dateKey) {
            // No date field, generate synthetic timeline
            this.timelineData = this.generateTimelineData();
            return;
        }

        // Extract unique months from data
        const monthlyData = {};

        this.realData.forEach(row => {
            if (row[dateKey]) {
                const date = new Date(row[dateKey]);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

                if (!monthlyData[monthKey]) {
                    monthlyData[monthKey] = { count: 0, month: date.getMonth() };
                }

                // Count enrolments for this month
                Object.keys(row).forEach(key => {
                    if (key.includes('age') && !isNaN(row[key])) {
                        monthlyData[monthKey].count += parseInt(row[key]) || 0;
                    }
                });
            }
        });

        // Convert to timeline format
        const sortedMonths = Object.keys(monthlyData).sort();
        if (sortedMonths.length > 0) {
            const maxCount = Math.max(...Object.values(monthlyData).map(m => m.count));
            this.timelineData = sortedMonths.slice(0, 12).map((key, index) => ({
                month: monthlyData[key].month,
                multiplier: monthlyData[key].count / maxCount,
                label: key
            }));
        } else {
            this.timelineData = this.generateTimelineData();
        }
    }

    extractTimelineFromStats() {
        // When we have pre-processed stats, generate a synthetic timeline
        this.timelineData = this.generateTimelineData();
    }

    generateServiceCenters() {
        this.serviceCenters = [];

        // Use uploaded data to determine density if available
        const stateCounts = this.processedStats && this.processedStats.stateCounts ? this.processedStats.stateCounts : null;

        this.indiaStates.forEach(state => {
            let count = 0;

            if (stateCounts) {
                // Get count from uploaded data
                let stateVal = stateCounts[state.name];

                // Handle object vs number format
                let totalEnrol = 0;
                if (typeof stateVal === 'object') {
                    totalEnrol = stateVal.total || 0;
                } else if (typeof stateVal === 'number') {
                    totalEnrol = stateVal;
                }

                // Algorithm: 1 center per 100k enrolments approx, min 2, max 15 for visual clarity
                if (totalEnrol > 0) {
                    count = Math.max(2, Math.min(15, Math.floor(totalEnrol / 100000)));
                } else {
                    count = 2; // Default low
                }
            } else {
                // Fallback to random if no data
                count = Math.floor(Math.random() * 3) + 3;
            }

            for (let i = 0; i < count; i++) {
                this.serviceCenters.push({
                    state: state.name,
                    x: state.cx + (Math.random() * 60 - 30),
                    y: state.cy + (Math.random() * 60 - 30),
                    type: Math.random() > 0.5 ? 'Permanent' : 'Mobile'
                });
            }
        });

        console.log(`Geospatial: Generated ${this.serviceCenters.length} service centers based on data density.`);
    }

    init() {
        this.generateServiceCenters();
        this.setupEventListeners();
        this.initializeTimeSlider();
        this.renderMap();
        this.updateStats();
    }

    setupEventListeners() {
        // Layer toggle buttons
        document.querySelectorAll('.layer-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Ensure we target the button correctly (handle icon clicks)
                const targetBtn = e.target.closest('.layer-btn');
                if (!targetBtn) return;

                document.querySelectorAll('.layer-btn').forEach(b => b.classList.remove('active'));
                targetBtn.classList.add('active');
                this.currentLayer = targetBtn.dataset.layer;
                this.renderMap();
            });
        });

        // Metric selector
        const metricSelector = document.getElementById('metricSelector');
        if (metricSelector) {
            metricSelector.addEventListener('change', (e) => {
                this.currentMetric = e.target.value;
                this.renderMap();
                this.updateStats();
            });
        }

        // Demographic Selector
        const demographicSelector = document.getElementById('demographicSelector');
        if (demographicSelector) {
            demographicSelector.addEventListener('change', (e) => {
                this.currentDemographic = e.target.value;
                console.log("Demographic filter changed to:", this.currentDemographic);
                this.renderMap();
                this.updateStats();
            });
        }

        // Infrastructure Toggle
        const infraToggle = document.getElementById('infrastructureToggle');
        if (infraToggle) {
            infraToggle.addEventListener('change', (e) => {
                this.showInfrastructure = e.target.checked;
                this.renderMap();
            });
        }

        // Back to India button
        const backBtn = document.getElementById('backToIndia');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.backToIndia();
            });
        }

        // Time slider
        const timeSlider = document.getElementById('timeSlider');
        if (timeSlider) {
            timeSlider.addEventListener('input', (e) => {
                this.currentTimeIndex = parseInt(e.target.value);
                this.updateTimeDisplay();
                this.renderMap();
            });
        }

        // Playback controls
        const playBtn = document.getElementById('playBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        const resetBtn = document.getElementById('resetBtn');

        if (playBtn) {
            playBtn.addEventListener('click', () => this.playTimeline());
        }

        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => this.pauseTimeline());
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetTimeline());
        }

        // Range selector buttons
        document.querySelectorAll('.range-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.changeTimeRange(btn.dataset.range);
            });
        });
    }

    initializeTimeSlider() {
        const marksContainer = document.getElementById('sliderMarks');
        if (!marksContainer) return;

        marksContainer.innerHTML = '';
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        months.forEach((month, index) => {
            if (index % 2 === 0) { // Show every other month
                const mark = document.createElement('div');
                mark.className = 'slider-mark';
                mark.textContent = month;
                marksContainer.appendChild(mark);
            }
        });

        this.updateTimeDisplay();
    }

    updateTimeDisplay() {
        const display = document.getElementById('currentTimeDisplay');
        if (!display) return;

        const months = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        display.textContent = `${months[this.currentTimeIndex]} 2026`;
    }

    playTimeline() {
        this.isPlaying = true;
        document.getElementById('playBtn').style.display = 'none';
        document.getElementById('pauseBtn').style.display = 'flex';

        this.playInterval = setInterval(() => {
            this.currentTimeIndex++;
            if (this.currentTimeIndex > 11) {
                this.currentTimeIndex = 0;
            }

            document.getElementById('timeSlider').value = this.currentTimeIndex;
            this.updateTimeDisplay();
            this.renderMap();
        }, 1000); // Change every second
    }

    pauseTimeline() {
        this.isPlaying = false;
        document.getElementById('playBtn').style.display = 'flex';
        document.getElementById('pauseBtn').style.display = 'none';

        if (this.playInterval) {
            clearInterval(this.playInterval);
            this.playInterval = null;
        }
    }

    resetTimeline() {
        this.pauseTimeline();
        this.currentTimeIndex = 0;
        document.getElementById('timeSlider').value = 0;
        this.updateTimeDisplay();
        this.renderMap();
    }

    changeTimeRange(range) {
        // This would adjust the slider to show different time ranges
        console.log('Time range changed to:', range);
        // Implementation would adjust the timeline data and slider
    }

    renderMap() {
        const svg = document.getElementById('indiaMap');
        const loading = document.getElementById('mapLoading');

        if (!svg) return;

        // Show loading
        if (loading) loading.classList.remove('hidden');

        // Clear existing content
        svg.innerHTML = '';

        setTimeout(() => {
            if (this.currentView === 'india') {
                this.renderIndiaMap(svg);
            } else {
                this.renderStateMap(svg);
            }

            // Hide loading
            if (loading) loading.classList.add('hidden');
        }, 300);
    }

    renderIndiaMap(svg) {
        const data = this.getStateDataForTime(this.currentTimeIndex);

        if (this.currentLayer === 'heatmap' || this.currentLayer === 'choropleth') {
            this.renderChoropleth(svg, data);
        } else if (this.currentLayer === 'bubble') {
            this.renderBubbleMap(svg, data);
        }

        // Render Infrastructure Overlay
        if (this.showInfrastructure) {
            this.renderInfrastructure(svg);
        }
    }

    renderInfrastructure(svg) {
        // Filter centers if in state view (simple approximation for demo)
        let centers = this.serviceCenters;
        if (this.currentView === 'state' && this.selectedState) {
            centers = this.serviceCenters.filter(c => c.state === this.selectedState);
            // In a real app, we'd remap coordinates from National scale to State scale here.
            // For this demo, we might need to adjust or simply skip state-level pins if coords don't match.
            // Let's just show them if they exist, but coord mapping is complex without a real GIS engine.
            // We'll stick to showing them only on National View for accuracy, or just mock some for state view.

            // Mocking random positions for state view to avoid empty map
            centers = centers.map(c => ({
                ...c,
                x: 100 + Math.random() * 600,
                y: 100 + Math.random() * 400
            }));
        }

        centers.forEach(center => {
            const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            group.classList.add('infra-pin');

            // Pin Icon (Simple marker)
            const pinColor = center.type === 'Permanent' ? '#dc2626' : '#ea580c'; // Red vs Orange

            // Outer circle
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', center.x);
            circle.setAttribute('cy', center.y);
            circle.setAttribute('r', '4');
            circle.setAttribute('fill', pinColor);
            circle.setAttribute('stroke', '#fff');
            circle.setAttribute('stroke-width', '1');

            // Add interaction
            circle.addEventListener('mouseenter', (e) => {
                this.showTooltip(e, `${center.type} Center`, `State: ${center.state}`);
            });
            circle.addEventListener('mouseleave', () => this.hideTooltip());

            group.appendChild(circle);
            svg.appendChild(group);
        });
    }

    renderChoropleth(svg, data) {
        // Simplified India map using rectangles (in production, use actual SVG paths)
        const states = this.indiaStates;
        const maxValue = Math.max(...Object.values(data));

        states.forEach((state, index) => {
            const value = data[state.name] || 0;
            const intensity = value / maxValue;
            const color = this.getColorForIntensity(intensity);

            // Create simplified state representation
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            rect.setAttribute('d', state.path);
            rect.setAttribute('fill', color);
            rect.setAttribute('stroke', 'white');
            rect.setAttribute('stroke-width', '2');
            rect.setAttribute('data-state', state.name);
            rect.setAttribute('data-value', value);

            // Add hover and click events
            rect.addEventListener('mouseenter', (e) => this.showTooltip(e, state.name, value));
            rect.addEventListener('mouseleave', () => this.hideTooltip());
            rect.addEventListener('click', () => this.drillDownToState(state.name));

            svg.appendChild(rect);
        });
    }

    renderBubbleMap(svg, data) {
        const states = this.indiaStates;
        const maxValue = Math.max(...Object.values(data));

        // First render a base map
        states.forEach(state => {
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            rect.setAttribute('d', state.path);
            rect.setAttribute('fill', '#e2e8f0');
            rect.setAttribute('stroke', 'white');
            rect.setAttribute('stroke-width', '2');
            svg.appendChild(rect);
        });

        // Then add bubbles
        states.forEach(state => {
            const value = data[state.name] || 0;
            const radius = (value / maxValue) * 30 + 5; // Scale bubble size

            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', state.cx);
            circle.setAttribute('cy', state.cy);
            circle.setAttribute('r', radius);
            circle.classList.add('bubble');
            circle.setAttribute('data-state', state.name);
            circle.setAttribute('data-value', value);

            circle.addEventListener('mouseenter', (e) => this.showTooltip(e, state.name, value));
            circle.addEventListener('mouseleave', () => this.hideTooltip());
            circle.addEventListener('click', () => this.drillDownToState(state.name));

            svg.appendChild(circle);
        });
    }

    renderStateMap(svg) {
        // Render district-level data for selected state
        const data = this.getDistrictDataForTime(this.selectedState, this.currentTimeIndex);

        // Check if we have real district data
        const hasRealDistricts = this.processedStats &&
            this.processedStats.districtCounts &&
            this.processedStats.districtCounts[this.selectedState];

        let districts = [];

        if (hasRealDistricts) {
            // Generate district layout dynamically from real data
            const districtNames = Object.keys(this.processedStats.districtCounts[this.selectedState]);
            const numDistricts = districtNames.length;
            const cols = Math.ceil(Math.sqrt(numDistricts));
            const rows = Math.ceil(numDistricts / cols);
            const districtWidth = 700 / cols;
            const districtHeight = 500 / rows;

            districts = districtNames.map((name, index) => ({
                name: name,
                x: 50 + (index % cols) * districtWidth,
                y: 50 + Math.floor(index / cols) * districtHeight,
                width: districtWidth - 10,
                height: districtHeight - 10
            }));
        } else {
            // Use sample district data
            districts = this.districtData[this.selectedState] || [];
        }

        const maxValue = Math.max(...Object.values(data));

        districts.forEach(district => {
            const value = data[district.name] || 0;
            const intensity = value / maxValue;
            const color = this.getColorForIntensity(intensity);

            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', district.x);
            rect.setAttribute('y', district.y);
            rect.setAttribute('width', district.width);
            rect.setAttribute('height', district.height);
            rect.setAttribute('fill', color);
            rect.setAttribute('stroke', 'white');
            rect.setAttribute('stroke-width', '2');
            rect.setAttribute('rx', '4');

            rect.addEventListener('mouseenter', (e) => this.showTooltip(e, district.name, value));
            rect.addEventListener('mouseleave', () => this.hideTooltip());

            svg.appendChild(rect);

            // Add label
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', district.x + district.width / 2);
            text.setAttribute('y', district.y + district.height / 2);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('dominant-baseline', 'middle');
            text.setAttribute('fill', 'white');
            text.setAttribute('font-size', '12');
            text.setAttribute('font-weight', 'bold');
            text.textContent = district.name;
            svg.appendChild(text);
        });

        // Render Infrastructure Overlay for State View
        if (this.showInfrastructure) {
            this.renderInfrastructure(svg);
        }
    }

    getColorForIntensity(intensity) {
        // Color gradient from light to dark blue
        const colors = [
            '#e0e7ff', // Very light
            '#c7d2fe', // Light
            '#a5b4fc', // Medium-light
            '#818cf8', // Medium
            '#6366f1', // Medium-dark
            '#4f46e5', // Dark
            '#4338ca'  // Very dark
        ];

        const index = Math.min(Math.floor(intensity * colors.length), colors.length - 1);
        return colors[index];
    }

    showTooltip(event, name, value) {
        // Create or update tooltip
        let tooltip = document.querySelector('.map-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.className = 'map-tooltip';
            document.body.appendChild(tooltip);
        }

        tooltip.innerHTML = `
            <div class="tooltip-title">${name}</div>
            <div class="tooltip-value">${this.formatNumber(value)} enrolments</div>
        `;

        tooltip.style.left = event.pageX + 10 + 'px';
        tooltip.style.top = event.pageY + 10 + 'px';
        tooltip.classList.add('show');
    }

    hideTooltip() {
        const tooltip = document.querySelector('.map-tooltip');
        if (tooltip) {
            tooltip.classList.remove('show');
        }
    }

    drillDownToState(stateName) {
        this.selectedState = stateName;
        this.currentView = 'state';

        // Update breadcrumb
        document.getElementById('breadcrumbText').textContent = stateName;
        document.getElementById('backToIndia').style.display = 'flex';
        document.getElementById('regionTag').textContent = stateName;

        this.renderMap();
        this.updateStats();
    }

    backToIndia() {
        this.selectedState = null;
        this.currentView = 'india';

        // Update breadcrumb
        document.getElementById('breadcrumbText').textContent = 'India';
        document.getElementById('backToIndia').style.display = 'none';
        document.getElementById('regionTag').textContent = 'National';

        this.renderMap();
        this.updateStats();
    }

    updateStats() {
        const data = this.currentView === 'india'
            ? this.getStateDataForTime(this.currentTimeIndex)
            : this.getDistrictDataForTime(this.selectedState, this.currentTimeIndex);

        const values = Object.values(data);
        const total = values.reduce((a, b) => a + b, 0);
        const avg = total / values.length;
        const activeRegions = values.filter(v => v > 0).length;

        // Update stat cards
        document.getElementById('geoTotalEnrol').textContent = this.formatNumber(total);
        document.getElementById('geoActiveRegions').textContent = activeRegions;
        document.getElementById('geoAvgEnrol').textContent = this.formatNumber(Math.round(avg));

        // Update top regions list
        this.updateTopRegionsList(data);
    }

    updateTopRegionsList(data) {
        const container = document.getElementById('topRegionsContent');
        if (!container) return;

        // Sort and get top 5
        const sorted = Object.entries(data)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        container.innerHTML = sorted.map(([name, value]) => `
            <div class="top-region-item">
                <span class="top-region-name">${name}</span>
                <span class="top-region-value">${this.formatNumber(value)}</span>
            </div>
        `).join('');
    }

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    // Data generation methods
    generateTimelineData() {
        // Generate 12 months of data
        const data = [];
        for (let i = 0; i < 12; i++) {
            data.push({
                month: i,
                multiplier: 0.8 + Math.random() * 0.4 // Random variation
            });
        }
        return data;
    }

    getStateDataForTime(timeIndex) {
        if (!this.processedStats || !this.processedStats.stateCounts) {
            // Fallback to sample data
            const multiplier = this.timelineData[timeIndex]?.multiplier || 1;
            const baseData = {
                'Uttar Pradesh': 854000,
                'Maharashtra': 721000,
                'Bihar': 640000,
                'West Bengal': 580000,
                'Madhya Pradesh': 520000,
                'Tamil Nadu': 485000,
                'Rajasthan': 450000,
                'Karnataka': 420000,
                'Gujarat': 376000,
                'Andhra Pradesh': 320000
            };

            const result = {};
            for (const [state, value] of Object.entries(baseData)) {
                // Mock demographic split for fallback
                let finalValue = value;
                if (this.currentDemographic === '0-5') finalValue = value * 0.15;
                if (this.currentDemographic === '5-18') finalValue = value * 0.30;
                if (this.currentDemographic === '18+') finalValue = value * 0.55;

                result[state] = Math.round(finalValue * multiplier);
            }
            return result;
        }

        // Use real data
        const multiplier = this.timelineData[timeIndex]?.multiplier || 1;
        const result = {};

        for (const [state, counts] of Object.entries(this.processedStats.stateCounts)) {
            // Check if counts is object (new format) or number (old format legacy check)
            let value = 0;
            if (typeof counts === 'number') {
                value = counts; // Legacy/Simple format, no demographic breakdown available
            } else {
                // Granular Object format
                if (this.currentDemographic === 'all') value = counts.total;
                else if (this.currentDemographic === '0-5') value = counts.age_0_5;
                else if (this.currentDemographic === '5-18') value = counts.age_5_18;
                else if (this.currentDemographic === '18+') value = counts.age_18_plus;
                else value = counts.total;
            }

            result[state] = Math.round(value * multiplier);
        }

        return result;
    }

    getDistrictDataForTime(stateName, timeIndex) {
        const multiplier = this.timelineData[timeIndex]?.multiplier || 1;

        // Check if we have real district data for this state
        if (this.processedStats &&
            this.processedStats.districtCounts &&
            this.processedStats.districtCounts[stateName]) {

            const result = {};
            for (const [district, counts] of Object.entries(this.processedStats.districtCounts[stateName])) {
                let value = 0;
                if (typeof counts === 'number') {
                    value = counts;
                } else {
                    if (this.currentDemographic === 'all') value = counts.total;
                    else if (this.currentDemographic === '0-5') value = counts.age_0_5;
                    else if (this.currentDemographic === '5-18') value = counts.age_5_18;
                    else if (this.currentDemographic === '18+') value = counts.age_18_plus;
                    else value = counts.total;
                }
                result[district] = Math.round(value * multiplier);
            }
            return result;
        }

        // Fallback to sample district data
        const districts = this.districtData[stateName] || [];
        const result = {};
        districts.forEach((district, index) => {
            let baseValue = 50000 - (index * 5000);

            // Mock demographic
            if (this.currentDemographic === '0-5') baseValue *= 0.15;
            if (this.currentDemographic === '5-18') baseValue *= 0.30;
            if (this.currentDemographic === '18+') baseValue *= 0.55;

            result[district.name] = Math.round(baseValue * multiplier);
        });
        return result;
    }

    getIndiaStatesData() {
        // Simplified state data with SVG paths (in production, use actual India map SVG)
        return [
            { name: 'Uttar Pradesh', path: 'M 400 300 L 500 300 L 500 400 L 400 400 Z', cx: 450, cy: 350 },
            { name: 'Maharashtra', path: 'M 300 400 L 400 400 L 400 500 L 300 500 Z', cx: 350, cy: 450 },
            { name: 'Bihar', path: 'M 500 250 L 600 250 L 600 350 L 500 350 Z', cx: 550, cy: 300 },
            { name: 'West Bengal', path: 'M 600 250 L 700 250 L 700 350 L 600 350 Z', cx: 650, cy: 300 },
            { name: 'Madhya Pradesh', path: 'M 350 300 L 450 300 L 450 400 L 350 400 Z', cx: 400, cy: 350 },
            { name: 'Tamil Nadu', path: 'M 350 550 L 450 550 L 450 650 L 350 650 Z', cx: 400, cy: 600 },
            { name: 'Rajasthan', path: 'M 250 250 L 350 250 L 350 400 L 250 400 Z', cx: 300, cy: 325 },
            { name: 'Karnataka', path: 'M 300 500 L 400 500 L 400 600 L 300 600 Z', cx: 350, cy: 550 },
            { name: 'Gujarat', path: 'M 200 350 L 300 350 L 300 450 L 200 450 Z', cx: 250, cy: 400 },
            { name: 'Andhra Pradesh', path: 'M 400 500 L 500 500 L 500 600 L 400 600 Z', cx: 450, cy: 550 }
        ];
    }

    getDistrictData() {
        // Sample district data for each state
        return {
            'Uttar Pradesh': [
                { name: 'Lucknow', x: 100, y: 100, width: 120, height: 100 },
                { name: 'Kanpur', x: 240, y: 100, width: 120, height: 100 },
                { name: 'Agra', x: 380, y: 100, width: 120, height: 100 },
                { name: 'Varanasi', x: 100, y: 220, width: 120, height: 100 },
                { name: 'Allahabad', x: 240, y: 220, width: 120, height: 100 },
                { name: 'Meerut', x: 380, y: 220, width: 120, height: 100 }
            ],
            'Maharashtra': [
                { name: 'Mumbai', x: 100, y: 100, width: 150, height: 120 },
                { name: 'Pune', x: 270, y: 100, width: 150, height: 120 },
                { name: 'Nagpur', x: 100, y: 240, width: 150, height: 120 },
                { name: 'Nashik', x: 270, y: 240, width: 150, height: 120 }
            ],
            // Add more states as needed
        };
    }
}

// Initialize when the geospatial view is activated
document.addEventListener('DOMContentLoaded', function () {
    let geoViz = null;

    // Initialize when Geospatial nav is clicked
    const geoNav = document.getElementById('nav-geo');
    if (geoNav) {
        geoNav.addEventListener('click', function () {
            setTimeout(() => {
                if (!geoViz) {
                    geoViz = new GeospatialVisualization();
                }
            }, 100);
        });
    }
});
