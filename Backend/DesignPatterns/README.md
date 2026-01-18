# Design Patterns - Interview Preparation Guide

## 🎯 Introduction

Design patterns are **reusable solutions to common software design problems**. They represent best practices evolved over time by experienced software developers. Understanding design patterns is essential for backend engineering interviews at top tech companies.

### Why Design Patterns Matter

| Benefit | Description |
|---------|-------------|
| **Common Vocabulary** | Communicate complex ideas with simple pattern names |
| **Proven Solutions** | Battle-tested approaches to recurring problems |
| **Code Quality** | Promote maintainable, flexible, and reusable code |
| **Interview Essential** | Frequently asked in system design and coding interviews |

---

## 📚 Pattern Categories

### 💡 **Gang of Four (GoF) Classification**

Design patterns are traditionally divided into three categories based on their purpose:

```
Design Patterns
├── Creational Patterns    → Object creation mechanisms
├── Structural Patterns    → Object composition and relationships
└── Behavioral Patterns    → Object communication and responsibility
```

---

## 🗂️ Topics Covered

### 1. Creational Patterns

**Purpose:** Control object creation, hiding the creation logic.

| Pattern | Intent | Common Use Case |
|---------|--------|-----------------|
| [Singleton](./01-creational-patterns.md#singleton) | Ensure single instance | Database connections, Loggers |
| [Factory Method](./01-creational-patterns.md#factory-method) | Create objects without specifying class | Plugin systems, UI elements |
| [Abstract Factory](./01-creational-patterns.md#abstract-factory) | Create families of related objects | Cross-platform UI |
| [Builder](./01-creational-patterns.md#builder) | Construct complex objects step by step | Query builders, Config objects |
| [Prototype](./01-creational-patterns.md#prototype) | Clone existing objects | Object caching, Templates |

**[→ View Creational Patterns](./01-creational-patterns.md)**

---

### 2. Structural Patterns

**Purpose:** Compose objects into larger structures while keeping them flexible.

| Pattern | Intent | Common Use Case |
|---------|--------|-----------------|
| [Adapter](./02-structural-patterns.md#adapter) | Make incompatible interfaces work together | Third-party library integration |
| [Decorator](./02-structural-patterns.md#decorator) | Add behavior dynamically | Middleware, Logging |
| [Facade](./02-structural-patterns.md#facade) | Provide simplified interface | Complex subsystem access |
| [Proxy](./02-structural-patterns.md#proxy) | Control access to another object | Caching, Lazy loading |
| [Composite](./02-structural-patterns.md#composite) | Treat individual and composite objects uniformly | File systems, UI trees |
| [Bridge](./02-structural-patterns.md#bridge) | Separate abstraction from implementation | Cross-platform support |

**[→ View Structural Patterns](./02-structural-patterns.md)**

---

### 3. Behavioral Patterns

**Purpose:** Define how objects communicate and distribute responsibility.

| Pattern | Intent | Common Use Case |
|---------|--------|-----------------|
| [Strategy](./03-behavioral-patterns.md#strategy) | Define interchangeable algorithms | Payment processors, Sorting |
| [Observer](./03-behavioral-patterns.md#observer) | Notify multiple objects of state changes | Event systems, Pub/Sub |
| [Command](./03-behavioral-patterns.md#command) | Encapsulate requests as objects | Undo/Redo, Task queues |
| [State](./03-behavioral-patterns.md#state) | Alter behavior when state changes | Order status, Game states |
| [Template Method](./03-behavioral-patterns.md#template-method) | Define algorithm skeleton | Frameworks, Hooks |
| [Iterator](./03-behavioral-patterns.md#iterator) | Traverse collections | Custom collections |
| [Chain of Responsibility](./03-behavioral-patterns.md#chain-of-responsibility) | Pass requests along a chain | Middleware, Logging |

**[→ View Behavioral Patterns](./03-behavioral-patterns.md)**

---

### 4. Architectural Patterns

**Purpose:** High-level structural organization of entire applications.

| Pattern | Intent | Common Use Case |
|---------|--------|-----------------|
| [Repository](./04-architectural-patterns.md#repository) | Abstract data access | Database operations |
| [Dependency Injection](./04-architectural-patterns.md#dependency-injection) | Invert object dependencies | Testing, Modularity |
| [MVC](./04-architectural-patterns.md#mvc) | Separate concerns | Web applications |
| [Service Layer](./04-architectural-patterns.md#service-layer) | Define application boundary | Business logic |
| [Unit of Work](./04-architectural-patterns.md#unit-of-work) | Track changes to objects | Transaction management |

**[→ View Architectural Patterns](./04-architectural-patterns.md)**

---

### 5. SOLID Principles

**Purpose:** Five principles for writing maintainable object-oriented code.

| Principle | Name | Key Idea |
|-----------|------|----------|
| **S** | Single Responsibility | One class, one reason to change |
| **O** | Open/Closed | Open for extension, closed for modification |
| **L** | Liskov Substitution | Subtypes must be substitutable |
| **I** | Interface Segregation | Many specific interfaces over one general |
| **D** | Dependency Inversion | Depend on abstractions, not concretions |

**[→ View SOLID Principles](./05-solid-principles.md)**

---

## 🎓 Interview Focus

### Most Frequently Asked Patterns

Based on interview frequency at top tech companies:

```
High Frequency
├── Singleton         ★★★★★
├── Factory           ★★★★★
├── Strategy          ★★★★★
├── Observer          ★★★★☆
├── Decorator         ★★★★☆
└── Dependency Injection ★★★★★

Medium Frequency
├── Builder           ★★★☆☆
├── Adapter           ★★★☆☆
├── Facade            ★★★☆☆
├── Command           ★★★☆☆
└── Repository        ★★★☆☆

Lower Frequency (but still important)
├── Prototype         ★★☆☆☆
├── Bridge            ★★☆☆☆
├── Composite         ★★☆☆☆
├── Chain of Responsibility ★★☆☆☆
└── State             ★★☆☆☆
```

### Common Interview Questions

**Conceptual Questions:**
1. What is the difference between Factory and Abstract Factory?
2. When would you use Strategy vs State pattern?
3. How does Decorator differ from Adapter?
4. Explain Dependency Injection and its benefits
5. What problems does Singleton pattern solve and create?

**Coding Questions:**
1. Implement a Logger using Singleton pattern
2. Design a payment system using Strategy pattern
3. Create a notification system using Observer pattern
4. Build a query builder using Builder pattern
5. Implement middleware using Chain of Responsibility

---

## 📊 Pattern Selection Guide

### 💡 **Decision Tree**

```
Need to create objects?
├── Single instance needed? → Singleton
├── Hide concrete class? → Factory Method
├── Family of related objects? → Abstract Factory
├── Complex construction? → Builder
└── Clone existing object? → Prototype

Need to structure objects?
├── Incompatible interfaces? → Adapter
├── Add behavior dynamically? → Decorator
├── Simplify complex system? → Facade
├── Control access? → Proxy
└── Tree structure? → Composite

Need to manage behavior?
├── Interchangeable algorithms? → Strategy
├── Notify on changes? → Observer
├── Encapsulate requests? → Command
├── State-dependent behavior? → State
└── Algorithm skeleton? → Template Method
```

---

## 🛠️ Language Considerations

### JavaScript/TypeScript Specifics

Design patterns in JavaScript differ from classical OOP languages:

| Aspect | Classical OOP | JavaScript |
|--------|---------------|------------|
| **Classes** | Required | Optional (functions/objects) |
| **Interfaces** | Built-in | TypeScript only |
| **Access Modifiers** | private, protected | # (private), closures |
| **Singleton** | Static instance | Module pattern, closures |
| **Factory** | Factory classes | Factory functions |

**Key Insight:**
> JavaScript's flexibility allows implementing patterns with functions and closures instead of classes. TypeScript adds type safety and interface support for cleaner pattern implementations.

---

## 📋 Study Plan

### Week 1: Foundational Patterns

| Day | Topic | Focus |
|-----|-------|-------|
| 1-2 | Singleton, Factory | Creational basics |
| 3-4 | Strategy, Observer | Core behavioral |
| 5-6 | Decorator, Adapter | Essential structural |
| 7 | Review & Practice | Code implementations |

### Week 2: Advanced Patterns & SOLID

| Day | Topic | Focus |
|-----|-------|-------|
| 1-2 | Builder, Command | Complex patterns |
| 3-4 | Repository, DI | Architectural patterns |
| 5-6 | SOLID Principles | Design principles |
| 7 | Mock Interview | Pattern discussions |

---

## 🎯 Learning Approach

### For Each Pattern, Understand:

1. **Problem** - What issue does this pattern solve?
2. **Solution** - How does it solve the problem?
3. **Structure** - What are the participants and relationships?
4. **Implementation** - How to code it in JavaScript/TypeScript?
5. **Trade-offs** - What are the pros and cons?
6. **Real-world** - Where is it used in popular libraries?

### Practice Strategy

1. **Read the pattern** - Understand the concept
2. **Study examples** - See real implementations
3. **Code from scratch** - Implement without reference
4. **Refactor existing code** - Apply patterns to improve code
5. **Explain verbally** - Practice for interviews

---

## 📚 Additional Resources

### Books
- "Design Patterns: Elements of Reusable Object-Oriented Software" - GoF
- "Head First Design Patterns" - Freeman & Robson
- "JavaScript Design Patterns" - Addy Osmani
- "Learning JavaScript Design Patterns" - Addy Osmani

### Online Resources
- [Refactoring Guru](https://refactoring.guru/design-patterns)
- [Source Making](https://sourcemaking.com/design_patterns)
- [JavaScript Design Patterns (patterns.dev)](https://www.patterns.dev/)

---

## 🚀 Quick Reference

### Pattern Relationships

```
Creational → How objects are created
    ↓
Structural → How objects are composed
    ↓
Behavioral → How objects communicate
    ↓
Architectural → How system is organized
```

### Anti-Patterns to Avoid

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| **God Object** | One class does everything | Single Responsibility |
| **Spaghetti Code** | No clear structure | Appropriate patterns |
| **Copy-Paste** | Duplicated code | Template Method, Strategy |
| **Tight Coupling** | Hard dependencies | Dependency Injection |
| **Premature Abstraction** | Over-engineering | YAGNI principle |

---

**Next Steps:** Start with [Creational Patterns →](./01-creational-patterns.md)

---

[← Back to Backend Guide](../README.md)
