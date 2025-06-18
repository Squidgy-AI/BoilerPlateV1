from flask import Flask, request, jsonify, send_from_directory
from datetime import datetime
import os
import sys
import signal
import atexit
from flask_cors import CORS

# Import functions from heygen_api_test.py
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from heygen_api_test import test_stop_session as stop_session, read_session_ids_from_log

# Get the current directory
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

LOG_FILE = "heygen_sessions.log"

@app.route('/log_session', methods=['POST'])
def log_session():
    """Log a session ID to the heygen_sessions.log file"""
    try:
        data = request.json
        session_id = data.get('session_id')
        
        if not session_id:
            return jsonify({'success': False, 'message': 'Missing session ID'}), 400
        
        timestamp = data.get('timestamp', datetime.now().isoformat())
        
        # Append to log file
        with open(LOG_FILE, "a") as f:
            f.write(f"{timestamp} | {session_id}\n")
        
        print(f"✅ Logged session ID to {LOG_FILE}: {session_id}")
        return jsonify({'success': True, 'message': 'Session logged successfully'})
    
    except Exception as e:
        print(f"❌ Error logging session: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/clear_log', methods=['POST'])
def clear_log():
    """Clear the session log file"""
    try:
        with open(LOG_FILE, "w") as f:
            f.write(f"# Heygen sessions log - cleared at {datetime.now().isoformat()}\n")
        
        print(f"✅ Cleared session log file: {LOG_FILE}")
        return jsonify({'success': True, 'message': 'Log file cleared successfully'})
    
    except Exception as e:
        print(f"❌ Error clearing log: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/avatar_viewer')
def avatar_viewer():
    """Serve the simple avatar viewer HTML file"""
    return send_from_directory(CURRENT_DIR, 'simple_avatar_viewer.html')

@app.route('/simple_avatar_viewer.html')
def simple_avatar_viewer():
    """Serve the simple avatar viewer HTML file directly"""
    return send_from_directory(CURRENT_DIR, 'simple_avatar_viewer.html')

@app.route('/static/<path:filename>')
def serve_static(filename):
    """Serve static files"""
    return send_from_directory(CURRENT_DIR, filename)

@app.route('/get_sessions', methods=['GET'])
def get_sessions():
    """Get all session IDs from the log file"""
    try:
        if not os.path.exists(LOG_FILE):
            return jsonify({'sessions': []})
        
        with open(LOG_FILE, "r") as f:
            lines = f.readlines()
        
        sessions = []
        for line in lines:
            if " | " in line and not line.startswith("#"):
                parts = line.strip().split(" | ")
                if len(parts) >= 2:
                    timestamp = parts[0]
                    session_id = parts[1]
                    sessions.append({
                        'timestamp': timestamp,
                        'session_id': session_id
                    })
        
        return jsonify({'sessions': sessions})
    
    except Exception as e:
        print(f"❌ Error getting sessions: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/')
def index():
    """Serve a simple status page with a button to open the avatar viewer"""
    return """
    <html>
        <head>
            <title>Heygen Session Logger</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
                h1 { color: #333; }
                .status { padding: 10px; background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 4px; margin-bottom: 20px; }
                .button {
                    display: inline-block;
                    background-color: #007bff;
                    color: white;
                    padding: 10px 20px;
                    text-decoration: none;
                    border-radius: 4px;
                    font-weight: bold;
                    margin-top: 15px;
                    cursor: pointer;
                    border: none;
                }
                .button:hover {
                    background-color: #0056b3;
                }
                .sessions {
                    margin-top: 30px;
                    padding: 10px;
                    background-color: #f8f9fa;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                }
                th, td {
                    padding: 8px;
                    text-align: left;
                    border-bottom: 1px solid #ddd;
                }
                th {
                    background-color: #f2f2f2;
                }
            </style>
            <script>
                function openAvatarViewer() {
                    window.open('/avatar_viewer', '_blank');
                }
                
                function loadSessions() {
                    fetch('/get_sessions')
                        .then(response => response.json())
                        .then(data => {
                            const sessionsTable = document.getElementById('sessions-table');
                            const tbody = sessionsTable.querySelector('tbody');
                            tbody.innerHTML = '';
                            
                            if (data.sessions && data.sessions.length > 0) {
                                data.sessions.forEach((session, index) => {
                                    const row = document.createElement('tr');
                                    row.innerHTML = `
                                        <td>${index + 1}</td>
                                        <td>${session.timestamp}</td>
                                        <td>${session.session_id}</td>
                                    `;
                                    tbody.appendChild(row);
                                });
                            } else {
                                const row = document.createElement('tr');
                                row.innerHTML = '<td colspan="3">No active sessions found</td>';
                                tbody.appendChild(row);
                            }
                        })
                        .catch(error => {
                            console.error('Error loading sessions:', error);
                        });
                }
                
                function clearLog() {
                    if (confirm('Are you sure you want to clear the session log?')) {
                        fetch('/clear_log', { method: 'POST' })
                            .then(response => response.json())
                            .then(data => {
                                alert(data.message);
                                loadSessions();
                            })
                            .catch(error => {
                                console.error('Error clearing log:', error);
                                alert('Error clearing log: ' + error.message);
                            });
                    }
                }
                
                // Load sessions when page loads
                window.onload = loadSessions;
                
                // Refresh sessions every 10 seconds
                setInterval(loadSessions, 10000);
            </script>
        </head>
        <body>
            <h1>Heygen Session Logger</h1>
            <div class="status">
                Server is running. Use the following endpoints:
                <ul>
                    <li><code>POST /log_session</code> - Log a session ID</li>
                    <li><code>POST /clear_log</code> - Clear the log file</li>
                    <li><code>GET /get_sessions</code> - Get all sessions from the log</li>
                </ul>
            </div>
            
            <button class="button" onclick="openAvatarViewer()">Open Avatar Viewer</button>
            <button class="button" onclick="loadSessions()" style="background-color: #28a745;">Refresh Sessions</button>
            <button class="button" onclick="clearLog()" style="background-color: #dc3545;">Clear Log</button>
            
            <div class="sessions">
                <h2>Active Sessions</h2>
                <table id="sessions-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Timestamp</th>
                            <th>Session ID</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td colspan="3">Loading sessions...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </body>
    </html>
    """

def close_all_sessions_on_exit():
    """Close all sessions when the server is shutting down"""
    print("\n\n🔄 Server shutting down, closing all active sessions...")
    
    try:
        session_ids = read_session_ids_from_log()
        if not session_ids:
            print("No active sessions found in log file")
            return
        
        print(f"Found {len(session_ids)} sessions to close")
        for session_id in session_ids:
            print(f"Closing session: {session_id}")
            try:
                stop_session(session_id)
                print(f"✅ Successfully closed session: {session_id}")
            except Exception as e:
                print(f"❌ Failed to close session {session_id}: {e}")
        
        # Clear the log file after closing all sessions
        with open(LOG_FILE, "w") as f:
            f.write(f"# Heygen sessions log - cleared at {datetime.now().isoformat()}\n")
        print("✅ Session log file cleared")
        
    except Exception as e:
        print(f"❌ Error during shutdown cleanup: {e}")
    
    print("👋 Goodbye!")

# Register the cleanup function to be called on exit
atexit.register(close_all_sessions_on_exit)

# Handle Ctrl+C gracefully
def signal_handler(sig, frame):
    print('\n⚠️ Ctrl+C pressed, shutting down server...')
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)

if __name__ == '__main__':
    print("🚀 Starting Heygen Session Logger Server")
    print("ℹ️ Press Ctrl+C to stop the server and close all active sessions")
    app.run(host='0.0.0.0', port=5000, debug=False)  # Set debug=False for clean shutdown
