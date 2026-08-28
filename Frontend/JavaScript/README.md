# JavaScript Fundamentals

Master core JavaScript concepts essential for frontend interviews at multinational companies. JavaScript is the foundation of modern web development and is tested extensively in technical interviews.

## 📚 Topics Covered

### Basics
1. **[Data Types & Variables](./01-data-types-variables.md)**
   - Primitives vs Reference types
   - Type coercion and conversion
   - Variable declarations (var, let, const)

2. **[Functions & Scope](./02-functions-scope.md)**
   - Function declarations vs expressions
   - Arrow functions
   - Scope and hoisting

### Advanced Concepts
3. **[Closures](./03-closures.md)**
   - Lexical scope
   - Closure patterns
   - IIFE and module pattern

4. **[This Keyword](./04-this-keyword.md)**
   - Context binding rules
   - call, apply, bind
   - Arrow functions and this

5. **[Prototypes & Inheritance](./05-prototypes-inheritance.md)**
   - Prototype chain
   - Constructor functions
   - ES6 classes

### Asynchronous JavaScript
6. **[Promises & Async/Await](./06-promises-async.md)**
   - Promise creation and chaining
   - Async/await syntax
   - Error handling

7. **[Event Loop](./07-event-loop.md)**
   - Call stack
   - Task queue and microtask queue
   - Browser vs Node.js event loop

### Modern JavaScript
8. **[ES6+ Features](./08-es6-features.md)**
   - Destructuring
   - Spread and rest operators
   - Template literals, modules

9. **[Array & Object Methods](./09-array-object-methods.md)**
   - Map, filter, reduce
   - Object.keys, values, entries
   - Array iteration methods

10. **[Error Handling](./10-error-handling.md)**
    - Try/catch/finally
    - Custom errors
    - Debugging techniques

---

## 🎯 Interview Focus Areas

### Most Commonly Asked (Must Know)
1. Closures and scope
2. Promises and async/await
3. Event loop and call stack
4. Array methods (map, filter, reduce)
5. This keyword binding

### Frequently Asked
6. Prototypes and inheritance
7. ES6+ features
8. Type coercion
9. Hoisting
10. Error handling

---

## 📖 Study Approach

### Week 1: Foundations
- Days 1-2: Data types, variables, functions
- Days 3-4: Scope and closures
- Days 5-7: Practice coding problems

### Week 2: Advanced
- Days 1-2: This keyword and prototypes
- Days 3-4: Promises and async/await
- Days 5-6: Event loop
- Day 7: Practice and review

### Week 3: Modern JavaScript
- Days 1-3: ES6+ features
- Days 4-5: Array and object methods
- Days 6-7: Mock interviews and practice

---

## 💡 Quick Reference

### Common Interview Questions
1. "Explain closures with an example"
2. "What is the event loop?"
3. "Difference between var, let, and const"
4. "How do promises work?"
5. "Explain the this keyword"
6. "What is hoisting?"
7. "Difference between map() and forEach()"
8. "How does prototypal inheritance work?"

### Code Patterns to Master
```typescript
// Closure
function createCounter(): () => number {
  let count = 0;
  return (): number => ++count;
}

// Promise chaining
fetch(url)
  .then((res: Response): Promise<unknown> => res.json())
  .then((data: unknown): void => console.log(data))
  .catch((err: unknown): void => console.error(err));

// Array methods
const numbers: number[] = [1, 2, 3, 4, 5];
const doubled: number[] = numbers.map((n: number): number => n * 2);
const sum: number = numbers.reduce((acc: number, n: number): number => acc + n, 0);
```

---

## 🔗 External Resources

### Documentation
- [MDN JavaScript Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide)
- [JavaScript.info](https://javascript.info/)
- [ECMAScript Specifications](https://tc39.es/ecma262/)

### Books
- "You Don't Know JS" - Kyle Simpson
- "Eloquent JavaScript" - Marijn Haverbeke
- "JavaScript: The Good Parts" - Douglas Crockford

### Practice
- [JavaScript30](https://javascript30.com/) - 30 Day Challenge
- [Exercism JavaScript Track](https://exercism.org/tracks/javascript)
- [LeetCode](https://leetcode.com/) - JavaScript problems

---

[← Back to Frontend](../README.md)
