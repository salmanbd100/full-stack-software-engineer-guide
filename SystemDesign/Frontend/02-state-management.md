# State Management at Scale

## Overview
Managing application state in large-scale frontend applications.

## State Management Patterns

Different approaches to managing application state, each with unique trade-offs for complexity, performance, and scalability.

### Redux Pattern

**What is Redux?**
Redux is a predictable state container that implements the Flux pattern with some refinements. It provides a single source of truth for your entire application state, making state management consistent and debuggable across large applications.

**Core Principles:**
1. **Single Source of Truth**: All state in one store
2. **State is Read-Only**: Only way to change state is to dispatch an action
3. **Changes via Pure Functions**: Reducers are pure functions that compute the next state

**Why Use Redux?**
- Predictability: Same action always produces same result
- Centralization: All state logic in one place
- Debuggability: Redux DevTools shows every state change
- Testing: Pure reducers are easy to test
- Time-travel debugging: Can replay actions

**When to Use Redux:**
✅ Large applications (10+ pages)
✅ Complex state with many updates
✅ State shared across many components
✅ Need to understand how state changed over time

**When NOT to Use Redux:**
❌ Small applications or prototypes
❌ Simple state requirements
❌ State only needed in 1-2 components

**Redux Data Flow:**
1. Component dispatches an action
2. Reducer receives action and current state
3. Reducer computes new state
4. Store updates and notifies subscribers
5. Component re-renders with new state

Predictable state container using unidirectional data flow with actions, reducers, and a single store.
```javascript
// Actions
const INCREMENT = 'INCREMENT';
const FETCH_USERS_SUCCESS = 'FETCH_USERS_SUCCESS';

const increment = () => ({ type: INCREMENT });
const fetchUsersSuccess = (users) => ({ 
  type: FETCH_USERS_SUCCESS, 
  payload: users 
});

// Reducer
const initialState = {
  count: 0,
  users: [],
  loading: false
};

function rootReducer(state = initialState, action) {
  switch(action.type) {
    case INCREMENT:
      return { ...state, count: state.count + 1 };
    case FETCH_USERS_SUCCESS:
      return { ...state, users: action.payload, loading: false };
    default:
      return state;
  }
}

// Store
import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';

const store = createStore(rootReducer, applyMiddleware(thunk));

// Async action with Redux Thunk
const fetchUsers = () => async (dispatch) => {
  dispatch({ type: 'FETCH_USERS_REQUEST' });
  try {
    const response = await fetch('/api/users');
    const users = await response.json();
    dispatch(fetchUsersSuccess(users));
  } catch (error) {
    dispatch({ type: 'FETCH_USERS_FAILURE', error });
  }
};
```

### Redux Toolkit (Modern Approach)

**What is Redux Toolkit?**
Redux Toolkit (RTK) is the official, recommended way to write Redux code. It provides utilities that simplify common Redux patterns and reduce boilerplate code by 50-70% compared to vanilla Redux.

**Why Redux Toolkit Exists:**
Classic Redux required too much boilerplate:
- Lots of action creators and constants
- Immutable updates were verbose and error-prone
- Configuring the store required multiple packages
- Async logic needed middleware like thunk or saga

**What Redux Toolkit Provides:**
1. **createSlice**: Combines actions, reducers, and constants in one place
2. **createAsyncThunk**: Handles async logic automatically
3. **Immer integration**: Write "mutating" code that's actually immutable
4. **configureStore**: Pre-configured store with good defaults

**Key Benefits:**
- 50-70% less code than vanilla Redux
- Built-in best practices (Immer, Redux Thunk, Redux DevTools)
- TypeScript support out of the box
- Easier to learn and use

**When to Use RTK:**
If you're using Redux, always use Redux Toolkit. There's no reason to use vanilla Redux in new projects.

Official opinionated toolset for efficient Redux development, reducing boilerplate with built-in best practices.

