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

```typescript
interface ValidationResult {
  valid: boolean;
  error?: string;
}

interface PaymentResult {
  success: boolean;
  transactionId: string;
  method: string;
  amount: number;
  cryptoAmount?: string;
}

// Strategy interface
interface PaymentStrategy {
  pay(amount: number): PaymentResult;
  validate(): ValidationResult;
}

// Concrete strategies
class CreditCardStrategy implements PaymentStrategy {
  private cardNumber: string;
  private cvv: string;
  private expiry: string;

  constructor(cardNumber: string, cvv: string, expiry: string) {
    this.cardNumber = cardNumber;
    this.cvv = cvv;
    this.expiry = expiry;
  }

  validate(): ValidationResult {
    if (!/^\d{16}$/.test(this.cardNumber)) {
      return { valid: false, error: 'Invalid card number' };
    }
    if (!/^\d{3,4}$/.test(this.cvv)) {
      return { valid: false, error: 'Invalid CVV' };
    }
    return { valid: true };
  }

  pay(amount: number): PaymentResult {
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

class PayPalStrategy implements PaymentStrategy {
  private email: string;

  constructor(email: string) {
    this.email = email;
  }

  validate(): ValidationResult {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
      return { valid: false, error: 'Invalid email' };
    }
    return { valid: true };
  }

  pay(amount: number): PaymentResult {
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

type CryptoCurrency = 'BTC' | 'ETH';

class CryptoStrategy implements PaymentStrategy {
  private walletAddress: string;
  private currency: CryptoCurrency;

  constructor(walletAddress: string, currency: CryptoCurrency = 'BTC') {
    this.walletAddress = walletAddress;
    this.currency = currency;
  }

  validate(): ValidationResult {
    if (!this.walletAddress || this.walletAddress.length < 26) {
      return { valid: false, error: 'Invalid wallet address' };
    }
    return { valid: true };
  }

  pay(amount: number): PaymentResult {
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

  private convertToCrypto(usdAmount: number): string {
    const rates: Record<CryptoCurrency, number> = { BTC: 0.000024, ETH: 0.00042 };
    return (usdAmount * (rates[this.currency] || 0.001)).toFixed(8);
  }
}

// Context
class PaymentProcessor {
  private strategy: PaymentStrategy | null = null;

  setStrategy(strategy: PaymentStrategy): void {
    this.strategy = strategy;
  }

  checkout(amount: number): PaymentResult {
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

```typescript
// Simple: if-else is fine
function formatDate(date: Date, format: 'short' | 'long' | 'iso'): string {
  if (format === 'short') return date.toLocaleDateString();
  if (format === 'long') return date.toDateString();
  return date.toISOString();
}

// Complex: Strategy is better
interface CompressionStrategy {
  compress(data: Buffer): Buffer;
}
class GzipStrategy implements CompressionStrategy { compress(data: Buffer): Buffer { return data; /* complex implementation */ } }
class BrotliStrategy implements CompressionStrategy { compress(data: Buffer): Buffer { return data; /* complex implementation */ } }
class LZ4Strategy implements CompressionStrategy { compress(data: Buffer): Buffer { return data; /* complex implementation */ } }
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

```typescript
type EventListener<T = unknown> = (...args: T[]) => void;

class EventEmitter {
  private events: Map<string, EventListener<unknown>[]> = new Map();

  on<T = unknown>(event: string, listener: EventListener<T>): this {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(listener as EventListener<unknown>);
    return this; // Allow chaining
  }

  off<T = unknown>(event: string, listener: EventListener<T>): this {
    if (!this.events.has(event)) return this;

    const listeners = this.events.get(event)!;
    const index = listeners.indexOf(listener as EventListener<unknown>);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
    return this;
  }

  once<T = unknown>(event: string, listener: EventListener<T>): this {
    const wrapper: EventListener<unknown> = (...args: unknown[]) => {
      (listener as EventListener<unknown>)(...args);
      this.off(event, wrapper);
    };
    return this.on(event, wrapper);
  }

  emit(event: string, ...args: unknown[]): boolean {
    if (!this.events.has(event)) return false;

    const listeners = this.events.get(event)!;
    listeners.forEach(listener => {
      try {
        listener(...args);
      } catch (error) {
        console.error(`Error in ${event} listener:`, error);
      }
    });
    return true;
  }

  listenerCount(event: string): number {
    return this.events.get(event)?.length || 0;
  }
}

// Usage
interface UserCreatedPayload {
  id: number;
  name: string;
  email: string;
}

const emitter = new EventEmitter();

// Subscribe to events
emitter.on<UserCreatedPayload>('user:created', (user) => {
  console.log('Send welcome email to:', user.email);
});

emitter.on<UserCreatedPayload>('user:created', (user) => {
  console.log('Initialize user preferences for:', user.id);
});

emitter.on<UserCreatedPayload>('user:created', (user) => {
  console.log('Add to newsletter:', user.email);
});

// One-time listener
emitter.once<UserCreatedPayload>('user:firstLogin', (user) => {
  console.log('Show onboarding tutorial to:', user.name);
});

// Emit events
emitter.emit('user:created', { id: 1, name: 'John', email: 'john@example.com' });
// Send welcome email to: john@example.com
// Initialize user preferences for: 1
// Add to newsletter: john@example.com
```

