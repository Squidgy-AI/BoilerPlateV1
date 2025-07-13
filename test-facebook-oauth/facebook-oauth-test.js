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
        this.generatedOAuthUrl = null;
        
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
            this.updateStatus('oauth-status', 'Getting redirect URL from GHL service...', 'info');
            
            // Step 1: Get the redirect URL from GHL service using iframe method
            const ghlUrl = `${this.config.baseUrl}/social-media-posting/oauth/facebook/start?locationId=${this.config.locationId}&userId=${this.config.userId}`;
            
            this.addDebugLog('Getting redirect URL from GHL service via iframe', { url: ghlUrl });
            
            // First check if we have cached params
            let extractedParams = this.getCachedParams();
            
            if (!extractedParams) {
                // Use Python backend to extract params (no CORS issues)
                this.updateStatus('oauth-status', 'Extracting parameters via backend...', 'info');
                extractedParams = await this.extractParamsViaBackend();
            } else {
                this.addDebugLog('Using cached parameters', extractedParams);
            }
            
            this.addDebugLog('Final extracted parameters', extractedParams);
            
            if (!extractedParams || !extractedParams.client_id) {
                throw new Error('Failed to extract client_id from GHL service. Cannot proceed without the correct Facebook App ID.');
            }
            
            // Step 3: Build OAuth URL using extracted params + our specific fixes
            const oauthParams = new URLSearchParams({
                response_type: extractedParams?.response_type || 'code',
                client_id: extractedParams?.client_id || 'MISSING_CLIENT_ID', // MUST extract from GHL
                redirect_uri: 'https://services.leadconnectorhq.com/integrations/oauth/finish', // ALWAYS fix this
                scope: this.buildFixedScope(extractedParams?.scope), // Merge GHL scope + our additions
                state: JSON.stringify({
                    locationId: this.config.locationId,
                    userId: this.config.userId,
                    type: 'facebook'
                }), // ALWAYS fix state format
                logger_id: extractedParams?.logger_id || this.generateLoggerId() // Use GHL's or generate
            });
            
            const finalOAuthUrl = `https://www.facebook.com/v18.0/dialog/oauth?${oauthParams.toString()}`;
            
            this.addDebugLog('Built OAuth URL with extracted + fixed params', { 
                url: finalOAuthUrl,
                extracted: extractedParams,
                fixes: {
                    redirect_uri: 'Always fixed to /integrations/oauth/finish',
                    scope: 'Merged GHL scope + missing permissions',
                    state: 'Always fixed to JSON format',
                    logger_id: extractedParams?.logger_id ? 'Used from GHL' : 'Generated new'
                }
            });
            
            // Step 2: Store the OAuth URL and display it in chat window
            this.generatedOAuthUrl = finalOAuthUrl;
            this.updateStatus('oauth-status', '✅ Facebook OAuth URL generated successfully!', 'success');
            
            // Show chat window and display the generated URL
            this.showChatWindow();
            this.addChatMessage('bot', 'Facebook OAuth URL has been generated successfully! You can now click the button below to open it in a new tab.');
            this.displayGeneratedUrl(finalOAuthUrl);
            
        } catch (error) {
            this.addDebugLog('OAuth Error', error);
            this.updateStatus('oauth-status', `❌ Error: ${error.message}`, 'error');
        }
    }
    
    extractParametersFromRedirect(url) {
        try {
            this.addDebugLog('Extracting parameters from URL', { url });
            
            let params = {};
            
            if (url.includes('facebook.com/privacy/consent/gdp')) {
                // Extract from GDPR consent page (encoded parameters)
                params = this.extractFromGDPRUrl(url);
            } else if (url.includes('facebook.com/dialog/oauth')) {
                // Extract from direct OAuth URL
                const urlObj = new URL(url);
                params.app_id = urlObj.searchParams.get('app_id') || urlObj.searchParams.get('client_id');
                params.client_id = urlObj.searchParams.get('client_id');
                params.redirect_uri = urlObj.searchParams.get('redirect_uri');
                params.response_type = urlObj.searchParams.get('response_type');
                params.scope = urlObj.searchParams.get('scope');
                params.state = urlObj.searchParams.get('state');
                params.logger_id = urlObj.searchParams.get('logger_id');
            }
            
            // Log what we got vs what's missing
            this.addDebugLog('Raw extracted parameters', params);
            
            const missing = [];
            Object.keys(params).forEach(key => {
                if (!params[key]) missing.push(key);
            });
            
            if (missing.length > 0) {
                this.addDebugLog('Missing parameters from GHL service', missing);
            }
            
            return params;
            
        } catch (error) {
            this.addDebugLog('Error extracting parameters', error);
            return null;
        }
    }
    
    extractFromGDPRUrl(url) {
        try {
            const params = {};
            
            // Extract app_id
            const appIdMatch = url.match(/params%5Bapp_id%5D=(\d+)/);
            if (appIdMatch) {
                params.app_id = appIdMatch[1];
                params.client_id = appIdMatch[1];
            }
            
            // Extract redirect_uri (URL encoded)
            const redirectMatch = url.match(/params%5Bredirect_uri%5D=%22([^%]+(?:%[^%]+)*)/);
            if (redirectMatch) {
                params.redirect_uri = decodeURIComponent(redirectMatch[1].replace(/\\%2F/g, '/').replace(/\\/g, ''));
            }
            
            // Extract scope (URL encoded array)
            const scopeMatch = url.match(/params%5Bscope%5D=(%5B[^%]+(?:%[^%]+)*%5D)/);
            if (scopeMatch) {
                const scopeStr = decodeURIComponent(scopeMatch[1]);
                const scopeArray = JSON.parse(scopeStr.replace(/\\/g, ''));
                params.scope = scopeArray.join(',');
            }
            
            // Extract state (URL encoded)
            const stateMatch = url.match(/params%5Bstate%5D=%22([^%]+(?:%[^%]+)*)/);
            if (stateMatch) {
                params.state = decodeURIComponent(stateMatch[1].replace(/\\/g, ''));
            }
            
            // Extract logger_id
            const loggerMatch = url.match(/params%5Blogger_id%5D=%22([^%]+)/);
            if (loggerMatch) {
                params.logger_id = loggerMatch[1];
            }
            
            // Default response_type
            params.response_type = 'code';
            
            this.addDebugLog('Extracted from GDPR URL', params);
            return params;
            
        } catch (error) {
            this.addDebugLog('Error extracting from GDPR URL', error);
            return {};
        }
    }
    
    fixParameters(params) {
        const fixed = { ...params };
        
        // Fix 1: Change redirect_uri to match working UI
        if (fixed.redirect_uri && fixed.redirect_uri.includes('/social-media-posting/oauth/facebook/finish')) {
            fixed.redirect_uri = 'https://services.leadconnectorhq.com/integrations/oauth/finish';
            this.addDebugLog('Fixed redirect_uri', { 
                old: params.redirect_uri, 
                new: fixed.redirect_uri 
            });
        }
        
        // Fix 2: Add missing scope permissions
        const currentScopes = fixed.scope ? fixed.scope.split(',').map(s => s.trim()) : [];
        const requiredScopes = [
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
        
        // Merge current scopes with required ones
        const allScopes = [...new Set([...currentScopes, ...requiredScopes])];
        fixed.scope = allScopes.join(',');
        this.addDebugLog('Fixed scope', { 
            old: currentScopes.length, 
            new: allScopes.length,
            added: requiredScopes.filter(s => !currentScopes.includes(s))
        });
        
        // Fix 3: Change state to proper JSON format
        if (fixed.state && fixed.state.includes('undefined')) {
            fixed.state = JSON.stringify({
                locationId: this.config.locationId,
                userId: this.config.userId,
                type: 'facebook'
            });
            this.addDebugLog('Fixed state format', { 
                old: params.state, 
                new: fixed.state 
            });
        }
        
        // Fix 4: Add logger_id if missing
        if (!fixed.logger_id) {
            fixed.logger_id = this.generateLoggerId();
            this.addDebugLog('Added missing logger_id', fixed.logger_id);
        }
        
        // Use app_id instead of client_id for consistency
        if (params.client_id && !fixed.app_id) {
            fixed.app_id = params.client_id;
            delete fixed.client_id;
        }
        
        return fixed;
    }
    
    buildFixedScope(ghlScope) {
        // Get the scopes that GHL provides
        const ghlScopes = ghlScope ? ghlScope.split(',').map(s => s.trim()) : [];
        
        // Required scopes for full functionality
        const requiredScopes = [
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
            'email',
            'public_profile',
            'read_insights'
        ];
        
        // Merge scopes (GHL first, then add missing required ones)
        const allScopes = [...ghlScopes];
        requiredScopes.forEach(scope => {
            if (!allScopes.includes(scope)) {
                allScopes.push(scope);
            }
        });
        
        this.addDebugLog('Scope merging', {
            fromGHL: ghlScopes,
            required: requiredScopes,
            missing: requiredScopes.filter(s => !ghlScopes.includes(s)),
            final: allScopes
        });
        
        return allScopes.join(',');
    }
    
    getDefaultScopes() {
        return [
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
        ].join(',');
    }
    
    async extractParamsViaPopup(url) {
        return new Promise((resolve) => {
            this.updateStatus('oauth-status', 'Opening popup to extract Facebook parameters...', 'info');
            
            // Open popup with GHL URL
            const popup = window.open(url, 'ParamExtractor', 'width=600,height=700,scrollbars=yes');
            
            if (!popup) {
                this.addDebugLog('Popup blocked');
                resolve(null);
                return;
            }
            
            // Store reference for cleanup
            let intervalId;
            let resolved = false;
            
            // Monitor popup URL
            intervalId = setInterval(() => {
                try {
                    if (popup.closed) {
                        clearInterval(intervalId);
                        if (!resolved) {
                            resolved = true;
                            this.addDebugLog('Popup closed without extracting parameters');
                            resolve(null);
                        }
                        return;
                    }
                    
                    // Try to read popup URL (will work if same origin or once redirected to Facebook)
                    const popupUrl = popup.location.href;
                    
                    if (popupUrl && (popupUrl.includes('facebook.com/dialog/oauth') || popupUrl.includes('facebook.com/privacy/consent/gdp'))) {
                        // Found Facebook OAuth URL - extract parameters
                        const params = this.extractParametersFromRedirect(popupUrl);
                        
                        // Store in localStorage for future use
                        localStorage.setItem('ghl_facebook_params', JSON.stringify({
                            timestamp: Date.now(),
                            locationId: this.config.locationId,
                            params: params
                        }));
                        
                        // Close popup and resolve
                        popup.close();
                        clearInterval(intervalId);
                        
                        if (!resolved) {
                            resolved = true;
                            this.addDebugLog('Successfully extracted params via popup', { popupUrl, params });
                            resolve(params);
                        }
                    }
                } catch (e) {
                    // Cross-origin error - expected while navigating
                    // Continue monitoring
                }
            }, 100);
            
            // Timeout after 30 seconds
            setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    clearInterval(intervalId);
                    popup.close();
                    
                    // Try to use cached params from localStorage
                    const cached = this.getCachedParams();
                    if (cached) {
                        this.addDebugLog('Using cached parameters from localStorage', cached);
                        resolve(cached);
                    } else {
                        this.addDebugLog('Popup extraction timeout and no cached params');
                        resolve(null);
                    }
                }
            }, 30000);
        });
    }
    
    async extractParamsViaBackend() {
        try {
            // Make request to your Python backend
            const backendUrl = 'http://localhost:8001'; // Test server port
            const response = await fetch(`${backendUrl}/api/facebook/extract-oauth-params`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    locationId: this.config.locationId,
                    userId: this.config.userId
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Backend request failed: ${response.status} - ${errorText}`);
            }
            
            const result = await response.json();
            this.addDebugLog('Backend extraction result', result);
            
            if (result.success && result.params) {
                // Cache the extracted params
                localStorage.setItem('ghl_facebook_params', JSON.stringify({
                    timestamp: Date.now(),
                    locationId: this.config.locationId,
                    params: result.params
                }));
                
                return result.params;
            } else {
                throw new Error('Backend extraction failed');
            }
            
        } catch (error) {
            this.addDebugLog('Backend extraction error', error);
            return null;
        }
    }
    
    getCachedParams() {
        try {
            const stored = localStorage.getItem('ghl_facebook_params');
            if (!stored) return null;
            
            const data = JSON.parse(stored);
            
            // Check if cached data is for same location and not too old (1 hour)
            if (data.locationId === this.config.locationId && 
                (Date.now() - data.timestamp) < 3600000) {
                return data.params;
            }
            
            // Remove stale data
            localStorage.removeItem('ghl_facebook_params');
            return null;
        } catch (e) {
            return null;
        }
    }
    
    generateLoggerId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    
    extractOAuthParams(url) {
        try {
            // Decode the URL to extract parameters
            const decodedUrl = decodeURIComponent(url);
            
            // Extract parameters from the GDPR consent URL
            const params = {};
            
            // Extract app_id
            const appIdMatch = decodedUrl.match(/app_id%5D=(\d+)/);
            if (appIdMatch) params.app_id = appIdMatch[1];
            
            // Extract redirect_uri
            const redirectUriMatch = decodedUrl.match(/redirect_uri%5D=%22([^%]+(?:%[^%]+)*)/);
            if (redirectUriMatch) {
                params.redirect_uri = decodeURIComponent(redirectUriMatch[1].replace(/\\%2F/g, '/'));
            }
            
            // Extract scope
            const scopeMatch = decodedUrl.match(/scope%5D=(%5B[^%]+(?:%[^%]+)*%5D)/);
            if (scopeMatch) {
                const scopeStr = decodeURIComponent(scopeMatch[1]);
                params.scope = scopeStr.replace(/[\[\]"]/g, '').split(',');
            }
            
            // Extract state
            const stateMatch = decodedUrl.match(/state%5D=%22([^%]+(?:%[^%]+)*)/);
            if (stateMatch) {
                params.state = decodeURIComponent(stateMatch[1]);
            }
            
            // Extract logger_id
            const loggerIdMatch = decodedUrl.match(/logger_id%5D=%22([^%]+)/);
            if (loggerIdMatch) {
                params.logger_id = loggerIdMatch[1];
            }
            
            this.addDebugLog('Extracted OAuth parameters', params);
            return params;
            
        } catch (error) {
            this.addDebugLog('Error extracting OAuth params', error);
            return null;
        }
    }
    
    buildFinalOAuthUrl(params) {
        const oauthParams = new URLSearchParams({
            app_id: params.app_id,
            redirect_uri: params.redirect_uri,
            response_type: 'code',
            scope: Array.isArray(params.scope) ? params.scope.join(',') : params.scope,
            state: params.state,
            logger_id: params.logger_id
        });
        
        const finalUrl = `https://www.facebook.com/v18.0/dialog/oauth?${oauthParams.toString()}`;
        this.addDebugLog('Built final OAuth URL', { url: finalUrl });
        
        return finalUrl;
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
    
    showChatWindow() {
        const chatWindow = document.getElementById('chat-window');
        chatWindow.style.display = 'block';
        this.addDebugLog('Chat window displayed');
    }
    
    addChatMessage(sender, message) {
        const chatMessages = document.getElementById('chat-messages');
        const messageElement = document.createElement('div');
        messageElement.className = `chat-message ${sender}-message`;
        
        const senderName = sender === 'bot' ? 'Squidgy Bot' : 'User';
        messageElement.innerHTML = `<strong>${senderName}:</strong> ${message}`;
        
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        this.addDebugLog(`Chat message added (${sender})`, message);
    }
    
    displayGeneratedUrl(url) {
        const urlContainer = document.getElementById('generated-url-container');
        const urlDisplay = document.getElementById('oauth-url-display');
        
        urlDisplay.textContent = url;
        urlContainer.style.display = 'block';
        
        this.addDebugLog('OAuth URL displayed in chat window', { url: url.substring(0, 100) + '...' });
    }
    
    openFacebookOAuth() {
        if (!this.generatedOAuthUrl) {
            this.addChatMessage('bot', 'Error: No OAuth URL available. Please generate the URL first.');
            return;
        }
        
        this.addChatMessage('bot', 'Opening Facebook OAuth in new tab. After completing the authentication, you will be redirected back to Squidgy.');
        
        // Open in new tab instead of popup window
        const newTab = window.open(this.generatedOAuthUrl, '_blank');
        
        if (!newTab) {
            this.addChatMessage('bot', 'Popup blocker may be preventing the OAuth window from opening. Please allow popups and try again.');
        }
        
        this.addDebugLog('OAuth URL opened in new tab', this.generatedOAuthUrl);
    }
    
    copyUrlToClipboard() {
        if (!this.generatedOAuthUrl) {
            this.addChatMessage('bot', 'Error: No OAuth URL to copy.');
            return;
        }
        
        navigator.clipboard.writeText(this.generatedOAuthUrl).then(() => {
            this.addChatMessage('bot', 'OAuth URL copied to clipboard! You can paste it anywhere you need.');
        }).catch(err => {
            this.addChatMessage('bot', 'Failed to copy URL to clipboard. Please copy it manually from the text box above.');
            console.error('Failed to copy: ', err);
        });
        
        this.addDebugLog('OAuth URL copied to clipboard');
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

function openFacebookOAuth() {
    facebookOAuthTest.openFacebookOAuth();
}

function copyUrlToClipboard() {
    facebookOAuthTest.copyUrlToClipboard();
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    facebookOAuthTest = new FacebookOAuthTest();
});