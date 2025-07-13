#!/usr/bin/env python3
"""
🚀 Solar Clone API Server Runner
===============================
Starts the FastAPI server for testing the Solar Clone API
"""

import uvicorn
from fastapi import FastAPI
from solar_clone_router import router

# Create FastAPI app
app = FastAPI(
    title="Solar Clone API",
    description="Automated Solar Sub-Account Cloning System",
    version="1.0.0"
)

# Include the solar clone router
app.include_router(router)

@app.get("/")
def root():
    return {
        "message": "🌞 Solar Clone API Server",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/ghl/solar-clone-health"
    }

if __name__ == "__main__":
    print("🌞 Starting Solar Clone API Server...")
    print("📋 Available endpoints:")
    print("  • GET  /                           - API info")
    print("  • GET  /docs                       - Interactive API docs")
    print("  • POST /api/ghl/solar-clone        - Create clone")
    print("  • GET  /api/ghl/solar-clone/{id}   - Get clone status")
    print("  • GET  /api/ghl/solar-clones       - List clones")
    print("  • GET  /api/ghl/solar-clone-health - Health check")
    print("🌐 Server will start at: http://localhost:8000")
    print("📖 Interactive docs at: http://localhost:8000/docs")
    
    uvicorn.run(
        "run_api_server:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        log_level="info"
    )