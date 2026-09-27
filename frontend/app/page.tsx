'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { api } from '@/lib/api';
import { Task, Profile, TaskStatus, TaskPriority, TaskFilterView, CreateTaskInput } from '@/types';
import { Navbar } from '@/components/Navbar';
import { StatsCards } from '@/components/StatsCards';
import { FilterBar } from '@/components/FilterBar';
import { TaskCard } from '@/components/TaskCard';
import { TaskModal } from '@/components/TaskModal';
import { Plus, Inbox } from 'lucide-react';

export default function DashboardPage() {
  const { user, token, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  // State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loadingTasks, setLoadingTasks] = useState<boolean>(true);

  // Filters
  const [filterView, setFilterView] = useState<TaskFilterView>('all');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Authentication Guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Fetch Users Directory
  const loadUsers = useCallback(async () => {
    if (!token) return;
    try {
      const userList = await api.getUsers(token);
      setUsers(userList);
    } catch (err) {
      console.warn('[Dashboard] Could not fetch users directory:', err);
    }
  }, [token]);

  // Fetch Tasks with Current Filters
  const loadTasks = useCallback(async () => {
    if (!token) return;
    try {
      setLoadingTasks(true);
      const data = await api.getTasks(token, {
        status: (statusFilter as TaskStatus) || undefined,
        priority: (priorityFilter as TaskPriority) || undefined,
        filter: filterView,
        search: searchQuery.trim() || undefined,
      });
      setTasks(data);
    } catch (err: any) {
      console.error('[Dashboard] Error loading tasks:', err);
      showToast('Failed to load tasks from server', 'error');
    } finally {
      setLoadingTasks(false);
    }
  }, [token, statusFilter, priorityFilter, filterView, searchQuery, showToast]);

  useEffect(() => {
    if (token) {
      loadUsers();
      loadTasks();
    }
  }, [token, loadUsers, loadTasks]);

  // ---------------------------------------------------------------------------
  // Task Actions
  // ---------------------------------------------------------------------------

  // Handle Create or Update
  const handleSaveTask = async (data: CreateTaskInput) => {
    if (!token) return;

    if (editingTask) {
      // Update
      const updated = await api.updateTask(token, editingTask.id, data);
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      showToast('Task updated successfully!', 'success');
    } else {
      // Create
      const created = await api.createTask(token, data);
      setTasks((prev) => [created, ...prev]);

      const assigneeName = users.find((u) => u.id === created.assigned_to)?.full_name || 'Team member';
      if (created.assigned_to) {
        showToast(`Task assigned to ${assigneeName}! Gmail notification queued.`, 'success');
      } else {
        showToast('Task created successfully!', 'success');
      }
    }
  };

  // Toggle Complete / Incomplete
  const handleStatusToggle = async (taskId: string, currentStatus: TaskStatus) => {
    if (!token) return;
    const newStatus: TaskStatus = currentStatus === 'completed' ? 'todo' : 'completed';

    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    try {
      const updated = await api.updateTaskStatus(token, taskId, newStatus);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));

      if (newStatus === 'completed') {
        showToast('Task marked as completed! Notification sent to creator.', 'success');
      } else {
        showToast('Task reopened as To Do.', 'info');
      }
    } catch (err: any) {
      // Revert optimistic update
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: currentStatus } : t))
      );
      showToast(err.message || 'Failed to update status', 'error');
    }
  };

  // Status dropdown change
  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    if (!token) return;
    try {
      const updated = await api.updateTaskStatus(token, taskId, newStatus);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));

      if (newStatus === 'completed') {
        showToast('Task completed! Notification dispatched via Gmail.', 'success');
      } else {
        showToast(`Status changed to ${newStatus}.`, 'info');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update status', 'error');
    }
  };

  // Delete Task
  const handleDeleteTask = async (taskId: string) => {
    if (!token) return;
    const confirmed = window.confirm('Are you sure you want to delete this task?');
    if (!confirmed) return;

    try {
      await api.deleteTask(token, taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      showToast('Task deleted successfully.', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete task', 'error');
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  if (authLoading || (!user && !token)) {
    return (
      <div className="login-wrapper">
        <div style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
          Loading TaskFlow workspace...
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Top Navigation */}
      <Navbar onOpenCreateModal={handleOpenCreate} />

      <main className="app-container">
        {/* Metric Summary Counters */}
        <StatsCards tasks={tasks} />

        {/* Filter Controls Bar */}
        <FilterBar
          filterView={filterView}
          onFilterViewChange={setFilterView}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          priorityFilter={priorityFilter}
          onPriorityFilterChange={setPriorityFilter}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
        />

        {/* Task Cards List */}
        {loadingTasks ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            Refreshing tasks...
          </div>
        ) : tasks.length > 0 ? (
          <div className="tasks-container">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onStatusToggle={handleStatusToggle}
                onStatusChange={handleStatusChange}
                onEdit={handleOpenEdit}
                onDelete={handleDeleteTask}
                isCreator={task.created_by === user?.id}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">
              <Inbox size={48} />
            </div>
            <h3 className="empty-title">No tasks found</h3>
            <p className="empty-desc">
              {searchQuery || statusFilter || priorityFilter || filterView !== 'all'
                ? 'Try adjusting your filters or search query to find what you are looking for.'
                : 'Get started by creating your first task and assigning it to a team member.'}
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOpenCreate}
            >
              <Plus size={16} />
              <span>Create Task</span>
            </button>
          </div>
        )}

        {/* Create / Edit Modal Dialog */}
        <TaskModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingTask(null);
          }}
          onSubmit={handleSaveTask}
          initialData={editingTask}
          users={users}
        />
      </main>
    </>
  );
}
