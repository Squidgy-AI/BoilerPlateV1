import React, { useState, useEffect } from 'react';

interface FacebookIntegrationProps {
  locationId: string;
  bearerToken: string;
  onConnectionComplete?: () => void;
}

const FacebookIntegration: React.FC<FacebookIntegrationProps> = ({
  locationId,
  bearerToken,
  onConnectionComplete
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isPolling, setIsPolling] = useState(false);

  // Generate GoHighLevel integration URL
  const getIntegrationUrl = () => {
    return `https://app.gohighlevel.com/v2/location/${locationId}/settings/integrations`;
  };

  // Open GoHighLevel integrations in new window
  const openIntegrations = () => {
    const url = getIntegrationUrl();
    const windowFeatures = 'width=1200,height=800,resizable=yes,scrollbars=yes';
    window.open(url, 'GHLIntegrations', windowFeatures);
    
    // Start polling for connection status
    setIsPolling(true);
  };

  // Check if Facebook is connected (you'll need to implement this based on your backend)
  const checkConnectionStatus = async () => {
    setIsChecking(true);
    
    try {
      // Option 1: Check via your backend which monitors webhooks
      const response = await fetch(`/api/check-facebook-connection/${locationId}`, {
        headers: {
          'Authorization': `Bearer ${bearerToken}`
        }
      });
      
      const data = await response.json();
      const connected = data.connected || false;
      
      setIsConnected(connected);
      
      if (connected && onConnectionComplete) {
        onConnectionComplete();
        setIsPolling(false);
      }
      
      return connected;
    } catch (error) {
      console.error('Error checking connection:', error);
      return false;
    } finally {
      setIsChecking(false);
    }
  };

  // Polling effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isPolling) {
      // Check every 5 seconds
      interval = setInterval(() => {
        checkConnectionStatus();
      }, 5000);
      
      // Initial check
      checkConnectionStatus();
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isPolling, locationId]);

  // Check initial status on mount
  useEffect(() => {
    checkConnectionStatus();
  }, [locationId]);

  return (
    <div className="facebook-integration">
      <div className="integration-header">
        <h2>Connect Facebook to Your Account</h2>
        <p>Connect your Facebook account to manage pages and run ads.</p>
      </div>

      <div className="integration-status">
        <div className="status-indicator">
          <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`} />
          <span className="status-text">
            {isChecking ? 'Checking...' : isConnected ? 'Connected' : 'Not Connected'}
          </span>
        </div>
      </div>

      {!isConnected && (
        <div className="integration-actions">
          <button 
            className="connect-button"
            onClick={openIntegrations}
          >
            🔗 Connect Facebook Account
          </button>
          
          <div className="integration-instructions">
            <h3>How to connect:</h3>
            <ol>
              <li>Click the button above to open GoHighLevel</li>
              <li>Find the Facebook/Instagram card</li>
              <li>Click "Connect"</li>
              <li>Log into Facebook and grant permissions</li>
              <li>Select your Facebook pages</li>
              <li>This window will update automatically when connected</li>
            </ol>
          </div>
        </div>
      )}

      {isConnected && (
        <div className="connection-success">
          <h3>✅ Facebook Connected Successfully!</h3>
          <p>Your Facebook account is now connected to GoHighLevel.</p>
          <button 
            className="manage-button"
            onClick={openIntegrations}
          >
            ⚙️ Manage Connection
          </button>
        </div>
      )}

      <style jsx>{`
        .facebook-integration {
          max-width: 600px;
          margin: 0 auto;
          padding: 24px;
          background: #fff;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .integration-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .integration-header h2 {
          color: #333;
          margin-bottom: 8px;
        }

        .integration-header p {
          color: #666;
          font-size: 16px;
        }

        .integration-status {
          display: flex;
          justify-content: center;
          align-items: center;
          margin-bottom: 24px;
          padding: 16px;
          background: #f5f5f5;
          border-radius: 8px;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .status-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        .status-dot.connected {
          background-color: #4caf50;
        }

        .status-dot.disconnected {
          background-color: #f44336;
        }

        .status-text {
          font-size: 16px;
          font-weight: 500;
        }

        .connect-button, .manage-button {
          display: block;
          width: 100%;
          padding: 14px 24px;
          font-size: 16px;
          font-weight: 500;
          color: white;
          background-color: #1877f2;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .connect-button:hover, .manage-button:hover {
          background-color: #166fe5;
        }

        .manage-button {
          background-color: #42a5f5;
        }

        .manage-button:hover {
          background-color: #2196f3;
        }

        .integration-instructions {
          margin-top: 24px;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .integration-instructions h3 {
          margin-bottom: 12px;
          color: #333;
          font-size: 18px;
        }

        .integration-instructions ol {
          margin: 0;
          padding-left: 24px;
          color: #666;
        }

        .integration-instructions li {
          margin-bottom: 8px;
          line-height: 1.5;
        }

        .connection-success {
          text-align: center;
        }

        .connection-success h3 {
          color: #4caf50;
          margin-bottom: 12px;
        }

        .connection-success p {
          color: #666;
          margin-bottom: 24px;
        }

        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.4);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(76, 175, 80, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(76, 175, 80, 0);
          }
        }
      `}</style>
    </div>
  );
};

export default FacebookIntegration;

// Example usage in your app:
/*
<FacebookIntegration
  locationId="lBPqgBowX1CsjHay12LY"
  bearerToken="your-bearer-token"
  onConnectionComplete={() => {
    console.log('Facebook connected!');
    // Navigate to next step or update UI
  }}
/>
*/