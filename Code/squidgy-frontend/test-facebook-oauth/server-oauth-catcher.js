// Simple Express server to catch OAuth responses
// Run this with: node server-oauth-catcher.js

const express = require('express');
const path = require('path');
const app = express();
const port = 3001;

// Serve static files
app.use(express.static(__dirname));

// Enable JSON parsing
app.use(express.json());

// Store OAuth responses temporarily (in production, use a database)
const oauthResponses = new Map();

// OAuth callback endpoint - this is where GoHighLevel will redirect
app.get('/oauth-callback', (req, res) => {
    console.log('📥 OAuth callback received:', {
        query: req.query,
        headers: req.headers,
        timestamp: new Date().toISOString()
    });
    
    // Extract data from query parameters
    const { code, state, error, error_description } = req.query;
    
    if (error) {
        console.error('❌ OAuth error:', error, error_description);
        
        // Send error page that communicates with parent window
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>OAuth Error</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        margin: 0;
                        background: #f5f5f5;
                    }
                    .container {
                        text-align: center;
                        padding: 40px;
                        background: white;
                        border-radius: 8px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h2>❌ OAuth Failed</h2>
                    <p>Error: ${error}</p>
                    <p>${error_description || ''}</p>
                </div>
                <script>
                    console.log('OAuth error received:', {
                        error: '${error}',
                        description: '${error_description}'
                    });
                    
                    // Send message to parent window
                    if (window.opener) {
                        window.opener.postMessage({
                            type: 'oauth-error',
                            error: '${error}',
                            description: '${error_description}'
                        }, '*');
                    }
                    
                    // Close after 3 seconds
                    setTimeout(() => {
                        window.close();
                    }, 3000);
                </script>
            </body>
            </html>
        `);
        return;
    }
    
    if (code) {
        console.log('✅ OAuth code received:', code);
        
        // Store the response (in production, save to database)
        const responseId = Date.now().toString();
        oauthResponses.set(responseId, {
            code,
            state,
            timestamp: new Date(),
            processed: false
        });
        
        // Send success page that communicates with parent window
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>OAuth Success</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        margin: 0;
                        background: #f5f5f5;
                    }
                    .container {
                        text-align: center;
                        padding: 40px;
                        background: white;
                        border-radius: 8px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    }
                    .success {
                        color: #4caf50;
                        font-size: 48px;
                        margin-bottom: 16px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="success">✅</div>
                    <h2>Facebook Connected!</h2>
                    <p>OAuth completed successfully. This window will close automatically...</p>
                    <p><small>Response ID: ${responseId}</small></p>
                </div>
                <script>
                    console.log('OAuth success received:', {
                        code: '${code}',
                        state: '${state}',
                        responseId: '${responseId}'
                    });
                    
                    // Send message to parent window
                    if (window.opener) {
                        window.opener.postMessage({
                            type: 'oauth-success',
                            code: '${code}',
                            state: '${state}',
                            responseId: '${responseId}',
                            timestamp: new Date().toISOString()
                        }, '*');
                    }
                    
                    // Also send to all windows (in case the parent is different)
                    window.postMessage({
                        type: 'oauth-success',
                        code: '${code}',
                        state: '${state}',
                        responseId: '${responseId}',
                        timestamp: new Date().toISOString()
                    }, '*');
                    
                    // Close after 2 seconds
                    setTimeout(() => {
                        window.close();
                    }, 2000);
                </script>
            </body>
            </html>
        `);
    } else {
        res.send(`
            <!DOCTYPE html>
            <html>
            <head><title>OAuth Response</title></head>
            <body>
                <h2>OAuth Response Received</h2>
                <p>No code or error found in response.</p>
                <pre>${JSON.stringify(req.query, null, 2)}</pre>
            </body>
            </html>
        `);
    }
});

// API endpoint to get OAuth responses
app.get('/api/oauth-responses', (req, res) => {
    const responses = Array.from(oauthResponses.entries()).map(([id, data]) => ({
        id,
        ...data
    }));
    
    res.json(responses);
});

// API endpoint to get specific OAuth response
app.get('/api/oauth-response/:id', (req, res) => {
    const response = oauthResponses.get(req.params.id);
    
    if (response) {
        res.json(response);
    } else {
        res.status(404).json({ error: 'Response not found' });
    }
});

// Serve the test page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'test-with-server.html'));
});

// Start server
app.listen(port, () => {
    console.log(`🚀 OAuth catcher server running at http://localhost:${port}`);
    console.log(`📝 OAuth callback URL: http://localhost:${port}/oauth-callback`);
    console.log('');
    console.log('To test:');
    console.log('1. Open http://localhost:3001 in your browser');
    console.log('2. Click the OAuth test button');
    console.log('3. Complete Facebook OAuth');
    console.log('4. Check console for captured responses');
});

module.exports = app;