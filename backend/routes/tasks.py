import logging
from flask import Blueprint, jsonify, request, g
from middleware.auth_middleware import require_auth
from services.task_service import TaskService

logger = logging.getLogger(__name__)
tasks_bp = Blueprint("tasks", __name__)

@tasks_bp.route("", methods=["GET"])
@require_auth
def list_tasks():
    """
    List tasks with optional filtering:
      - status: 'todo' | 'in_progress' | 'completed' | 'cancelled'
      - priority: 'low' | 'medium' | 'high' | 'urgent'
      - filter: 'assigned_to_me' | 'created_by_me' | 'all'
      - search: string query
    """
    try:
        status = request.args.get("status")
        priority = request.args.get("priority")
        filter_view = request.args.get("filter", "all")
        search = request.args.get("search")

        tasks = TaskService.list_tasks(
            current_user_id=g.user_id,
            status=status,
            priority=priority,
            filter_view=filter_view,
            search=search
        )
        return jsonify({
            "tasks": tasks,
            "count": len(tasks)
        }), 200
    except Exception as e:
        logger.error(f"[Tasks Route] Error listing tasks: {e}")
        return jsonify({"error": "Failed to list tasks", "details": str(e)}), 500


@tasks_bp.route("", methods=["POST"])
@require_auth
def create_task():
    """
    Create a new task and dispatch notification to assignee via Gmail.
    Request body:
      - title (str, required)
      - description (str, optional)
      - priority (str, optional: 'low', 'medium', 'high', 'urgent')
      - due_date (ISO date string, optional)
      - assigned_to (UUID string, optional)
    """
    try:
        data = request.get_json() or {}
        if not data.get("title"):
            return jsonify({"error": "Validation Error", "message": "Title is required."}), 400

        task = TaskService.create_task(
            current_user=g.user,
            payload=data
        )
        return jsonify({
            "message": "Task created successfully.",
            "task": task
        }), 201
    except ValueError as ve:
        return jsonify({"error": "Validation Error", "message": str(ve)}), 400
    except Exception as e:
        logger.error(f"[Tasks Route] Error creating task: {e}")
        return jsonify({"error": "Failed to create task", "details": str(e)}), 500


@tasks_bp.route("/<task_id>", methods=["GET"])
@require_auth
def get_task(task_id):
    """Get single task by ID."""
    try:
        task = TaskService.get_task(task_id)
        if not task:
            return jsonify({"error": "Not Found", "message": "Task not found."}), 404
        return jsonify({"task": task}), 200
    except Exception as e:
        logger.error(f"[Tasks Route] Error retrieving task {task_id}: {e}")
        return jsonify({"error": "Failed to get task", "details": str(e)}), 500


@tasks_bp.route("/<task_id>", methods=["PUT"])
@require_auth
def update_task(task_id):
    """
    Update task details.
    Dispatches email notification if marked as completed.
    """
    try:
        data = request.get_json() or {}
        updated_task = TaskService.update_task(
            current_user=g.user,
            task_id=task_id,
            payload=data
        )
        if not updated_task:
            return jsonify({"error": "Not Found", "message": "Task not found."}), 404

        return jsonify({
            "message": "Task updated successfully.",
            "task": updated_task
        }), 200
    except Exception as e:
        logger.error(f"[Tasks Route] Error updating task {task_id}: {e}")
        return jsonify({"error": "Failed to update task", "details": str(e)}), 500


@tasks_bp.route("/<task_id>/status", methods=["PATCH"])
@require_auth
def update_task_status(task_id):
    """
    Quick status toggle endpoint (e.g. mark completed).
    Dispatches completion email via Gmail if transitioned to 'completed'.
    """
    try:
        data = request.get_json() or {}
        new_status = data.get("status")
        valid_statuses = ["todo", "in_progress", "completed", "cancelled"]
        
        if not new_status or new_status not in valid_statuses:
            return jsonify({
                "error": "Validation Error",
                "message": f"Status must be one of: {', '.join(valid_statuses)}"
            }), 400

        updated_task = TaskService.update_task(
            current_user=g.user,
            task_id=task_id,
            payload={"status": new_status}
        )
        if not updated_task:
            return jsonify({"error": "Not Found", "message": "Task not found."}), 404

        return jsonify({
            "message": f"Task status updated to '{new_status}'.",
            "task": updated_task
        }), 200
    except Exception as e:
        logger.error(f"[Tasks Route] Error updating task status {task_id}: {e}")
        return jsonify({"error": "Failed to update status", "details": str(e)}), 500


@tasks_bp.route("/<task_id>", methods=["DELETE"])
@require_auth
def delete_task(task_id):
    """Delete a task."""
    try:
        deleted = TaskService.delete_task(
            current_user=g.user,
            task_id=task_id
        )
        if not deleted:
            return jsonify({"error": "Not Found", "message": "Task not found or cannot be deleted."}), 404

        return jsonify({"message": "Task deleted successfully."}), 200
    except Exception as e:
        logger.error(f"[Tasks Route] Error deleting task {task_id}: {e}")
        return jsonify({"error": "Failed to delete task", "details": str(e)}), 500
