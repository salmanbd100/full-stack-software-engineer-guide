# Behavioral Design Patterns

## 🎯 Overview

Behavioral patterns are concerned with **algorithms and the assignment of responsibilities** between objects. They describe not just patterns of objects or classes but also the patterns of communication between them.

### When to Use Behavioral Patterns

| Scenario | Pattern |
|----------|---------|
| Swap algorithms at runtime | Strategy |
| Notify objects of state changes | Observer |
| Encapsulate requests as objects | Command |
| Change behavior based on internal state | State |
| Define algorithm skeleton, defer steps | Template Method |
| Traverse collections | Iterator |
| Pass requests along a chain | Chain of Responsibility |

---

## Strategy

### 💡 **Intent**

Define a **family of algorithms**, encapsulate each one, and make them **interchangeable**. Strategy lets the algorithm vary independently from clients that use it.

### Problem It Solves

```
Without Strategy:
├── Giant if-else or switch statements
├── Algorithm changes require modifying existing code
├── Cannot change algorithm at runtime
├── Hard to test individual algorithms
└── Code duplication across similar algorithms
```

### Structure

```
┌─────────────────┐         ┌─────────────────┐
│     Context     │────────▶│    Strategy     │
├─────────────────┤         ├─────────────────┤
│ - strategy      │         │ + execute()     │
│ + setStrategy() │         └────────△────────┘
│ + doSomething() │                  │
└─────────────────┘         ┌────────┴────────┐
                            │                 │
                   ┌────────┴──────┐  ┌───────┴───────┐
                   │ConcreteStrategyA│  │ConcreteStrategyB│
                   ├───────────────┤  ├───────────────┤
                   │ + execute()   │  │ + execute()   │
                   └───────────────┘  └───────────────┘
```

### Implementation

**Payment Processing:**

```javascript
// Strategy interface
class PaymentStrategy {
  pay(amount) {
    throw new Error('pay must be implemented');
  }

  validate(paymentDetails) {
    throw new Error('validate must be implemented');
  }
}

// Concrete strategies
class CreditCardStrategy extends PaymentStrategy {
  constructor(cardNumber, cvv, expiry) {
    super();
    this.cardNumber = cardNumber;
    this.cvv = cvv;
    this.expiry = expiry;
  }

  validate(paymentDetails) {
    if (!/^\d{16}$/.test(this.cardNumber)) {
      return { valid: false, error: 'Invalid card number' };
    }
    if (!/^\d{3,4}$/.test(this.cvv)) {
      return { valid: false, error: 'Invalid CVV' };
    }
    return { valid: true };
  }

  pay(amount) {
    const validation = this.validate();
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    console.log(`Processing credit card payment of $${amount}`);
    console.log(`Card: **** **** **** ${this.cardNumber.slice(-4)}`);

    return {
      success: true,
      transactionId: `CC_${Date.now()}`,
      method: 'credit_card',
      amount
    };
  }
}

class PayPalStrategy extends PaymentStrategy {
  constructor(email) {
    super();
    this.email = email;
  }

  validate() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
      return { valid: false, error: 'Invalid email' };
    }
    return { valid: true };
  }

  pay(amount) {
    const validation = this.validate();
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    console.log(`Processing PayPal payment of $${amount}`);
    console.log(`Account: ${this.email}`);

    return {
      success: true,
      transactionId: `PP_${Date.now()}`,
      method: 'paypal',
      amount
    };
  }
}

class CryptoStrategy extends PaymentStrategy {
  constructor(walletAddress, currency = 'BTC') {
    super();
    this.walletAddress = walletAddress;
    this.currency = currency;
  }

  validate() {
    if (!this.walletAddress || this.walletAddress.length < 26) {
      return { valid: false, error: 'Invalid wallet address' };
    }
    return { valid: true };
  }

  pay(amount) {
    const validation = this.validate();
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const cryptoAmount = this.convertToCrypto(amount);
    console.log(`Processing ${this.currency} payment of ${cryptoAmount} ${this.currency}`);
    console.log(`Wallet: ${this.walletAddress.slice(0, 10)}...`);

    return {
      success: true,
      transactionId: `CRYPTO_${Date.now()}`,
      method: this.currency.toLowerCase(),
      amount,
      cryptoAmount
    };
  }

  convertToCrypto(usdAmount) {
    const rates = { BTC: 0.000024, ETH: 0.00042 };
    return (usdAmount * (rates[this.currency] || 0.001)).toFixed(8);
  }
}

// Context
class PaymentProcessor {
  constructor() {
    this.strategy = null;
  }

  setStrategy(strategy) {
    this.strategy = strategy;
  }

  checkout(amount) {
    if (!this.strategy) {
      throw new Error('Payment strategy not set');
    }

    console.log(`\n--- Processing $${amount} payment ---`);
    const result = this.strategy.pay(amount);
    console.log('Payment result:', result);
    return result;
  }
}

// Usage
const processor = new PaymentProcessor();

// Pay with credit card
processor.setStrategy(new CreditCardStrategy('4242424242424242', '123', '12/25'));
processor.checkout(99.99);

// Switch to PayPal
processor.setStrategy(new PayPalStrategy('user@example.com'));
processor.checkout(49.99);

// Switch to crypto
processor.setStrategy(new CryptoStrategy('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', 'BTC'));
processor.checkout(199.99);
```

