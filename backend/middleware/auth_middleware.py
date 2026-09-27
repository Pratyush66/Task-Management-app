import functools
import logging
import jwt
from flask import request, jsonify, g
from config import Config
from services.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)

# Fallback test user for local exploration when Supabase isn't linked yet
MOCK_DEMO_USER = {
    "id": "11111111-2222-3333-4444-555555555555",
    "email": "demo.user@example.com",
    "user_metadata": {
        "full_name": "Demo Reviewer",
        "name": "Demo Reviewer",
        "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces"
    }
}

def require_auth(f):
    """
    Decorator to protect Flask endpoints.
    Extracts and validates the Supabase Bearer token from the Authorization header.
    Populates Flask's `g.user` and `g.user_id` on successful verification.
    """
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get("Authorization", None)
        
        if not auth_header:
            return jsonify({
                "error": "Unauthorized",
                "message": "Missing Authorization header with Bearer token."
            }), 401
            
        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            return jsonify({
                "error": "Unauthorized",
                "message": "Authorization header must be formatted as 'Bearer <token>'."
            }), 401
            
        token = parts[1]

        # 1. Check for Demo Token (Helps during initial evaluation or local mock testing)
        if token == "demo-token" or (not Config.is_supabase_configured() and token.startswith("mock-")):
            g.user = MOCK_DEMO_USER
            g.user_id = MOCK_DEMO_USER["id"]
            return f(*args, **kwargs)

        # 2. Verify via Supabase Client (Standard production path)
        client = get_supabase_client()
        if client:
            try:
                # supabase-py auth.get_user verifies the JWT with Supabase Auth servers
                user_response = client.auth.get_user(token)
                if user_response and user_response.user:
                    user_data = user_response.user
                    g.user = {
                        "id": user_data.id,
                        "email": user_data.email,
                        "user_metadata": user_data.user_metadata or {}
                    }
                    g.user_id = user_data.id
                    return f(*args, **kwargs)
            except Exception as e:
                logger.warning(f"[Auth] Supabase token verification failed: {e}")

        # 3. Direct JWT Secret Verification (Fast local verification without network hop)
        if Config.SUPABASE_JWT_SECRET:
            try:
                payload = jwt.decode(
                    token,
                    Config.SUPABASE_JWT_SECRET,
                    algorithms=["HS256"],
                    audience="authenticated"
                )
                g.user = {
                    "id": payload.get("sub"),
                    "email": payload.get("email"),
                    "user_metadata": payload.get("user_metadata", {})
                }
                g.user_id = payload.get("sub")
                return f(*args, **kwargs)
            except jwt.ExpiredSignatureError:
                return jsonify({"error": "Unauthorized", "message": "Token has expired."}), 401
            except jwt.InvalidTokenError as e:
                logger.warning(f"[Auth] JWT decoding failed: {e}")
                return jsonify({"error": "Unauthorized", "message": "Invalid token."}), 401

        # If Supabase client wasn't available and no JWT secret was set
        if not Config.is_supabase_configured():
            logger.info("[Auth] Supabase not configured; permitting request in development mode.")
            g.user = MOCK_DEMO_USER
            g.user_id = MOCK_DEMO_USER["id"]
            return f(*args, **kwargs)

        return jsonify({
            "error": "Unauthorized",
            "message": "Invalid or expired session token."
        }), 401

    return decorated_function
