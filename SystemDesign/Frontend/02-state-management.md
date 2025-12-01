# State Management at Scale

## Overview
Managing application state in large-scale frontend applications.

## State Management Patterns

### Redux Pattern
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

### Normalized State Shape
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