**Sorting Strategies:**

```typescript
interface SortStrategy<T> {
  sort(data: T[]): T[];
}

class QuickSort<T> implements SortStrategy<T> {
  sort(data: T[]): T[] {
    console.log('Using QuickSort');
    if (data.length <= 1) return data;

    const pivot = data[Math.floor(data.length / 2)];
    const left = data.filter(x => x < pivot);
    const middle = data.filter(x => x === pivot);
    const right = data.filter(x => x > pivot);

    return [...this.sort(left), ...middle, ...this.sort(right)];
  }
}

class MergeSort<T> implements SortStrategy<T> {
  sort(data: T[]): T[] {
    console.log('Using MergeSort');
    if (data.length <= 1) return data;

    const mid = Math.floor(data.length / 2);
    const left = this.sort(data.slice(0, mid));
    const right = this.sort(data.slice(mid));

    return this.merge(left, right);
  }

  private merge(left: T[], right: T[]): T[] {
    const result: T[] = [];
    let i = 0, j = 0;

    while (i < left.length && j < right.length) {
      if (left[i] <= right[j]) {
        result.push(left[i++]);
      } else {
        result.push(right[j++]);
      }
    }

    return [...result, ...left.slice(i), ...right.slice(j)];
  }
}

class BubbleSort<T> implements SortStrategy<T> {
  sort(data: T[]): T[] {
    console.log('Using BubbleSort');
    const arr = [...data];

    for (let i = 0; i < arr.length; i++) {
      for (let j = 0; j < arr.length - i - 1; j++) {
        if (arr[j] > arr[j + 1]) {
          [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
        }
      }
    }

    return arr;
  }
}

// Context with automatic strategy selection
class Sorter<T> {
  private strategy: SortStrategy<T>;

  constructor(strategy?: SortStrategy<T>) {
    this.strategy = strategy || new QuickSort<T>();
  }

  setStrategy(strategy: SortStrategy<T>): void {
    this.strategy = strategy;
  }

  // Auto-select based on data size
  sort(data: T[]): T[] {
    // Small arrays: use simple algorithm
    if (data.length < 10) {
      this.strategy = new BubbleSort<T>();
    }
    // Medium: QuickSort
    else if (data.length < 1000) {
      this.strategy = new QuickSort<T>();
    }
    // Large: MergeSort (stable, predictable)
    else {
      this.strategy = new MergeSort<T>();
    }

    return this.strategy.sort(data);
  }
}

// Usage
const sorter = new Sorter<number>();

console.log(sorter.sort([3, 1, 4, 1, 5]));           // BubbleSort
console.log(sorter.sort(Array.from({length: 100}, () => Math.random()))); // QuickSort
```

### Real-World Examples

| Library/Framework | Strategy Usage |
|-------------------|----------------|
| **Passport.js** | Authentication strategies |
| **Winston** | Transport strategies |
| **Compression** | Compression algorithms |
| **Axios** | Request interceptors |

### Interview Questions

**Q: When would you use Strategy vs simple if-else?**

**A:**

Use **if-else/switch** when:
- Few options that won't change
- Simple selection logic
- No need to add new algorithms

Use **Strategy** when:
- Multiple algorithms with same interface
- Algorithm needs to be selected at runtime
- New algorithms added frequently
- Algorithms are complex or need testing independently

```javascript
// Simple: if-else is fine
function formatDate(date, format) {
  if (format === 'short') return date.toLocaleDateString();
  if (format === 'long') return date.toDateString();
  return date.toISOString();
}

// Complex: Strategy is better
class CompressionStrategy { compress(data) {} }
class GzipStrategy extends CompressionStrategy { /* complex implementation */ }
class BrotliStrategy extends CompressionStrategy { /* complex implementation */ }
class LZ4Strategy extends CompressionStrategy { /* complex implementation */ }
```

---

## Observer

### 💡 **Intent**

Define a **one-to-many dependency** between objects so that when one object changes state, all its dependents are notified and updated automatically.

### Problem It Solves

```
Without Observer:
├── Tight coupling between objects
├── Manual notification to all interested parties
├── Hard to add new subscribers
├── Polling for changes (inefficient)
└── Difficult to maintain as system grows
```

### Structure

```
┌─────────────────┐         ┌─────────────────┐
│    Subject      │◄────────│    Observer     │
├─────────────────┤         ├─────────────────┤
│ - observers     │         │ + update()      │
│ + attach()      │         └────────△────────┘
│ + detach()      │                  │
│ + notify()      │         ┌────────┴────────┐
└─────────────────┘         │                 │
                   ┌────────┴──────┐  ┌───────┴───────┐
                   │ConcreteObserverA│ │ConcreteObserverB│
                   └───────────────┘  └───────────────┘
```

### Implementation

**Event Emitter:**

