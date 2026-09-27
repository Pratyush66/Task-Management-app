import logging
from flask import Blueprint, jsonify
from middleware.auth_middleware import require_auth
from services.task_service import TaskService

logger = logging.getLogger(__name__)
users_bp = Blueprint("users", __name__)

@users_bp.route("", methods=["GET"])
@require_auth
def get_users():
    """
    Returns list of registered users for the task assignment dropdown.
    """
    try:
        users = TaskService.list_users()
        return jsonify({
            "users": users,
            "count": len(users)
        }), 200
    except Exception as e:
        logger.error(f"[Users Route] Error fetching users: {e}")
        return jsonify({"error": "Failed to fetch users", "details": str(e)}), 500
