# Frontend Architecture Patterns

## Overview
Architectural patterns for building scalable frontend applications.

## Core Patterns

Fundamental architectural patterns that form the foundation of frontend application design.

### MVC (Model-View-Controller)

**What is MVC?**
MVC is a foundational architectural pattern that separates an application into three interconnected components. This separation promotes organized code and makes testing, maintenance, and scaling easier.

**The Three Components:**
1. **Model**: Manages data and business logic. Handles data retrieval, storage, and validation.
2. **View**: Presents data to the user. Renders UI based on Model data.
3. **Controller**: Handles user input and updates Model/View. Acts as intermediary.

**Data Flow:**
User interacts with View → Controller processes input → Controller updates Model → Model notifies View → View re-renders

**When to Use MVC:**
- Server-rendered applications (traditional web apps)
- Applications with clear separation between data and presentation
- Teams familiar with this pattern from backend development

**Trade-offs:**
✅ Clear separation of concerns
✅ Easier to test components independently
✅ Well-understood pattern with extensive documentation
❌ Can be verbose for simple applications
❌ Bidirectional data flow can be hard to debug

Traditional pattern separating data (Model), presentation (View), and control logic (Controller).
```javascript
// Model
class UserModel {
  constructor() {
    this.users = [];
  }
  
  async fetchUsers() {
    const response = await fetch('/api/users');
    this.users = await response.json();
    return this.users;
  }
}

// View
class UserView {
  render(users) {
    return users.map(user => `
      <div class="user">
        <h3>${user.name}</h3>
        <p>${user.email}</p>
      </div>
    `).join('');
  }
}

// Controller
class UserController {
  constructor(model, view) {
    this.model = model;
    this.view = view;
  }
  
  async init() {
    const users = await this.model.fetchUsers();
    document.getElementById('app').innerHTML = this.view.render(users);
  }
}
```

### Component-Based Architecture

**What is Component-Based Architecture?**
Component-based architecture treats UI as a composition of independent, reusable pieces called components. Each component encapsulates its own logic, styling, and state. This is the dominant pattern in modern frontend frameworks (React, Vue, Angular).

**Core Principles:**
1. **Reusability**: Write once, use everywhere
2. **Encapsulation**: Component internals are hidden from outside
3. **Composition**: Build complex UIs from simple components
4. **Single Responsibility**: Each component does one thing well

**Why It Matters:**
- Dramatically improves code reusability (70-80% code reuse is common)
- Makes testing easier (test components in isolation)
- Enables parallel development (different team members work on different components)
- Reduces bugs through isolation and reusability

**Component Types:**
- **Presentational**: Dumb components that just render props
- **Container**: Smart components that manage state and logic
- **Higher-Order Components (HOC)**: Components that enhance other components
- **Hooks-based**: Functional components with React Hooks

**When to Use:**
- All modern React, Vue, Angular applications
- Any application requiring reusable UI elements
- Applications with multiple developers

Modular approach building UIs from reusable, self-contained components with encapsulated logic and styling.

```jsx
// Atomic Design Pattern
// Atoms
const Button = ({ onClick, children }) => (
  <button onClick={onClick}>{children}</button>
);

// Molecules
const SearchBox = ({ onSearch }) => {
  const [query, setQuery] = useState('');
  
  return (
    <div className="search-box">
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <Button onClick={() => onSearch(query)}>Search</Button>
    </div>
  );
};

// Organisms
const Header = ({ onSearch, user }) => (
  <header>
    <Logo />
    <SearchBox onSearch={onSearch} />
    <UserProfile user={user} />
  </header>
);
```

### Micro-Frontend Architecture

**What are Micro-Frontends?**
Micro-frontends extend the microservices concept to frontend development. Instead of one large frontend application, you have multiple smaller frontend apps, each owned by different teams, integrated into one user experience.

**The Problem They Solve:**
In large organizations, a monolithic frontend becomes a bottleneck:
- Changes require coordination across teams
- One team's bugs can break the entire app
- Different teams may want different tech stacks
- Deployment of one feature requires deploying everything

**How Micro-Frontends Work:**
Each team builds and deploys their own frontend module independently. A container/shell application orchestrates these modules, loading them dynamically at runtime.

**Architecture Patterns:**
1. **Build-time integration**: Modules are npm packages (simple but couples deployments)
2. **Runtime integration via JavaScript**: Modules loaded dynamically (most flexible)
3. **iframes**: Strong isolation but poor UX
4. **Web Components**: Standard-based, framework agnostic

