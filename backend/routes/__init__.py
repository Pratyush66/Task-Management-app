from routes.auth import auth_bp
from routes.tasks import tasks_bp
from routes.users import users_bp
from routes.health import health_bp

__all__ = ["auth_bp", "tasks_bp", "users_bp", "health_bp"]
