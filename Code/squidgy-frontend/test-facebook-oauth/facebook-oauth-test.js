// Facebook OAuth Integration Test Script
// This script handles the complete OAuth flow for Facebook integration

class FacebookOAuthTest {
    constructor() {
        this.config = {
            bearerToken: '',
            locationId: '',
            userId: '',
            baseUrl: 'https://services.leadconnectorhq.com',
            version: '2021-07-28'
        };
        this.accountData = null;
        this.facebookPages = [];
        this.selectedPages = [];
        this.debugLog = [];
        
        this.initializeEventListeners();
    }
    
    initializeEventListeners() {
        // Listen for Facebook OAuth messages
        window.addEventListener('message', (event) => {
            this.handleOAuthMessage(event);
        }, false);
        
        this.addDebugLog('Facebook OAuth Test initialized');
    }
    
    addDebugLog(message, data = null) {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = `[${timestamp}] ${message}`;
        
        if (data) {
            console.log(logEntry, data);
            this.debugLog.push(`${logEntry}\n${JSON.stringify(data, null, 2)}`);
        } else {
            console.log(logEntry);
            this.debugLog.push(logEntry);
        }
        
        // Update debug display
        const debugElement = document.getElementById('debug-log');
        if (debugElement) {
            debugElement.textContent = this.debugLog.slice(-10).join('\n\n');
            debugElement.scrollTop = debugElement.scrollHeight;
        }
    }
    
    updateConfig() {
        this.config.bearerToken = document.getElementById('bearerToken').value;
        this.config.locationId = document.getElementById('locationId').value;
        this.config.userId = document.getElementById('userId').value;
        
        this.addDebugLog('Configuration updated', this.config);
    }
    
    async startOAuth() {
        try {
            this.updateConfig();
            
            if (!this.config.bearerToken || !this.config.locationId || !this.config.userId) {
                throw new Error('Please fill in all required configuration fields');
            }
            
            this.updateStepStatus('step-oauth', 'active');
            this.updateStatus('oauth-status', 'Opening Facebook OAuth window...', 'info');
            
            // Build the correct Facebook OAuth URL that redirects to /integrations/oauth/finish
            const state = JSON.stringify({
                locationId: this.config.locationId,
                userId: this.config.userId,
                type: 'facebook'
            });
            
            const scopes = [
                'pages_manage_ads',
                'pages_read_engagement',
                'pages_show_list',
                'pages_read_user_content',
                'pages_manage_metadata',
                'pages_manage_posts',
                'pages_manage_engagement',
                'leads_retrieval',
                'ads_read',
                'pages_messaging',
                'ads_management',
                'instagram_basic',
                'instagram_manage_messages',
                'instagram_manage_comments',
                'business_management',
                'catalog_management',
                'email'
            ];
            
            const oauthParams = new URLSearchParams({
                app_id: '390181264778064', // GoHighLevel's Facebook App ID
                redirect_uri: 'https://services.leadconnectorhq.com/integrations/oauth/finish',
                response_type: 'code',
                scope: scopes.join(','),
                state: state,
                logger_id: 'a1530b75-6c07-4b80-87d9-bdad6ee2e5e9'
            });
            
            const oauthUrl = `https://www.facebook.com/v18.0/dialog/oauth?${oauthParams.toString()}`;
            
            this.addDebugLog('Starting OAuth flow (HighLevel Method)', { url: oauthUrl });
            
            // Use window.open() as specified by HighLevel dev team
            // NOT fetch() or regular HTTP calls
            const target = 'FacebookOAuthWindow';
            const features = 'toolbar=no,menubar=no,scrollbars=yes,resizable=yes,location=no,directories=no,status=no,width=600,height=700';
            
            this.addDebugLog('Opening OAuth window with window.open()', { 
                url: oauthUrl, 
                target, 
                features 
            });
            
            const popup = window.open(oauthUrl, target, features);
            
            if (!popup) {
                throw new Error('Popup blocked! Please allow popups for this site.');
            }
            
            this.updateStatus('oauth-status', '✅ OAuth window opened. Please complete Facebook login...', 'success');
            this.addDebugLog('OAuth window opened successfully', { popup: !!popup });
            
            // Monitor popup as per HighLevel flow:
            // 1. User logs into FB
            // 2. Original window closes
            // 3. New window opens with postMessage
            const popupMonitor = setInterval(() => {
                if (popup.closed) {
                    clearInterval(popupMonitor);
                    this.addDebugLog('OAuth popup closed - waiting for postMessage');
                    if (!this.accountData) {
                        // Don't show error immediately - postMessage might still come
                        setTimeout(() => {
                            if (!this.accountData) {
                                this.updateStatus('oauth-status', '❌ OAuth cancelled or failed - no postMessage received', 'error');
                            }
                        }, 3000);
                    }
                }
            }, 1000);
            
        } catch (error) {
            this.addDebugLog('OAuth Error', error);
            this.updateStatus('oauth-status', `❌ Error: ${error.message}`, 'error');
        }
    }
    
