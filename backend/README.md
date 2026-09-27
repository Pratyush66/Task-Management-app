# TaskFlow Backend API (Flask)

The backend service for **TaskFlow**, built with Python & Flask. Handles task lifecycle operations, Supabase data synchronization, JWT authentication verification, and non-blocking Gmail SMTP email notifications.

---

## 🛠️ Architecture & Core Components

```
backend/
├── app.py                     # Flask application factory (CORS, error handlers)
├── config.py                  # Environment-driven configuration
├── requirements.txt           # Python package dependencies
├── Procfile                   # Process file for Render / Railway (Gunicorn)
├── Dockerfile                 # Container image specification
├── middleware/
│   └── auth_middleware.py     # @require_auth decorator for Supabase JWT validation
├── routes/
│   ├── auth.py                # User profile synchronization and session check
│   ├── tasks.py               # Task CRUD & status transitions
│   ├── users.py               # Assignable user directory
│   └── health.py              # Operational healthcheck & dependency telemetry
└── services/
    ├── supabase_client.py     # Supabase client singleton
    ├── task_service.py        # Task domain logic & event triggers
    └── email_service.py       # Asynchronous Gmail SMTP delivery service
```

---

## 🔑 Authentication Architecture

Authentication is stateless and delegates identity management to **Supabase Auth (Google OAuth 2.0)**:
1. The client signs in via Google OAuth with Supabase.
2. Supabase issues a cryptographically signed JWT Access Token.
3. The frontend passes this token in the `Authorization: Bearer <token>` header to this Flask API.
4. The `@require_auth` decorator validates the token against Supabase or the project's JWT secret, extracting the authenticated `user_id` and injecting it into Flask's `g.user` request context.

---

## 📧 Gmail Notification System

TaskFlow sends transactional emails at critical lifecycle moments:
1. **Task Created & Assigned**: Dispatches an email to the assignee with title, priority badge, due date, description, and link to view the task.
2. **Task Completed**: Dispatches an email to the task creator informing them the task is finished.

### Asynchronous Execution
To keep API responses instantaneous (< 50ms) and eliminate latency spikes caused by external SMTP handshakes (typically 1-2 seconds), all emails are dispatched using Python's `concurrent.futures.ThreadPoolExecutor`.

### Setup Gmail Credentials
1. Turn on **2-Step Verification** in your Google Account: [Google Security Settings](https://myaccount.google.com/security)
2. Generate an **App Password**: [Google App Passwords](https://myaccount.google.com/apppasswords)
   - App: `Mail`
   - Device: `TaskFlow`
3. Add the 16-character password to `backend/.env`:
   ```env
   GMAIL_USER=your-email@gmail.com
   GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
   ```
*(Note: If not configured, emails will be logged clearly in the console during development without throwing errors.)*

---

## 🚀 Local Development Setup

### 1. Create Virtual Environment
```bash
# Using Python
python -m venv .venv

# Activate virtual environment
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# Mac/Linux:
source .venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your Supabase credentials:
```bash
cp .env.example .env
```

### 4. Run Development Server
```bash
python app.py
```
Server starts on `http://localhost:5000`.

---

## 📡 API Endpoints Reference

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/health` | Service health & dependency status | No |
| `POST` | `/api/auth/sync` | Syncs Google OAuth user into profiles | Yes |
| `GET` | `/api/auth/me` | Current authenticated user's profile | Yes |
| `GET` | `/api/users` | List registered users for task assignment | Yes |
| `GET` | `/api/tasks` | List tasks (supports `status`, `priority`, `filter`, `search`) | Yes |
| `POST` | `/api/tasks` | Create task & dispatch email | Yes |
| `GET` | `/api/tasks/<id>` | Get task details | Yes |
| `PUT` | `/api/tasks/<id>` | Update task | Yes |
| `PATCH` | `/api/tasks/<id>/status`| Update status (e.g. `completed` triggers email) | Yes |
| `DELETE` | `/api/tasks/<id>`| Delete task | Yes |