```javascript
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Async thunk
export const fetchUsers = createAsyncThunk(
  'users/fetchUsers',
  async () => {
    const response = await fetch('/api/users');
    return response.json();
  }
);

// Slice
const usersSlice = createSlice({
  name: 'users',
  initialState: {
    entities: [],
    loading: 'idle',
    error: null
  },
  reducers: {
    userAdded(state, action) {
      state.entities.push(action.payload);
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.loading = 'pending';
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = 'idle';
        state.entities = action.payload;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = 'idle';
        state.error = action.error.message;
      });
  }
});

// Selectors
export const selectAllUsers = (state) => state.users.entities;
export const selectUserById = (state, userId) =>
  state.users.entities.find(user => user.id === userId);
```

### Context API + useReducer

**What is Context API?**
Context provides a way to pass data through the component tree without manually passing props at every level. Combined with useReducer, it becomes a lightweight state management solution built into React.

**Why Use Context + useReducer?**
- No external dependencies (built into React)
- Simpler than Redux for medium-sized apps
- Good for avoiding prop drilling
- Familiar to React developers

**How It Works:**
1. **Context** provides a way to share values across the component tree
2. **useReducer** manages complex state transitions (like Redux reducers)
3. Combine them to get Redux-like state management without Redux

**When to Use Context API:**
✅ Medium-sized applications (5-10 pages)
✅ State shared by a few related components
✅ Want to avoid prop drilling
✅ Don't need advanced Redux features

**When NOT to Use:**
❌ Very large applications (Context can cause performance issues)
❌ Frequent state updates (causes re-renders of all consumers)
❌ Need time-travel debugging
❌ Complex middleware requirements

**Performance Consideration:**
Every context update re-renders ALL consumers, even if they only use part of the context. Solution: Split contexts or use selector libraries.

React's built-in state management solution combining Context for distribution and useReducer for complex state logic.

```jsx
// Context with reducer
const TodoContext = createContext();

const todoReducer = (state, action) => {
  switch(action.type) {
    case 'ADD_TODO':
      return {
        ...state,
        todos: [...state.todos, action.payload]
      };
    case 'TOGGLE_TODO':
      return {
        ...state,
        todos: state.todos.map(todo =>
          todo.id === action.payload
            ? { ...todo, completed: !todo.completed }
            : todo
        )
      };
    default:
      return state;
  }
};

function TodoProvider({ children }) {
  const [state, dispatch] = useReducer(todoReducer, {
    todos: [],
    filter: 'all'
  });
  
  return (
    <TodoContext.Provider value={{ state, dispatch }}>
      {children}
    </TodoContext.Provider>
  );
}

// Custom hook
function useTodos() {
  const context = useContext(TodoContext);
  if (!context) throw new Error('useTodos must be used within TodoProvider');
  return context;
}
```

### Zustand (Lightweight Alternative)

**What is Zustand?**
Zustand is a small, fast state management library that offers Redux-like capabilities with a much simpler API. It's become popular as a lightweight alternative to Redux for applications that find Redux too complex but Context API too limited.

**Why Zustand?**
- **Tiny**: Only 1KB gzipped (vs Redux 3KB + React-Redux 2KB)
- **Simple API**: No providers, no reducers, no boilerplate
- **Fast**: Doesn't wrap app in context providers
- **Flexible**: Works with React or vanilla JavaScript

**How It Compares:**
- Simpler than Redux (no actions, reducers, or dispatch)
- More performant than Context (selective subscriptions)
- More features than useState (middleware, persistence)

**When to Use Zustand:**
✅ Want Redux features without Redux complexity
✅ Medium to large applications
✅ Need global state with good performance
✅ Want minimal boilerplate

**When NOT to Use:**
❌ Need Redux DevTools time-travel
❌ Team already knows Redux well
❌ Very simple state (just use useState)

**Key Features:**
- No providers needed
- Built-in middleware (persist, devtools)
- Automatic shallow equality checks
- TypeScript support

Minimal state management library with simple API and no boilerplate, offering Redux-like capabilities without the complexity.

```javascript
import create from 'zustand';
import { devtools, persist } from 'zustand/middleware';

const useStore = create(
  devtools(
    persist(
      (set, get) => ({
        users: [],
        loading: false,
        
        fetchUsers: async () => {
          set({ loading: true });
          const users = await fetch('/api/users').then(r => r.json());
          set({ users, loading: false });
        },
        
        addUser: (user) => set((state) => ({
          users: [...state.users, user]
        })),
        
        removeUser: (id) => set((state) => ({
          users: state.users.filter(u => u.id !== id)
        }))
      }),
      { name: 'user-storage' }
    )
  )
);

// Usage in component
function UserList() {
  const { users, loading, fetchUsers } = useStore();
  
  useEffect(() => {
    fetchUsers();
  }, []);
  
  if (loading) return <Loading />;
  return users.map(user => <UserCard key={user.id} user={user} />);
}
```

