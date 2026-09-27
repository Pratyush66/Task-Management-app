'use client';

import React from 'react';
import { Task } from '@/types';
import { ListTodo, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';

interface StatsCardsProps {
  tasks: Task[];
}

export function StatsCards({ tasks }: StatsCardsProps) {
  const total = tasks.length;
  const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
  const completed = tasks.filter((t) => t.status === 'completed').length;
  const urgentOrHigh = tasks.filter(
    (t) => (t.priority === 'urgent' || t.priority === 'high') && t.status !== 'completed'
  ).length;

  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="stats-grid">
      {/* Total Tasks */}
      <div className="stat-card">
        <div className="stat-info">
          <span className="stat-label">Total Tasks</span>
          <span className="stat-value">{total}</span>
        </div>
        <div className="stat-icon-wrapper stat-icon-total">
          <ListTodo size={22} />
        </div>
      </div>

      {/* In Progress */}
      <div className="stat-card">
        <div className="stat-info">
          <span className="stat-label">In Progress</span>
          <span className="stat-value">{inProgress}</span>
        </div>
        <div className="stat-icon-wrapper stat-icon-progress">
          <Clock size={22} />
        </div>
      </div>

      {/* Completed */}
      <div className="stat-card">
        <div className="stat-info">
          <span className="stat-label">Completed ({completionRate}%)</span>
          <span className="stat-value">{completed}</span>
        </div>
        <div className="stat-icon-wrapper stat-icon-completed">
          <CheckCircle2 size={22} />
        </div>
      </div>

      {/* Urgent / High Attention */}
      <div className="stat-card">
        <div className="stat-info">
          <span className="stat-label">Urgent & High</span>
          <span className="stat-value">{urgentOrHigh}</span>
        </div>
        <div className="stat-icon-wrapper stat-icon-urgent">
          <AlertTriangle size={22} />
        </div>
      </div>
    </div>
  );
}
