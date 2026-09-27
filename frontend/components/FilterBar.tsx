'use client';

import React from 'react';
import { TaskStatus, TaskPriority, TaskFilterView } from '@/types';
import { Search, Filter } from 'lucide-react';

interface FilterBarProps {
  filterView: TaskFilterView;
  onFilterViewChange: (view: TaskFilterView) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  priorityFilter: string;
  onPriorityFilterChange: (priority: string) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
}

export function FilterBar({
  filterView,
  onFilterViewChange,
  statusFilter,
  onStatusFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  searchQuery,
  onSearchQueryChange,
}: FilterBarProps) {
  return (
    <div className="controls-bar">
      {/* Scope Tabs */}
      <div className="filter-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={filterView === 'all'}
          className={`filter-tab ${filterView === 'all' ? 'active' : ''}`}
          onClick={() => onFilterViewChange('all')}
        >
          All Tasks
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filterView === 'assigned_to_me'}
          className={`filter-tab ${filterView === 'assigned_to_me' ? 'active' : ''}`}
          onClick={() => onFilterViewChange('assigned_to_me')}
        >
          Assigned to Me
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filterView === 'created_by_me'}
          className={`filter-tab ${filterView === 'created_by_me' ? 'active' : ''}`}
          onClick={() => onFilterViewChange('created_by_me')}
        >
          Created by Me
        </button>
      </div>

      {/* Filter Dropdowns & Search */}
      <div className="filter-dropdowns">
        {/* Search Input */}
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
          />
        </div>

        {/* Status Filter */}
        <select
          className="select-filter"
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="">All Statuses</option>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        {/* Priority Filter */}
        <select
          className="select-filter"
          value={priorityFilter}
          onChange={(e) => onPriorityFilterChange(e.target.value)}
          aria-label="Filter by priority"
        >
          <option value="">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>
    </div>
  );
}
