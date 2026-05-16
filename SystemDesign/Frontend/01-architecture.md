# Frontend Architecture Patterns

## 💡 **Concept**

Frontend architecture organizes code into layers and modules so the system can scale — in team size, feature count, and traffic. The right pattern depends on team size, application complexity, and how often it changes.

**How to answer in an interview:** "I'd start with component-based architecture — it's the default for modern React apps. If we have 5+ independent teams, I'd consider micro-frontends. For long-lived enterprise apps, I'd add a layered structure separating UI, business logic, and data access."

---

## Pattern Comparison

| Pattern | Team Size | Complexity | Best For |
|---------|-----------|------------|----------|
| **Component-Based** | Any | Low | Default for all SPAs |
| **Layered** | 3–10 devs | Medium | Enterprise apps with complex logic |
| **Micro-Frontends** | 5+ teams | High | Large orgs, independent deployments |
| **Clean Architecture** | 5+ devs | High | Long-lived projects, framework swaps |

---

## Component-Based Architecture

The default pattern for React, Vue, and Angular applications. Build UIs from independent, reusable pieces.

```typescript
// Atomic Design hierarchy
// Atoms → Molecules → Organisms → Pages

interface ButtonProps {
  variant: "primary" | "secondary" | "ghost";
  size: "sm" | "md" | "lg";
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}

// Atom
const Button: React.FC<ButtonProps> = ({ variant, size, onClick, children, disabled }) => (
  <button className={`btn btn-${variant} btn-${size}`} onClick={onClick} disabled={disabled}>
    {children}
  </button>
);

// Molecule (combines atoms)
interface SearchBoxProps {
  onSearch: (query: string) => void;
}

const SearchBox: React.FC<SearchBoxProps> = ({ onSearch }) => {
  const [query, setQuery] = React.useState("");
  return (
    <div className="search-box">
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <Button variant="primary" size="md" onClick={() => onSearch(query)}>
        Search
      </Button>
    </div>
  );
};
```

**Container vs Presentational split:**

```typescript
// Presentational — pure UI, no data fetching
const UserCard: React.FC<{ user: User; onEdit: () => void }> = ({ user, onEdit }) => (
  <div className="card">
    <h3>{user.name}</h3>
    <Button variant="secondary" size="sm" onClick={onEdit}>Edit</Button>
  </div>
);

// Container — owns data and side effects
const UserCardContainer: React.FC<{ userId: string }> = ({ userId }) => {
  const { data: user, isLoading } = useUser(userId);
  if (isLoading) return <Skeleton />;
  return <UserCard user={user} onEdit={() => router.push(`/users/${userId}/edit`)} />;
};
```

---

## Layered Architecture

Separates the application into layers with a strict dependency direction: UI → Business Logic → Data Access. Each layer is independently testable.

```
┌─────────────────────────────────┐
│   Presentation (React pages)    │
└────────────────┬────────────────┘
                 ↓ (one direction only)
┌─────────────────────────────────┐
│   Business Logic (hooks, utils) │
└────────────────┬────────────────┘
                 ↓
┌─────────────────────────────────┐
│   Data Access (API clients)     │
└─────────────────────────────────┘
```

```typescript
// Data Access Layer
const userApi = {
  getById: (id: string): Promise<User> => fetch(`/api/users/${id}`).then(r => r.json()),
};

// Business Logic Layer
function useUser(id: string) {
  return useQuery(["user", id], () => userApi.getById(id));
}

// Presentation Layer
const UserPage: React.FC<{ id: string }> = ({ id }) => {
  const { data } = useUser(id);
  return <UserCard user={data} onEdit={() => {}} />;
};
```

---

## Micro-Frontend Architecture

Each team owns a business domain end-to-end. Teams deploy independently and can use different tech stacks.

**When to use:**
- ✅ 5+ independent frontend teams
- ✅ Different release cadences per domain
- ❌ Small team — coordination overhead kills velocity

```typescript
// Module Federation (Webpack 5) — Host app config
const ModuleFederationPlugin = require("webpack/lib/container/ModuleFederationPlugin");

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: "host",
      remotes: {
        productApp: "productApp@http://products.internal/remoteEntry.js",
        checkoutApp: "checkoutApp@http://checkout.internal/remoteEntry.js",
      },
      shared: { react: { singleton: true }, "react-dom": { singleton: true } },
    }),
  ],
};

// Usage in host
const ProductList = React.lazy(() => import("productApp/ProductList"));

function App() {
  return (
    <React.Suspense fallback={<Loading />}>
      <ProductList />
    </React.Suspense>
  );
}
```

---

## Clean Architecture

Business logic at the center, framework at the edge. You could swap React for Vue without touching core logic.

```typescript
// Domain (no framework deps)
interface User { id: string; email: string; name: string; }
interface IAuthService { login(email: string, password: string): Promise<string>; }

// Use Case (orchestrates domain)
class LoginUseCase {
  constructor(private auth: IAuthService) {}
  async execute(email: string, password: string): Promise<User> {
    const token = await this.auth.login(email, password);
    return decodeToken(token);
  }
}

// UI (React depends on use case, not the other way)
function LoginPage() {
  const useCase = useMemo(() => new LoginUseCase(new AuthService()), []);
  const handleSubmit = async (email: string, password: string) => {
    const user = await useCase.execute(email, password);
    navigate("/dashboard");
  };
}
```

---

## Common Mistakes

❌ **Mixing business logic into components** — makes testing and reuse hard  
❌ **Micro-frontends for small teams** — coordination overhead outweighs the benefits  
❌ **Over-engineering early** — start component-based, add layers only when the codebase demands it

**Key insight:**

> Architecture is about trade-offs. Start with component-based (it's the right default). Add layering when logic grows complex. Add micro-frontends only when team independence is the bottleneck.

---
[← Back to SystemDesign](../README.md)