```javascript
class EventEmitter {
  constructor() {
    this.events = new Map();
  }

  on(event, listener) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event).push(listener);
    return this; // Allow chaining
  }

  off(event, listener) {
    if (!this.events.has(event)) return this;

    const listeners = this.events.get(event);
    const index = listeners.indexOf(listener);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
    return this;
  }

  once(event, listener) {
    const wrapper = (...args) => {
      listener(...args);
      this.off(event, wrapper);
    };
    return this.on(event, wrapper);
  }

  emit(event, ...args) {
    if (!this.events.has(event)) return false;

    const listeners = this.events.get(event);
    listeners.forEach(listener => {
      try {
        listener(...args);
      } catch (error) {
        console.error(`Error in ${event} listener:`, error);
      }
    });
    return true;
  }

  listenerCount(event) {
    return this.events.get(event)?.length || 0;
  }
}

// Usage
const emitter = new EventEmitter();

// Subscribe to events
emitter.on('user:created', (user) => {
  console.log('Send welcome email to:', user.email);
});

emitter.on('user:created', (user) => {
  console.log('Initialize user preferences for:', user.id);
});

emitter.on('user:created', (user) => {
  console.log('Add to newsletter:', user.email);
});

// One-time listener
emitter.once('user:firstLogin', (user) => {
  console.log('Show onboarding tutorial to:', user.name);
});

// Emit events
emitter.emit('user:created', { id: 1, name: 'John', email: 'john@example.com' });
// Send welcome email to: john@example.com
// Initialize user preferences for: 1
// Add to newsletter: john@example.com
```

**Stock Price Observer:**

```javascript
// Subject
class StockTicker {
  constructor(symbol) {
    this.symbol = symbol;
    this.price = 0;
    this.observers = new Set();
  }

  subscribe(observer) {
    this.observers.add(observer);
    console.log(`${observer.name} subscribed to ${this.symbol}`);
  }

  unsubscribe(observer) {
    this.observers.delete(observer);
    console.log(`${observer.name} unsubscribed from ${this.symbol}`);
  }

  setPrice(price) {
    const oldPrice = this.price;
    this.price = price;

    if (oldPrice !== price) {
      this.notify(oldPrice);
    }
  }

  notify(oldPrice) {
    const change = ((this.price - oldPrice) / oldPrice * 100).toFixed(2);
    const direction = this.price > oldPrice ? '📈' : '📉';

    this.observers.forEach(observer => {
      observer.update({
        symbol: this.symbol,
        price: this.price,
        oldPrice,
        change: `${change}%`,
        direction
      });
    });
  }
}

// Concrete observers
class PriceAlert {
  constructor(name, threshold, direction) {
    this.name = name;
    this.threshold = threshold;
    this.direction = direction; // 'above' or 'below'
  }

  update(data) {
    const shouldAlert =
      (this.direction === 'above' && data.price > this.threshold) ||
      (this.direction === 'below' && data.price < this.threshold);

    if (shouldAlert) {
      console.log(`🚨 ${this.name}: ${data.symbol} is ${this.direction} $${this.threshold}! Current: $${data.price}`);
    }
  }
}

class PriceLogger {
  constructor(name) {
    this.name = name;
  }

  update(data) {
    console.log(`[${this.name}] ${data.symbol}: $${data.oldPrice} → $${data.price} (${data.direction} ${data.change})`);
  }
}

class TradingBot {
  constructor(name, buyThreshold, sellThreshold) {
    this.name = name;
    this.buyThreshold = buyThreshold;
    this.sellThreshold = sellThreshold;
    this.position = 0;
  }

  update(data) {
    if (data.price < this.buyThreshold && this.position < 100) {
      this.position += 10;
      console.log(`🤖 ${this.name}: Buying 10 shares of ${data.symbol} at $${data.price}. Position: ${this.position}`);
    } else if (data.price > this.sellThreshold && this.position > 0) {
      const sellAmount = Math.min(10, this.position);
      this.position -= sellAmount;
      console.log(`🤖 ${this.name}: Selling ${sellAmount} shares of ${data.symbol} at $${data.price}. Position: ${this.position}`);
    }
  }
}

// Usage
const appleStock = new StockTicker('AAPL');

// Create observers
const logger = new PriceLogger('Console Logger');
const highAlert = new PriceAlert('High Alert', 200, 'above');
const lowAlert = new PriceAlert('Low Alert', 150, 'below');
const bot = new TradingBot('AutoTrader', 155, 195);

// Subscribe observers
appleStock.subscribe(logger);
appleStock.subscribe(highAlert);
appleStock.subscribe(lowAlert);
appleStock.subscribe(bot);

// Simulate price changes
console.log('\n--- Price Updates ---');
appleStock.setPrice(175);
appleStock.setPrice(180);
appleStock.setPrice(152);
appleStock.setPrice(148);
appleStock.setPrice(205);

// Unsubscribe
appleStock.unsubscribe(lowAlert);
appleStock.setPrice(145); // Low alert won't trigger
```

**TypeScript Reactive Store:**

