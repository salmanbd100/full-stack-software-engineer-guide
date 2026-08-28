---
title: TypeScript
part: 1
chapter: 0
slug: frontend-typescript-index
level: intermediate # beginner | intermediate | advanced
reading_time: 3
updated: 2025-11-30
tags: [frontend, typescript]
in_book: true
---

# TypeScript

Master TypeScript for modern frontend development. TypeScript is increasingly required at major companies and improves code quality, maintainability, and developer experience.

## 📚 Topics Covered

### Fundamentals
1. **[Basic Types](./01-basic-types.md)**
   - Primitives (string, number, boolean)
   - Arrays and tuples
   - any, unknown, never
   - Type inference

2. **[Interfaces & Types](./02-interfaces-types.md)**
   - Interface declaration
   - Type aliases
   - Interface vs Type
   - Extending and implementing

### Advanced Types
3. **[Generics](./03-generics.md)**
   - Generic functions
   - Generic interfaces
   - Constraints
   - Default type parameters

4. **[Utility Types](./04-utility-types.md)**
   - Partial, Required, Readonly
   - Pick, Omit, Record
   - ReturnType, Parameters
   - Conditional types

5. **[Type Guards](./05-type-guards.md)**
   - typeof guards
   - instanceof guards
   - Custom type guards
   - Discriminated unions

### Advanced Concepts
6. **[Advanced Types](./06-advanced-types.md)**
   - Union types
   - Intersection types
   - Conditional types
   - Mapped types
   - Template literal types

7. **[Enums & Literals](./07-enums-literals.md)**
   - Numeric enums
   - String enums
   - Literal types
   - Const assertions

### React Integration
8. **[React TypeScript](./08-react-typescript.md)**
   - Typing components
   - Props and state
   - Hooks with TypeScript
   - Event handlers
   - Common patterns

---

## 🎯 Interview Focus Areas

### Must Know
1. Basic types and type inference
2. Interfaces vs Types
3. Generics
4. Type guards
5. Utility types

### Very Important
6. React component typing
7. Union and intersection types
8. Type narrowing
9. Enums and literals
10. Conditional types

### Good to Know
11. Advanced mapped types
12. Template literal types
13. Module declaration
14. Decorators

---

## 💡 Quick Reference

### Common Interview Questions
1. "Difference between interface and type?"
2. "What are generics? When to use them?"
3. "Explain utility types in TypeScript"
4. "How to type React components?"
5. "What is type narrowing?"
6. "Difference between any and unknown?"
7. "How to create custom type guards?"
8. "What are union types?"

### Essential Patterns
```typescript
// Generic Function
function identity<T>(arg: T): T {
    return arg;
}

// Interface with Generics
interface ApiResponse<T> {
    data: T;
    status: number;
    message: string;
}

// Type Guard
function isString(value: unknown): value is string {
    return typeof value === 'string';
}

// React Component Props
interface ButtonProps {
    label: string;
    onClick: () => void;
    disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({ label, onClick, disabled }) => {
    return <button onClick={onClick} disabled={disabled}>{label}</button>;
};

// Utility Types
type User = {
    id: number;
    name: string;
    email: string;
};

type PartialUser = Partial<User>; // All properties optional
type UserWithoutEmail = Omit<User, 'email'>; // Exclude 'email'
```

---

## 🔗 External Resources

- [TypeScript Official Docs](https://www.typescriptlang.org/docs/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [Type Challenges](https://github.com/type-challenges/type-challenges)

---

[← Back to Frontend](../README.md)
