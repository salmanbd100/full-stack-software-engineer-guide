# Forms & Validation

## Understanding Form Handling in React

Handling forms and validation in React requires understanding controlled components, form state management, and validation strategies that provide excellent user experience.

## Why This Matters

**Interview Perspective:**
- Form handling tested in 90%+ of React interviews
- Controlled vs uncontrolled components is classic interview question
- Validation patterns demonstrate UX and architecture knowledge
- Understanding form libraries shows real-world experience

**Real-World Importance:**
- **User Input**: Every application needs forms
- **Data Quality**: Validation ensures clean data
- **UX**: Real-time feedback improves experience
- **Security**: Client-side validation prevents bad data

## Core Concepts Overview

### Form Data Flow

```
User Types → onChange → Update State → Re-render
     ↑                                      ↓
     └──────── Value from State ────────────┘
```

### Key Principles

| Concept | Description | Why It Matters |
|---------|-------------|----------------|
| **Controlled** | React state controls input value | Single source of truth |
| **Uncontrolled** | DOM manages input value | Less code, limited features |
| **Validation** | Check input correctness | Data quality & UX |
| **Error Display** | Show validation messages | User guidance |
| **Submit Handling** | Process form data | Final validation & submission |

### Controlled vs Uncontrolled

| Feature | Controlled | Uncontrolled |
|---------|-----------|--------------|
| **Value source** | React state | DOM |
| **Access** | Immediate (state) | On-demand (refs) |
| **Validation** | Real-time | On submit |
| **Format input** | ✅ Easy | ❌ Hard |
| **Code** | More verbose | Less code |
| **Use case** | Most forms | Simple forms |

---

## Example 1: Controlled Components

### 💡 **React-Controlled Form Inputs**

Controlled components are the React way - form input values driven by React state, creating a single source of truth.

**The Pattern:**

```
State → value prop → Input → onChange → Update State
  ↑                                            ↓
  └────────────────────────────────────────────┘
```

**How It Works:**

**Step 1: Initialize State**
- Create state for each form field
- State holds current values

**Step 2: Bind to Input**
- Set input's `value` from state
- Input displays state value

**Step 3: Handle Changes**
- `onChange` fires on every keystroke
- Handler updates state

**Step 4: React Re-renders**
- State change triggers re-render
- Input shows new value

**Benefits:**

**Single Source of Truth:**
- State is always correct
- No DOM querying needed
- Easy to debug

**Instant Validation:**
- Validate as user types
- Show errors in real-time
- Format input on the fly

**Conditional Rendering:**
- Show/hide fields based on values
- Enable/disable submit button
- Dynamic form behavior

```jsx
import { useState } from 'react';

function LoginForm() {
    // State for form fields
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();

        console.log({
            email,
            password,
            rememberMe
        });

        // Submit to API
        // ...
    };

    return (
        <form onSubmit={handleSubmit}>
            {/* Text input - controlled */}
            <div>
                <label htmlFor="email">Email</label>
                <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                />
            </div>

            {/* Password input - controlled */}
            <div>
                <label htmlFor="password">Password</label>
                <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                />
            </div>

            {/* Checkbox - controlled */}
            <div>
                <label>
                    <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    Remember me
                </label>
            </div>

            {/* Submit button - can be conditionally disabled */}
            <button
                type="submit"
                disabled={!email || !password}
            >
                Login
            </button>

            {/* Current state display */}
            <div>
                <p>Email: {email}</p>
                <p>Has password: {password ? 'Yes' : 'No'}</p>
            </div>
        </form>
    );
}
```

**Multiple Fields Pattern:**

```jsx
// Managing multiple fields with single state object
function ContactForm() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        message: '',
        category: 'general'
    });

    // Single handler for all fields
    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    return (
        <form>
            <input
                name="name"
                value={formData.name}
                onChange={handleChange}
            />

            <input
                name="email"
                value={formData.email}
                onChange={handleChange}
            />

            <select
                name="category"
                value={formData.category}
                onChange={handleChange}
            >
                <option value="general">General</option>
                <option value="support">Support</option>
                <option value="sales">Sales</option>
            </select>

            <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
            />
        </form>
    );
}
```

---

## Example 2: Form Validation

### 💡 **Real-Time Validation Pattern**