**Stock Price Observer:**

```typescript
interface PriceUpdate {
  symbol: string;
  price: number;
  oldPrice: number;
  change: string;
  direction: string;
}

interface StockObserver {
  name: string;
  update(data: PriceUpdate): void;
}

// Subject
class StockTicker {
  private symbol: string;
  private price: number = 0;
  private observers: Set<StockObserver> = new Set();

  constructor(symbol: string) {
    this.symbol = symbol;
  }

  subscribe(observer: StockObserver): void {
    this.observers.add(observer);
    console.log(`${observer.name} subscribed to ${this.symbol}`);
  }

  unsubscribe(observer: StockObserver): void {
    this.observers.delete(observer);
    console.log(`${observer.name} unsubscribed from ${this.symbol}`);
  }

  setPrice(price: number): void {
    const oldPrice = this.price;
    this.price = price;

    if (oldPrice !== price) {
      this.notify(oldPrice);
    }
  }

  private notify(oldPrice: number): void {
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
class PriceAlert implements StockObserver {
  public name: string;
  private threshold: number;
  private direction: 'above' | 'below';

  constructor(name: string, threshold: number, direction: 'above' | 'below') {
    this.name = name;
    this.threshold = threshold;
    this.direction = direction;
  }

  update(data: PriceUpdate): void {
    const shouldAlert =
      (this.direction === 'above' && data.price > this.threshold) ||
      (this.direction === 'below' && data.price < this.threshold);

    if (shouldAlert) {
      console.log(`🚨 ${this.name}: ${data.symbol} is ${this.direction} $${this.threshold}! Current: $${data.price}`);
    }
  }
}

class PriceLogger implements StockObserver {
  public name: string;

  constructor(name: string) {
    this.name = name;
  }

  update(data: PriceUpdate): void {
    console.log(`[${this.name}] ${data.symbol}: $${data.oldPrice} → $${data.price} (${data.direction} ${data.change})`);
  }
}

class TradingBot implements StockObserver {
  public name: string;
  private buyThreshold: number;
  private sellThreshold: number;
  private position: number = 0;

  constructor(name: string, buyThreshold: number, sellThreshold: number) {
    this.name = name;
    this.buyThreshold = buyThreshold;
    this.sellThreshold = sellThreshold;
  }

  update(data: PriceUpdate): void {
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
  private selectorListeners: Map<Selector<T, unknown>, Set<Listener<unknown>>> = new Map();

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
    this.selectorListeners.get(selector)!.add(listener as Listener<unknown>);

    return () => {
      this.selectorListeners.get(selector)?.delete(listener as Listener<unknown>);
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
interface CartState {
  items: string[];
  total: number;
}

interface AppState {
  user: { name: string; email: string } | null;
  cart: CartState;
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

```typescript
// Observer: Subject knows observers directly
interface Observer { update(): void; }
class Subject {
  private observers: Observer[] = [];
  addObserver(observer: Observer): void { this.observers.push(observer); }
  notify(): void { this.observers.forEach(o => o.update()); } // Subject calls observer.update()
}

// Pub/Sub: Through message broker
type Handler = (message: unknown) => void;
class Broker {
  private subscribers: Map<string, Handler[]> = new Map();
  subscribe(channel: string, handler: Handler): void {
    if (!this.subscribers.has(channel)) this.subscribers.set(channel, []);
    this.subscribers.get(channel)!.push(handler);
  }
  publish(channel: string, message: unknown): void {
    this.subscribers.get(channel)?.forEach(h => h(message)); // Broker routes to subscribers
  }
}
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

