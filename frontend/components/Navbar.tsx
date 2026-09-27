'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { CheckSquare, Plus, LogOut, User as UserIcon } from 'lucide-react';

interface NavbarProps {
  onOpenCreateModal: () => void;
}

export function Navbar({ onOpenCreateModal }: NavbarProps) {
  const { user, profile, signOut, isDemoUser } = useAuth();

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;

  return (
    <header className="navbar">
      <div className="navbar-inner">
        {/* Brand */}
        <div className="brand-logo">
          <div className="brand-icon-wrapper">
            <CheckSquare size={20} />
          </div>
          <span>TaskFlow</span>
        </div>

        {/* Action Controls */}
        <div className="navbar-actions">
          {user && (
            <>
              {/* User Profile Pill */}
              <div className="user-pill" title={user.email}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="user-avatar" />
                ) : (
                  <div className="user-avatar">
                    <UserIcon size={16} />
                  </div>
                )}
                <span className="user-name">
                  {displayName}
                  {isDemoUser && <span style={{ color: 'var(--accent-warning)', fontSize: '11px', marginLeft: '4px' }}>(Demo)</span>}
                </span>
              </div>

              {/* Create Task Button */}
              <button
                type="button"
                className="btn btn-primary"
                onClick={onOpenCreateModal}
                id="create-task-btn"
              >
                <Plus size={18} />
                <span>New Task</span>
              </button>

              {/* Logout Button */}
              <button
                type="button"
                className="btn btn-secondary btn-icon"
                onClick={signOut}
                title="Log out"
                aria-label="Log out"
              >
                <LogOut size={16} />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