Validation provides immediate feedback as users type, balancing helpfulness without being annoying.

**Validation Strategy:**

**When to Validate:**

| Event | Validate? | Show Errors? | Why |
|-------|-----------|--------------|-----|
| **onChange** | ✅ Yes | ⚠️ Only if touched | Immediate feedback after first interaction |
| **onBlur** | ✅ Yes | ✅ Yes | User finished with field |
| **onSubmit** | ✅ Yes | ✅ Yes | Final check before submission |

**The "Touched" Pattern:**

```
User hasn't interacted → Don't show errors (too early!)
User is typing → Validate, show errors only if already touched
User leaves field → Mark as touched, show any errors
```

**Benefits:**

**Better UX:**
- Don't overwhelm with errors before typing
- Show errors after field interaction
- Prevent submission with invalid data

**Data Quality:**
- Catch errors early
- Guide users to correct format
- Ensure complete required fields

```jsx
import { useState } from 'react';

function SignupForm() {
    // Form values
    const [values, setValues] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
    });

    // Validation errors
    const [errors, setErrors] = useState({});

    // Touched fields (user has interacted)
    const [touched, setTouched] = useState({});

    // Validation function
    const validate = (name, value) => {
        switch (name) {
            case 'username':
                if (!value) return 'Username is required';
                if (value.length < 3) return 'Username must be at least 3 characters';
                if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'Username can only contain letters, numbers, and underscores';
                return '';

            case 'email':
                if (!value) return 'Email is required';
                if (!/\S+@\S+\.\S+/.test(value)) return 'Email is invalid';
                return '';

            case 'password':
                if (!value) return 'Password is required';
                if (value.length < 8) return 'Password must be at least 8 characters';
                if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
                    return 'Password must contain uppercase, lowercase, and number';
                }
                return '';

            case 'confirmPassword':
                if (!value) return 'Please confirm password';
                if (value !== values.password) return 'Passwords do not match';
                return '';

            default:
                return '';
        }
    };

    // Handle field change
    const handleChange = (e) => {
        const { name, value } = e.target;

        // Update value
        setValues(prev => ({ ...prev, [name]: value }));

        // Validate and update errors
        const error = validate(name, value);
        setErrors(prev => ({ ...prev, [name]: error }));
    };

    // Handle field blur (user left field)
    const handleBlur = (e) => {
        const { name } = e.target;
        setTouched(prev => ({ ...prev, [name]: true }));
    };

    // Handle form submission
    const handleSubmit = (e) => {
        e.preventDefault();

        // Validate all fields
        const newErrors = {};
        Object.keys(values).forEach(key => {
            const error = validate(key, values[key]);
            if (error) newErrors[key] = error;
        });

        setErrors(newErrors);

        // Mark all fields as touched
        const allTouched = {};
        Object.keys(values).forEach(key => {
            allTouched[key] = true;
        });
        setTouched(allTouched);

        // If no errors, submit
        if (Object.keys(newErrors).length === 0) {
            console.log('Form is valid!', values);
            // Submit to API
        }
    };

    // Helper to show error
    const shouldShowError = (field) => {
        return touched[field] && errors[field];
    };

    return (
        <form onSubmit={handleSubmit} className="signup-form">
            {/* Username field */}
            <div className="form-group">
                <label htmlFor="username">Username</label>
                <input
                    id="username"
                    name="username"
                    value={values.username}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={shouldShowError('username') ? 'error' : ''}
                    placeholder="johndoe"
                />
                {shouldShowError('username') && (
                    <span className="error-message">{errors.username}</span>
                )}
            </div>

            {/* Email field */}
            <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                    id="email"
                    name="email"
                    type="email"
                    value={values.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={shouldShowError('email') ? 'error' : ''}
                    placeholder="john@example.com"
                />
                {shouldShowError('email') && (
                    <span className="error-message">{errors.email}</span>
                )}
            </div>

            {/* Password field */}
            <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                    id="password"
                    name="password"
                    type="password"
                    value={values.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={shouldShowError('password') ? 'error' : ''}
                    placeholder="Min 8 characters"
                />
                {shouldShowError('password') && (
                    <span className="error-message">{errors.password}</span>
                )}
            </div>

            {/* Confirm password field */}
            <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={values.confirmPassword}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={shouldShowError('confirmPassword') ? 'error' : ''}
                    placeholder="Re-enter password"
                />
                {shouldShowError('confirmPassword') && (
                    <span className="error-message">{errors.confirmPassword}</span>
                )}
            </div>

            {/* Submit button */}
            <button type="submit">
                Sign Up
            </button>
        </form>
    );
}
```