```typescript
// Command interface
interface Command {
  execute(): void;
  undo(): void;
}

// Receiver
class TextEditor {
  private content: string = '';
  private clipboard: string = '';

  getContent(): string {
    return this.content;
  }

  setContent(content: string): void {
    this.content = content;
  }

  insertText(position: number, text: string): void {
    this.content =
      this.content.slice(0, position) +
      text +
      this.content.slice(position);
  }

  deleteText(position: number, length: number): string {
    const deleted = this.content.slice(position, position + length);
    this.content =
      this.content.slice(0, position) +
      this.content.slice(position + length);
    return deleted;
  }

  copy(start: number, end: number): void {
    this.clipboard = this.content.slice(start, end);
  }

  paste(position: number): void {
    this.insertText(position, this.clipboard);
  }
}

// Concrete commands
class InsertCommand implements Command {
  private editor: TextEditor;
  private position: number;
  private text: string;

  constructor(editor: TextEditor, position: number, text: string) {
    this.editor = editor;
    this.position = position;
    this.text = text;
  }

  execute(): void {
    this.editor.insertText(this.position, this.text);
  }

  undo(): void {
    this.editor.deleteText(this.position, this.text.length);
  }
}

class DeleteCommand implements Command {
  private editor: TextEditor;
  private position: number;
  private length: number;
  private deletedText: string = '';

  constructor(editor: TextEditor, position: number, length: number) {
    this.editor = editor;
    this.position = position;
    this.length = length;
  }

  execute(): void {
    this.deletedText = this.editor.deleteText(this.position, this.length);
  }

  undo(): void {
    this.editor.insertText(this.position, this.deletedText);
  }
}

class ReplaceCommand implements Command {
  private editor: TextEditor;
  private position: number;
  private length: number;
  private newText: string;
  private oldText: string = '';

  constructor(editor: TextEditor, position: number, length: number, newText: string) {
    this.editor = editor;
    this.position = position;
    this.length = length;
    this.newText = newText;
  }

  execute(): void {
    this.oldText = this.editor.getContent().slice(this.position, this.position + this.length);
    this.editor.deleteText(this.position, this.length);
    this.editor.insertText(this.position, this.newText);
  }

  undo(): void {
    this.editor.deleteText(this.position, this.newText.length);
    this.editor.insertText(this.position, this.oldText);
  }
}

// Invoker
class EditorHistory {
  private editor: TextEditor;
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];

  constructor(editor: TextEditor) {
    this.editor = editor;
  }

  execute(command: Command): void {
    command.execute();
    this.undoStack.push(command);
    this.redoStack = []; // Clear redo stack on new action
    console.log(`Executed. Content: "${this.editor.getContent()}"`);
  }

  undo(): void {
    if (this.undoStack.length === 0) {
      console.log('Nothing to undo');
      return;
    }

    const command = this.undoStack.pop()!;
    command.undo();
    this.redoStack.push(command);
    console.log(`Undone. Content: "${this.editor.getContent()}"`);
  }

  redo(): void {
    if (this.redoStack.length === 0) {
      console.log('Nothing to redo');
      return;
    }

    const command = this.redoStack.pop()!;
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

  constructor(concurrency: number = 2) {
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

```typescript
type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';

// State interface
interface OrderState {
  pay(): void;
  ship(): void;
  deliver(): void;
  cancel(): void;
  getStatus(): OrderStatus;
}

// Forward declaration for Order class
class Order {
  public id: string;
  public items: string[];
  private state: OrderState;

  constructor(id: string, items: string[]) {
    this.id = id;
    this.items = items;
    this.state = new PendingState(this);
  }

  setState(state: OrderState): void {
    console.log(`Order ${this.id}: ${this.state.getStatus()} → ${state.getStatus()}`);
    this.state = state;
  }

  getStatus(): OrderStatus {
    return this.state.getStatus();
  }

  // Delegate to current state
  pay(): void { this.state.pay(); }
  ship(): void { this.state.ship(); }
  deliver(): void { this.state.deliver(); }
  cancel(): void { this.state.cancel(); }
}

// Concrete states
class PendingState implements OrderState {
  constructor(private order: Order) {}

  getStatus(): OrderStatus { return 'pending'; }

