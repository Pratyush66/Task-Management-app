-- ==============================================================================
-- Migration 03: Row Level Security (RLS) Policies
-- Project: TaskFlow - Distributed Task Management App
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Enable RLS on All Tables
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_activities ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 2. Profiles Table Policies
-- ------------------------------------------------------------------------------

-- Allow any authenticated user to view profiles (essential for assigning tasks)
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view all profiles"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow users to update only their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Allow service role / trigger to insert profiles
DROP POLICY IF EXISTS "Service role has full access to profiles" ON public.profiles;
CREATE POLICY "Service role has full access to profiles"
    ON public.profiles
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 3. Tasks Table Policies
-- ------------------------------------------------------------------------------

-- Authenticated users can view all tasks in the shared workspace
DROP POLICY IF EXISTS "Authenticated users can view tasks" ON public.tasks;
CREATE POLICY "Authenticated users can view tasks"
    ON public.tasks
    FOR SELECT
    TO authenticated
    USING (true);

-- Authenticated users can create tasks (enforcing created_by = auth.uid())
DROP POLICY IF EXISTS "Users can insert their own tasks" ON public.tasks;
CREATE POLICY "Users can insert their own tasks"
    ON public.tasks
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = created_by);

-- Creators and assignees can update a task (e.g., status, description, assignee)
DROP POLICY IF EXISTS "Creators and assignees can update tasks" ON public.tasks;
CREATE POLICY "Creators and assignees can update tasks"
    ON public.tasks
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = created_by OR auth.uid() = assigned_to)
    WITH CHECK (auth.uid() = created_by OR auth.uid() = assigned_to);

-- Only the creator can delete a task
DROP POLICY IF EXISTS "Only creators can delete tasks" ON public.tasks;
CREATE POLICY "Only creators can delete tasks"
    ON public.tasks
    FOR DELETE
    TO authenticated
    USING (auth.uid() = created_by);

-- Service role bypass for backend administration
DROP POLICY IF EXISTS "Service role has full access to tasks" ON public.tasks;
CREATE POLICY "Service role has full access to tasks"
    ON public.tasks
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 4. Task Activities Policies
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS "Authenticated users can view task activities" ON public.task_activities;
CREATE POLICY "Authenticated users can view task activities"
    ON public.task_activities
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert task activities" ON public.task_activities;
CREATE POLICY "Authenticated users can insert task activities"
    ON public.task_activities
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = actor_id);

DROP POLICY IF EXISTS "Service role has full access to task activities" ON public.task_activities;
CREATE POLICY "Service role has full access to task activities"
    ON public.task_activities
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