    handleOAuthMessage(event) {
        this.addDebugLog('Received message', event.data);
        
        if (event.data && event.data.page === 'social_media_posting') {
            const { actionType, page, platform, placement, accountId, reconnectAccounts } = event.data;
            
            this.addDebugLog('OAuth message processed', {
                actionType,
                page,
                platform,
                placement,
                accountId,
                reconnectAccounts
            });
            
            if (actionType === 'close' && accountId) {
                this.accountData = {
                    accountId,
                    platform,
                    reconnectAccounts
                };
                
                this.updateStepStatus('step-oauth', 'completed');
                this.updateStepStatus('step-account', 'active');
                this.updateStatus('oauth-status', '✅ OAuth completed successfully!', 'success');
                
                // Display account data
                this.displayAccountData();
                
                // Enable fetch pages button
                document.getElementById('fetch-pages-btn').disabled = false;
            } else if (actionType === 'close') {
                this.updateStatus('oauth-status', '❌ OAuth cancelled', 'error');
            }
        }
    }
    
    displayAccountData() {
        const container = document.getElementById('account-data');
        container.innerHTML = `
            <div class="success">
                <strong>✅ Facebook Account Connected!</strong><br>
                Account ID: ${this.accountData.accountId}<br>
                Platform: ${this.accountData.platform}<br>
                ${this.accountData.reconnectAccounts ? `Reconnect Accounts: ${this.accountData.reconnectAccounts.length}` : ''}
            </div>
        `;
    }
    
