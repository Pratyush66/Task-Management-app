# 🎓 TaskFlow Technical Interview Preparation Guide

This guide is designed to help you confidently explain the architecture, design choices, trade-offs, and implementation details of **TaskFlow** during your technical interview.

---

## 📑 Table of Contents

1. [High-Level Architectural Rationale](#1-high-level-architectural-rationale)
2. [End-to-End Authentication Flow (OAuth 2.0 PKCE & JWT)](#2-end-to-end-authentication-flow-oauth-20-pkce--jwt)
3. [Database Design & PostgreSQL Triggers](#3-database-design--postgresql-triggers)
4. [Backend (Flask) Architecture & Middleware](#4-backend-flask-architecture--middleware)
5. [Gmail Notification Service & Async Concurrency](#5-gmail-notification-service--async-concurrency)
6. [Frontend (Next.js 16 + TypeScript) Architecture](#6-frontend-nextjs-16--typescript-architecture)
7. [Common Technical Interview Questions & Answers](#7-common-technical-interview-questions--answers)
8. [Edge Cases, Error Handling & Future Scalability](#8-edge-cases-error-handling--future-scalability)

---

## 1. High-Level Architectural Rationale

### Why This Stack?

- **Frontend (Next.js + TypeScript)**:
  - **Type Safety**: TypeScript prevents runtime bugs with strict contracts for tasks, profiles, and API inputs.
  - **App Router**: Modern component tree structure with declarative client-side state and clean separation of concerns.
  - **Vanilla CSS Design System**: Rather than relying on generic Tailwind utility classes, we built a custom design system using CSS custom properties (variables), native glassmorphism, responsive grid, and fluid micro-interactions. This demonstrates deep CSS fundamentals.

- **Backend (Flask + Python)**:
  - **Lightweight & Modular**: Flask provides an un-opinionated foundation using the Application Factory Pattern (`create_app`) and Blueprints (`auth_bp`, `tasks_bp`, `users_bp`, `health_bp`).
  - **Domain Decoupling**: Business logic resides in `TaskService`, completely decoupled from HTTP transport.
  - **Background Concurrency**: Python's `concurrent.futures.ThreadPoolExecutor` handles external I/O (SMTP email delivery) asynchronously without the overhead of heavy message brokers like RabbitMQ or Celery for small-to-medium throughput.

- **Database (Supabase / PostgreSQL)**:
  - **Relational Integrity**: Foreign keys (`created_by`, `assigned_to` referencing `profiles.id`) enforce referential integrity.
  - **Database Triggers**: The `handle_new_user()` trigger automatically synchronizes Google OAuth claims into the application database without requiring fragile manual webhook orchestration.
  - **Row Level Security (RLS)**: Protects data at the database engine level, defense-in-depth against API vulnerabilities.

---

## 2. End-to-End Authentication Flow (OAuth 2.0 PKCE & JWT)

### Step-by-Step Sequence

```
1. User clicks "Sign in with Google" on /login
2. Next.js triggers supabase.auth.signInWithOAuth({ provider: 'google' })
3. Browser redirects to Google Accounts consent screen
4. Google validates credentials and redirects back to Supabase Auth endpoint
5. Supabase executes trigger `on_auth_user_created`, inserting profile into `public.profiles`
6. Supabase redirects to Next.js client: `/auth/callback` with access_token
7. Next.js exchanges callback, retrieves user session, and calls Flask API:
   POST /api/auth/sync (Bearer <token>)
8. Flask @require_auth middleware validates JWT with Supabase / JWT Secret
9. User is redirected to Dashboard (/) with active authenticated session
```

### How the Token is Verified in Flask (`backend/middleware/auth_middleware.py`)
- The incoming request header `Authorization: Bearer <token>` is extracted.
- Flask validates the JWT either through Supabase's `auth.get_user(token)` API or by decoding the JWT signature directly using `SUPABASE_JWT_SECRET` (algorithm `HS256`).
- Once verified, the decoded user claims (`sub`, `email`, `user_metadata`) are attached to Flask's thread-local `g.user` and `g.user_id` context.
- If the token is invalid or expired, the request is rejected immediately with a `401 Unauthorized` JSON response.

---

## 3. Database Design & PostgreSQL Triggers

### 1. `profiles` Table
- `id` (UUID, Primary Key, Foreign Key to `auth.users(id)` ON DELETE CASCADE).
- `email` (TEXT, UNIQUE, NOT NULL).
- `full_name` (TEXT).
- `avatar_url` (TEXT).
- `created_at`, `updated_at` (TIMESTAMPTZ).

### 2. `tasks` Table
- `id` (UUID, Primary Key, `gen_random_uuid()`).
- `title` (VARCHAR(255), NOT NULL).
- `description` (TEXT).
- `status` (`CHECK (status IN ('todo', 'in_progress', 'completed', 'cancelled'))`).
- `priority` (`CHECK (priority IN ('low', 'medium', 'high', 'urgent'))`).
- `due_date` (TIMESTAMPTZ, nullable).
- `created_by` (UUID, Foreign Key to `profiles.id`).
- `assigned_to` (UUID, Foreign Key to `profiles.id`, ON DELETE SET NULL).
- `completed_at` (TIMESTAMPTZ, nullable).
- `created_at`, `updated_at` (TIMESTAMPTZ).

### 3. Database Triggers (`migrations/02_triggers_and_functions.sql`)
- **`handle_new_user()`**:
  Fires `AFTER INSERT OR UPDATE ON auth.users`. Reads `raw_user_meta_data->>'full_name'` and `raw_user_meta_data->>'avatar_url'` provided by Google OAuth and upserts into `public.profiles`.
- **`handle_task_completion_status()`**:
  Fires `BEFORE UPDATE ON public.tasks`. When status transitions to `'completed'`, sets `completed_at = NOW()`. If reopened to `'todo'`, clears `completed_at = NULL`.

---

## 4. Backend (Flask) Architecture & Middleware

### Application Factory Pattern (`backend/app.py`)
- Encapsulates app creation in `create_app(config_class=Config)`.
- Eliminates circular import issues common in simple Flask scripts.
- Enables spinning up different app instances for testing vs production.

### Blueprint Structure
- `routes/auth.py`: `/api/auth/sync`, `/api/auth/me`
- `routes/tasks.py`: Task CRUD (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`)
- `routes/users.py`: Assignable users directory
- `routes/health.py`: Live telemetry of dependencies (Supabase, Gmail SMTP)

### Decoupled Service Layer (`backend/services/task_service.py`)
- Routes do not write SQL or talk directly to the database. They perform input parsing and delegate to `TaskService`.
- If Supabase credentials are missing during local evaluation, `TaskService` transparently uses an in-memory mock store with pre-populated tasks, so reviewers can immediately click and explore the app without hitting 500 errors.

---

## 5. Gmail Notification Service & Async Concurrency

### Requirement: Send email on task creation and task completion

### Implementation (`backend/services/email_service.py`)
- Protocol: SMTP over SSL (`smtp.gmail.com:465`).
- Authentication: Gmail App Password (16 characters) generated under Google Account 2FA.
- Message Format: `MIMEMultipart("alternative")` with both plain text and responsive HTML email templates (styled with modern typography, priority pills, and deep link button).

### Why `ThreadPoolExecutor` instead of synchronous sending?
- **Problem**: Opening an SSL socket and performing SMTP handshake with Google's mail servers takes between 1.0s and 2.5s. If done synchronously in the Flask route, the user would perceive a noticeable lag after clicking "Create Task".
- **Solution**: We instantiate a dedicated `ThreadPoolExecutor(max_workers=4)`. When `create_task()` finishes, it submits `_send_smtp_email` to the pool and returns `201 Created` immediately (in ~30ms).
- **Scalability Note for Interviewers**: In a massive production cluster, you would explain that you would migrate `ThreadPoolExecutor` to **Celery + Redis** or an AWS SQS / Cloud Tasks worker queue so tasks persist across server restarts.

---

## 6. Frontend (Next.js 16 + TypeScript) Architecture

### Key Design Highlights:
- **`AuthContext.tsx`**: Centralized authentication state. Automatically syncs user profile with Flask backend on login. Supports instant **Demo Login** for quick reviewer evaluation.
- **`ToastContext.tsx`**: Custom lightweight toast dispatch system providing instant visual feedback on actions (e.g., "Task assigned to Priya! Notification email queued.").
- **`FilterBar.tsx`**: Client-side & server-side filter support:
  - Filter by scope: All Tasks, Assigned to Me, Created by Me.
  - Filter by status: To Do, In Progress, Completed, Cancelled.
  - Filter by priority: Urgent, High, Medium, Low.
  - Search query text filtering.
- **Optimistic UI Updates**:
  When marking a task completed via checkbox in `TaskCard.tsx`, the UI updates the task state immediately, then fires the API patch in the background. If the request fails, it gracefully reverts and shows a toast error.

---

## 7. Common Technical Interview Questions & Answers

### Q1: How did you implement Google OAuth, and why through Supabase?
> **Answer**: "I leveraged Supabase Auth as the OAuth 2.0 Identity Broker. When the user clicks 'Sign in with Google', the frontend initiates an OAuth 2.0 PKCE flow with Google. Once Google authenticates the user, Supabase receives the authorization code, issues a signed JWT access token, and triggers a PostgreSQL function (`handle_new_user`) that automatically provisions the user in the `public.profiles` table. The frontend passes this Supabase JWT in the `Authorization: Bearer` header to the Flask backend, which validates the token claims before fulfilling any request."

### Q2: How does the Flask backend verify that an incoming request is authentic?
> **Answer**: "We built an `@require_auth` decorator in `backend/middleware/auth_middleware.py`. It inspects the `Authorization` header, extracts the Bearer token, and verifies it with Supabase Auth or decodes its cryptographic signature using the project's `SUPABASE_JWT_SECRET` with the `HS256` algorithm. If valid, the user identity (`user_id`, `email`, metadata) is attached to Flask's `g.user` context. If the token is missing, expired, or tampered with, it returns a 401 Unauthorized error."

### Q3: Why did you use `ThreadPoolExecutor` for Gmail notifications instead of sending synchronously?
> **Answer**: "SMTP network calls involve DNS resolution, TLS handshakes, and mail server acknowledgments, which typically introduce 1 to 2.5 seconds of latency. If executed synchronously inside the HTTP handler, the API response time would degrade significantly. By offloading the email dispatch to a background `ThreadPoolExecutor`, the API responds to the client in under 50ms, while the background thread takes care of SMTP delivery. For high-volume production systems, this could easily be upgraded to Celery with Redis or Google Cloud Tasks."

### Q4: How is data consistency maintained when assigning tasks to other users?
> **Answer**: "At the database level, foreign key constraints link `tasks.assigned_to` and `tasks.created_by` directly to `profiles.id`. We have an index on `assigned_to` and `created_by` for fast joins and lookups. In the UI, the assignee dropdown dynamically loads registered users from `/api/users`. When a task is assigned, the backend fetches the assignee's profile to extract their verified email address and dispatches the Gmail notification."

### Q5: What is Row Level Security (RLS), and how does it protect the application?
> **Answer**: "Row Level Security is a PostgreSQL feature that evaluates access control policies directly inside the database engine on every query. In our `03_rls_policies.sql` migration, we configured policies ensuring that:
> 1. Any authenticated user can view profiles (to enable assignment).
> 2. Users can only update their own profile (`auth.uid() = id`).
> 3. Task updates are restricted to the task's creator or assignee.
> This guarantees defense-in-depth: even if a client attempts a direct Supabase query, the database enforces authorization boundaries."

### Q6: How does the app handle users who want to review or test without setting up Google Cloud Console credentials?
> **Answer**: "We built an intentional **Demo Mode** into the application. On the login screen, there is a 'Quick Evaluation Demo Account' button that seeds a mock reviewer session. Furthermore, if `SUPABASE_URL` or Gmail credentials are not configured in `.env`, the backend operates in development simulation mode—mocking tasks in-memory and logging emails to the console—allowing any reviewer to evaluate the entire UI and backend workflows without setup friction."

### Q7: Why Vanilla CSS instead of Tailwind CSS?
> **Answer**: "We engineered a clean custom design system in `globals.css` with CSS custom properties (variables) for theme tokens, glassmorphism (`backdrop-filter: blur`), dark-slate foundations, glowing priority badges, and CSS grid layouts. This avoids heavy external build dependencies, ensures 100% fine-grained control over micro-animations, and demonstrates strong core web standards and CSS proficiency."

### Q8: How did you prevent SQL injection and cross-site scripting (XSS)?
> **Answer**: "SQL injection is prevented by using parameterized queries and ORM/SDK abstractions (Supabase client and PostgreSQL prepared statements). Next.js automatically escapes values in JSX to prevent Cross-Site Scripting (XSS). In addition, CORS is configured in Flask with explicit allowed headers (`Authorization`, `Content-Type`) and methods (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`)."

---

## 8. Edge Cases, Error Handling & Future Scalability

1. **Email Failure Resiliency**:
   If Gmail SMTP encounters an authentication error or rate limit, the error is caught and logged in `email_service.py` without causing the task creation or status update to fail. The database transaction always succeeds.
2. **Optimistic UI Updates**:
   Status toggling in `page.tsx` updates local React state immediately for instant perceived performance. If the network request fails, the task state is reverted and an error toast is displayed.
3. **Database Migration Strategy**:
   The `/migrations` directory contains numbered, idempotent SQL files (`01_initial_schema.sql`, `02_triggers_and_functions.sql`, `03_rls_policies.sql`) that can be applied via Supabase CLI (`supabase db push`) or the Supabase SQL Editor.
4. **Production Scalability Roadmap**:
   - Add Redis caching for `/api/users` and `/api/tasks`.
   - Upgrade `ThreadPoolExecutor` to Celery + Redis or SQS for distributed email queuing with automatic retries and exponential backoff.
   - Deploy backend to Render/Railway using Gunicorn with 4 gevent/gthread workers behind PgBouncer connection pooling.
