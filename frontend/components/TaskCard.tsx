'use client';

import React from 'react';
import { Task, TaskStatus } from '@/types';
import { Calendar, User, Check, Trash2, Edit3 } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onStatusToggle: (taskId: string, currentStatus: TaskStatus) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  isCreator: boolean;
}

export function TaskCard({
  task,
  onStatusToggle,
  onStatusChange,
  onEdit,
  onDelete,
  isCreator,
}: TaskCardProps) {
  const isCompleted = task.status === 'completed';

  const formattedDueDate = task.due_date
    ? new Date(task.due_date).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <div className={`task-card priority-${task.priority} ${isCompleted ? 'status-completed' : ''}`}>
      <div className="task-left-section">
        {/* Quick Complete Checkbox */}
        <button
          type="button"
          className={`task-checkbox-btn ${isCompleted ? 'checked' : ''}`}
          onClick={() => onStatusToggle(task.id, task.status)}
          title={isCompleted ? 'Mark as incomplete' : 'Mark as completed'}
          aria-label={isCompleted ? 'Mark as incomplete' : 'Mark as completed'}
        >
          {isCompleted && <Check size={14} strokeWidth={3} />}
        </button>

        {/* Task Details */}
        <div className="task-details">
          <div className="task-header-row">
            <span className={`badge badge-${task.priority}`}>
              {task.priority}
            </span>

            <select
              className={`select-filter badge-status badge-${task.status}`}
              value={task.status}
              onChange={(e) => onStatusChange(task.id, e.target.value as TaskStatus)}
              style={{ padding: '2px 8px', fontSize: '12px', height: '26px' }}
            >
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <h3 className={`task-title ${isCompleted ? 'strikethrough' : ''}`}>
              {task.title}
            </h3>
          </div>

          {task.description && (
            <p className="task-description">{task.description}</p>
          )}

          {/* Metadata bar */}
          <div className="task-meta-bar">
            {/* Assignee */}
            <div className="task-meta-item" title={task.assignee?.email ? `Assignee: ${task.assignee.email}` : 'Unassigned'}>
              <User size={14} />
              <span>
                Assigned to:{' '}
                <strong>
                  {task.assignee?.full_name || task.assignee?.email || 'Unassigned'}
                </strong>
              </span>
            </div>

            {/* Due Date */}
            {formattedDueDate && (
              <div className="task-meta-item">
                <Calendar size={14} />
                <span>Due: {formattedDueDate}</span>
              </div>
            )}

            {/* Creator */}
            <div className="task-meta-item">
              <span>Created by: {task.creator?.full_name || 'Team member'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Action Menu */}
      <div className="task-right-section">
        <button
          type="button"
          className="btn btn-secondary btn-icon"
          onClick={() => onEdit(task)}
          title="Edit task"
          aria-label="Edit task"
        >
          <Edit3 size={15} />
        </button>

        {isCreator && (
          <button
            type="button"
            className="btn btn-danger btn-icon"
            onClick={() => onDelete(task.id)}
            title="Delete task"
            aria-label="Delete task"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>
    </div>
  );
}