    async tryAlternativeEndpoint(type) {
        try {
            this.updateStatus('pages-container', `Trying ${type} endpoint...`, 'info');
            
            const endpoints = {
                v1: `${this.config.baseUrl}/locations/${this.config.locationId}/social/oauth/facebook/accounts`,
                userBased: `${this.config.baseUrl}/social-media-posting/oauth/facebook/accounts/${this.accountData.accountId}?locationId=${this.config.locationId}`,
                alternative: `${this.config.baseUrl}/integrations/facebook/accounts/${this.accountData.accountId}?locationId=${this.config.locationId}`
            };
            
            const url = endpoints[type];
            this.addDebugLog(`Testing ${type} endpoint`, { url });
            
            const headers = {
                'Authorization': `Bearer ${this.config.bearerToken}`,
                'Version': this.config.version,
                'Accept': 'application/json'
            };
            
            const response = await fetch(url, {
                method: 'GET',
                headers: headers
            });
            
            this.addDebugLog(`${type} endpoint response`, {
                status: response.status,
                statusText: response.statusText
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
            
            const data = await response.json();
            this.addDebugLog(`${type} endpoint success`, data);
            
            if (data.success && data.results && data.results.pages) {
                this.facebookPages = data.results.pages;
                this.displayFacebookPages();
            }
            
        } catch (error) {
            this.addDebugLog(`${type} endpoint error`, error);
            this.updateStatus('pages-container', `❌ ${type} Error: ${error.message}`, 'error');
        }
    }
    
    async fetchFacebookPages() {
        try {
            this.updateStepStatus('step-pages', 'active');
            this.updateStatus('pages-container', 'Loading Facebook pages...', 'info');
            
            // Try different API endpoint variations
            const endpoints = {
                v2: `${this.config.baseUrl}/social-media-posting/oauth/${this.config.locationId}/facebook/accounts/${this.accountData.accountId}`,
                v1: `${this.config.baseUrl}/locations/${this.config.locationId}/social/oauth/facebook/accounts`,
                userBased: `${this.config.baseUrl}/social-media-posting/oauth/facebook/accounts/${this.accountData.accountId}?locationId=${this.config.locationId}`,
                alternative: `${this.config.baseUrl}/integrations/facebook/accounts/${this.accountData.accountId}?locationId=${this.config.locationId}`
            };
            
            // Try v2 endpoint first, can switch to others
            const url = endpoints.v2;
            
            this.addDebugLog('Fetching Facebook pages', { 
                url,
                accountId: this.accountData.accountId,
                locationId: this.config.locationId,
                bearerToken: this.config.bearerToken.substring(0, 20) + '...' 
            });
            
            // Try different authentication approaches
            const headers = {
                'Authorization': `Bearer ${this.config.bearerToken}`,
                'Version': this.config.version,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            };
            
            // Add X-Authorization header as alternative
            if (this.config.useXAuth) {
                headers['X-Authorization'] = `Bearer ${this.config.bearerToken}`;
            }
            
            const response = await fetch(url, {
                method: 'GET',
                headers: headers
            });
            
            this.addDebugLog('Fetch pages response status', { 
                status: response.status, 
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries())
            });
            
            if (!response.ok) {
                // Get detailed error information
                const errorText = await response.text();
                this.addDebugLog('Fetch pages error details', { 
                    status: response.status,
                    statusText: response.statusText,
                    errorBody: errorText
                });
                
                if (response.status === 401) {
                    throw new Error(`HTTP 401: Unauthorized - Bearer token may be invalid or expired. Check token permissions for social media posting.`);
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
                }
            }
            
            const data = await response.json();
            this.addDebugLog('Facebook pages response', data);
            
            if (data.success && data.results && data.results.pages) {
                this.facebookPages = data.results.pages;
                this.displayFacebookPages();
            } else {
                throw new Error('Invalid response format or no pages found');
            }
            
        } catch (error) {
            this.addDebugLog('Fetch pages error', error);
            this.updateStatus('pages-container', `❌ Error: ${error.message}`, 'error');
        }
    }
    
    displayFacebookPages() {
        const container = document.getElementById('pages-container');
        
        if (this.facebookPages.length === 0) {
            container.innerHTML = '<div class="error">No Facebook pages found</div>';
            return;
        }
        
        const pagesHtml = this.facebookPages.map(page => `
            <div class="page-card" onclick="togglePageSelection('${page.id}')" id="page-${page.id}">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <img src="${page.avatar || '/default-avatar.png'}" alt="${page.name}" onerror="this.src='/default-avatar.png'">
                    <div>
                        <strong>${page.name}</strong><br>
                        <small>ID: ${page.id}</small><br>
                        <small>Owned: ${page.isOwned ? '✅' : '❌'} | Connected: ${page.isConnected ? '✅' : '❌'}</small>
                    </div>
                    <div style="margin-left: auto;">
                        <input type="checkbox" id="checkbox-${page.id}" onchange="handlePageCheckbox('${page.id}')">
                    </div>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = `
            <div class="success">Found ${this.facebookPages.length} Facebook page(s):</div>
            ${pagesHtml}
            <p><small>Select the pages you want to integrate with your account.</small></p>
        `;
        
        // Enable attach button if pages exist
        document.getElementById('attach-pages-btn').disabled = false;
    }
    
    togglePageSelection(pageId) {
        const checkbox = document.getElementById(`checkbox-${pageId}`);
        checkbox.checked = !checkbox.checked;
        this.handlePageCheckbox(pageId);
    }
    
    handlePageCheckbox(pageId) {
        const checkbox = document.getElementById(`checkbox-${pageId}`);
        const pageCard = document.getElementById(`page-${pageId}`);
        
        if (checkbox.checked) {
            pageCard.classList.add('selected');
            if (!this.selectedPages.includes(pageId)) {
                this.selectedPages.push(pageId);
            }
        } else {
            pageCard.classList.remove('selected');
            this.selectedPages = this.selectedPages.filter(id => id !== pageId);
        }
        
        this.addDebugLog(`Page ${pageId} ${checkbox.checked ? 'selected' : 'deselected'}`, {
            selectedPages: this.selectedPages
        });
    }
    
    async attachSelectedPages() {
        try {
            if (this.selectedPages.length === 0) {
                throw new Error('Please select at least one Facebook page to attach');
            }
            
            this.updateStepStatus('step-results', 'active');
            this.updateStatus('results-container', 'Attaching selected pages...', 'info');
            
            const results = [];
            
            for (const pageId of this.selectedPages) {
                const page = this.facebookPages.find(p => p.id === pageId);
                if (!page) continue;
                
                const attachData = {
                    type: "page",
                    originId: page.id,
                    name: page.name,
                    avatar: page.avatar || "https://via.placeholder.com/150",
                    companyId: this.config.locationId
                };
                
                this.addDebugLog(`Attaching page: ${page.name}`, attachData);
                
                const url = `${this.config.baseUrl}/social-media-posting/oauth/${this.config.locationId}/facebook/accounts/${this.accountData.accountId}`;
                
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.config.bearerToken}`,
                        'Version': this.config.version,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(attachData)
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const result = await response.json();
                this.addDebugLog(`Page attached: ${page.name}`, result);
                results.push(result);
            }
            
            this.displayResults(results);
            
        } catch (error) {
            this.addDebugLog('Attach pages error', error);
            this.updateStatus('results-container', `❌ Error: ${error.message}`, 'error');
        }
    }
    