```typescript
type Listener<T> = (state: T, prevState: T) => void;
type Selector<T, R> = (state: T) => R;

class Store<T extends object> {
  private state: T;
  private listeners: Set<Listener<T>> = new Set();
  private selectorListeners: Map<Selector<T, any>, Set<Listener<any>>> = new Map();

  constructor(initialState: T) {
    this.state = initialState;
  }

  getState(): T {
    return this.state;
  }

  setState(partial: Partial<T> | ((state: T) => Partial<T>)): void {
    const prevState = this.state;
    const changes = typeof partial === 'function' ? partial(this.state) : partial;

    this.state = { ...this.state, ...changes };
    this.notify(prevState);
  }

  subscribe(listener: Listener<T>): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Subscribe to specific part of state
  subscribeToSelector<R>(selector: Selector<T, R>, listener: Listener<R>): () => void {
    if (!this.selectorListeners.has(selector)) {
      this.selectorListeners.set(selector, new Set());
    }
    this.selectorListeners.get(selector)!.add(listener);

    return () => {
      this.selectorListeners.get(selector)?.delete(listener);
    };
  }

  private notify(prevState: T): void {
    // Notify general listeners
    this.listeners.forEach(listener => {
      listener(this.state, prevState);
    });

    // Notify selector listeners only if selected value changed
    this.selectorListeners.forEach((listeners, selector) => {
      const prevValue = selector(prevState);
      const newValue = selector(this.state);

      if (prevValue !== newValue) {
        listeners.forEach(listener => {
          listener(newValue, prevValue);
        });
      }
    });
  }
}

// Usage
interface AppState {
  user: { name: string; email: string } | null;
  cart: { items: string[]; total: number };
  theme: 'light' | 'dark';
}

const store = new Store<AppState>({
  user: null,
  cart: { items: [], total: 0 },
  theme: 'light'
});

// Subscribe to all changes
const unsubscribeAll = store.subscribe((state, prev) => {
  console.log('State changed:', state);
});

// Subscribe to specific slice
const selectUser = (state: AppState) => state.user;
const selectCartTotal = (state: AppState) => state.cart.total;

store.subscribeToSelector(selectUser, (user, prevUser) => {
  console.log('User changed:', prevUser, '→', user);
});

store.subscribeToSelector(selectCartTotal, (total, prevTotal) => {
  console.log('Cart total changed:', prevTotal, '→', total);
});

// Update state
store.setState({ user: { name: 'John', email: 'john@example.com' } });
store.setState({ theme: 'dark' }); // Cart listener won't fire
store.setState(state => ({
  cart: { items: [...state.cart.items, 'Product'], total: state.cart.total + 29.99 }
}));
```

### Real-World Examples

| Library/Framework | Observer Usage |
|-------------------|----------------|
| **Node.js** | EventEmitter |
| **React** | useState, Redux |
| **Vue.js** | Reactivity system |
| **RxJS** | Observables |
| **DOM** | addEventListener |

### Interview Questions

**Q: What's the difference between Observer and Pub/Sub?**

**A:**

| Aspect | Observer | Pub/Sub |
|--------|----------|---------|
| **Coupling** | Subject knows observers | Decoupled via message broker |
| **Communication** | Direct | Through channel/topic |
| **Scalability** | Limited | Better for distributed systems |
| **Implementation** | Subject maintains list | Separate mediator/broker |

```javascript
// Observer: Subject knows observers directly
subject.addObserver(observer);
subject.notify(); // Subject calls observer.update()

// Pub/Sub: Through message broker
broker.subscribe('channel', handler);
broker.publish('channel', message); // Broker routes to subscribers
```

---

## Command

### 💡 **Intent**

Encapsulate a request as an object, thereby letting you parameterize clients with different requests, queue or log requests, and support undoable operations.

### Problem It Solves

```
Without Command:
├── Cannot undo/redo operations
├── Cannot queue or schedule operations
├── Hard to implement transaction logging
├── Tight coupling between invoker and receiver
└── Cannot parameterize objects with operations
```

### Structure

```
┌─────────────────┐         ┌─────────────────┐
│     Invoker     │────────▶│    Command      │
├─────────────────┤         ├─────────────────┤
│ + setCommand()  │         │ + execute()     │
│ + executeCommand│         │ + undo()        │
└─────────────────┘         └────────△────────┘
                                     │
                            ┌────────┴────────┐
                            │ConcreteCommand  │
                            ├─────────────────┤
                            │ - receiver      │
                            │ + execute()     │───▶ receiver.action()
                            │ + undo()        │
                            └─────────────────┘
```

### Implementation

**Text Editor with Undo/Redo:**

