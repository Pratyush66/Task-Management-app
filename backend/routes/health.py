from flask import Blueprint, jsonify
from config import Config
from services.supabase_client import get_supabase_client

health_bp = Blueprint("health", __name__)

@health_bp.route("", methods=["GET"])
def health_check():
    """
    Service health check endpoint.
    Reports operational status and external dependency connectivity.
    """
    supabase_connected = False
    client = get_supabase_client()
    if client:
        try:
            # Simple query to verify database link
            client.table("profiles").select("id").limit(1).execute()
            supabase_connected = True
        except Exception:
            supabase_connected = False

    return jsonify({
        "status": "healthy",
        "service": "TaskFlow Backend API (Flask)",
        "version": "1.0.0",
        "environment": Config.ENV,
        "dependencies": {
            "supabase": {
                "configured": Config.is_supabase_configured(),
                "connected": supabase_connected
            },
            "gmail_smtp": {
                "configured": Config.is_gmail_configured(),
                "sender": Config.GMAIL_USER if Config.is_gmail_configured() else "simulated_console_logger"
            }
        }
    }), 200
