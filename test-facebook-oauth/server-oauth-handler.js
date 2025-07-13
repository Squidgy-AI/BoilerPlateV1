// Server-side OAuth handler (Node.js/Express example)
// This handles the Facebook OAuth callback and saves to GoHighLevel

const express = require('express');
const axios = require('axios');
const router = express.Router();

// Facebook App credentials (these should be in environment variables)
const FACEBOOK_APP_ID = '390181264778064'; // GoHighLevel's App ID
const FACEBOOK_APP_SECRET = 'YOUR_APP_SECRET'; // You need this from Facebook/GoHighLevel
const GOHIGHLEVEL_API_KEY = 'pit-d8e51778-4fe8-42eb-91e8-ca2da69b89d8';

// OAuth callback endpoint
router.get('/api/facebook-oauth-callback', async (req, res) => {
    try {
        const { code, state } = req.query;
        
        if (!code) {
            throw new Error('No authorization code received');
        }
        
        // Decode state to get locationId and userId
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        const { locationId, userId } = stateData;
        
        // Step 1: Exchange code for access token
        const tokenResponse = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
            params: {
                client_id: FACEBOOK_APP_ID,
                client_secret: FACEBOOK_APP_SECRET,
                redirect_uri: `${process.env.APP_URL}/api/facebook-oauth-callback`,
                code: code
            }
        });
        
        const { access_token } = tokenResponse.data;
        
        // Step 2: Get user's Facebook pages
        const pagesResponse = await axios.get('https://graph.facebook.com/v18.0/me/accounts', {
            params: {
                access_token: access_token,
                fields: 'id,name,access_token,picture'
            }
        });
        
        const pages = pagesResponse.data.data;
        
        // Step 3: Save to GoHighLevel (this is where we hit the API issue)
        // Since the API has issues, we'll store this in our database
        // and handle the GoHighLevel integration differently
        
        // For now, save to your database
        await saveFacebookConnection({
            locationId,
            userId,
            facebookUserId: tokenResponse.data.user_id,
            accessToken: access_token,
            pages: pages,
            connectedAt: new Date()
        });
        
        // Step 4: Return success page that communicates with parent window
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Facebook Connected</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        margin: 0;
                        background: #f0f2f5;
                    }
                    .message {
                        text-align: center;
                        padding: 40px;
                        background: white;
                        border-radius: 8px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    }
                    .success-icon {
                        font-size: 48px;
                        color: #4caf50;
                        margin-bottom: 16px;
                    }
                </style>
            </head>
            <body>
                <div class="message">
                    <div class="success-icon">✅</div>
                    <h2>Facebook Connected Successfully!</h2>
                    <p>You have connected ${pages.length} page(s). This window will close automatically...</p>
                </div>
                <script>
                    // Notify parent window
                    if (window.opener) {
                        window.opener.postMessage({
                            type: 'facebook-connected',
                            success: true,
                            pages: ${JSON.stringify(pages)},
                            locationId: '${locationId}'
                        }, '*');
                        
                        // Close after 2 seconds
                        setTimeout(() => {
                            window.close();
                        }, 2000);
                    }
                </script>
            </body>
            </html>
        `);
        
    } catch (error) {
        console.error('OAuth callback error:', error);
        
        // Return error page
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Connection Failed</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        margin: 0;
                        background: #f0f2f5;
                    }
                    .message {
                        text-align: center;
                        padding: 40px;
                        background: white;
                        border-radius: 8px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    }
                    .error-icon {
                        font-size: 48px;
                        color: #f44336;
                        margin-bottom: 16px;
                    }
                </style>
            </head>
            <body>
                <div class="message">
                    <div class="error-icon">❌</div>
                    <h2>Connection Failed</h2>
                    <p>${error.message}</p>
                </div>
                <script>
                    // Notify parent window
                    if (window.opener) {
                        window.opener.postMessage({
                            type: 'facebook-error',
                            success: false,
                            message: '${error.message}'
                        }, '*');
                        
                        // Close after 3 seconds
                        setTimeout(() => {
                            window.close();
                        }, 3000);
                    }
                </script>
            </body>
            </html>
        `);
    }
});

// Helper function to save connection to your database
async function saveFacebookConnection(data) {
    // Save to your database
    // Example with MongoDB:
    /*
    await FacebookConnection.create({
        locationId: data.locationId,
        userId: data.userId,
        facebookUserId: data.facebookUserId,
        accessToken: data.accessToken,
        pages: data.pages,
        connectedAt: data.connectedAt,
        status: 'active'
    });
    */
    
    // Also create webhook to sync with GoHighLevel when they fix their API
    console.log('Facebook connection saved:', data);
}

// Endpoint to check connection status
router.get('/api/check-facebook-connection/:locationId', async (req, res) => {
    try {
        const { locationId } = req.params;
        
        // Check your database
        const connection = await FacebookConnection.findOne({ 
            locationId, 
            status: 'active' 
        });
        
        res.json({
            connected: !!connection,
            pages: connection ? connection.pages : []
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint to get Facebook pages for a location
router.get('/api/facebook-pages/:locationId', async (req, res) => {
    try {
        const { locationId } = req.params;
        
        const connection = await FacebookConnection.findOne({ 
            locationId, 
            status: 'active' 
        });
        
        if (!connection) {
            return res.status(404).json({ error: 'No Facebook connection found' });
        }
        
        res.json({
            pages: connection.pages,
            connectedAt: connection.connectedAt
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;