**When to Use Micro-Frontends:**
✅ Large organizations with 5+ frontend teams
✅ Need for independent deployments
✅ Different parts need different tech stacks
✅ Very large applications (100+ pages)

**When NOT to Use:**
❌ Small teams (< 5 developers)
❌ Startups / MVPs
❌ Applications with tight coupling requirements

Architectural style splitting frontend monoliths into smaller, independently deployable applications.

```javascript
// Container Application
import { registerApplication, start } from 'single-spa';

registerApplication({
  name: '@myapp/navbar',
  app: () => System.import('@myapp/navbar'),
  activeWhen: '/'
});

registerApplication({
  name: '@myapp/products',
  app: () => System.import('@myapp/products'),
  activeWhen: '/products'
});

start();
```

### Layered Architecture

Hierarchical organization separating presentation, business logic, and data access into distinct layers.

```
┌─────────────────────────────────────┐
│     Presentation Layer (UI)         │
│  - Components                       │
│  - Pages                            │
│  - Routing                          │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│     Business Logic Layer            │
│  - State Management                 │
│  - Hooks                            │
│  - Services                         │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│     Data Access Layer               │
│  - API Clients                      │
│  - Data Models                      │
│  - Cache Layer                      │
└─────────────────────────────────────┘
```

## Interview Questions

Common architecture-related questions asked in frontend system design interviews with detailed answers.

**Q: What is the difference between MVC and MVVM patterns?**
A: MVC (Model-View-Controller) separates data (Model), UI (View), and logic (Controller). The Controller handles user input and updates both Model and View. MVVM (Model-View-ViewModel) uses data binding between View and ViewModel, where ViewModel exposes Model data to View. MVVM enables two-way data binding and is more testable. Example:

```javascript
// MVVM with Vue.js
export default {
  data() {
    return {
      users: []  // Model
    }
  },
  computed: {
    activeUsers() {  // ViewModel
      return this.users.filter(u => u.active);
    }
  },
  methods: {
    async loadUsers() {
      this.users = await fetch('/api/users').then(r => r.json());
    }
  }
}
```

**Q: How would you design a micro-frontend architecture for a large application?**
A: Use module federation or single-spa framework. Key considerations:
1. **Independent deployment**: Each team owns a micro-frontend
2. **Shared dependencies**: Use webpack module federation for shared libraries
3. **Communication**: Event bus or shared state for cross-app communication
4. **Routing**: Container app handles routing, lazy loads micro-frontends
5. **Styling**: CSS modules or scoped styles to avoid conflicts
6. **Performance**: Code splitting, lazy loading, shared chunks

**Q: What architectural patterns prevent prop drilling in React?**
A: Multiple solutions:
1. **Context API**: Provider/Consumer pattern for global state
2. **Composition**: Children props and component composition
3. **State management libraries**: Redux, MobX, Zustand
4. **Custom hooks**: Encapsulate logic and state access

Example with Context:
```jsx
const UserContext = createContext();

function App() {
  const user = useAuth();
  return (
    <UserContext.Provider value={user}>
      <Dashboard />
    </UserContext.Provider>
  );
}

function NestedComponent() {
  const user = useContext(UserContext);  // No prop drilling
  return <div>{user.name}</div>;
}
```

## Architectural Patterns

Advanced patterns for managing application state, data flow, and dependency organization.

### Flux Architecture

**What is Flux?**
Flux is an architectural pattern introduced by Facebook to address problems with bidirectional data flow in large applications. It enforces a strict unidirectional data flow, making application state more predictable and easier to debug.

**The Problem with Bidirectional Flow:**
In traditional MVC, models and views can update each other, creating complex dependency chains that are hard to track and debug as the application grows. Changes cascade in unpredictable ways.

**Flux Solution - Unidirectional Flow:**
Action → Dispatcher → Store → View → (back to Action)

This one-way flow makes it easy to understand how data moves through your application.

**Core Components:**
1. **Actions**: Objects describing what happened (e.g., "user clicked button")
2. **Dispatcher**: Central hub that receives actions and distributes to stores
3. **Stores**: Hold application state and business logic
4. **Views**: React components that render based on store data

**Benefits:**
- Predictable state updates (always follow the same path)
- Easier debugging (can log every action and state change)
- Scales well to large applications
- Foundation for Redux and other state management libraries

**Trade-offs:**
✅ Predictable data flow
✅ Excellent for large applications
❌ More boilerplate code
❌ Overkill for simple apps

