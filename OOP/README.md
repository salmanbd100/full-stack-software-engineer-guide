# Object-Oriented Programming (OOP)

## 🎯 Why OOP Matters for Full-Stack Engineers

Object-Oriented Programming is the **foundation of modern software architecture**. Whether you're building Express/NestJS backends, designing React state management, or structuring microservices — OOP principles guide how you organize, scale, and maintain code.

### Why This Matters for Interviews

1. **System Design** — OOP principles drive class hierarchies, service layers, and API design
2. **Design Patterns** — Every GoF pattern relies on OOP fundamentals (inheritance, polymorphism, composition)
3. **Code Quality** — Encapsulation and abstraction questions reveal how you think about maintainability
4. **Real-World Architecture** — NestJS, TypeORM, and most backend frameworks are deeply OOP

### The Four Pillars at a Glance

| Pillar | What It Does | Real-World Analogy |
|--------|-------------|-------------------|
| **Encapsulation** | Bundles data + methods, hides internals | ATM machine — hidden internals, public interface |
| **Inheritance** | Creates "is-a" hierarchies, reuses code | Vehicle → Car → ElectricCar |
| **Polymorphism** | Same interface, different behaviors | USB port — same port, different devices |
| **Abstraction** | Simplifies complex systems via contracts | Steering wheel — simple interface, complex internals |

---

## 📚 Topics

| # | Topic | Key Concepts |
|---|-------|-------------|
| 01 | [OOP Fundamentals](./01-oop-fundamentals.md) | Classes, objects, constructors, static vs instance, `this` |
| 02 | [Encapsulation](./02-encapsulation.md) | Access modifiers, getters/setters, information hiding |
| 03 | [Inheritance](./03-inheritance.md) | `extends`, `super`, method overriding, constructor chaining |
| 04 | [Polymorphism](./04-polymorphism.md) | Method overriding, interfaces, generics, duck typing |
| 05 | [Abstraction](./05-abstraction.md) | Abstract classes, interfaces, contracts, Template Method |
| 06 | [Composition vs Inheritance](./06-composition-vs-inheritance.md) | "Favor composition", DI, mixins, utility composition |
| 07 | [OOP in the Real World](./07-oop-in-real-world.md) | Services, repositories, controllers, DTOs, testing |

---

## 📅 Study Plan (3-Day Track)

### Day 1: Core Concepts (3-4 hours)

| Time | Topic | Focus |
|------|-------|-------|
| 1.5 hrs | [01 - OOP Fundamentals](./01-oop-fundamentals.md) | Classes, objects, constructors, `this` |
| 1.5 hrs | [02 - Encapsulation](./02-encapsulation.md) | Access modifiers, getters/setters |

### Day 2: Pillars Deep Dive (4-5 hours)

| Time | Topic | Focus |
|------|-------|-------|
| 1.5 hrs | [03 - Inheritance](./03-inheritance.md) | `extends`, `super`, when to inherit |
| 1.5 hrs | [04 - Polymorphism](./04-polymorphism.md) | Interfaces, generics, runtime behavior |
| 1 hr | [05 - Abstraction](./05-abstraction.md) | Abstract classes vs interfaces |

### Day 3: Advanced & Applied (3-4 hours)

| Time | Topic | Focus |
|------|-------|-------|
| 1.5 hrs | [06 - Composition vs Inheritance](./06-composition-vs-inheritance.md) | DI, mixins, real patterns |
| 1.5 hrs | [07 - OOP in the Real World](./07-oop-in-real-world.md) | Full-stack architecture, interview questions |

---

## 🔑 Quick Reference: Top OOP Interview Questions

| Question | Key Answer Points |
|----------|------------------|
| What are the 4 pillars of OOP? | Encapsulation, Inheritance, Polymorphism, Abstraction |
| Composition vs Inheritance? | Favor composition for flexibility; inheritance for "is-a" relationships |
| Abstract class vs Interface? | Abstract = partial implementation + state; Interface = pure contract |
| What is polymorphism? | Same method call → different behavior depending on the object type |
| What is encapsulation? | Bundling data + methods together, hiding internal state behind a public API |
| When should you NOT use inheritance? | When you need "has-a" relationships, or when the hierarchy gets more than 2-3 levels deep |
| What is Dependency Injection? | Passing dependencies in from outside instead of creating them internally |

---

## 🔗 Related Sections

- [Backend / Design Patterns](../Backend/DesignPatterns/) — GoF patterns built on OOP
- [Frontend / TypeScript](../Frontend/TypeScript/) — TypeScript's type system and OOP features
- [Frontend / JavaScript](../Frontend/JavaScript/) — Prototypal inheritance, `this` keyword

---

## 📝 Convention Notes

- All code examples use **TypeScript** (ES6+ class syntax)
- Every topic includes: **analogy**, **ASCII diagram**, **comparison tables**, **real-world use cases**
- Emoji indicators: 💡 concepts | ✅ good practice | ❌ bad practice | ⚠️ warning | 🌍 real-world

---

[← Back to Main Repository](../README.md)
