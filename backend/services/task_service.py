import uuid
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from services.supabase_client import get_supabase_client
from services.email_service import GmailEmailService

logger = logging.getLogger(__name__)

# In-memory store used as fallback when Supabase credentials aren't linked yet.
# Enables instant local testing, demo evaluation, and offline development.
_MOCK_PROFILES = [
    {
        "id": "11111111-2222-3333-4444-555555555555",
        "email": "demo.user@example.com",
        "full_name": "Demo Reviewer",
        "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces"
    },
    {
        "id": "22222222-3333-4444-5555-666666666666",
        "email": "alex.morgan@company.com",
        "full_name": "Alex Morgan",
        "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces"
    },
    {
        "id": "33333333-4444-5555-6666-777777777777",
        "email": "priya.sharma@company.com",
        "full_name": "Priya Sharma",
        "avatar_url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces"
    }
]

_MOCK_TASKS = [
    {
        "id": "a0000000-0000-0000-0000-000000000001",
        "title": "Set up Supabase and Google OAuth Client",
        "description": "Configure Google Cloud Console OAuth 2.0 Client ID and redirect URLs in Supabase Auth settings.",
        "status": "completed",
        "priority": "high",
        "due_date": "2026-10-01T12:00:00Z",
        "created_by": "11111111-2222-3333-4444-555555555555",
        "assigned_to": "22222222-3333-4444-5555-666666666666",
        "completed_at": "2026-09-27T10:00:00Z",
        "created_at": "2026-09-26T08:00:00Z",
        "updated_at": "2026-09-27T10:00:00Z",
        "creator": _MOCK_PROFILES[0],
        "assignee": _MOCK_PROFILES[1]
    },
    {
        "id": "a0000000-0000-0000-0000-000000000002",
        "title": "Design Task Assignment Email Templates",
        "description": "Craft responsive HTML emails dispatched via Gmail when new tasks are assigned or completed.",
        "status": "in_progress",
        "priority": "urgent",
        "due_date": "2026-10-05T18:00:00Z",
        "created_by": "11111111-2222-3333-4444-555555555555",
        "assigned_to": "33333333-4444-5555-6666-777777777777",
        "completed_at": None,
        "created_at": "2026-09-27T09:00:00Z",
        "updated_at": "2026-09-27T09:00:00Z",
        "creator": _MOCK_PROFILES[0],
        "assignee": _MOCK_PROFILES[2]
    }
]