```javascript
// Command interface
class Command {
  execute() {
    throw new Error('execute must be implemented');
  }

  undo() {
    throw new Error('undo must be implemented');
  }
}

// Receiver
class TextEditor {
  constructor() {
    this.content = '';
    this.clipboard = '';
  }

  getContent() {
    return this.content;
  }

  setContent(content) {
    this.content = content;
  }

  insertText(position, text) {
    this.content =
      this.content.slice(0, position) +
      text +
      this.content.slice(position);
  }

  deleteText(position, length) {
    const deleted = this.content.slice(position, position + length);
    this.content =
      this.content.slice(0, position) +
      this.content.slice(position + length);
    return deleted;
  }

  copy(start, end) {
    this.clipboard = this.content.slice(start, end);
  }

  paste(position) {
    this.insertText(position, this.clipboard);
  }
}

// Concrete commands
class InsertCommand extends Command {
  constructor(editor, position, text) {
    super();
    this.editor = editor;
    this.position = position;
    this.text = text;
  }

  execute() {
    this.editor.insertText(this.position, this.text);
  }

  undo() {
    this.editor.deleteText(this.position, this.text.length);
  }
}

class DeleteCommand extends Command {
  constructor(editor, position, length) {
    super();
    this.editor = editor;
    this.position = position;
    this.length = length;
    this.deletedText = '';
  }

  execute() {
    this.deletedText = this.editor.deleteText(this.position, this.length);
  }

  undo() {
    this.editor.insertText(this.position, this.deletedText);
  }
}

class ReplaceCommand extends Command {
  constructor(editor, position, length, newText) {
    super();
    this.editor = editor;
    this.position = position;
    this.length = length;
    this.newText = newText;
    this.oldText = '';
  }

  execute() {
    this.oldText = this.editor.content.slice(this.position, this.position + this.length);
    this.editor.deleteText(this.position, this.length);
    this.editor.insertText(this.position, this.newText);
  }

  undo() {
    this.editor.deleteText(this.position, this.newText.length);
    this.editor.insertText(this.position, this.oldText);
  }
}

// Invoker
class EditorHistory {
  constructor(editor) {
    this.editor = editor;
    this.undoStack = [];
    this.redoStack = [];
  }

  execute(command) {
    command.execute();
    this.undoStack.push(command);
    this.redoStack = []; // Clear redo stack on new action
    console.log(`Executed. Content: "${this.editor.getContent()}"`);
  }

  undo() {
    if (this.undoStack.length === 0) {
      console.log('Nothing to undo');
      return;
    }

    const command = this.undoStack.pop();
    command.undo();
    this.redoStack.push(command);
    console.log(`Undone. Content: "${this.editor.getContent()}"`);
  }

  redo() {
    if (this.redoStack.length === 0) {
      console.log('Nothing to redo');
      return;
    }

    const command = this.redoStack.pop();
    command.execute();
    this.undoStack.push(command);
    console.log(`Redone. Content: "${this.editor.getContent()}"`);
  }
}

// Usage
const editor = new TextEditor();
const history = new EditorHistory(editor);

history.execute(new InsertCommand(editor, 0, 'Hello'));
// Executed. Content: "Hello"

history.execute(new InsertCommand(editor, 5, ' World'));
// Executed. Content: "Hello World"

history.execute(new DeleteCommand(editor, 5, 6));
// Executed. Content: "Hello"

history.undo();
// Undone. Content: "Hello World"

history.undo();
// Undone. Content: "Hello"

history.redo();
// Redone. Content: "Hello World"

history.execute(new ReplaceCommand(editor, 6, 5, 'JavaScript'));
// Executed. Content: "Hello JavaScript"
```

**Task Queue:**

```typescript
interface Task {
  execute(): Promise<void>;
  getName(): string;
}

class SendEmailTask implements Task {
  constructor(private to: string, private subject: string, private body: string) {}

  async execute(): Promise<void> {
    console.log(`Sending email to ${this.to}: ${this.subject}`);
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log(`Email sent to ${this.to}`);
  }

  getName(): string {
    return `SendEmail(${this.to})`;
  }
}

class ProcessPaymentTask implements Task {
  constructor(private orderId: string, private amount: number) {}

  async execute(): Promise<void> {
    console.log(`Processing payment for order ${this.orderId}: $${this.amount}`);
    await new Promise(resolve => setTimeout(resolve, 200));
    console.log(`Payment processed for order ${this.orderId}`);
  }

  getName(): string {
    return `ProcessPayment(${this.orderId})`;
  }
}

class GenerateReportTask implements Task {
  constructor(private reportType: string) {}

  async execute(): Promise<void> {
    console.log(`Generating ${this.reportType} report...`);
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log(`${this.reportType} report generated`);
  }

  getName(): string {
    return `GenerateReport(${this.reportType})`;
  }
}

// Command queue processor
class TaskQueue {
  private queue: Task[] = [];
  private processing = false;
  private concurrency: number;
  private activeCount = 0;

  constructor(concurrency = 2) {
    this.concurrency = concurrency;
  }

  add(task: Task): void {
    this.queue.push(task);
    console.log(`Task added: ${task.getName()}. Queue size: ${this.queue.length}`);
    this.process();
  }

  private async process(): Promise<void> {
    while (this.queue.length > 0 && this.activeCount < this.concurrency) {
      const task = this.queue.shift()!;
      this.activeCount++;

      console.log(`Starting: ${task.getName()}`);

      task.execute()
        .then(() => {
          console.log(`Completed: ${task.getName()}`);
        })
        .catch(err => {
          console.error(`Failed: ${task.getName()}`, err);
        })
        .finally(() => {
          this.activeCount--;
          this.process(); // Process next
        });
    }
  }
}

// Usage
const queue = new TaskQueue(2);

queue.add(new SendEmailTask('user@example.com', 'Welcome', 'Welcome to our platform!'));
queue.add(new ProcessPaymentTask('ORD-001', 99.99));
queue.add(new GenerateReportTask('Monthly Sales'));
queue.add(new SendEmailTask('admin@example.com', 'Report Ready', 'Monthly report is ready'));
```