  pay(): void {
    console.log('Processing payment...');
    this.order.setState(new PaidState(this.order));
    console.log('Payment successful. Order is now paid.');
  }

  ship(): void { throw new Error('Cannot ship in current state'); }
  deliver(): void { throw new Error('Cannot deliver in current state'); }

  cancel(): void {
    console.log('Cancelling pending order...');
    this.order.setState(new CancelledState(this.order));
    console.log('Order cancelled.');
  }
}

class PaidState implements OrderState {
  constructor(private order: Order) {}

  getStatus(): OrderStatus { return 'paid'; }

  pay(): void { throw new Error('Cannot pay in current state'); }

  ship(): void {
    console.log('Preparing shipment...');
    this.order.setState(new ShippedState(this.order));
    console.log('Order shipped.');
  }

  deliver(): void { throw new Error('Cannot deliver in current state'); }

  cancel(): void {
    console.log('Processing refund...');
    this.order.setState(new CancelledState(this.order));
    console.log('Order cancelled and refunded.');
  }
}

class ShippedState implements OrderState {
  constructor(private order: Order) {}

  getStatus(): OrderStatus { return 'shipped'; }

  pay(): void { throw new Error('Cannot pay in current state'); }
  ship(): void { throw new Error('Cannot ship in current state'); }

  deliver(): void {
    console.log('Confirming delivery...');
    this.order.setState(new DeliveredState(this.order));
    console.log('Order delivered.');
  }

  // Cannot cancel shipped orders
  cancel(): void {
    throw new Error('Cannot cancel shipped orders. Please request a return after delivery.');
  }
}

class DeliveredState implements OrderState {
  constructor(private order: Order) {}

  getStatus(): OrderStatus { return 'delivered'; }

  // Cannot do anything in delivered state
  pay(): void { throw new Error('Order already delivered'); }
  ship(): void { throw new Error('Order already delivered'); }
  deliver(): void { throw new Error('Order already delivered'); }
  cancel(): void { throw new Error('Cannot cancel delivered orders. Please initiate a return.'); }
}

class CancelledState implements OrderState {
  constructor(private order: Order) {}

  getStatus(): OrderStatus { return 'cancelled'; }

  pay(): void { throw new Error('Cannot pay for cancelled order'); }
  ship(): void { throw new Error('Cannot ship cancelled order'); }
  deliver(): void { throw new Error('Cannot deliver cancelled order'); }
  cancel(): void { throw new Error('Order already cancelled'); }
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
  console.error('Error:', (e as Error).message);
}

console.log('\n=== Invalid Transition ===\n');

