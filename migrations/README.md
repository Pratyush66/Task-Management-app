# Database Migrations (Supabase / PostgreSQL)

This directory contains versioned SQL migrations for the **TaskFlow** management application.

## Migration Files

| Order | File | Description |
|---|---|---|
| `01` | [`01_initial_schema.sql`](file:///c:/interview%20assignment/Hair_drama_tech/Task-Management-app/migrations/01_initial_schema.sql) | Creates `profiles`, `tasks`, and `task_activities` tables with appropriate indexes and foreign keys. |
| `02` | [`02_triggers_and_functions.sql`](file:///c:/interview%20assignment/Hair_drama_tech/Task-Management-app/migrations/02_triggers_and_functions.sql) | Installs trigger for automatic Google OAuth profile provisioning (`handle_new_user`) and timestamp management (`updated_at`, `completed_at`). |
| `03` | [`03_rls_policies.sql`](file:///c:/interview%20assignment/Hair_drama_tech/Task-Management-app/migrations/03_rls_policies.sql) | Enforces Row Level Security (RLS) guaranteeing data privacy and authorization boundaries at the database layer. |

## How to Apply Migrations

### Method 1: Via Supabase Dashboard (Recommended for quick setup)
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your project and navigate to the **SQL Editor** tab on the left sidebar.
3. Open each file in numerical order (`01`, `02`, `03`) and click **Run**.

### Method 2: Via Supabase CLI
```bash
# Link your local project to your remote Supabase instance
npx supabase link --project-ref <your-project-id>

# Push migrations directly to remote database
npx supabase db push
```

## Entity Relationship Summary

```
auth.users (Supabase Managed Auth)
    │  (1:1 on auth.users.id)
    ▼
public.profiles
    ├── id (UUID, PK)
    ├── email (TEXT, Unique)
    ├── full_name (TEXT)
    └── avatar_url (TEXT)
         │
         ├── 1:N (created_by) ──┐
         └── 1:N (assigned_to) ─┼──► public.tasks
                                │       ├── id (UUID, PK)
                                │       ├── title (VARCHAR)
                                │       ├── description (TEXT)
                                │       ├── status ('todo', 'in_progress', 'completed', 'cancelled')
                                │       ├── priority ('low', 'medium', 'high', 'urgent')
                                │       ├── due_date (TIMESTAMPTZ)
                                │       └── completed_at (TIMESTAMPTZ)
                                │
                                └── 1:N ──► public.task_activities
                                                ├── id (UUID, PK)
                                                ├── task_id (UUID, FK -> tasks)
                                                ├── actor_id (UUID, FK -> profiles)
                                                └── action (VARCHAR)
```