**Validation Patterns:**

```jsx
// Email validation
const isValidEmail = (email) => {
    return /\S+@\S+\.\S+/.test(email);
};

// Password strength
const isStrongPassword = (password) => {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password);
};

// Phone number (US)
const isValidPhone = (phone) => {
    return /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/.test(phone);
};

// URL validation
const isValidURL = (url) => {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
};
```

---

## Example 3: Uncontrolled Components with Refs

### 💡 **DOM-Managed Form Inputs**

Uncontrolled components let the DOM manage form state, using refs to access values only when needed.

**When to Use:**

**✅ Good For:**
- Simple forms without complex validation
- File inputs (must be uncontrolled)
- Integrating with non-React libraries
- Performance-critical forms with many inputs

**❌ Not Good For:**
- Real-time validation
- Formatted input (phone numbers, currency)
- Conditional fields based on input
- Displaying current values elsewhere

**The Pattern:**

```
User Types → DOM updates → Read via ref on submit
(No React state updates, no re-renders during typing)
```

```jsx
import { useRef } from 'react';

function UncontrolledForm() {
    // Create refs for each input
    const emailRef = useRef();
    const passwordRef = useRef();
    const fileRef = useRef();

    const handleSubmit = (e) => {
        e.preventDefault();

        // Access values through refs
        const email = emailRef.current.value;
        const password = passwordRef.current.value;
        const file = fileRef.current.files[0];

        console.log({
            email,
            password,
            fileName: file?.name
        });

        // Submit to API
        // ...

        // Reset form
        e.target.reset();
    };

    return (
        <form onSubmit={handleSubmit}>
            {/* Email input */}
            <input
                ref={emailRef}
                type="email"
                name="email"
                defaultValue=""  // Use defaultValue, not value
                placeholder="Email"
            />

            {/* Password input */}
            <input
                ref={passwordRef}
                type="password"
                name="password"
                defaultValue=""
                placeholder="Password"
            />

            {/* File input (must be uncontrolled) */}
            <input
                ref={fileRef}
                type="file"
                name="avatar"
                accept="image/*"
            />

            <button type="submit">Submit</button>
        </form>
    );
}
```

**Hybrid Approach:**

```jsx
// Mix controlled and uncontrolled for best of both
function HybridForm() {
    const [email, setEmail] = useState('');  // Controlled for validation
    const messageRef = useRef();  // Uncontrolled for simple textarea

    const handleSubmit = (e) => {
        e.preventDefault();

        const data = {
            email,  // From state
            message: messageRef.current.value  // From ref
        };

        console.log(data);
    };

    return (
        <form onSubmit={handleSubmit}>
            {/* Controlled - need validation */}
            <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
            />

            {/* Uncontrolled - just need value on submit */}
            <textarea
                ref={messageRef}
                defaultValue=""
                rows={5}
            />

            <button type="submit">Send</button>
        </form>
    );
}
```

---

## Common Mistakes

### ❌ Mistake 1: Not Preventing Default Form Submission

```jsx
// ❌ WRONG - Page reloads on submit
function BadForm() {
    const handleSubmit = () => {
        console.log('Submitting...');
        // Page reloads! Form submitted to server
    };

    return <form onSubmit={handleSubmit}>...</form>;
}

// ✅ CORRECT - Prevent default behavior
function GoodForm() {
    const handleSubmit = (e) => {
        e.preventDefault();  // Prevent page reload
        console.log('Submitting...');
    };

    return <form onSubmit={handleSubmit}>...</form>;
}
```

**Why It Matters:**
- Forms naturally submit to server
- Causes page reload
- Loses all React state
- Breaks SPA experience

---

### ❌ Mistake 2: Showing Errors Too Early