### Recoil (Atom-based State)

**What is Recoil?**
Recoil is Facebook's experimental state management library that takes a fundamentally different approach from Redux. Instead of a single store, Recoil uses atoms (independent state units) and selectors (derived state) with automatic dependency tracking.

**Core Concepts:**
1. **Atoms**: Independent pieces of state that components can subscribe to
2. **Selectors**: Derived state that automatically updates when dependencies change
3. **Automatic Dependency Tracking**: Selectors track their dependencies automatically

**How It's Different from Redux:**
- **Granular Updates**: Only components using changed atoms re-render
- **Distributed State**: No single store, state is distributed across atoms
- **Async Built-in**: Selectors can be async without middleware
- **Graph-based**: State forms a dependency graph

**Why Use Recoil?**
- Fine-grained reactivity (better performance than Context)
- Composable state (build complex state from simple atoms)
- Async support without middleware
- Time-travel debugging like Redux

**When to Use Recoil:**
✅ Complex derived state requirements
✅ Need fine-grained reactivity
✅ Many independent pieces of state
✅ Async data dependencies

**When NOT to Use:**
❌ Still experimental (not production-ready by Facebook)
❌ Simple applications
❌ Team prefers battle-tested solutions

**Key Benefits:**
- Minimal re-renders (only affected components update)
- Clean async data handling
- Composable selectors
- Works great with React Concurrent Mode

Facebook's experimental state library using atoms and selectors for granular, composable state management with automatic dependency tracking.

```javascript
import { atom, selector, useRecoilState, useRecoilValue } from 'recoil';

// Atoms
const userListState = atom({
  key: 'userListState',
  default: []
});

const filterState = atom({
  key: 'filterState',
  default: 'all'
});

// Selectors
const filteredUsersState = selector({
  key: 'filteredUsersState',
  get: ({ get }) => {
    const filter = get(filterState);
    const users = get(userListState);
    
    switch(filter) {
      case 'active':
        return users.filter(u => u.active);
      case 'inactive':
        return users.filter(u => !u.active);
      default:
        return users;
    }
  }
});

// Async selector
const currentUserState = selector({
  key: 'currentUserState',
  get: async () => {
    const response = await fetch('/api/current-user');
    return response.json();
  }
});

// Component usage
function UserList() {
  const [users, setUsers] = useRecoilState(userListState);
  const filteredUsers = useRecoilValue(filteredUsersState);
  const currentUser = useRecoilValue(currentUserState);
  
  return (
    <div>
      <h2>Welcome, {currentUser.name}</h2>
      {filteredUsers.map(user => <UserCard key={user.id} user={user} />)}
    </div>
  );
}
```

## Interview Questions

Common questions about state management patterns, libraries, and best practices for technical interviews.

**Q: When would you choose Redux over Context API?**
A: Use Redux when:
- Large applications with complex state logic
- Need for time-travel debugging
- Multiple components need the same state
- State updates are frequent and complex
- Need middleware (logging, analytics, async)

Use Context API when:
- Small to medium applications
- Simpler state requirements
- Want to avoid additional dependencies
- State updates are infrequent

**Q: How do you handle async operations in Redux?**
A: Multiple approaches:
1. **Redux Thunk**: Dispatch functions that can perform async operations
2. **Redux Saga**: Use generator functions for complex async flows
3. **Redux Toolkit**: Built-in createAsyncThunk for async actions

Example with Redux Saga:
```javascript
import { call, put, takeEvery } from 'redux-saga/effects';

function* fetchUserSaga(action) {
  try {
    const user = yield call(api.fetchUser, action.payload);
    yield put({ type: 'FETCH_USER_SUCCESS', user });
  } catch (error) {
    yield put({ type: 'FETCH_USER_FAILURE', error });
  }
}

function* watchFetchUser() {
  yield takeEvery('FETCH_USER_REQUEST', fetchUserSaga);
}
```

