# Facebook OAuth Server Test

## What This Does

Since the Facebook OAuth is working but we're not receiving the postMessage properly, this server approach:

1. **Captures OAuth responses** that GoHighLevel sends back
2. **Logs all OAuth data** to see exactly what's being returned  
3. **Tests both approaches** - server callback vs postMessage
4. **Helps debug** what messages we should be listening for

## Quick Start

### 1. Install Dependencies
```bash
cd /Users/somasekharaddakula/CascadeProjects/SquidgyFrontend/Code/squidgy-frontend/test-facebook-oauth
npm install
```

### 2. Start the Server
```bash
npm start
```

You should see:
```
🚀 OAuth catcher server running at http://localhost:3001
📝 OAuth callback URL: http://localhost:3001/oauth-callback
```

### 3. Test OAuth
1. Open http://localhost:3001 in your browser
2. Click "🚀 Test OAuth with Server Callback" 
3. Complete Facebook OAuth
4. Click "📋 Check Server Responses" to see captured data

## What to Look For

### If Server Callback Works:
- You'll see OAuth code/data captured in server responses
- This means we can build a server-side integration

### If Original OAuth Works:
- You'll see postMessage data in the results
- This means we need to fix our message listener

### If Neither Works:
- Check GoHighLevel UI to see if Facebook connected anyway
- The OAuth might be working but responses are going elsewhere

## Files Created

- `server-oauth-catcher.js` - Express server to catch responses
- `test-with-server.html` - Test interface  
- `package.json` - Dependencies
- Enhanced message listener in original test

## Expected Results

Based on your report that "Facebook connection worked despite the error", we should see:

1. **OAuth completes successfully** 
2. **Facebook shows as connected in GoHighLevel**
3. **Either server catches the response OR we identify the correct postMessage format**

This will help us determine the right approach for your main application.