```jsx
// ❌ WRONG - Shows errors immediately
function BadForm() {
    const [email, setEmail] = useState('');
    const error = !email ? 'Required' : '';  // Error from start!

    return (
        <div>
            <input value={email} onChange={(e) => setEmail(e.target.value)} />
            {error && <span>{error}</span>}  {/* Shows before user types */}
        </div>
    );
}

// ✅ CORRECT - Only show errors after interaction
function GoodForm() {
    const [email, setEmail] = useState('');
    const [touched, setTouched] = useState(false);
    const error = !email ? 'Required' : '';

    return (
        <div>
            <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched(true)}
            />
            {touched && error && <span>{error}</span>}
        </div>
    );
}
```

---

### ❌ Mistake 3: Mutating State Directly

```jsx
// ❌ WRONG - Mutating state object
function BadForm() {
    const [formData, setFormData] = useState({ name: '', email: '' });

    const handleChange = (e) => {
        formData[e.target.name] = e.target.value;  // Direct mutation!
        setFormData(formData);  // React doesn't detect change
    };

    return <form>...</form>;
}

// ✅ CORRECT - Create new object
function GoodForm() {
    const [formData, setFormData] = useState({ name: '', email: '' });

    const handleChange = (e) => {
        setFormData({
            ...formData,  // Copy existing
            [e.target.name]: e.target.value  // Update field
        });
    };

    return <form>...</form>;
}
```

---

### ❌ Mistake 4: Not Disabling Submit During Submission

```jsx
// ❌ WRONG - Can submit multiple times
function BadForm() {
    const handleSubmit = async (e) => {
        e.preventDefault();
        await api.submitForm(data);  // User can click again during this!
    };

    return (
        <form onSubmit={handleSubmit}>
            <button type="submit">Submit</button>
        </form>
    );
}

// ✅ CORRECT - Disable while submitting
function GoodForm() {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            await api.submitForm(data);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
        </form>
    );
}
```

---

## Best Practices

### 1. Use Controlled Components as Default

```jsx
// ✅ Controlled gives you more power
const [value, setValue] = useState('');

<input
    value={value}
    onChange={(e) => setValue(e.target.value)}
/>
```

### 2. Validate on Change and Submit

```jsx
// ✅ Immediate feedback + final check
const handleChange = (e) => {
    const { name, value } = e.target;
    setValues({ ...values, [name]: value });
    validateField(name, value);  // Validate as typing
};

const handleSubmit = (e) => {
    e.preventDefault();
    validateAll();  // Final validation
    if (isValid) submit();
};
```

### 3. Show Clear Error Messages

```jsx
// ✅ Specific, helpful errors
const errors = {
    email: 'Please enter a valid email address',  // Not just "Invalid"
    password: 'Password must be at least 8 characters',  // Explain requirement
    username: 'Username is already taken'  // Tell what's wrong
};
```

### 4. Disable Submit While Submitting

```jsx
// ✅ Prevent double submission
const [isSubmitting, setIsSubmitting] = useState(false);

<button type="submit" disabled={isSubmitting || !isValid}>
    {isSubmitting ? 'Submitting...' : 'Submit'}
</button>
```

### 5. Use Form Libraries for Complex Forms

```jsx
// ✅ For complex validation, use libraries
import { useForm } from 'react-hook-form';

function Form() {
    const { register, handleSubmit, formState: { errors } } = useForm();

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <input {...register('email', { required: true, pattern: /\S+@\S+/ })} />
            {errors.email && <span>Email is required</span>}
        </form>
    );
}
```

---

## Real-World Scenarios

### Scenario 1: Multi-Step Form

```jsx
function MultiStepForm() {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        // Step 1
        name: '',
        email: '',
        // Step 2
        address: '',
        city: '',
        // Step 3
        cardNumber: ''
    });

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const nextStep = () => setStep(step + 1);
    const prevStep = () => setStep(step - 1);

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('Final data:', formData);
    };

    return (
        <form onSubmit={handleSubmit}>
            {step === 1 && (
                <div>
                    <h2>Step 1: Personal Info</h2>
                    <input
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Name"
                    />
                    <input
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="Email"
                    />
                    <button type="button" onClick={nextStep}>Next</button>
                </div>
            )}

            {step === 2 && (
                <div>
                    <h2>Step 2: Address</h2>
                    <input
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        placeholder="Address"
                    />
                    <input
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        placeholder="City"
                    />
                    <button type="button" onClick={prevStep}>Back</button>
                    <button type="button" onClick={nextStep}>Next</button>
                </div>
            )}

            {step === 3 && (
                <div>
                    <h2>Step 3: Payment</h2>
                    <input
                        name="cardNumber"
                        value={formData.cardNumber}
                        onChange={handleChange}
                        placeholder="Card Number"
                    />
                    <button type="button" onClick={prevStep}>Back</button>
                    <button type="submit">Submit</button>
                </div>
            )}
        </form>
    );
}
```