### Pros and Cons

**Pros:**
- ✅ Decouple invoker from receiver
- ✅ Implement undo/redo
- ✅ Implement deferred execution
- ✅ Assemble commands into composite commands

**Cons:**
- ❌ Increases complexity with many command classes
- ❌ Can be overkill for simple operations

---

## State

### 💡 **Intent**

Allow an object to **alter its behavior when its internal state changes**. The object will appear to change its class.

### Problem It Solves

```
Without State:
├── Large switch/if-else for state-dependent behavior
├── State transitions scattered throughout code
├── Hard to add new states
├── Difficult to understand state machine
└── Code duplication across states
```

### Implementation

**Order State Machine:**

```javascript
// State interface
class OrderState {
  constructor(order) {
    this.order = order;
  }

  pay() {
    throw new Error('Cannot pay in current state');
  }

  ship() {
    throw new Error('Cannot ship in current state');
  }

  deliver() {
    throw new Error('Cannot deliver in current state');
  }

  cancel() {
    throw new Error('Cannot cancel in current state');
  }

  getStatus() {
    throw new Error('getStatus must be implemented');
  }
}

// Concrete states
class PendingState extends OrderState {
  getStatus() {
    return 'pending';
  }

  pay() {
    console.log('Processing payment...');
    this.order.setState(new PaidState(this.order));
    console.log('Payment successful. Order is now paid.');
  }

  cancel() {
    console.log('Cancelling pending order...');
    this.order.setState(new CancelledState(this.order));
    console.log('Order cancelled.');
  }
}

class PaidState extends OrderState {
  getStatus() {
    return 'paid';
  }

  ship() {
    console.log('Preparing shipment...');
    this.order.setState(new ShippedState(this.order));
    console.log('Order shipped.');
  }

  cancel() {
    console.log('Processing refund...');
    this.order.setState(new CancelledState(this.order));
    console.log('Order cancelled and refunded.');
  }
}

class ShippedState extends OrderState {
  getStatus() {
    return 'shipped';
  }

  deliver() {
    console.log('Confirming delivery...');
    this.order.setState(new DeliveredState(this.order));
    console.log('Order delivered.');
  }

  // Cannot cancel shipped orders
  cancel() {
    throw new Error('Cannot cancel shipped orders. Please request a return after delivery.');
  }
}

class DeliveredState extends OrderState {
  getStatus() {
    return 'delivered';
  }

  // Cannot do anything in delivered state
  pay() {
    throw new Error('Order already delivered');
  }

  ship() {
    throw new Error('Order already delivered');
  }

  deliver() {
    throw new Error('Order already delivered');
  }

  cancel() {
    throw new Error('Cannot cancel delivered orders. Please initiate a return.');
  }
}

class CancelledState extends OrderState {
  getStatus() {
    return 'cancelled';
  }

  pay() {
    throw new Error('Cannot pay for cancelled order');
  }

  ship() {
    throw new Error('Cannot ship cancelled order');
  }

  cancel() {
    throw new Error('Order already cancelled');
  }
}

// Context
class Order {
  constructor(id, items) {
    this.id = id;
    this.items = items;
    this.state = new PendingState(this);
  }

  setState(state) {
    console.log(`Order ${this.id}: ${this.state.getStatus()} → ${state.getStatus()}`);
    this.state = state;
  }

  getStatus() {
    return this.state.getStatus();
  }

  // Delegate to current state
  pay() {
    this.state.pay();
  }

  ship() {
    this.state.ship();
  }

  deliver() {
    this.state.deliver();
  }

  cancel() {
    this.state.cancel();
  }
}

// Usage
console.log('=== Order Lifecycle ===\n');

const order1 = new Order('ORD-001', ['Product A', 'Product B']);
console.log(`Initial status: ${order1.getStatus()}\n`);

order1.pay();
// Order ORD-001: pending → paid
// Payment successful.

console.log();
order1.ship();
// Order ORD-001: paid → shipped
// Order shipped.

console.log();
order1.deliver();
// Order ORD-001: shipped → delivered
// Order delivered.

console.log('\n=== Cancelled Order ===\n');

const order2 = new Order('ORD-002', ['Product C']);
order2.pay();
console.log();

try {
  order2.cancel(); // After payment, before shipping
} catch (e) {
  console.error('Error:', e.message);
}

console.log('\n=== Invalid Transition ===\n');

const order3 = new Order('ORD-003', ['Product D']);
try {
  order3.ship(); // Cannot ship without paying
} catch (e) {
  console.error('Error:', e.message);
}
```

**TypeScript Traffic Light:**