**Q: What is the difference between local and global state?**
A: 
- **Local state**: Component-specific, managed with useState/useReducer, not shared
- **Global state**: Application-wide, accessible by multiple components, managed by Redux/Context

Best practice: Keep state as local as possible, lift to global only when necessary.

**Q: How do you prevent unnecessary re-renders with Context?**
A: Solutions:
1. Split contexts by concern
2. Use useMemo for context values
3. Implement selector pattern
4. Use React.memo for consumers

```jsx
const UserContext = createContext();

function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  
  // Memoize to prevent re-renders
  const value = useMemo(() => ({ user, setUser }), [user]);
  
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}
```

## State Normalization

Structuring nested data in a flat format to improve performance, prevent duplication, and simplify updates.

### Normalized State Shape

**What is State Normalization?**
State normalization is the practice of structuring your state in a flat, relational database-like format instead of deeply nested objects. This is crucial for performance and maintainability in applications managing complex, relational data.

**The Problem with Nested State:**
Deeply nested state causes several issues:
- **Duplication**: Same data (e.g., user) repeated in multiple places
- **Update Complexity**: Updating nested data is difficult and error-prone
- **Performance**: Changing one item can trigger re-renders of unrelated components
- **Consistency**: Hard to keep duplicate data in sync

**Normalization Solution:**
Store data in flat lookup tables (like database tables) with IDs as references.

**Structure:**
```
{
  entities: {
    users: { [id]: user },
    posts: { [id]: post },
    comments: { [id]: comment }
  },
  ids: {
    users: [id1, id2],
    posts: [id1, id2]
  }
}
```

**Benefits:**
1. **Single Source of Truth**: Each entity exists once
2. **Easy Updates**: Find by ID, update in place
3. **Better Performance**: Update only what changed
4. **Simpler Reducers**: No deep nesting logic

**When to Normalize:**
✅ Relational data (users, posts, comments)
✅ Data used in multiple places
✅ Frequent updates to nested data
✅ Large datasets

**When NOT to Normalize:**
❌ Simple, non-relational data
❌ Data only used in one place
❌ Very small datasets

Flat data structure using lookup tables instead of nested objects for efficient access and updates.
```javascript
// Instead of nested data
const badState = {
  posts: [
    {
      id: 1,
      title: 'Post 1',
      author: { id: 1, name: 'John' },
      comments: [
        { id: 1, text: 'Comment 1', author: { id: 2, name: 'Jane' } }
      ]
    }
  ]
};

// Use normalized structure
const goodState = {
  entities: {
    users: {
      1: { id: 1, name: 'John' },
      2: { id: 2, name: 'Jane' }
    },
    posts: {
      1: { id: 1, title: 'Post 1', authorId: 1, commentIds: [1] }
    },
    comments: {
      1: { id: 1, text: 'Comment 1', authorId: 2, postId: 1 }
    }
  },
  ids: {
    users: [1, 2],
    posts: [1],
    comments: [1]
  }
};

// Using normalizr library
import { normalize, schema } from 'normalizr';

const user = new schema.Entity('users');
const comment = new schema.Entity('comments', { author: user });
const post = new schema.Entity('posts', {
  author: user,
  comments: [comment]
});

const normalizedData = normalize(apiResponse, [post]);
```

## Best Practices

Guidelines for organizing, optimizing, and maintaining state management in production applications.

✅ **State Organization**
- Keep state as local as possible
- Normalize complex nested data
- Use selectors for derived state
- Separate UI state from domain data

✅ **Performance**
- Memoize expensive computations
- Use shallow equality checks
- Implement proper selector patterns
- Avoid deep object nesting

✅ **Maintainability**
- Use TypeScript for type safety
- Follow consistent naming conventions
- Document state shape
- Write unit tests for reducers

❌ **Common Pitfalls**
- Don't store derived data in state
- Avoid mutating state directly
- Don't over-use global state
- Avoid storing non-serializable values in Redux

## Summary
- Choose state management based on application complexity
- Redux excels at large-scale applications with complex state
- Context API is sufficient for simpler state needs
- Modern alternatives like Zustand offer simpler APIs
- Normalize state for better performance and maintainability
- Keep state as local as possible

---
[← Back to SystemDesign](../README.md)
