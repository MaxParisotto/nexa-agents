class LogViewer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.logTypes = ['error', 'api', 'performance', 'security'];
        this.currentType = 'error';
        this.pageSize = 50;
        this.currentPage = 1;
        this.filters = {
            level: 'all',
            service: 'all',
            search: ''
        };
        
        this.initialize();
    }

    initialize() {
        this.render();
        this.attachEventListeners();
        this.loadLogs();
    }

    updateUI() {
        // Update active state of type selector buttons
        this.container.querySelectorAll('.log-type-selector button').forEach(btn => {
            const isActive = btn.dataset.type === this.currentType;
            btn.classList.toggle('active', isActive);
        });
    }

    render() {
        this.container.innerHTML = `
            <div class="log-viewer">
                <div class="log-controls">
                    <button class="btn primary" onclick="window.logViewer.initializeLogs()">
                        Initialize Test Logs
                    </button>
                    <div class="log-type-selector">
                        ${this.logTypes.map(type => `
                            <button class="btn ${type === this.currentType ? 'active' : ''}"
                                    data-type="${type}">
                                ${type.charAt(0).toUpperCase() + type.slice(1)} Logs
                            </button>
                        `).join('')}
                    </div>
                    <div class="log-filters">
                        <select id="levelFilter">
                            <option value="all">All Levels</option>
                            <option value="error">Error</option>
                            <option value="warn">Warning</option>
                            <option value="info">Info</option>
                            <option value="debug">Debug</option>
                        </select>
                        <select id="serviceFilter">
                            <option value="all">All Services</option>
                        </select>
                        <input type="text" id="searchFilter" placeholder="Search logs...">
                    </div>
                </div>
                <div class="log-table-container">
                    <table class="log-table">
                        <thead>
                            <tr>
                                <th>Timestamp</th>
                                <th>Level</th>
                                <th>Service</th>
                                <th>Message</th>
                                <th>Metadata</th>
                            </tr>
                        </thead>
                        <tbody id="logTableBody">
                            <tr><td colspan="5">Loading logs...</td></tr>
                        </tbody>
                    </table>
                </div>
                <div class="log-pagination">
                    <button id="prevPage">Previous</button>
                    <span id="pageInfo">Page 1</span>
                    <button id="nextPage">Next</button>
                </div>
                <div class="log-stats">
                    <div id="logStats"></div>
                </div>
            </div>
        `;
    }

    attachEventListeners() {
        // Type selector
        this.container.querySelectorAll('.log-type-selector button').forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentType = btn.dataset.type;
                this.currentPage = 1;
                this.loadLogs();
                this.updateUI();
            });
        });

        // Filters
        const levelFilter = document.getElementById('levelFilter');
        const searchFilter = document.getElementById('searchFilter');

        if (levelFilter) {
            levelFilter.addEventListener('change', (e) => {
                this.filters.level = e.target.value;
                this.loadLogs();
            });
        }

        if (searchFilter) {
            searchFilter.addEventListener('input', (e) => {
                this.filters.search = e.target.value;
                this.debounce(() => this.loadLogs(), 300);
            });
        }

        // Pagination
        const prevPage = document.getElementById('prevPage');
        const nextPage = document.getElementById('nextPage');

        if (prevPage) {
            prevPage.addEventListener('click', () => {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.loadLogs();
                }
            });
        }

        if (nextPage) {
            nextPage.addEventListener('click', () => {
                this.currentPage++;
                this.loadLogs();
            });
        }
    }

    async loadLogs() {
        try {
            const response = await fetch(`/api/logs/${this.currentType}?` + new URLSearchParams({
                page: this.currentPage,
                pageSize: this.pageSize,
                level: this.filters.level,
                service: this.filters.service,
                search: this.filters.search
            }));

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.renderLogs(data.logs);
            this.updateStats(data.stats);
            this.updatePagination(data.total);
        } catch (error) {
            console.error('Error loading logs:', error);
            const tbody = document.getElementById('logTableBody');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="5">Error loading logs</td></tr>';
            }
        }
    }

    async initializeLogs() {
        try {
            const response = await fetch('/api/logs/init');
            if (!response.ok) {
                throw new Error('Failed to initialize logs');
            }
            await this.loadLogs(); // Reload logs after initialization
        } catch (error) {
            console.error('Error initializing logs:', error);
            alert('Failed to initialize logs');
        }
    }

    renderLogs(logs) {
        const tbody = document.getElementById('logTableBody');
        if (!tbody) return;

        tbody.innerHTML = logs.map(log => `
            <tr class="log-entry ${log.level.toLowerCase()}">
                <td>${this.formatDate(log.timestamp)}</td>
                <td>${log.level}</td>
                <td>${log.service}</td>
                <td>${this.escapeHtml(log.message)}</td>
                <td>
                    <button class="btn-small" onclick='${this.toggleMetadata.bind(this, log.metadata)}'>
                        View
                    </button>
                </td>
            </tr>
        `).join('');
    }

    updateStats(stats) {
        const statsElement = document.getElementById('logStats');
        if (!statsElement) return;

        statsElement.innerHTML = `
            <div>Total Logs: ${stats.total}</div>
            <div>Error Rate: ${stats.errorRate}%</div>
            <div>Avg Response Time: ${stats.avgResponseTime}ms</div>
        `;
    }

    updatePagination(total) {
        const pageInfo = document.getElementById('pageInfo');
        const prevButton = document.getElementById('prevPage');
        const nextButton = document.getElementById('nextPage');

        if (!pageInfo || !prevButton || !nextButton) return;

        const totalPages = Math.ceil(total / this.pageSize);
        pageInfo.textContent = `Page ${this.currentPage} of ${totalPages}`;
        prevButton.disabled = this.currentPage === 1;
        nextButton.disabled = this.currentPage === totalPages;
    }

    toggleMetadata(metadata) {
        const modal = document.createElement('div');
        modal.className = 'log-metadata-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Log Metadata</h3>
                <pre>${JSON.stringify(metadata, null, 2)}</pre>
                <button onclick="this.closest('.log-metadata-modal').remove()">Close</button>
            </div>
        `;
        document.body.appendChild(modal);
    }

    formatDate(timestamp) {
        return new Date(timestamp).toLocaleString();
    }

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    debounce(func, wait) {
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(func, wait);
    }
}

// Initialize log viewer when document is ready
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('logViewerContainer')) {
        window.logViewer = new LogViewer('logViewerContainer');
    }
});