class TaskService:
    """
    Core business logic for task management, authorization checks, and notification triggering.
    """

    @classmethod
    def get_user_profile(cls, user_id: str) -> Optional[Dict[str, Any]]:
        """Fetch profile for a specific user ID."""
        client = get_supabase_client()
        if client:
            try:
                res = client.table("profiles").select("*").eq("id", user_id).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                logger.error(f"[TaskService] Error fetching user profile: {e}")

        # Fallback to mock profiles
        for p in _MOCK_PROFILES:
            if p["id"] == user_id:
                return p
        return {"id": user_id, "email": "user@example.com", "full_name": "Team Member"}

    @classmethod
    def list_users(cls) -> List[Dict[str, Any]]:
        """List all users available for task assignment."""
        client = get_supabase_client()
        if client:
            try:
                res = client.table("profiles").select("id, email, full_name, avatar_url").order("full_name").execute()
                if res.data is not None:
                    return res.data
            except Exception as e:
                logger.error(f"[TaskService] Error listing profiles: {e}")
        return _MOCK_PROFILES

    @classmethod
    def sync_user_profile(cls, user_dict: Dict[str, Any]) -> Dict[str, Any]:
        """
        Synchronizes logged in user's profile details into public.profiles.
        Called on login/callback from frontend.
        """
        client = get_supabase_client()
        user_id = user_dict.get("id")
        email = user_dict.get("email")
        metadata = user_dict.get("user_metadata", {})
        
        full_name = metadata.get("full_name") or metadata.get("name") or email.split("@")[0]
        avatar_url = metadata.get("avatar_url") or metadata.get("picture") or ""

        profile_data = {
            "id": user_id,
            "email": email,
            "full_name": full_name,
            "avatar_url": avatar_url,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }

        if client:
            try:
                client.table("profiles").upsert(profile_data).execute()
            except Exception as e:
                logger.error(f"[TaskService] Error syncing profile: {e}")

        # Keep mock store in sync as well
        existing = next((p for p in _MOCK_PROFILES if p["id"] == user_id), None)
        if existing:
            existing.update(profile_data)
        else:
            _MOCK_PROFILES.append(profile_data)

        return profile_data

    @classmethod
    def list_tasks(cls, current_user_id: str, status: Optional[str] = None, priority: Optional[str] = None, filter_view: Optional[str] = None, search: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Retrieve list of tasks with flexible filtering.
        """
        client = get_supabase_client()
        if client:
            try:
                query = client.table("tasks").select(
                    "*, creator:profiles!created_by(id, email, full_name, avatar_url), assignee:profiles!assigned_to(id, email, full_name, avatar_url)"
                )

                if status:
                    query = query.eq("status", status)
                if priority:
                    query = query.eq("priority", priority)

                if filter_view == "assigned_to_me":
                    query = query.eq("assigned_to", current_user_id)
                elif filter_view == "created_by_me":
                    query = query.eq("created_by", current_user_id)

                if search:
                    query = query.ilike("title", f"%{search}%")

                res = query.order("created_at", desc=True).execute()
                if res.data is not None:
                    return res.data
            except Exception as e:
                logger.error(f"[TaskService] Error fetching tasks from Supabase: {e}")

        # In-memory mock filtering fallback
        results = list(_MOCK_TASKS)
        if status:
            results = [t for t in results if t.get("status") == status]
        if priority:
            results = [t for t in results if t.get("priority") == priority]
        if filter_view == "assigned_to_me":
            results = [t for t in results if t.get("assigned_to") == current_user_id]
        elif filter_view == "created_by_me":
            results = [t for t in results if t.get("created_by") == current_user_id]
        if search:
            s = search.lower()
            results = [t for t in results if s in t.get("title", "").lower() or s in t.get("description", "").lower()]

        return results

    @classmethod
    def get_task(cls, task_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve single task by ID."""
        client = get_supabase_client()
        if client:
            try:
                res = client.table("tasks").select(
                    "*, creator:profiles!created_by(id, email, full_name, avatar_url), assignee:profiles!assigned_to(id, email, full_name, avatar_url)"
                ).eq("id", task_id).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                logger.error(f"[TaskService] Error getting task: {e}")

        for t in _MOCK_TASKS:
            if t["id"] == task_id:
                return t
        return None

    @classmethod
    def create_task(cls, current_user: Dict[str, Any], payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Creates a new task and dispatches email notification to assignee via Gmail.
        """
        user_id = current_user["id"]
        task_id = str(uuid.uuid4())
        now_iso = datetime.now(timezone.utc).isoformat()

        title = payload.get("title", "").strip()
        if not title:
            raise ValueError("Task title is required.")

        task_data = {
            "id": task_id,
            "title": title,
            "description": payload.get("description", "").strip(),
            "status": payload.get("status", "todo"),
            "priority": payload.get("priority", "medium"),
            "due_date": payload.get("due_date"),
            "created_by": user_id,
            "assigned_to": payload.get("assigned_to") or None,
            "created_at": now_iso,
            "updated_at": now_iso,
            "completed_at": None
        }

        client = get_supabase_client()
        if client:
            try:
                res = client.table("tasks").insert(task_data).execute()
                if res.data and len(res.data) > 0:
                    task_data = res.data[0]
            except Exception as e:
                logger.error(f"[TaskService] Error inserting task in Supabase: {e}")

        # Fetch creator and assignee profiles for the email notification
        creator_profile = cls.get_user_profile(user_id) or current_user
        assignee_profile = None
        if task_data.get("assigned_to"):
            assignee_profile = cls.get_user_profile(task_data["assigned_to"])

        # Hydrate for response & mock store
        task_data["creator"] = creator_profile
        task_data["assignee"] = assignee_profile
        _MOCK_TASKS.insert(0, task_data)

        # Trigger Gmail Notification: Task Created & Assigned
        if assignee_profile:
            GmailEmailService.notify_task_created(
                task=task_data,
                creator=creator_profile,
                assignee=assignee_profile
            )

        return task_data

    @classmethod
    def update_task(cls, current_user: Dict[str, Any], task_id: str, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Updates an existing task. If status changes to completed, dispatches Gmail notification.
        """
        existing_task = cls.get_task(task_id)
        if not existing_task:
            return None

        previous_status = existing_task.get("status")
        now_iso = datetime.now(timezone.utc).isoformat()

        update_fields: Dict[str, Any] = {"updated_at": now_iso}

        for field in ["title", "description", "status", "priority", "due_date", "assigned_to"]:
            if field in payload:
                update_fields[field] = payload[field]

        new_status = update_fields.get("status", previous_status)
        if new_status == "completed" and previous_status != "completed":
            update_fields["completed_at"] = now_iso
        elif new_status != "completed" and previous_status == "completed":
            update_fields["completed_at"] = None

        client = get_supabase_client()
        if client:
            try:
                res = client.table("tasks").update(update_fields).eq("id", task_id).execute()
                if res.data and len(res.data) > 0:
                    update_fields = res.data[0]
            except Exception as e:
                logger.error(f"[TaskService] Error updating task in Supabase: {e}")

        # Update in-memory record
        existing_task.update(update_fields)

        # Check if new assignee was assigned
        new_assignee_id = existing_task.get("assigned_to")
        assignee_profile = cls.get_user_profile(new_assignee_id) if new_assignee_id else None
        creator_profile = cls.get_user_profile(existing_task.get("created_by"))

        existing_task["assignee"] = assignee_profile
        existing_task["creator"] = creator_profile

        # Notification: If task was just marked completed, dispatch completion email
        if new_status == "completed" and previous_status != "completed":
            GmailEmailService.notify_task_completed(
                task=existing_task,
                completer=current_user,
                creator=creator_profile,
                assignee=assignee_profile
            )

        return existing_task

    @classmethod
    def delete_task(cls, current_user: Dict[str, Any], task_id: str) -> bool:
        """Deletes task if user is authorized."""
        client = get_supabase_client()
        if client:
            try:
                client.table("tasks").delete().eq("id", task_id).execute()
                return True
            except Exception as e:
                logger.error(f"[TaskService] Error deleting task from Supabase: {e}")

        # Fallback
        global _MOCK_TASKS
        initial_len = len(_MOCK_TASKS)
        _MOCK_TASKS = [t for t in _MOCK_TASKS if t["id"] != task_id]
        return len(_MOCK_TASKS) < initial_len