const order3 = new Order('ORD-003', ['Product D']);
try {
  order3.ship(); // Cannot ship without paying
} catch (e) {
  console.error('Error:', (e as Error).message);
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

```typescript
interface ParsedFile {
  path: string;
  type: string;
  content: string;
}

interface DataRecord {
  [key: string]: string | number;
}

interface AnalysisResult {
  count: number;
  data: DataRecord[];
  averageAge?: number;
}

// Abstract class with template method
abstract class DataMiner {
  // Template method - defines the algorithm skeleton
  mine(path: string): string {
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
  protected abstract openFile(path: string): ParsedFile;
  protected abstract extractData(file: ParsedFile): string;
  protected abstract parseData(data: string): DataRecord[];
  protected abstract closeFile(file: ParsedFile): void;

  // Hook methods - optional override
  protected analyzeData(data: DataRecord[]): AnalysisResult {
    console.log('Analyzing data...');
    return { count: data.length, data };
  }

  protected generateReport(analysis: AnalysisResult): string {
    console.log('Generating report...');
    return `Report: ${analysis.count} records processed`;
  }

  protected sendReport(report: string): void {
    // Default: do nothing - hook method
  }
}

// Concrete implementations
class CSVDataMiner extends DataMiner {
  protected openFile(path: string): ParsedFile {
    console.log(`Opening CSV file: ${path}`);
    return { path, type: 'csv', content: 'name,age,city\nJohn,30,NYC\nJane,25,LA' };
  }

  protected extractData(file: ParsedFile): string {
    console.log('Extracting CSV data...');
    return file.content;
  }

  protected parseData(data: string): DataRecord[] {
    console.log('Parsing CSV data...');
    const lines = data.split('\n');
    const headers = lines[0].split(',');
    return lines.slice(1).map(line => {
      const values = line.split(',');
      return headers.reduce<DataRecord>((obj, header, i) => {
        obj[header] = values[i];
        return obj;
      }, {});
    });
  }

  protected closeFile(file: ParsedFile): void {
    console.log(`Closing CSV file: ${file.path}`);
  }
}

class JSONDataMiner extends DataMiner {
  protected openFile(path: string): ParsedFile {
    console.log(`Opening JSON file: ${path}`);
    return {
      path,
      type: 'json',
      content: '[{"name":"John","age":30},{"name":"Jane","age":25}]'
    };
  }

  protected extractData(file: ParsedFile): string {
    console.log('Extracting JSON data...');
    return file.content;
  }

  protected parseData(data: string): DataRecord[] {
    console.log('Parsing JSON data...');
    return JSON.parse(data) as DataRecord[];
  }

  protected closeFile(file: ParsedFile): void {
    console.log(`Closing JSON file: ${file.path}`);
  }

  // Override hook to add custom analysis
  protected analyzeData(data: DataRecord[]): AnalysisResult {
    console.log('Performing advanced JSON analysis...');
    const avgAge = data.reduce((sum, p) => sum + (p.age as number), 0) / data.length;
    return { count: data.length, averageAge: avgAge, data };
  }

  // Override hook to send report
  protected sendReport(report: string): void {
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

```typescript
interface HttpRequest {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
  ip?: string;
  user?: { id: number; name: string };
}

interface HttpResponse {
  status: number | null;
  body: unknown;
}

type RequestHandlerFn = (req: HttpRequest, res: HttpResponse) => HttpResponse;

// Handler interface
abstract class Middleware {
  protected next: Middleware | null = null;

  setNext(middleware: Middleware): Middleware {
    this.next = middleware;
    return middleware;
  }

  handle(request: HttpRequest, response: HttpResponse): HttpResponse | null {
    if (this.next) {
      return this.next.handle(request, response);
    }
    return null;
  }
}

// Concrete handlers
class LoggingMiddleware extends Middleware {
  handle(request: HttpRequest, response: HttpResponse): HttpResponse | null {
    const start = Date.now();
    console.log(`[${new Date().toISOString()}] ${request.method} ${request.url}`);

    const result = super.handle(request, response);

    console.log(`[${new Date().toISOString()}] Completed in ${Date.now() - start}ms`);
    return result;
  }
}

class AuthMiddleware extends Middleware {
  handle(request: HttpRequest, response: HttpResponse): HttpResponse | null {
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

  private validateToken(token: string): boolean {
    return token === 'Bearer valid-token';
  }
}

class RateLimitMiddleware extends Middleware {
  private limit: number;
  private requests: Map<string, number>;

  constructor(limit: number = 100) {
    super();
    this.limit = limit;
    this.requests = new Map();
  }

  handle(request: HttpRequest, response: HttpResponse): HttpResponse | null {
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

interface ValidationRule {
  required?: boolean;
}

class ValidationMiddleware extends Middleware {
  private rules: Record<string, ValidationRule>;

  constructor(rules: Record<string, ValidationRule>) {
    super();
    this.rules = rules;
  }

  handle(request: HttpRequest, response: HttpResponse): HttpResponse | null {
    const errors: string[] = [];

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
  private handler: RequestHandlerFn;

  constructor(handler: RequestHandlerFn) {
    super();
    this.handler = handler;
  }

  handle(request: HttpRequest, response: HttpResponse): HttpResponse | null {
    return this.handler(request, response);
  }
}

// Build chain
const createChain = (handler: RequestHandlerFn): Middleware => {
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
const handler: RequestHandlerFn = (req: HttpRequest, res: HttpResponse): HttpResponse => {
  console.log('Handler: Processing request');
  res.status = 200;
  res.body = { success: true, user: req.user, data: req.body };
  return res;
};

const chain = createChain(handler);

console.log('\n=== Valid Request ===');
const validRequest: HttpRequest = {
  method: 'POST',
  url: '/api/users',
  headers: { authorization: 'Bearer valid-token' },
  body: { name: 'John', email: 'john@example.com' },
  ip: '192.168.1.1'
};
let response: HttpResponse = { status: null, body: null };
chain.handle(validRequest, response);
console.log('Response:', response);

console.log('\n=== Unauthorized Request ===');
const noAuthRequest: HttpRequest = {
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
const invalidRequest: HttpRequest = {
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
