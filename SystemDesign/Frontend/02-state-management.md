# State Management

## 💡 **Concept**

State management organizes data that changes over time. The right tool depends on how widely state is shared, how often it changes, and how complex the update logic is.

**How to answer in an interview:** "I'd start by asking where the state lives. Component-level state stays in useState. Shared UI state (theme, modals) goes into Context. Server data goes into React Query. Global client state — if it exists — goes into Zustand or Redux Toolkit depending on complexity."

---

## Decision Guide

| Solution | Bundle | Best for |
|----------|--------|---------|
| `useState` / `useReducer` | 0 KB | Local component state |
| Context API | 0 KB | Rarely-changing global values (theme, locale) |
| **Zustand** | 1 KB | Client-side global state, simple API |
| **Redux Toolkit** | ~8 KB | Large apps, complex state, time-travel debugging |
| **React Query / SWR** | ~14 KB | Server state (async data, caching, sync) |

> **Server state is not client state.** Data fetched from an API (users, products) should live in React Query, not Redux.

---

## Context API + useReducer

Built into React. Good for infrequently-changing global values.

```typescript
interface TodoState {
  todos: Todo[];
  filter: "all" | "active" | "completed";
}

type TodoAction =
  | { type: "ADD"; payload: Todo }
  | { type: "TOGGLE"; payload: string }
  | { type: "SET_FILTER"; payload: TodoState["filter"] };

const todoReducer = (state: TodoState, action: TodoAction): TodoState => {
  switch (action.type) {
    case "ADD":
      return { ...state, todos: [...state.todos, action.payload] };
    case "TOGGLE":
      return {
        ...state,
        todos: state.todos.map((t) =>
          t.id === action.payload ? { ...t, completed: !t.completed } : t
        ),
      };
    case "SET_FILTER":
      return { ...state, filter: action.payload };
    default:
      return state;
  }
};

const TodoContext = React.createContext<{
  state: TodoState;
  dispatch: React.Dispatch<TodoAction>;
} | null>(null);

function TodoProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(todoReducer, { todos: [], filter: "all" });
  return <TodoContext.Provider value={{ state, dispatch }}>{children}</TodoContext.Provider>;
}
```

⚠️ **Warning:** Every context update re-renders all consumers. For frequently-updated state, use Zustand or split the context.

---

## Zustand

Minimal boilerplate. No providers. Selective subscriptions prevent unnecessary re-renders.

```typescript
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UserStore {
  users: User[];
  loading: boolean;
  fetchUsers: () => Promise<void>;
  addUser: (user: User) => void;
  removeUser: (id: string) => void;
}

const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      users: [],
      loading: false,

      fetchUsers: async () => {
        set({ loading: true });
        const users = await fetch("/api/users").then((r) => r.json());
        set({ users, loading: false });
      },

      addUser: (user) => set((state) => ({ users: [...state.users, user] })),

      removeUser: (id) =>
        set((state) => ({ users: state.users.filter((u) => u.id !== id) })),
    }),
    { name: "user-storage" }
  )
);

// Component — only re-renders when `users` changes
function UserList() {
  const { users, fetchUsers } = useUserStore((state) => ({
    users: state.users,
    fetchUsers: state.fetchUsers,
  }));
  React.useEffect(() => { fetchUsers(); }, []);
  return <>{users.map((u) => <UserCard key={u.id} user={u} />)}</>;
}
```

---

## Redux Toolkit

Best for large apps with complex state logic, time-travel debugging, or many async flows.

```typescript
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

interface UsersState {
  entities: Record<string, User>;
  ids: string[];
  status: "idle" | "pending" | "fulfilled" | "rejected";
}

export const fetchUsers = createAsyncThunk("users/fetchAll", async () => {
  const res = await fetch("/api/users");
  return res.json() as Promise<User[]>;
});

const usersSlice = createSlice({
  name: "users",
  initialState: { entities: {}, ids: [], status: "idle" } as UsersState,
  reducers: {
    userAdded(state, action: PayloadAction<User>) {
      state.entities[action.payload.id] = action.payload;
      state.ids.push(action.payload.id);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => { state.status = "pending"; })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.status = "fulfilled";
        action.payload.forEach((u) => { state.entities[u.id] = u; state.ids.push(u.id); });
      });
  },
});

// Typed selector
export const selectUserById = (id: string) => (state: RootState) =>
  state.users.entities[id];
```

---

## State Normalization

For relational data, store it flat — like a database table — to avoid duplication and O(n) updates.

```typescript
// ❌ Nested (causes duplication and complex updates)
const badState = {
  posts: [{ id: 1, author: { id: 10, name: "Alice" }, comments: [{ authorId: 10 }] }],
};

// ✅ Normalized (single source of truth, O(1) lookups)
interface NormalizedState {
  users: Record<string, User>;
  posts: Record<string, Post>;         // Post.authorId references users
  comments: Record<string, Comment>;  // Comment.authorId references users
  postIds: string[];
}
```

---

## Common Mistakes

❌ **Putting server data into Redux** — React Query handles caching, revalidation, and background sync  
❌ **Global state for local concerns** — form state belongs in `useState`, not the store  
❌ **Context for high-frequency updates** — every update re-renders all consumers; use Zustand

**Key insight:**

> Most apps only need useState + React Query. Add Zustand when you have real global client state. Add Redux only when you need time-travel debugging or a very large shared state graph.

---
[← Back to SystemDesign](../README.md)