```typescript
interface TrafficLightState {
  display(): string;
  next(light: TrafficLight): void;
  canGo(): boolean;
}

class RedState implements TrafficLightState {
  display(): string {
    return '🔴 RED - STOP';
  }

  next(light: TrafficLight): void {
    light.setState(new GreenState());
  }

  canGo(): boolean {
    return false;
  }
}

class GreenState implements TrafficLightState {
  display(): string {
    return '🟢 GREEN - GO';
  }

  next(light: TrafficLight): void {
    light.setState(new YellowState());
  }

  canGo(): boolean {
    return true;
  }
}

class YellowState implements TrafficLightState {
  display(): string {
    return '🟡 YELLOW - CAUTION';
  }

  next(light: TrafficLight): void {
    light.setState(new RedState());
  }

  canGo(): boolean {
    return false; // Should stop if possible
  }
}

class TrafficLight {
  private state: TrafficLightState;

  constructor() {
    this.state = new RedState();
  }

  setState(state: TrafficLightState): void {
    this.state = state;
  }

  display(): string {
    return this.state.display();
  }

  next(): void {
    this.state.next(this);
  }

  canGo(): boolean {
    return this.state.canGo();
  }
}

// Usage
const light = new TrafficLight();

for (let i = 0; i < 6; i++) {
  console.log(light.display(), `- Can go: ${light.canGo()}`);
  light.next();
}
```

### Interview Questions

**Q: What's the difference between State and Strategy?**

**A:**

| Aspect | State | Strategy |
|--------|-------|----------|
| **Purpose** | Manage state transitions | Swap algorithms |
| **Who decides** | States decide next state | Client sets strategy |
| **Awareness** | States know about each other | Strategies independent |
| **Change frequency** | Changes automatically | Changed by client |
| **Represents** | Lifecycle/workflow | Algorithm choice |

---

## Template Method

### 💡 **Intent**

Define the **skeleton of an algorithm** in an operation, deferring some steps to subclasses. Template Method lets subclasses redefine certain steps of an algorithm without changing its structure.

### Implementation

```javascript
// Abstract class with template method
class DataMiner {
  // Template method - defines the algorithm skeleton
  mine(path) {
    console.log('\n=== Starting Data Mining ===');

    const file = this.openFile(path);
    const rawData = this.extractData(file);
    const data = this.parseData(rawData);

    const analysis = this.analyzeData(data); // Hook - can be overridden
    const report = this.generateReport(analysis);

    this.sendReport(report); // Hook - optional step
    this.closeFile(file);

    console.log('=== Data Mining Complete ===\n');
    return report;
  }

  // Abstract methods - must be implemented
  openFile(path) {
    throw new Error('openFile must be implemented');
  }

  extractData(file) {
    throw new Error('extractData must be implemented');
  }

  parseData(data) {
    throw new Error('parseData must be implemented');
  }

  closeFile(file) {
    throw new Error('closeFile must be implemented');
  }

  // Hook methods - optional override
  analyzeData(data) {
    console.log('Analyzing data...');
    return { count: data.length, data };
  }

  generateReport(analysis) {
    console.log('Generating report...');
    return `Report: ${analysis.count} records processed`;
  }

  sendReport(report) {
    // Default: do nothing - hook method
  }
}

// Concrete implementations
class CSVDataMiner extends DataMiner {
  openFile(path) {
    console.log(`Opening CSV file: ${path}`);
    return { path, type: 'csv', content: 'name,age,city\nJohn,30,NYC\nJane,25,LA' };
  }

  extractData(file) {
    console.log('Extracting CSV data...');
    return file.content;
  }

  parseData(data) {
    console.log('Parsing CSV data...');
    const lines = data.split('\n');
    const headers = lines[0].split(',');
    return lines.slice(1).map(line => {
      const values = line.split(',');
      return headers.reduce((obj, header, i) => {
        obj[header] = values[i];
        return obj;
      }, {});
    });
  }

  closeFile(file) {
    console.log(`Closing CSV file: ${file.path}`);
  }
}

class JSONDataMiner extends DataMiner {
  openFile(path) {
    console.log(`Opening JSON file: ${path}`);
    return {
      path,
      type: 'json',
      content: '[{"name":"John","age":30},{"name":"Jane","age":25}]'
    };
  }

  extractData(file) {
    console.log('Extracting JSON data...');
    return file.content;
  }

  parseData(data) {
    console.log('Parsing JSON data...');
    return JSON.parse(data);
  }

  closeFile(file) {
    console.log(`Closing JSON file: ${file.path}`);
  }

  // Override hook to add custom analysis
  analyzeData(data) {
    console.log('Performing advanced JSON analysis...');
    const avgAge = data.reduce((sum, p) => sum + p.age, 0) / data.length;
    return { count: data.length, averageAge: avgAge, data };
  }

  // Override hook to send report
  sendReport(report) {
    console.log(`Sending report via email: ${report}`);
  }
}

// Usage
const csvMiner = new CSVDataMiner();
csvMiner.mine('data.csv');

const jsonMiner = new JSONDataMiner();
jsonMiner.mine('data.json');
```

---

## Chain of Responsibility

### 💡 **Intent**

Avoid coupling the sender of a request to its receiver by giving more than one object a chance to handle the request. Chain the receiving objects and pass the request along the chain until an object handles it.

### Implementation

**HTTP Middleware Chain:**