### Scenario 2: Dynamic Fields

```jsx
function DynamicForm() {
    const [fields, setFields] = useState([{ id: 1, value: '' }]);

    const addField = () => {
        setFields([...fields, { id: Date.now(), value: '' }]);
    };

    const removeField = (id) => {
        setFields(fields.filter(field => field.id !== id));
    };

    const updateField = (id, value) => {
        setFields(fields.map(field =>
            field.id === id ? { ...field, value } : field
        ));
    };

    return (
        <form>
            {fields.map(field => (
                <div key={field.id}>
                    <input
                        value={field.value}
                        onChange={(e) => updateField(field.id, e.target.value)}
                        placeholder="Enter value"
                    />
                    <button
                        type="button"
                        onClick={() => removeField(field.id)}
                    >
                        Remove
                    </button>
                </div>
            ))}

            <button type="button" onClick={addField}>
                Add Field
            </button>

            <button type="submit">Submit</button>
        </form>
    );
}
```

---

## Interview Questions

### Q1: What's the difference between controlled and uncontrolled components?

**Answer:**

| Aspect | Controlled | Uncontrolled |
|--------|-----------|--------------|
| **Value source** | React state | DOM |
| **Updates** | Through setState | Directly in DOM |
| **Access** | `value` prop | `ref.current.value` |
| **Validation** | Real-time | On submit |
| **Use case** | Most forms | Simple forms, file inputs |

**Controlled example:**
```jsx
<input value={state} onChange={(e) => setState(e.target.value)} />
```

**Uncontrolled example:**
```jsx
<input ref={inputRef} defaultValue="" />
```

---

### Q2: How do you validate forms in React?

**Answer:**

Three approaches:

**1. Manual validation:**
```jsx
const validate = (value) => {
    if (!value) return 'Required';
    if (value.length < 3) return 'Too short';
    return '';
};
```

**2. HTML5 validation:**
```jsx
<input type="email" required minLength={3} />
```

**3. Form libraries (recommended for complex forms):**
```jsx
// React Hook Form, Formik, etc.
const { register, errors } = useForm();
```

---

### Q3: When should you show validation errors?

**Answer:**

**Best Practice - "Touched" Pattern:**
- Don't show errors immediately (too aggressive)
- Show errors after user interacts with field (onBlur)
- Show all errors on submit attempt

```jsx
const shouldShowError = touched[field] && errors[field];
```

---

### Q4: How to handle file uploads?

**Answer:**

File inputs must be uncontrolled:

```jsx
const fileRef = useRef();

const handleSubmit = (e) => {
    e.preventDefault();
    const file = fileRef.current.files[0];

    const formData = new FormData();
    formData.append('file', file);

    await fetch('/upload', {
        method: 'POST',
        body: formData
    });
};

<input ref={fileRef} type="file" />
```

---

### Q5: How to prevent multiple form submissions?

**Answer:**

Track submission state and disable button:

```jsx
const [isSubmitting, setIsSubmitting] = useState(false);

const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
        await api.submit(data);
    } finally {
        setIsSubmitting(false);
    }
};

<button disabled={isSubmitting}>
    {isSubmitting ? 'Submitting...' : 'Submit'}
</button>
```

---

## External Resources

- [React Forms Documentation](https://react.dev/learn/sharing-state-between-components#controlled-and-uncontrolled-components)
- [React Hook Form](https://react-hook-form.com/)
- [Formik Documentation](https://formik.org/)
- [Form Validation Best Practices](https://www.smashingmagazine.com/2022/01/designing-better-inline-validation-ux/)

---

[← Back to React](./README.md) | [Next: Error Boundaries →](./10-error-boundaries.md)
