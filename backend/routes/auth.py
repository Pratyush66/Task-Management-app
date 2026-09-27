import logging
from flask import Blueprint, jsonify, request, g
from middleware.auth_middleware import require_auth
from services.task_service import TaskService

logger = logging.getLogger(__name__)
auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/sync", methods=["POST"])
@require_auth
def sync_user():
    """
    Syncs the authenticated Google OAuth user profile into the database.
    Called by Next.js frontend upon successful OAuth exchange.
    """
    try:
        user_data = g.user
        profile = TaskService.sync_user_profile(user_data)
        return jsonify({
            "message": "User profile synchronized successfully.",
            "profile": profile
        }), 200
    except Exception as e:
        logger.error(f"[Auth Route] Error syncing user: {e}")
        return jsonify({"error": "Failed to synchronize profile", "details": str(e)}), 500


@auth_bp.route("/me", methods=["GET"])
@require_auth
def get_current_user_profile():
    """
    Returns profile information and summary for currently authenticated user.
    """
    try:
        user_id = g.user_id
        profile = TaskService.get_user_profile(user_id)
        return jsonify({
            "user": g.user,
            "profile": profile
        }), 200
    except Exception as e:
        logger.error(f"[Auth Route] Error getting current user profile: {e}")
        return jsonify({"error": "Failed to get profile", "details": str(e)}), 500