Unidirectional data flow pattern with Actions, Dispatcher, Stores, and Views for predictable state management.
```javascript
// Action
const addTodo = (text) => ({
  type: 'ADD_TODO',
  payload: { text }
});

// Dispatcher
const dispatcher = new Dispatcher();

// Store
class TodoStore {
  constructor() {
    this.todos = [];
    dispatcher.register(this.handleAction.bind(this));
  }
  
  handleAction(action) {
    switch(action.type) {
      case 'ADD_TODO':
        this.todos.push(action.payload);
        this.emit('change');
        break;
    }
  }
}

// View
function TodoList() {
  const [todos, setTodos] = useState([]);
  
  useEffect(() => {
    const store = new TodoStore();
    store.on('change', () => setTodos(store.todos));
  }, []);
  
  return todos.map(todo => <div>{todo.text}</div>);
}
```

### Clean Architecture

Dependency rule-based architecture organizing code in concentric layers with business logic at the center.

```typescript
// Domain Layer (Entities)
interface User {
  id: string;
  email: string;
  name: string;
}

// Use Cases
class LoginUseCase {
  constructor(
    private authService: IAuthService,
    private userRepository: IUserRepository
  ) {}
  
  async execute(email: string, password: string): Promise<User> {
    const token = await this.authService.login(email, password);
    return await this.userRepository.getCurrentUser(token);
  }
}

// Interface Adapters (Presenters/Controllers)
class LoginController {
  constructor(private loginUseCase: LoginUseCase) {}
  
  async handleLogin(email: string, password: string) {
    try {
      const user = await this.loginUseCase.execute(email, password);
      return { success: true, user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// Frameworks & Drivers (UI)
function LoginPage() {
  const controller = useMemo(() => new LoginController(loginUseCase), []);
  
  const handleSubmit = async (e) => {
    const result = await controller.handleLogin(email, password);
    // Handle result
  };
}
```

## Best Practices

Guidelines and principles for building maintainable, scalable, and performant frontend architectures.

✅ **Separation of Concerns**
- Keep UI, business logic, and data access separate
- Use presentational and container components
- Extract reusable logic into hooks/services

✅ **Scalability**
- Design for code splitting and lazy loading
- Use dependency injection for testability
- Implement feature-based folder structure

✅ **Maintainability**
- Follow consistent naming conventions
- Document architectural decisions (ADRs)
- Use TypeScript for type safety

✅ **Performance**
- Implement virtual scrolling for large lists
- Use memoization strategically
- Optimize bundle size with tree shaking

❌ **Common Pitfalls**
- Don't mix business logic with UI components
- Avoid tight coupling between modules
- Don't over-engineer simple applications
- Avoid premature optimization

## Design Patterns

Reusable solutions to common problems in React and component-based architectures.

### Presentational vs Container Components

Separation pattern dividing components into stateless UI (presentational) and stateful logic (container) components.
```jsx
// Presentational Component (Dumb)
const UserCard = ({ user, onEdit }) => (
  <div className="card">
    <h3>{user.name}</h3>
    <p>{user.email}</p>
    <button onClick={onEdit}>Edit</button>
  </div>
);

// Container Component (Smart)
const UserCardContainer = ({ userId }) => {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    fetchUser(userId).then(setUser);
  }, [userId]);
  
  const handleEdit = () => {
    // Business logic
  };
  
  if (!user) return <Loading />;
  return <UserCard user={user} onEdit={handleEdit} />;
};
```

### Higher-Order Components (HOC)

Function that takes a component and returns a new component with additional props or behavior.

```jsx
function withAuth(Component) {
  return function AuthenticatedComponent(props) {
    const { user, loading } = useAuth();
    
    if (loading) return <Loading />;
    if (!user) return <Redirect to="/login" />;
    
    return <Component {...props} user={user} />;
  };
}

const ProtectedPage = withAuth(Dashboard);
```

### Render Props Pattern

Pattern using a function prop to share code and logic between components through rendering.

```jsx
class DataFetcher extends React.Component {
  state = { data: null, loading: true };
  
  componentDidMount() {
    fetch(this.props.url)
      .then(res => res.json())
      .then(data => this.setState({ data, loading: false }));
  }
  
  render() {
    return this.props.children(this.state);
  }
}

// Usage
<DataFetcher url="/api/users">
  {({ data, loading }) => (
    loading ? <Loading /> : <UserList users={data} />
  )}
</DataFetcher>
```

## Summary
- Frontend architecture defines structure and organization
- Choose patterns based on application scale and complexity
- Component-based architectures dominate modern frameworks
- Micro-frontends enable team autonomy at scale
- Clean architecture improves testability and maintainability
- Balance simplicity with scalability needs

---
[← Back to SystemDesign](../README.md)
