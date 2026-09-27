import logging
from typing import Optional
from config import Config

logger = logging.getLogger(__name__)

# Singleton client instance
_supabase_client = None

def get_supabase_client():
    """
    Returns an initialized Supabase client instance.
    Uses the SERVICE_ROLE_KEY if available for backend operations to bypass RLS,
    or falls back to the ANON_KEY.
    """
    global _supabase_client
    
    if _supabase_client is not None:
        return _supabase_client

    if not Config.is_supabase_configured():
        logger.warning(
            "[Supabase] Supabase credentials not found in environment. "
            "Please configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env."
        )
        return None

    try:
        from supabase import create_client, Client
        key = Config.SUPABASE_SERVICE_ROLE_KEY or Config.SUPABASE_ANON_KEY
        _supabase_client = create_client(Config.SUPABASE_URL, key)
        logger.info("[Supabase] Client initialized successfully.")
        return _supabase_client
    except Exception as e:
        logger.error(f"[Supabase] Failed to initialize Supabase client: {e}")
        return None
