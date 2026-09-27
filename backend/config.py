import os
from pathlib import Path
from dotenv import load_dotenv

# Automatically load environment variables from .env file
# Looks first in backend/.env then in root .env
backend_dir = Path(__file__).resolve().parent
load_dotenv(backend_dir / '.env')
load_dotenv(backend_dir.parent / '.env')

class Config:
    """
    Central application configuration.
    Extracts environment variables and establishes sane defaults for local development.
    """
    # Environment
    ENV = os.getenv('FLASK_ENV', 'development')
    DEBUG = os.getenv('FLASK_DEBUG', '1').lower() in ('1', 'true', 'yes')
    PORT = int(os.getenv('PORT', os.getenv('FLASK_RUN_PORT', 5000)))
    
    # CORS Configuration
    FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')
    ALLOWED_ORIGINS = [
        FRONTEND_URL,
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'https://*.vercel.app'
    ]
    
    # Supabase Configuration
    _raw_url = os.getenv('SUPABASE_URL', '').strip()
    SUPABASE_URL = _raw_url.replace('/rest/v1', '').rstrip('/')
    SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY', '')
    SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY', '')
    SUPABASE_JWT_SECRET = os.getenv('SUPABASE_JWT_SECRET', '')
    
    # Gmail SMTP Configuration
    GMAIL_USER = os.getenv('GMAIL_USER', '')
    GMAIL_APP_PASSWORD = os.getenv('GMAIL_APP_PASSWORD', '')
    MAIL_FROM_NAME = os.getenv('MAIL_FROM_NAME', 'TaskFlow App')
    SMTP_HOST = 'smtp.gmail.com'
    SMTP_PORT = 465  # SSL port
    
    @classmethod
    def is_supabase_configured(cls) -> bool:
        """Returns True if Supabase credentials are provided."""
        return bool(cls.SUPABASE_URL and (cls.SUPABASE_SERVICE_ROLE_KEY or cls.SUPABASE_ANON_KEY))
        
    @classmethod
    def is_gmail_configured(cls) -> bool:
        """Returns True if Gmail SMTP credentials are provided."""
        return bool(cls.GMAIL_USER and cls.GMAIL_APP_PASSWORD)