    displayResults(results) {
        const container = document.getElementById('results-container');
        
        const resultsHtml = results.map(result => `
            <div class="success">
                <strong>✅ ${result.results?.name || 'Page'} attached successfully!</strong><br>
                Account ID: ${result.results?._id}<br>
                Platform: ${result.results?.platform}<br>
                Type: ${result.results?.type}<br>
                Status: ${result.results?.active ? 'Active' : 'Inactive'}<br>
                Created: ${new Date(result.results?.createdAt).toLocaleString()}
            </div>
        `).join('');
        
        container.innerHTML = `
            <div class="success">
                <h4>🎉 Integration Completed Successfully!</h4>
                <p>Successfully attached ${results.length} Facebook page(s) to your account.</p>
            </div>
            ${resultsHtml}
            <div style="margin-top: 20px;">
                <button onclick="location.reload()">🔄 Start New Test</button>
            </div>
        `;
        
        this.updateStepStatus('step-results', 'completed');
    }
    
    updateStepStatus(stepId, status) {
        const step = document.getElementById(stepId);
        step.classList.remove('active', 'completed');
        if (status) {
            step.classList.add(status);
        }
    }
    
    updateStatus(elementId, message, type = 'info') {
        const element = document.getElementById(elementId);
        const className = type === 'error' ? 'error' : type === 'success' ? 'success' : 'info';
        element.innerHTML = `<div class="${className}">${message}</div>`;
    }
}

// Global functions for HTML onclick handlers
let facebookOAuthTest;

function startOAuth() {
    facebookOAuthTest.startOAuth();
}

function fetchFacebookPages() {
    facebookOAuthTest.fetchFacebookPages();
}

function togglePageSelection(pageId) {
    facebookOAuthTest.togglePageSelection(pageId);
}

function handlePageCheckbox(pageId) {
    facebookOAuthTest.handlePageCheckbox(pageId);
}

function attachSelectedPages() {
    facebookOAuthTest.attachSelectedPages();
}


function tryV1Endpoint() {
    facebookOAuthTest.addDebugLog('Trying V1 API endpoint');
    facebookOAuthTest.tryAlternativeEndpoint('v1');
}

function tryUserEndpoint() {
    facebookOAuthTest.addDebugLog('Trying User-based endpoint');
    facebookOAuthTest.tryAlternativeEndpoint('userBased');
}

function tryXAuthHeader() {
    facebookOAuthTest.addDebugLog('Trying X-Authorization header');
    facebookOAuthTest.config.useXAuth = true;
    facebookOAuthTest.fetchFacebookPages();
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    facebookOAuthTest = new FacebookOAuthTest();
});