```javascript
// Handler interface
class Middleware {
  constructor() {
    this.next = null;
  }

  setNext(middleware) {
    this.next = middleware;
    return middleware;
  }

  handle(request, response) {
    if (this.next) {
      return this.next.handle(request, response);
    }
    return null;
  }
}

// Concrete handlers
class LoggingMiddleware extends Middleware {
  handle(request, response) {
    const start = Date.now();
    console.log(`[${new Date().toISOString()}] ${request.method} ${request.url}`);

    const result = super.handle(request, response);

    console.log(`[${new Date().toISOString()}] Completed in ${Date.now() - start}ms`);
    return result;
  }
}

class AuthMiddleware extends Middleware {
  handle(request, response) {
    const token = request.headers?.authorization;

    if (!token) {
      console.log('Auth: No token provided');
      response.status = 401;
      response.body = { error: 'Unauthorized' };
      return response; // Stop chain
    }

    if (!this.validateToken(token)) {
      console.log('Auth: Invalid token');
      response.status = 403;
      response.body = { error: 'Forbidden' };
      return response; // Stop chain
    }

    console.log('Auth: Token valid');
    request.user = { id: 1, name: 'John' };
    return super.handle(request, response);
  }

  validateToken(token) {
    return token === 'Bearer valid-token';
  }
}

class RateLimitMiddleware extends Middleware {
  constructor(limit = 100) {
    super();
    this.limit = limit;
    this.requests = new Map();
  }

  handle(request, response) {
    const ip = request.ip || 'unknown';
    const count = this.requests.get(ip) || 0;

    if (count >= this.limit) {
      console.log(`RateLimit: Too many requests from ${ip}`);
      response.status = 429;
      response.body = { error: 'Too many requests' };
      return response;
    }

    this.requests.set(ip, count + 1);
    console.log(`RateLimit: ${count + 1}/${this.limit} requests from ${ip}`);

    return super.handle(request, response);
  }
}

class ValidationMiddleware extends Middleware {
  constructor(rules) {
    super();
    this.rules = rules;
  }

  handle(request, response) {
    const errors = [];

    for (const [field, rule] of Object.entries(this.rules)) {
      if (rule.required && !request.body?.[field]) {
        errors.push(`${field} is required`);
      }
    }

    if (errors.length > 0) {
      console.log('Validation: Failed -', errors);
      response.status = 400;
      response.body = { errors };
      return response;
    }

    console.log('Validation: Passed');
    return super.handle(request, response);
  }
}

class FinalHandler extends Middleware {
  constructor(handler) {
    super();
    this.handler = handler;
  }

  handle(request, response) {
    return this.handler(request, response);
  }
}

// Build chain
const createChain = (handler) => {
  const logging = new LoggingMiddleware();
  const rateLimit = new RateLimitMiddleware(10);
  const auth = new AuthMiddleware();
  const validation = new ValidationMiddleware({
    name: { required: true },
    email: { required: true }
  });
  const final = new FinalHandler(handler);

  // Chain: logging -> rateLimit -> auth -> validation -> handler
  logging
    .setNext(rateLimit)
    .setNext(auth)
    .setNext(validation)
    .setNext(final);

  return logging;
};

// Usage
const handler = (req, res) => {
  console.log('Handler: Processing request');
  res.status = 200;
  res.body = { success: true, user: req.user, data: req.body };
  return res;
};

const chain = createChain(handler);

console.log('\n=== Valid Request ===');
const validRequest = {
  method: 'POST',
  url: '/api/users',
  headers: { authorization: 'Bearer valid-token' },
  body: { name: 'John', email: 'john@example.com' },
  ip: '192.168.1.1'
};
let response = { status: null, body: null };
chain.handle(validRequest, response);
console.log('Response:', response);

console.log('\n=== Unauthorized Request ===');
const noAuthRequest = {
  method: 'POST',
  url: '/api/users',
  headers: {},
  body: { name: 'John' },
  ip: '192.168.1.2'
};
response = { status: null, body: null };
chain.handle(noAuthRequest, response);
console.log('Response:', response);

console.log('\n=== Validation Failed Request ===');
const invalidRequest = {
  method: 'POST',
  url: '/api/users',
  headers: { authorization: 'Bearer valid-token' },
  body: { name: 'John' }, // Missing email
  ip: '192.168.1.3'
};
response = { status: null, body: null };
chain.handle(invalidRequest, response);
console.log('Response:', response);
```

---

## Summary: Choosing the Right Behavioral Pattern

| Need | Pattern | Key Idea |
|------|---------|----------|
| Swap algorithms | **Strategy** | Encapsulate algorithm family |
| React to state changes | **Observer** | Publish/subscribe |
| Undo/redo operations | **Command** | Encapsulate requests |
| State-dependent behavior | **State** | Delegate to state objects |
| Algorithm skeleton | **Template Method** | Abstract steps in superclass |
| Process handlers | **Chain of Responsibility** | Pass along handler chain |

### Quick Decision Guide

```
"I need to..."

├── Allow switching between algorithms
│   └── Strategy
│
├── Notify multiple objects of changes
│   └── Observer
│
├── Queue, log, or undo operations
│   └── Command
│
├── Handle different states differently
│   └── State
│
├── Define algorithm with customizable steps
│   └── Template Method
│
└── Process request through multiple handlers
    └── Chain of Responsibility
```

---

**Next:** [Architectural Patterns →](./04-architectural-patterns.md)

---

[← Structural Patterns](./02-structural-patterns.md) | [Back to Design Patterns](./README.md)
