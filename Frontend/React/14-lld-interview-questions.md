# React Low-Level Design Interview Questions (TypeScript)

## Overview

This guide covers 10 essential Low-Level Design (LLD) questions frequently asked in React interviews at top Product-Based Companies (PBCs). All examples use **TypeScript** with proper type definitions, interfaces, and type safety.

**Target Audience:** Mid to senior-level React developers (2-7 years experience)

**Topics Covered:**
1. [Toast Notification System](#1-toast-notification-system)
2. [Nested Comment Thread](#2-nested-comment-thread-reddit-style)
3. [Responsive Sidebar Navigation](#3-responsive-sidebar-navigation)
4. [Tab Component with Animations](#4-tab-component-with-animations)
5. [Filterable Sortable Data Table](#5-filterable-sortable-data-table)
6. [Like Button with Optimistic Updates](#6-like-button-with-optimistic-updates)
7. [Live Chat Feature](#7-live-chat-feature)
8. [Throttle/Debounce Button Clicks](#8-throttledebounce-button-clicks)
9. [Collapsible Accordion Component](#9-collapsible-accordion-component)
10. [Dark/Light Mode Theming](#10-darklight-mode-theming)

---

## 1. Toast Notification System

### 💡 **Problem Statement**

Design a global toast notification system that can display multiple notifications, queue them properly, auto-dismiss after timeout, and prevent overlapping toasts.

**Key Requirements:**
- Display notifications from anywhere in the app
- Support multiple notification types (success, error, warning, info)
- Auto-dismiss after configurable timeout
- Queue notifications when multiple arrive simultaneously
- Support manual dismissal
- Prevent duplicate notifications

### **Architecture Approach**

**State Management Options:**

| Approach | Pros | Cons | Best For |
|----------|------|------|----------|
| **Context API** | Simple, built-in, no dependencies | Can cause unnecessary re-renders | Small to medium apps |
| **Redux** | Centralized, DevTools, middleware | Boilerplate overhead | Large apps with complex state |
| **Custom Event Bus** | Decoupled, lightweight | Manual subscription management | Standalone notification system |
| **Zustand** | Minimal boilerplate, good DX | External dependency | Modern apps needing simplicity |

**Recommended:** Context API + useReducer for most cases

### **Implementation**

**Step 1: Types and Interfaces**

```typescript
// types/toast.ts
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string | number;
  message: string;
  type: ToastType;
  duration: number;
}

export type ToastAction =
  | { type: 'ADD_TOAST'; payload: Toast }
  | { type: 'REMOVE_TOAST'; payload: string | number };

export interface ToastContextType {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType, duration?: number) => string | number;
  removeToast: (id: string | number) => void;
}
```

**Step 2: Toast Context & Provider**

```typescript
// contexts/ToastContext.tsx
import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import type { Toast, ToastAction, ToastContextType, ToastType } from '../types/toast';

const ToastContext = createContext<ToastContextType | null>(null);

// Reducer
function toastReducer(state: Toast[], action: ToastAction): Toast[] {
  switch (action.type) {
    case 'ADD_TOAST':
      return [...state, action.payload];

    case 'REMOVE_TOAST':
      return state.filter(toast => toast.id !== action.payload);

    default:
      return state;
  }
}

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, dispatch] = useReducer(toastReducer, []);

  // Add toast with auto-dismiss
  const addToast = useCallback((
    message: string,
    type: ToastType = 'info',
    duration: number = 3000
  ): string | number => {
    const id = Date.now() + Math.random(); // Unique ID

    dispatch({
      type: 'ADD_TOAST',
      payload: { id, message, type, duration }
    });

    // Auto-dismiss after duration
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id; // Return ID for manual dismissal
  }, []);

  const removeToast = useCallback((id: string | number): void => {
    dispatch({ type: 'REMOVE_TOAST', payload: id });
  }, []);

  const value: ToastContextType = {
    toasts,
    addToast,
    removeToast
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
```

**Step 3: Toast Component**

```typescript
// components/Toast.tsx
import React, { FC } from 'react';
import { useToast } from '../contexts/ToastContext';
import type { Toast as ToastType } from '../types/toast';
import './Toast.css';

interface ToastProps extends ToastType {}

const Toast: FC<ToastProps> = ({ id, message, type, duration }) => {
  const { removeToast } = useToast();

  const getIcon = (toastType: ToastType['type']): string => {
    const icons: Record<ToastType['type'], string> = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };
    return icons[toastType];
  };

  return (
    <div className={`toast toast-${type}`} role="alert">
      <div className="toast-content">
        <span className="toast-icon">{getIcon(type)}</span>
        <p className="toast-message">{message}</p>
      </div>
      <button
        className="toast-close"
        onClick={() => removeToast(id)}
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  );
};

export default Toast;
```

**Step 4: Toast Container**

```typescript
// components/ToastContainer.tsx
import React, { FC } from 'react';
import { useToast } from '../contexts/ToastContext';
import Toast from './Toast';
import './ToastContainer.css';

const ToastContainer: FC = () => {
  const { toasts } = useToast();

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} />
      ))}
    </div>
  );
};

export default ToastContainer;
```

**Step 5: Usage Example**

```typescript
// App.tsx
import React, { FC } from 'react';
import { ToastProvider, useToast } from './contexts/ToastContext';
import ToastContainer from './components/ToastContainer';

const MyComponent: FC = () => {
  const { addToast } = useToast();

  const handleSuccess = (): void => {
    addToast('Operation completed successfully!', 'success', 3000);
  };

  const handleError = (): void => {
    addToast('Something went wrong. Please try again.', 'error', 5000);
  };

  return (
    <div>
      <button onClick={handleSuccess}>Show Success</button>
      <button onClick={handleError}>Show Error</button>
    </div>
  );
};

const App: FC = () => {
  return (
    <ToastProvider>
      <div className="app">
        <MyComponent />
        <ToastContainer />
      </div>
    </ToastProvider>
  );
};

export default App;
```

### **Advanced Features**

**1. Prevent Duplicate Notifications:**

```typescript
// Enhanced addToast function with duplicate detection
const addToast = useCallback((
  message: string,
  type: ToastType = 'info',
  duration: number = 3000
): string | number | null => {
  // Check for duplicate messages
  const isDuplicate = toasts.some(
    toast => toast.message === message && toast.type === type
  );

  if (isDuplicate) {
    return null; // Don't add duplicate
  }

  const id = Date.now() + Math.random();
  dispatch({
    type: 'ADD_TOAST',
    payload: { id, message, type, duration }
  });

  if (duration > 0) {
    setTimeout(() => removeToast(id), duration);
  }

  return id;
}, [toasts]);
```

**2. Pause on Hover with TypeScript:**

```typescript
// components/Toast.tsx with pause functionality
import React, { FC, useState, useEffect, useRef } from 'react';

const Toast: FC<ToastProps> = ({ id, message, type, duration }) => {
  const { removeToast } = useToast();
  const [isPaused, setIsPaused] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const remainingTimeRef = useRef<number>(duration);

  useEffect(() => {
    if (!isPaused && duration > 0) {
      startTimeRef.current = Date.now();
      timeoutRef.current = setTimeout(() => {
        removeToast(id);
      }, remainingTimeRef.current);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        // Calculate remaining time
        remainingTimeRef.current -= Date.now() - startTimeRef.current;
      }
    };
  }, [isPaused, id, duration, removeToast]);

  return (
    <div
      className={`toast toast-${type}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* toast content */}
    </div>
  );
};
```

### **Key Considerations**

**Performance:**
- ✅ Use `useCallback` for memoized functions
- ✅ Implement unique IDs to prevent React key issues
- ✅ Clean up timeouts in useEffect cleanup

**Accessibility:**
- ✅ Use `role="alert"` for screen readers
- ✅ Use `aria-live="polite"` on container
- ✅ Include `aria-label` on close button
- ✅ Ensure sufficient color contrast

**Type Safety:**
- ✅ Define strict types for toast variants
- ✅ Use discriminated unions for actions
- ✅ Properly type context values
- ✅ Ensure all callbacks have proper signatures

### **Key Insight**
> TypeScript provides compile-time safety for toast types, preventing runtime errors from invalid toast configurations. Use discriminated unions for reducer actions and strict typing for context values to catch bugs early.

---

## 2. Nested Comment Thread (Reddit-Style)

### 💡 **Problem Statement**

Build a recursive comment thread system where users can reply to comments at any depth level, similar to Reddit or HackerNews.

**Key Requirements:**
- Unlimited nesting depth
- Reply to any comment
- Expand/collapse threads
- Vote system (upvote/downvote)
- Performance optimization for large threads

### **Types and Interfaces**

```typescript
// types/comment.ts
export interface Comment {
  id: string;
  author: string;
  content: string;
  timestamp: number;
  votes: number;
  replies: Comment[];
}

export interface CommentProps {
  comment: Comment;
  onReply: (parentId: string, content: string) => void;
  onVote: (commentId: string, value: number) => void;
  depth?: number;
}

export interface CommentThreadProps {
  initialComments: Comment[];
}
```

### **Implementation**

**Step 1: Recursive Comment Component**

```typescript
// components/Comment.tsx
import React, { FC, useState, memo, KeyboardEvent } from 'react';
import type { CommentProps } from '../types/comment';
import './Comment.css';

const Comment: FC<CommentProps> = memo(({
  comment,
  onReply,
  onVote,
  depth = 0
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyText, setReplyText] = useState('');

  const hasReplies = comment.replies && comment.replies.length > 0;
  const maxDepth = 10; // Prevent infinite nesting

  const handleSubmitReply = (): void => {
    if (replyText.trim()) {
      onReply(comment.id, replyText);
      setReplyText('');
      setShowReplyBox(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSubmitReply();
    }
  };

  const formatTime = (timestamp: number): string => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="comment" style={{ marginLeft: depth > 0 ? '40px' : '0' }}>
      {/* Comment Header */}
      <div className="comment-header">
        <div className="comment-meta">
          <span className="comment-author">{comment.author}</span>
          <span className="comment-time">{formatTime(comment.timestamp)}</span>
          {hasReplies && (
            <button
              className="comment-collapse"
              onClick={() => setIsCollapsed(!isCollapsed)}
              aria-label={isCollapsed ? "Expand thread" : "Collapse thread"}
            >
              [{isCollapsed ? '+' : '−'}]
            </button>
          )}
        </div>
      </div>

      {/* Comment Body */}
      {!isCollapsed && (
        <>
          {/* Vote System */}
          <div className="comment-votes">
            <button
              className="vote-btn"
              onClick={() => onVote(comment.id, 1)}
              aria-label="Upvote"
            >
              ▲
            </button>
            <span className="vote-count">{comment.votes}</span>
            <button
              className="vote-btn"
              onClick={() => onVote(comment.id, -1)}
              aria-label="Downvote"
            >
              ▼
            </button>
          </div>

          {/* Comment Content */}
          <div className="comment-content">
            <p>{comment.content}</p>
          </div>

          {/* Comment Actions */}
          <div className="comment-actions">
            {depth < maxDepth && (
              <button
                className="reply-btn"
                onClick={() => setShowReplyBox(!showReplyBox)}
              >
                Reply
              </button>
            )}
          </div>

          {/* Reply Input */}
          {showReplyBox && (
            <div className="reply-box">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Write a reply... (Ctrl+Enter to submit)"
                rows={3}
              />
              <div className="reply-actions">
                <button onClick={handleSubmitReply}>Submit</button>
                <button onClick={() => setShowReplyBox(false)}>Cancel</button>
              </div>
            </div>
          )}

          {/* Recursive Replies */}
          {hasReplies && (
            <div className="comment-replies">
              {comment.replies.map((reply) => (
                <Comment
                  key={reply.id}
                  comment={reply}
                  onReply={onReply}
                  onVote={onVote}
                  depth={depth + 1}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
});

Comment.displayName = 'Comment';

export default Comment;
```

**Step 2: Comment Thread Container**

```typescript
// components/CommentThread.tsx
import React, { FC, useState, useCallback, useMemo } from 'react';
import Comment from './Comment';
import type { Comment as CommentType, CommentThreadProps } from '../types/comment';

type SortOption = 'newest' | 'oldest' | 'top';

const CommentThread: FC<CommentThreadProps> = ({ initialComments }) => {
  const [comments, setComments] = useState<CommentType[]>(initialComments);
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  // Add reply to a specific comment
  const handleReply = useCallback((parentId: string, content: string): void => {
    const newReply: CommentType = {
      id: `c${Date.now()}`,
      author: 'CurrentUser', // Replace with actual user
      content,
      timestamp: Date.now(),
      votes: 0,
      replies: []
    };

    // Recursive function to find parent and add reply
    const addReplyToComment = (comments: CommentType[]): CommentType[] => {
      return comments.map(comment => {
        if (comment.id === parentId) {
          return {
            ...comment,
            replies: [...comment.replies, newReply]
          };
        }
        if (comment.replies.length > 0) {
          return {
            ...comment,
            replies: addReplyToComment(comment.replies)
          };
        }
        return comment;
      });
    };

    setComments(addReplyToComment(comments));
  }, [comments]);

  // Handle vote
  const handleVote = useCallback((commentId: string, value: number): void => {
    const updateVote = (comments: CommentType[]): CommentType[] => {
      return comments.map(comment => {
        if (comment.id === commentId) {
          return { ...comment, votes: comment.votes + value };
        }
        if (comment.replies.length > 0) {
          return {
            ...comment,
            replies: updateVote(comment.replies)
          };
        }
        return comment;
      });
    };

    setComments(updateVote(comments));
  }, [comments]);

  // Sort comments
  const sortedComments = useMemo(() => {
    return [...comments].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return b.timestamp - a.timestamp;
        case 'oldest':
          return a.timestamp - b.timestamp;
        case 'top':
          return b.votes - a.votes;
        default:
          return 0;
      }
    });
  }, [comments, sortBy]);

  return (
    <div className="comment-thread">
      {/* Sort Controls */}
      <div className="thread-controls">
        <label htmlFor="sort-select">Sort by: </label>
        <select
          id="sort-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="top">Top</option>
        </select>
      </div>

      {/* Comments List */}
      <div className="comments-list">
        {sortedComments.map((comment) => (
          <Comment
            key={comment.id}
            comment={comment}
            onReply={handleReply}
            onVote={handleVote}
          />
        ))}
      </div>
    </div>
  );
};

export default CommentThread;
```

### **Performance Optimization with TypeScript**

**1. Memoization with Proper Types:**

```typescript
import React, { memo } from 'react';
import type { Comment as CommentType, CommentProps } from '../types/comment';

// Custom comparison function with proper typing
const areEqual = (prevProps: CommentProps, nextProps: CommentProps): boolean => {
  return (
    prevProps.comment.id === nextProps.comment.id &&
    prevProps.comment.votes === nextProps.comment.votes &&
    prevProps.comment.replies.length === nextProps.comment.replies.length
  );
};

const Comment = memo<CommentProps>(({ comment, onReply, onVote, depth = 0 }) => {
  // Component implementation
  return <div>...</div>;
}, areEqual);
```

**2. Lazy Loading with TypeScript:**

```typescript
interface LazyCommentItemProps {
  comment: CommentType;
  depth: number;
}

const LazyCommentItem: FC<LazyCommentItemProps> = ({ comment, depth }) => {
  const [repliesLoaded, setRepliesLoaded] = useState(false);
  const [replies, setReplies] = useState<CommentType[]>([]);
  const hasReplies = comment.replies && comment.replies.length > 0;

  const loadReplies = async (): Promise<void> => {
    if (!repliesLoaded) {
      try {
        const response = await fetch(`/api/comments/${comment.id}/replies`);
        const data: CommentType[] = await response.json();
        setReplies(data);
        setRepliesLoaded(true);
      } catch (error) {
        console.error('Failed to load replies:', error);
      }
    }
  };

  return (
    <div className="comment">
      {/* Comment content */}

      {hasReplies && !repliesLoaded && (
        <button onClick={loadReplies}>
          Load {comment.replies.length} replies
        </button>
      )}

      {repliesLoaded && (
        <div className="replies">
          {replies.map(reply => (
            <LazyCommentItem key={reply.id} comment={reply} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};
```

### **Key Insight**
> TypeScript ensures type safety for nested comment structures, preventing errors from incorrect data shapes. Use proper typing for recursive functions and memoization comparison functions to catch type mismatches at compile time.

---

## 3. Responsive Sidebar Navigation

### 💡 **Problem Statement**

Design a responsive sidebar navigation that adapts between mobile and desktop views, supports nested menu items, and provides smooth transitions.

**Key Requirements:**
- Responsive: hamburger menu on mobile, always-visible on desktop
- Support nested submenus with expand/collapse
- Highlight active route
- Keyboard accessible
- Close sidebar when clicking outside (mobile)

### **Types and Interfaces**

```typescript
// types/menu.ts
export interface MenuItem {
  id: string;
  label: string;
  icon?: string;
  path?: string;
  submenu?: MenuItem[];
}

export interface SidebarProps {
  menuItems: MenuItem[];
}
```

### **Implementation**

```typescript
// components/Sidebar.tsx
import React, { FC, useState, useEffect, useRef, MouseEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { MenuItem, SidebarProps } from '../types/menu';
import './Sidebar.css';

const Sidebar: FC<SidebarProps> = ({ menuItems }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const sidebarRef = useRef<HTMLElement>(null);
  const location = useLocation();

  // Handle responsive behavior
  useEffect(() => {
    const handleResize = (): void => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);

      // Auto-open sidebar on desktop
      if (!mobile) {
        setIsOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close sidebar when clicking outside (mobile only)
  useEffect(() => {
    if (!isMobile) return;

    const handleClickOutside = (event: Event): void => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, isMobile]);

  // Close sidebar on route change (mobile only)
  useEffect(() => {
    if (isMobile && isOpen) {
      setIsOpen(false);
    }
  }, [location.pathname, isMobile]);

  const toggleSubmenu = (itemId: string): void => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const isActive = (path?: string): boolean => {
    if (!path) return false;
    return location.pathname === path;
  };

  const renderMenuItem = (item: MenuItem, level: number = 0): JSX.Element => {
    const hasSubmenu = item.submenu && item.submenu.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const active = isActive(item.path);

    return (
      <li key={item.id} className={`menu-item level-${level}`}>
        <div className={`menu-item-content ${active ? 'active' : ''}`}>
          {hasSubmenu ? (
            <button
              className="menu-button"
              onClick={() => toggleSubmenu(item.id)}
              aria-expanded={isExpanded}
            >
              {item.icon && <span className="menu-icon">{item.icon}</span>}
              <span className="menu-label">{item.label}</span>
              <span className={`menu-arrow ${isExpanded ? 'expanded' : ''}`}>
                ▼
              </span>
            </button>
          ) : item.path ? (
            <Link to={item.path} className="menu-link">
              {item.icon && <span className="menu-icon">{item.icon}</span>}
              <span className="menu-label">{item.label}</span>
            </Link>
          ) : (
            <span className="menu-text">
              {item.icon && <span className="menu-icon">{item.icon}</span>}
              <span className="menu-label">{item.label}</span>
            </span>
          )}
        </div>

        {hasSubmenu && isExpanded && (
          <ul className="submenu">
            {item.submenu!.map(subItem => renderMenuItem(subItem, level + 1))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      {isMobile && (
        <button
          className="sidebar-toggle"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle navigation menu"
          aria-expanded={isOpen}
        >
          <span className="hamburger">
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>
      )}

      {/* Overlay for mobile */}
      {isMobile && isOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setIsOpen(false)}
          role="button"
          tabIndex={0}
          aria-label="Close sidebar"
        />
      )}

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        className={`sidebar ${isOpen ? 'open' : ''} ${isMobile ? 'mobile' : 'desktop'}`}
        aria-hidden={!isOpen}
      >
        <div className="sidebar-header">
          <h2>Navigation</h2>
        </div>

        <nav className="sidebar-nav">
          <ul className="menu-list">
            {menuItems.map(item => renderMenuItem(item))}
          </ul>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
```

**Menu Data with TypeScript:**

```typescript
// data/menuItems.ts
import type { MenuItem } from '../types/menu';

export const menuItems: MenuItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: '📊',
    path: '/dashboard'
  },
  {
    id: 'products',
    label: 'Products',
    icon: '📦',
    path: '/products',
    submenu: [
      {
        id: 'all-products',
        label: 'All Products',
        icon: '📋',
        path: '/products/all'
      },
      {
        id: 'add-product',
        label: 'Add Product',
        icon: '➕',
        path: '/products/add'
      },
      {
        id: 'categories',
        label: 'Categories',
        icon: '🏷️',
        path: '/products/categories'
      }
    ]
  },
  {
    id: 'orders',
    label: 'Orders',
    icon: '🛒',
    path: '/orders',
    submenu: [
      {
        id: 'pending-orders',
        label: 'Pending',
        icon: '⏳',
        path: '/orders/pending'
      },
      {
        id: 'completed-orders',
        label: 'Completed',
        icon: '✅',
        path: '/orders/completed'
      }
    ]
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: '⚙️',
    path: '/settings'
  }
];
```

### **Key Insight**
> TypeScript ensures menu items conform to a consistent structure, preventing runtime errors from missing properties or incorrect nesting. Use proper event typing for mouse and keyboard events, and leverage discriminated unions if menu items have different shapes.

---

## 4. Tab Component with Animations

### 💡 **Problem Statement**

Implement a reusable tab component that supports dynamic content, smooth animations, keyboard navigation, and flexible styling.

**Key Requirements:**
- Render tabs dynamically from data
- Smooth content transitions
- Animated indicator that slides to active tab
- Keyboard navigation (Arrow keys, Home, End)
- Support controlled and uncontrolled modes
- Lazy load tab content

### **Types and Interfaces**

```typescript
// types/tabs.ts
import { ReactNode } from 'react';

export interface Tab {
  id: string;
  label: string;
  icon?: string;
  badge?: number | string;
  content: ReactNode;
  disabled?: boolean;
}

export type TabVariant = 'default' | 'pills' | 'underline';

export interface TabsProps {
  tabs: Tab[];
  defaultActiveId?: string;
  activeId?: string;
  onChange?: (tabId: string) => void;
  lazy?: boolean;
  variant?: TabVariant;
}
```

### **Implementation**

```typescript
// components/Tabs.tsx
import React, { FC, useState, useRef, useEffect, KeyboardEvent } from 'react';
import type { TabsProps, Tab } from '../types/tabs';
import './Tabs.css';

const Tabs: FC<TabsProps> = ({
  tabs,
  defaultActiveId,
  activeId: controlledActiveId,
  onChange,
  lazy = false,
  variant = 'default'
}) => {
  // Support both controlled and uncontrolled modes
  const isControlled = controlledActiveId !== undefined;
  const [uncontrolledActiveId, setUncontrolledActiveId] = useState<string>(
    defaultActiveId || tabs[0]?.id || ''
  );

  const activeId = isControlled ? controlledActiveId : uncontrolledActiveId;
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(new Set([activeId]));
  const [indicatorStyle, setIndicatorStyle] = useState<React.CSSProperties>({});
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const tabListRef = useRef<HTMLDivElement | null>(null);

  // Update indicator position when active tab changes
  useEffect(() => {
    const activeTabElement = tabRefs.current[activeId];
    if (activeTabElement && tabListRef.current) {
      const tabListRect = tabListRef.current.getBoundingClientRect();
      const tabRect = activeTabElement.getBoundingClientRect();

      setIndicatorStyle({
        left: tabRect.left - tabListRect.left,
        width: tabRect.width
      });
    }
  }, [activeId, tabs]);

  const handleTabChange = (tabId: string): void => {
    if (tabId === activeId) return;

    // Track visited tabs for lazy loading
    setVisitedTabs(prev => new Set([...prev, tabId]));

    if (isControlled) {
      onChange?.(tabId);
    } else {
      setUncontrolledActiveId(tabId);
      onChange?.(tabId);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, currentIndex: number): void => {
    let nextIndex: number | undefined;

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        nextIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
        break;

      case 'ArrowRight':
        e.preventDefault();
        nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
        break;

      case 'Home':
        e.preventDefault();
        nextIndex = 0;
        break;

      case 'End':
        e.preventDefault();
        nextIndex = tabs.length - 1;
        break;

      default:
        return;
    }

    const nextTab = tabs[nextIndex];
    if (nextTab && !nextTab.disabled) {
      handleTabChange(nextTab.id);
      tabRefs.current[nextTab.id]?.focus();
    }
  };

  const activeTab = tabs.find(tab => tab.id === activeId);

  return (
    <div className={`tabs tabs-${variant}`}>
      {/* Tab List */}
      <div
        className="tab-list"
        role="tablist"
        ref={tabListRef}
      >
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeId;
          const isDisabled = tab.disabled;

          return (
            <button
              key={tab.id}
              ref={el => { tabRefs.current[tab.id] = el; }}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              aria-disabled={isDisabled}
              id={`tab-${tab.id}`}
              className={`tab ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`}
              onClick={() => !isDisabled && handleTabChange(tab.id)}
              onKeyDown={(e) => !isDisabled && handleKeyDown(e, index)}
              tabIndex={isActive ? 0 : -1}
              disabled={isDisabled}
            >
              {tab.icon && <span className="tab-icon">{tab.icon}</span>}
              <span className="tab-label">{tab.label}</span>
              {tab.badge !== undefined && (
                <span className="tab-badge">{tab.badge}</span>
              )}
            </button>
          );
        })}

        {/* Animated Indicator */}
        <div
          className="tab-indicator"
          style={indicatorStyle}
        />
      </div>

      {/* Tab Panels */}
      <div className="tab-panels">
        {tabs.map(tab => {
          const isActive = tab.id === activeId;
          const shouldRender = !lazy || visitedTabs.has(tab.id);

          return (
            <div
              key={tab.id}
              role="tabpanel"
              id={`panel-${tab.id}`}
              aria-labelledby={`tab-${tab.id}`}
              className={`tab-panel ${isActive ? 'active' : ''}`}
              hidden={!isActive}
            >
              {shouldRender && tab.content}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Tabs;
```

**Usage Example with TypeScript:**

```typescript
// Usage
import React, { FC, useState } from 'react';
import Tabs from './components/Tabs';
import type { Tab } from './types/tabs';

const ProfileContent: FC = () => <div>Profile information...</div>;
const SettingsContent: FC = () => <div>Settings...</div>;
const NotificationsContent: FC = () => <div>Notifications...</div>;

const App: FC = () => {
  const tabs: Tab[] = [
    {
      id: 'profile',
      label: 'Profile',
      icon: '👤',
      content: <ProfileContent />
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: '⚙️',
      content: <SettingsContent />
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: '🔔',
      badge: 5,
      content: <NotificationsContent />
    }
  ];

  return <Tabs tabs={tabs} defaultActiveId="profile" />;
};

// Controlled Mode with TypeScript
const ControlledApp: FC = () => {
  const [activeTab, setActiveTab] = useState<string>('home');

  const handleChange = (tabId: string): void => {
    console.log('Tab changed to:', tabId);
    setActiveTab(tabId);
  };

  return (
    <div>
      <Tabs
        tabs={tabs}
        activeId={activeTab}
        onChange={handleChange}
      />
      <p>Current tab: {activeTab}</p>
    </div>
  );
};
```

### **Key Insight**
> TypeScript's union types for variants and proper typing of keyboard events ensure compile-time safety. Use generics if you need to support different content types, and leverage discriminated unions for tab states.

---

## 5. Filterable, Sortable Data Table

### 💡 **Problem Statement**

Build a data table component with filtering, sorting, pagination, and row selection capabilities, optimized for handling large datasets.

**Key Requirements:**
- Column-based filtering (text, dropdown, date range)
- Multi-column sorting
- Pagination with customizable page size
- Row selection (single/multiple)
- Type-safe column definitions
- Export functionality (CSV, JSON)

### **Types and Interfaces**

```typescript
// types/table.ts
import { ReactNode } from 'react';

export type FilterType = 'text' | 'select' | 'number' | 'date';

export interface FilterValue {
  min?: number;
  max?: number;
  start?: string;
  end?: string;
}

export interface FilterOption {
  label: string;
  value: string;
}

export interface Column<T> {
  header: string;
  accessor: keyof T;
  sortable?: boolean;
  filterable?: boolean;
  filterType?: FilterType;
  filterOptions?: FilterOption[];
  cell?: (value: any, row: T) => ReactNode;
}

export interface SortConfig<T> {
  key: keyof T | null;
  direction: 'asc' | 'desc';
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  pageSize?: number;
  selectable?: boolean;
  onRowSelect?: (selectedIds: Set<number>) => void;
  exportable?: boolean;
}
```

### **Implementation**

```typescript
// components/DataTable.tsx
import React, { useState, useMemo, useCallback } from 'react';
import type { Column, DataTableProps, SortConfig, FilterValue } from '../types/table';
import './DataTable.css';

function DataTable<T extends Record<string, any>>({
  data,
  columns,
  pageSize: initialPageSize = 10,
  selectable = false,
  onRowSelect,
  exportable = false
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [sortConfig, setSortConfig] = useState<SortConfig<T>>({ key: null, direction: 'asc' });
  const [filters, setFilters] = useState<Record<string, string | FilterValue>>({});
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  // Apply filters
  const filteredData = useMemo(() => {
    return data.filter(row => {
      return Object.entries(filters).every(([key, filterValue]) => {
        if (!filterValue) return true;

        const cellValue = row[key as keyof T];
        const column = columns.find(col => String(col.accessor) === key);

        if (!column) return true;

        switch (column.filterType) {
          case 'text':
            return String(cellValue)
              .toLowerCase()
              .includes(String(filterValue).toLowerCase());

          case 'select':
            return cellValue === filterValue;

          case 'number':
            const numFilter = filterValue as FilterValue;
            return (
              (!numFilter.min || Number(cellValue) >= numFilter.min) &&
              (!numFilter.max || Number(cellValue) <= numFilter.max)
            );

          case 'date':
            const dateFilter = filterValue as FilterValue;
            const date = new Date(cellValue as string);
            return (
              (!dateFilter.start || date >= new Date(dateFilter.start)) &&
              (!dateFilter.end || date <= new Date(dateFilter.end))
            );

          default:
            return true;
        }
      });
    });
  }, [data, filters, columns]);

  // Apply sorting
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key!];
      const bValue = b[sortConfig.key!];

      if (aValue === bValue) return 0;

      const comparison = aValue < bValue ? -1 : 1;
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortConfig]);

  // Apply pagination
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, currentPage, pageSize]);

  // Handle sorting
  const handleSort = useCallback((columnKey: keyof T): void => {
    setSortConfig(prev => ({
      key: columnKey,
      direction:
        prev.key === columnKey && prev.direction === 'asc'
          ? 'desc'
          : 'asc'
    }));
  }, []);

  // Handle filtering
  const handleFilter = useCallback((columnKey: string, value: string | FilterValue): void => {
    setFilters(prev => ({
      ...prev,
      [columnKey]: value
    }));
    setCurrentPage(1); // Reset to first page
  }, []);

  // Handle row selection
  const handleRowSelect = useCallback((rowIndex: number): void => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(rowIndex)) {
        next.delete(rowIndex);
      } else {
        next.add(rowIndex);
      }
      onRowSelect?.(next);
      return next;
    });
  }, [onRowSelect]);

  // Handle select all
  const handleSelectAll = useCallback((): void => {
    if (selectedRows.size === paginatedData.length) {
      setSelectedRows(new Set());
      onRowSelect?.(new Set());
    } else {
      const allIndices = new Set(paginatedData.map((_, idx) => idx));
      setSelectedRows(allIndices);
      onRowSelect?.(allIndices);
    }
  }, [paginatedData, selectedRows.size, onRowSelect]);

  // Export functions
  const exportToCSV = (): void => {
    const csv = [
      columns.map(col => col.header).join(','),
      ...sortedData.map(row =>
        columns.map(col => row[col.accessor]).join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'table-data.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportToJSON = (): void => {
    const json = JSON.stringify(sortedData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'table-data.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  // Pagination calculations
  const totalPages = Math.ceil(sortedData.length / pageSize);
  const startRow = (currentPage - 1) * pageSize + 1;
  const endRow = Math.min(currentPage * pageSize, sortedData.length);

  return (
    <div className="data-table-container">
      {/* Table Controls */}
      <div className="table-controls">
        <div className="table-info">
          Showing {startRow}-{endRow} of {sortedData.length} results
          {selectedRows.size > 0 && ` (${selectedRows.size} selected)`}
        </div>

        {exportable && (
          <div className="table-actions">
            <button onClick={exportToCSV}>Export CSV</button>
            <button onClick={exportToJSON}>Export JSON</button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            {/* Filter Row */}
            <tr className="filter-row">
              {selectable && <th></th>}
              {columns.map(column => (
                <th key={String(column.accessor)}>
                  {column.filterable && (
                    <FilterInput
                      type={column.filterType || 'text'}
                      value={filters[String(column.accessor)] || ''}
                      onChange={(value) => handleFilter(String(column.accessor), value)}
                      options={column.filterOptions}
                    />
                  )}
                </th>
              ))}
            </tr>

            {/* Header Row */}
            <tr className="header-row">
              {selectable && (
                <th className="select-column">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === paginatedData.length && paginatedData.length > 0}
                    onChange={handleSelectAll}
                    aria-label="Select all rows"
                  />
                </th>
              )}
              {columns.map(column => (
                <th
                  key={String(column.accessor)}
                  className={column.sortable ? 'sortable' : ''}
                  onClick={() => column.sortable && handleSort(column.accessor)}
                >
                  <div className="header-content">
                    <span>{column.header}</span>
                    {column.sortable && (
                      <span className="sort-indicator">
                        {sortConfig.key === column.accessor && (
                          sortConfig.direction === 'asc' ? '↑' : '↓'
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="no-data">
                  No data found
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={selectedRows.has(rowIndex) ? 'selected' : ''}
                >
                  {selectable && (
                    <td className="select-column">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(rowIndex)}
                        onChange={() => handleRowSelect(rowIndex)}
                        aria-label={`Select row ${rowIndex + 1}`}
                      />
                    </td>
                  )}
                  {columns.map(column => (
                    <td key={String(column.accessor)}>
                      {column.cell
                        ? column.cell(row[column.accessor], row)
                        : String(row[column.accessor])
                      }
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="table-footer">
        <div className="page-size-selector">
          <label htmlFor="page-size">Rows per page:</label>
          <select
            id="page-size"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        <div className="pagination">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
          >
            First
          </button>
          <button
            onClick={() => setCurrentPage(prev => prev - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </button>

          <span className="page-info">
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage(prev => prev + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
          >
            Last
          </button>
        </div>
      </div>
    </div>
  );
}

export default DataTable;
```

**Filter Input Component:**

```typescript
// components/FilterInput.tsx
import React, { FC, ChangeEvent } from 'react';
import type { FilterType, FilterValue, FilterOption } from '../types/table';

interface FilterInputProps {
  type: FilterType;
  value: string | FilterValue;
  onChange: (value: string | FilterValue) => void;
  options?: FilterOption[];
}

const FilterInput: FC<FilterInputProps> = ({ type, value, onChange, options }) => {
  switch (type) {
    case 'text':
      return (
        <input
          type="text"
          className="filter-input"
          placeholder="Filter..."
          value={value as string}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        />
      );

    case 'select':
      return (
        <select
          className="filter-select"
          value={value as string}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
        >
          <option value="">All</option>
          {options?.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );

    case 'number':
      const numValue = value as FilterValue;
      return (
        <div className="filter-range">
          <input
            type="number"
            placeholder="Min"
            value={numValue?.min || ''}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onChange({ ...numValue, min: Number(e.target.value) })
            }
          />
          <input
            type="number"
            placeholder="Max"
            value={numValue?.max || ''}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onChange({ ...numValue, max: Number(e.target.value) })
            }
          />
        </div>
      );

    case 'date':
      const dateValue = value as FilterValue;
      return (
        <div className="filter-date">
          <input
            type="date"
            value={dateValue?.start || ''}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onChange({ ...dateValue, start: e.target.value })
            }
          />
          <input
            type="date"
            value={dateValue?.end || ''}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onChange({ ...dateValue, end: e.target.value })
            }
          />
        </div>
      );

    default:
      return null;
  }
};

export default FilterInput;
```

**Usage with TypeScript:**

```typescript
// Usage
import React, { FC } from 'react';
import DataTable from './components/DataTable';
import type { Column } from './types/table';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
  age: number;
  status: 'Active' | 'Inactive';
}

const UserTable: FC = () => {
  const columns: Column<User>[] = [
    {
      header: 'Name',
      accessor: 'name',
      sortable: true,
      filterable: true,
      filterType: 'text'
    },
    {
      header: 'Email',
      accessor: 'email',
      sortable: true,
      filterable: true,
      filterType: 'text'
    },
    {
      header: 'Role',
      accessor: 'role',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { label: 'Admin', value: 'admin' },
        { label: 'User', value: 'user' },
        { label: 'Guest', value: 'guest' }
      ]
    },
    {
      header: 'Age',
      accessor: 'age',
      sortable: true,
      filterable: true,
      filterType: 'number'
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: (value: User['status']) => (
        <span className={`status-badge ${value.toLowerCase()}`}>
          {value}
        </span>
      )
    },
    {
      header: 'Actions',
      accessor: 'id',
      cell: (value: number, row: User) => (
        <div className="action-buttons">
          <button onClick={() => handleEdit(row)}>Edit</button>
          <button onClick={() => handleDelete(row)}>Delete</button>
        </div>
      )
    }
  ];

  const users: User[] = [
    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'admin', age: 30, status: 'Active' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'user', age: 25, status: 'Active' },
    // ... more data
  ];

  const handleEdit = (user: User): void => {
    console.log('Edit user:', user);
  };

  const handleDelete = (user: User): void => {
    console.log('Delete user:', user);
  };

  return (
    <DataTable
      data={users}
      columns={columns}
      pageSize={10}
      selectable
      exportable
    />
  );
};
```

### **Key Insight**
> TypeScript generics make the DataTable fully type-safe for any data shape. Column definitions enforce correct accessor keys, and filter types ensure proper value handling. Use mapped types for complex filtering logic to maintain type safety throughout the component.

---

## 6. Like Button with Optimistic Updates

### 💡 **Problem Statement**

Implement a "like" button that updates the UI immediately (optimistic update) while making the API call in the background, with proper rollback handling on failure.

**Key Requirements:**
- Instant UI feedback (no waiting for API)
- Rollback on API failure
- Handle concurrent clicks
- Prevent duplicate API calls
- TypeScript type safety

### **Types and Interfaces**

```typescript
// types/like.ts
export interface LikeButtonProps {
  postId: string;
  initialLiked?: boolean;
  initialCount?: number;
}

export interface LikeResponse {
  isLiked: boolean;
  likeCount: number;
}

export interface LikeState {
  isLiked: boolean;
  likeCount: number;
  isLoading: boolean;
  error: string | null;
}
```

### **Implementation**

```typescript
// components/LikeButton.tsx
import React, { FC, useState, useCallback, useRef } from 'react';
import type { LikeButtonProps, LikeResponse, LikeState } from '../types/like';
import './LikeButton.css';

const LikeButton: FC<LikeButtonProps> = ({
  postId,
  initialLiked = false,
  initialCount = 0
}) => {
  const [state, setState] = useState<LikeState>({
    isLiked: initialLiked,
    likeCount: initialCount,
    isLoading: false,
    error: null
  });

  // Track pending API call to prevent duplicates
  const pendingRequest = useRef<AbortController | null>(null);

  const handleLike = useCallback(async (): Promise<void> => {
    // Cancel if already processing
    if (state.isLoading) return;

    // Store previous state for rollback
    const previousState = {
      isLiked: state.isLiked,
      likeCount: state.likeCount
    };

    // Optimistic update - update UI immediately
    const newLiked = !state.isLiked;
    setState(prev => ({
      ...prev,
      isLiked: newLiked,
      likeCount: newLiked ? prev.likeCount + 1 : prev.likeCount - 1,
      error: null,
      isLoading: true
    }));

    try {
      // Cancel previous pending request if exists
      if (pendingRequest.current) {
        pendingRequest.current.abort();
      }

      // Create new AbortController for this request
      const controller = new AbortController();
      pendingRequest.current = controller;

      const response = await fetch(`/api/posts/${postId}/like`, {
        method: newLiked ? 'POST' : 'DELETE',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to update like status');
      }

      const data: LikeResponse = await response.json();

      // Sync with server response
      setState(prev => ({
        ...prev,
        likeCount: data.likeCount,
        isLiked: data.isLiked,
        isLoading: false
      }));

    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') return;

      // Rollback on error
      setState(prev => ({
        ...prev,
        isLiked: previousState.isLiked,
        likeCount: previousState.likeCount,
        error: 'Failed to update. Please try again.',
        isLoading: false
      }));

      // Clear error after 3 seconds
      setTimeout(() => {
        setState(prev => ({ ...prev, error: null }));
      }, 3000);

      console.error('Like error:', err);
    } finally {
      pendingRequest.current = null;
    }
  }, [postId, state.isLiked, state.likeCount, state.isLoading]);

  return (
    <div className="like-button-container">
      <button
        className={`like-button ${state.isLiked ? 'liked' : ''}`}
        onClick={handleLike}
        disabled={state.isLoading}
        aria-label={state.isLiked ? 'Unlike' : 'Like'}
        aria-pressed={state.isLiked}
      >
        {/* Heart Icon */}
        <svg
          className="heart-icon"
          viewBox="0 0 24 24"
          fill={state.isLiked ? 'currentColor' : 'none'}
          stroke="currentColor"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>

        {/* Like Count */}
        <span className="like-count">{state.likeCount}</span>

        {/* Loading Spinner */}
        {state.isLoading && (
          <span className="loading-spinner" aria-hidden="true">
            ⟳
          </span>
        )}
      </button>

      {/* Error Message */}
      {state.error && (
        <div className="error-message" role="alert">
          {state.error}
        </div>
      )}
    </div>
  );
};

export default LikeButton;
```

**Context for Global State Management:**

```typescript
// contexts/LikeContext.tsx
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { LikeResponse } from '../types/like';

interface LikeState {
  liked: boolean;
  count: number;
}

interface LikeContextType {
  toggleLike: (postId: string, currentLiked: boolean, currentCount: number) => Promise<{ success: boolean; error?: string }>;
  getLikeState: (postId: string) => LikeState | undefined;
  likedPosts: Map<string, LikeState>;
}

const LikeContext = createContext<LikeContextType | null>(null);

interface LikeProviderProps {
  children: ReactNode;
}

export const LikeProvider: FC<LikeProviderProps> = ({ children }) => {
  const [likedPosts, setLikedPosts] = useState<Map<string, LikeState>>(new Map());

  const toggleLike = useCallback(async (
    postId: string,
    currentLiked: boolean,
    currentCount: number
  ): Promise<{ success: boolean; error?: string }> => {
    const previousState: LikeState = {
      liked: currentLiked,
      count: currentCount
    };

    // Optimistic update
    const newLiked = !currentLiked;
    const newCount = newLiked ? currentCount + 1 : currentCount - 1;

    setLikedPosts(prev => {
      const next = new Map(prev);
      next.set(postId, { liked: newLiked, count: newCount });
      return next;
    });

    try {
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: newLiked ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) throw new Error('Failed to update');

      const data: LikeResponse = await response.json();

      // Sync with server
      setLikedPosts(prev => {
        const next = new Map(prev);
        next.set(postId, { liked: data.isLiked, count: data.likeCount });
        return next;
      });

      return { success: true };

    } catch (err) {
      // Rollback on error
      setLikedPosts(prev => {
        const next = new Map(prev);
        next.set(postId, previousState);
        return next;
      });

      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }
  }, []);

  const getLikeState = useCallback((postId: string): LikeState | undefined => {
    return likedPosts.get(postId);
  }, [likedPosts]);

  const value: LikeContextType = {
    toggleLike,
    getLikeState,
    likedPosts
  };

  return (
    <LikeContext.Provider value={value}>
      {children}
    </LikeContext.Provider>
  );
};

export const useLike = (): LikeContextType => {
  const context = useContext(LikeContext);
  if (!context) {
    throw new Error('useLike must be used within LikeProvider');
  }
  return context;
};
```

### **Key Insight**
> TypeScript ensures type safety for optimistic updates and rollback logic. Proper typing of async operations and error states prevents runtime errors. Use AbortController with proper typing to cancel pending requests safely.

---

## 7. Live Chat Feature

### 💡 **Problem Statement**

Build a real-time chat feature that supports multiple users, message history, typing indicators, online status, and message delivery status.

**Key Requirements:**
- Real-time message delivery (WebSocket)
- Typing indicators
- Online/offline status
- Message delivery and read receipts
- TypeScript type safety for all message types

### **Types and Interfaces**

```typescript
// types/chat.ts
export interface User {
  id: string;
  name: string;
  avatar?: string;
}

export interface Message {
  id: string;
  content: string;
  userId: string;
  userName: string;
  timestamp: number;
  status?: 'sent' | 'delivered' | 'read';
}

export type MessageType =
  | 'NEW_MESSAGE'
  | 'MESSAGE_HISTORY'
  | 'USER_TYPING'
  | 'STOP_TYPING'
  | 'USER_ONLINE'
  | 'USER_OFFLINE'
  | 'MESSAGE_DELIVERED'
  | 'MESSAGE_READ'
  | 'REQUEST_HISTORY';

export interface WebSocketMessage {
  type: MessageType;
  roomId?: string;
  userId?: string;
  userName?: string;
  message?: Message;
  messages?: Message[];
  messageId?: string;
  content?: string;
  timestamp?: number;
}

export interface ChatProps {
  roomId: string;
  currentUser: User;
}
```

### **WebSocket Hook with TypeScript**

```typescript
// hooks/useWebSocket.ts
import { useEffect, useRef, useState, useCallback } from 'react';

interface UseWebSocketOptions {
  onMessage?: (data: any) => void;
  onConnect?: () => void;
  onDisconnect?: (event: CloseEvent) => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

interface UseWebSocketReturn {
  sendMessage: (data: any) => void;
  isConnected: boolean;
  reconnectCount: number;
}

function useWebSocket(
  url: string,
  options: UseWebSocketOptions = {}
): UseWebSocketReturn {
  const {
    onMessage,
    onConnect,
    onDisconnect,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [reconnectCount, setReconnectCount] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Send message
  const sendMessage = useCallback((data: any): void => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket not connected');
    }
  }, []);

  // Connect to WebSocket
  const connect = useCallback((): void => {
    try {
      const ws = new WebSocket(url);

      ws.onopen = (): void => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setReconnectCount(0);
        onConnect?.();
      };

      ws.onmessage = (event: MessageEvent): void => {
        try {
          const data = JSON.parse(event.data);
          onMessage?.(data);
        } catch (err) {
          console.error('Failed to parse message:', err);
        }
      };

      ws.onclose = (event: CloseEvent): void => {
        console.log('WebSocket disconnected', event.code, event.reason);
        setIsConnected(false);
        onDisconnect?.(event);

        // Attempt reconnection
        if (reconnectCount < maxReconnectAttempts) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`Reconnecting... (${reconnectCount + 1}/${maxReconnectAttempts})`);
            setReconnectCount(prev => prev + 1);
            connect();
          }, reconnectInterval);
        }
      };

      ws.onerror = (error: Event): void => {
        console.error('WebSocket error:', error);
      };

      wsRef.current = ws;

    } catch (err) {
      console.error('Failed to create WebSocket:', err);
    }
  }, [url, onMessage, onConnect, onDisconnect, reconnectCount, maxReconnectAttempts, reconnectInterval]);

  // Connect on mount
  useEffect(() => {
    connect();

    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { sendMessage, isConnected, reconnectCount };
}

export default useWebSocket;
```

**Chat Component:**

```typescript
// components/Chat.tsx
import React, { FC, useState, useEffect, useRef, useCallback, FormEvent, ChangeEvent } from 'react';
import useWebSocket from '../hooks/useWebSocket';
import Message from './Message';
import TypingIndicator from './TypingIndicator';
import type { ChatProps, Message as MessageType, WebSocketMessage } from '../types/chat';
import './Chat.css';

const Chat: FC<ChatProps> = ({ roomId, currentUser }) => {
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle incoming WebSocket messages
  const handleWebSocketMessage = useCallback((data: WebSocketMessage): void => {
    switch (data.type) {
      case 'NEW_MESSAGE':
        if (data.message) {
          setMessages(prev => [...prev, data.message!]);
          scrollToBottom();
        }
        break;

      case 'MESSAGE_HISTORY':
        if (data.messages) {
          setMessages(data.messages);
          scrollToBottom();
        }
        break;

      case 'USER_TYPING':
        if (data.userId && data.userId !== currentUser.id) {
          setTypingUsers(prev => new Set([...prev, data.userId!]));

          // Remove typing indicator after timeout
          setTimeout(() => {
            setTypingUsers(prev => {
              const next = new Set(prev);
              next.delete(data.userId!);
              return next;
            });
          }, 3000);
        }
        break;

      case 'STOP_TYPING':
        if (data.userId) {
          setTypingUsers(prev => {
            const next = new Set(prev);
            next.delete(data.userId!);
            return next;
          });
        }
        break;

      case 'USER_ONLINE':
        if (data.userId) {
          setOnlineUsers(prev => new Set([...prev, data.userId!]));
        }
        break;

      case 'USER_OFFLINE':
        if (data.userId) {
          setOnlineUsers(prev => {
            const next = new Set(prev);
            next.delete(data.userId!);
            return next;
          });
        }
        break;

      case 'MESSAGE_DELIVERED':
        if (data.messageId) {
          setMessages(prev =>
            prev.map(msg =>
              msg.id === data.messageId
                ? { ...msg, status: 'delivered' as const }
                : msg
            )
          );
        }
        break;

      case 'MESSAGE_READ':
        if (data.messageId) {
          setMessages(prev =>
            prev.map(msg =>
              msg.id === data.messageId
                ? { ...msg, status: 'read' as const }
                : msg
            )
          );
        }
        break;

      default:
        console.warn('Unknown message type:', (data as any).type);
    }
  }, [currentUser.id]);

  // WebSocket connection
  const { sendMessage, isConnected } = useWebSocket(
    `ws://localhost:3001/chat?room=${roomId}&user=${currentUser.id}`,
    {
      onMessage: handleWebSocketMessage,
      onConnect: () => {
        console.log('Connected to chat');
        // Request message history
        sendMessage({ type: 'REQUEST_HISTORY', roomId });
      },
      onDisconnect: () => {
        console.log('Disconnected from chat');
      }
    }
  );

  // Send message
  const handleSendMessage = useCallback((e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();

    if (!inputValue.trim() || !isConnected) return;

    const message: WebSocketMessage = {
      type: 'NEW_MESSAGE',
      roomId,
      content: inputValue.trim(),
      userId: currentUser.id,
      userName: currentUser.name,
      timestamp: Date.now()
    };

    sendMessage(message);
    setInputValue('');

    // Stop typing indicator
    sendMessage({ type: 'STOP_TYPING', roomId, userId: currentUser.id });
  }, [inputValue, isConnected, roomId, currentUser, sendMessage]);

  // Handle typing
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setInputValue(e.target.value);

    // Send typing indicator
    if (isConnected) {
      sendMessage({
        type: 'USER_TYPING',
        roomId,
        userId: currentUser.id,
        userName: currentUser.name
      });

      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Stop typing after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        sendMessage({
          type: 'STOP_TYPING',
          roomId,
          userId: currentUser.id
        });
      }, 2000);
    }
  };

  // Auto-scroll to bottom
  const scrollToBottom = (): void => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="chat-container">
      {/* Chat Header */}
      <div className="chat-header">
        <h3>Chat Room: {roomId}</h3>
        <div className="connection-status">
          <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`} />
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
        <div className="online-count">
          {onlineUsers.size} online
        </div>
      </div>

      {/* Messages Area */}
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-state">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <Message
              key={message.id}
              message={message}
              isOwnMessage={message.userId === currentUser.id}
            />
          ))
        )}

        {/* Typing Indicators */}
        {typingUsers.size > 0 && (
          <TypingIndicator users={Array.from(typingUsers)} />
        )}

        {/* Auto-scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form className="message-input-form" onSubmit={handleSendMessage}>
        <input
          type="text"
          className="message-input"
          placeholder="Type a message..."
          value={inputValue}
          onChange={handleInputChange}
          disabled={!isConnected}
        />
        <button
          type="submit"
          className="send-button"
          disabled={!inputValue.trim() || !isConnected}
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default Chat;
```

### **Key Insight**
> TypeScript's discriminated unions for message types ensure type-safe WebSocket communication. Proper typing of event handlers and state updates prevents runtime errors in real-time applications.

---

## 8. Throttle/Debounce Button Clicks

### 💡 **Problem Statement**

Prevent API spam and improve UX by implementing throttle and debounce mechanisms with full TypeScript support.

**Key Requirements:**
- Type-safe function wrappers
- Generic implementations
- React hooks with proper typing
- Support for async functions

### **Types and Implementations**

```typescript
// utils/debounce.ts
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;

  return function debounced(...args: Parameters<T>): void {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
}

// Advanced: with immediate execution option
export function debounceAdvanced<T extends (...args: any[]) => any>(
  func: T,
  delay: number = 300,
  immediate: boolean = false
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return function debounced(...args: Parameters<T>): void {
    const callNow = immediate && !timeoutId;

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      timeoutId = null;
      if (!immediate) {
        func(...args);
      }
    }, delay);

    if (callNow) {
      func(...args);
    }
  };
}
```

```typescript
// utils/throttle.ts
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number = 300
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;

  return function throttled(...args: Parameters<T>): void {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;

      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

// Advanced: with trailing execution
export function throttleAdvanced<T extends (...args: any[]) => any>(
  func: T,
  limit: number = 300,
  trailing: boolean = true
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;
  let lastFunc: NodeJS.Timeout | null = null;
  let lastRan: number;

  return function throttled(...args: Parameters<T>): void {
    if (!inThrottle) {
      func(...args);
      lastRan = Date.now();
      inThrottle = true;
    } else if (trailing) {
      if (lastFunc) {
        clearTimeout(lastFunc);
      }
      lastFunc = setTimeout(() => {
        if (Date.now() - lastRan >= limit) {
          func(...args);
          lastRan = Date.now();
        }
      }, Math.max(limit - (Date.now() - lastRan), 0));
    }
  };
}
```

**React Hooks with TypeScript:**

```typescript
// hooks/useDebounce.ts
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

```typescript
// hooks/useThrottle.ts
import { useState, useEffect, useRef } from 'react';

export function useThrottle<T>(value: T, limit: number = 300): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastRan = useRef<number>(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, limit - (Date.now() - lastRan.current));

    return () => {
      clearTimeout(handler);
    };
  }, [value, limit]);

  return throttledValue;
}
```

```typescript
// hooks/useDebouncedCallback.ts
import { useCallback, useRef } from 'react';

export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    (...args: Parameters<T>): void => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );
}
```

```typescript
// hooks/useThrottledCallback.ts
import { useCallback, useRef } from 'react';

export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  limit: number = 300
): (...args: Parameters<T>) => void {
  const inThrottle = useRef<boolean>(false);

  return useCallback(
    (...args: Parameters<T>): void => {
      if (!inThrottle.current) {
        callback(...args);
        inThrottle.current = true;

        setTimeout(() => {
          inThrottle.current = false;
        }, limit);
      }
    },
    [callback, limit]
  );
}
```

**Usage Examples:**

```typescript
// Example 1: Debounced Search
import React, { FC, useState, useEffect } from 'react';
import { useDebounce } from '../hooks/useDebounce';

interface SearchResult {
  id: number;
  name: string;
}

const SearchBar: FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  useEffect(() => {
    if (debouncedSearchTerm) {
      setIsSearching(true);

      fetch(`/api/search?q=${debouncedSearchTerm}`)
        .then(res => res.json())
        .then((data: SearchResult[]) => {
          setResults(data);
          setIsSearching(false);
        })
        .catch(err => {
          console.error(err);
          setIsSearching(false);
        });
    } else {
      setResults([]);
    }
  }, [debouncedSearchTerm]);

  return (
    <div>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search..."
      />
      {isSearching && <span>Searching...</span>}
      {results.map(result => (
        <div key={result.id}>{result.name}</div>
      ))}
    </div>
  );
};
```

```typescript
// Example 2: Throttled Submit
import React, { FC, useState } from 'react';
import { useThrottledCallback } from '../hooks/useThrottledCallback';

const SubmitForm: FC = () => {
  const [status, setStatus] = useState('');

  const handleSubmit = useThrottledCallback(async (): Promise<void> => {
    setStatus('Submitting...');

    try {
      await fetch('/api/submit', { method: 'POST' });
      setStatus('Success!');
    } catch (err) {
      setStatus('Error!');
    }
  }, 2000);

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
      <button type="submit">Submit</button>
      {status && <p>{status}</p>}
    </form>
  );
};
```

### **Key Insight**
> TypeScript generics enable fully type-safe debounce and throttle implementations that preserve function signatures. Use `Parameters<T>` and `ReturnType<T>` utility types to maintain type safety throughout the wrapper functions.

---

## 9. Collapsible Accordion Component

### 💡 **Problem Statement**

Build a flexible accordion component with TypeScript support for single/multiple panel expansion, animations, and keyboard navigation.

**Key Requirements:**
- Type-safe panel configuration
- Controlled and uncontrolled modes
- Keyboard navigation
- Smooth animations

### **Types and Interfaces**

```typescript
// types/accordion.ts
import { ReactNode } from 'react';

export interface AccordionItem {
  id: string;
  title: string;
  children: ReactNode;
  icon?: string;
  disabled?: boolean;
}

export interface AccordionProps {
  children: ReactNode;
  allowMultiple?: boolean;
  defaultExpandedIds?: string[];
  expandedIds?: string[];
  onChange?: (expandedIds: string[]) => void;
}

export interface AccordionItemProps {
  id: string;
  title: string;
  children: ReactNode;
  icon?: string;
  disabled?: boolean;
}

export interface AccordionContextType {
  toggleItem: (itemId: string) => void;
  isExpanded: (itemId: string) => boolean;
  allowMultiple: boolean;
}
```

### **Implementation**

```typescript
// components/Accordion.tsx
import React, { FC, createContext, useContext, useState, ReactNode } from 'react';
import type { AccordionProps, AccordionContextType } from '../types/accordion';
import './Accordion.css';

const AccordionContext = createContext<AccordionContextType | null>(null);

export function useAccordionContext(): AccordionContextType {
  const context = useContext(AccordionContext);
  if (!context) {
    throw new Error('Accordion components must be wrapped in <Accordion>');
  }
  return context;
}

const Accordion: FC<AccordionProps> = ({
  children,
  allowMultiple = false,
  defaultExpandedIds = [],
  expandedIds: controlledExpandedIds,
  onChange
}) => {
  // Support both controlled and uncontrolled modes
  const isControlled = controlledExpandedIds !== undefined;
  const [uncontrolledExpandedIds, setUncontrolledExpandedIds] = useState<Set<string>>(
    new Set(defaultExpandedIds)
  );

  const expandedIds = isControlled
    ? new Set(controlledExpandedIds)
    : uncontrolledExpandedIds;

  const toggleItem = (itemId: string): void => {
    const newExpandedIds = new Set(expandedIds);

    if (newExpandedIds.has(itemId)) {
      // Collapse
      newExpandedIds.delete(itemId);
    } else {
      // Expand
      if (!allowMultiple) {
        // Single mode: close all others
        newExpandedIds.clear();
      }
      newExpandedIds.add(itemId);
    }

    if (isControlled) {
      onChange?.(Array.from(newExpandedIds));
    } else {
      setUncontrolledExpandedIds(newExpandedIds);
      onChange?.(Array.from(newExpandedIds));
    }
  };

  const isExpanded = (itemId: string): boolean => expandedIds.has(itemId);

  const value: AccordionContextType = {
    toggleItem,
    isExpanded,
    allowMultiple
  };

  return (
    <AccordionContext.Provider value={value}>
      <div className="accordion" role="region">
        {children}
      </div>
    </AccordionContext.Provider>
  );
};

export default Accordion;
```

```typescript
// components/AccordionItem.tsx
import React, { FC, useRef, useEffect, useState, KeyboardEvent } from 'react';
import { useAccordionContext } from './Accordion';
import type { AccordionItemProps } from '../types/accordion';
import './AccordionItem.css';

const AccordionItem: FC<AccordionItemProps> = ({
  id,
  title,
  children,
  icon,
  disabled = false
}) => {
  const { toggleItem, isExpanded } = useAccordionContext();
  const [height, setHeight] = useState(0);
  const contentRef = useRef<HTMLDivElement | null>(null);

  const expanded = isExpanded(id);

  // Calculate content height for smooth animation
  useEffect(() => {
    if (contentRef.current) {
      setHeight(contentRef.current.scrollHeight);
    }
  }, [children, expanded]);

  const handleToggle = (): void => {
    if (!disabled) {
      toggleItem(id);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>): void => {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        toggleItem(id);
        break;
      default:
        break;
    }
  };

  return (
    <div className={`accordion-item ${disabled ? 'disabled' : ''}`}>
      {/* Header */}
      <button
        className={`accordion-header ${expanded ? 'expanded' : ''}`}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        aria-expanded={expanded}
        aria-controls={`panel-${id}`}
        aria-disabled={disabled}
        id={`header-${id}`}
        disabled={disabled}
      >
        {/* Icon */}
        {icon && <span className="accordion-icon">{icon}</span>}

        {/* Title */}
        <span className="accordion-title">{title}</span>

        {/* Chevron */}
        <span className={`accordion-chevron ${expanded ? 'rotated' : ''}`}>
          ▼
        </span>
      </button>

      {/* Panel */}
      <div
        className={`accordion-panel ${expanded ? 'expanded' : ''}`}
        id={`panel-${id}`}
        role="region"
        aria-labelledby={`header-${id}`}
        aria-hidden={!expanded}
        style={{
          maxHeight: expanded ? `${height}px` : '0px'
        }}
      >
        <div ref={contentRef} className="accordion-content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AccordionItem;
```

**Usage:**

```typescript
// Usage
import React, { FC } from 'react';
import Accordion from './components/Accordion';
import AccordionItem from './components/AccordionItem';

const App: FC = () => {
  return (
    <Accordion>
      <AccordionItem id="1" title="What is React?" icon="⚛️">
        <p>React is a JavaScript library for building user interfaces.</p>
      </AccordionItem>

      <AccordionItem id="2" title="What are React Hooks?" icon="🪝">
        <p>Hooks are functions that let you use state and other React features.</p>
      </AccordionItem>

      <AccordionItem id="3" title="What is JSX?" icon="📝">
        <p>JSX is a syntax extension for JavaScript.</p>
      </AccordionItem>
    </Accordion>
  );
};
```

### **Key Insight**
> TypeScript ensures accordion items have consistent structures and proper event typing. Use discriminated unions for expansion state and generic types if supporting different content types per item.

---

## 10. Dark/Light Mode Theming

### 💡 **Problem Statement**

Implement a complete dark/light mode theming system with TypeScript support, persistence, and smooth transitions.

**Key Requirements:**
- Type-safe theme values
- System preference detection
- localStorage persistence
- CSS custom properties
- Prevent flash of wrong theme

### **Types and Interfaces**

```typescript
// types/theme.ts
export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}
```

### **Implementation**

```typescript
// contexts/ThemeContext.tsx
import React, { FC, createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { Theme, ResolvedTheme, ThemeContextType } from '../types/theme';

const ThemeContext = createContext<ThemeContextType | null>(null);

const STORAGE_KEY = 'theme-preference';

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && ['light', 'dark', 'system'].includes(stored)) {
      return stored as Theme;
    }
    return 'system';
  });

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');

  // Get system preference
  const getSystemTheme = (): ResolvedTheme => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  };

  // Update resolved theme based on theme setting
  useEffect(() => {
    const resolved: ResolvedTheme = theme === 'system' ? getSystemTheme() : theme;
    setResolvedTheme(resolved);

    // Apply to document
    document.documentElement.setAttribute('data-theme', resolved);

    // Also add class for legacy support
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(resolved);
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent): void => {
      const newTheme: ResolvedTheme = e.matches ? 'dark' : 'light';
      setResolvedTheme(newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(newTheme);
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  // Persist theme preference
  const setTheme = (newTheme: Theme): void => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
  };

  // Toggle between light and dark (skip system)
  const toggleTheme = (): void => {
    setTheme(resolvedTheme === 'light' ? 'dark' : 'light');
  };

  const value: ThemeContextType = {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
```

**Theme Switcher:**

```typescript
// components/ThemeSwitcher.tsx
import React, { FC, ChangeEvent } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import './ThemeSwitcher.css';

const ThemeSwitcher: FC = () => {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const handleChange = (e: ChangeEvent<HTMLSelectElement>): void => {
    setTheme(e.target.value as Theme);
  };

  return (
    <div className="theme-switcher">
      {/* Simple Toggle */}
      <button
        className="theme-toggle"
        onClick={() => setTheme(resolvedTheme === 'light' ? 'dark' : 'light')}
        aria-label={`Switch to ${resolvedTheme === 'light' ? 'dark' : 'light'} mode`}
      >
        {resolvedTheme === 'light' ? '🌙' : '☀️'}
      </button>

      {/* Dropdown with System Option */}
      <div className="theme-selector">
        <select
          value={theme}
          onChange={handleChange}
          aria-label="Select theme"
        >
          <option value="light">☀️ Light</option>
          <option value="dark">🌙 Dark</option>
          <option value="system">💻 System</option>
        </select>
      </div>
    </div>
  );
};

export default ThemeSwitcher;
```

### **Key Insight**
> TypeScript's literal types for theme values prevent invalid theme configurations at compile time. Use discriminated unions to ensure type-safe theme switching and proper localStorage typing.

---

## Summary

These 10 TypeScript implementations provide production-ready, type-safe solutions for common React interview questions. Key TypeScript patterns include:

**Type Safety Features:**
- ✅ Discriminated unions for action types
- ✅ Generic components for reusability
- ✅ Proper event typing (KeyboardEvent, MouseEvent, etc.)
- ✅ Type-safe ref usage
- ✅ Strict function signatures with Parameters<T> and ReturnType<T>

**Best Practices:**
- ✅ Interface over type aliases for object shapes
- ✅ Explicit return types for public APIs
- ✅ Use `unknown` instead of `any` when type is uncertain
- ✅ Leverage utility types (Partial, Pick, Omit, etc.)
- ✅ Type guards for runtime checks

**Common Patterns:**
- Context API with proper typing
- Generic hooks with constraints
- Event handlers with explicit types
- Ref types for DOM elements
- Type-safe callbacks and memoization

### **Interview Tips**

1. **Explain Type Choices:** Justify why you chose specific types or interfaces
2. **Show Type Safety Benefits:** Demonstrate how TypeScript prevents bugs
3. **Use Generics Appropriately:** Show understanding of when to use generics vs concrete types
4. **Handle Edge Cases:** Use proper null checks and type guards
5. **Balance Strictness:** Know when to use strict types vs more flexible approaches

**Good luck with your interviews!** 🚀