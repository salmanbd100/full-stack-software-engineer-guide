# Forms & Validation

Handling forms and validation in React requires understanding controlled components, form state, and validation strategies.

## 📚 Core Concepts

### 1. Controlled Components

**useState** - Demonstrates controlled form inputs where React state controls input values. Each input's value is tied to state and updates via onChange handlers, giving React full control over form data.

```jsx
function LoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log({ email, password });
    };

    return (
        <form onSubmit={handleSubmit}>
            <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
            />
            <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
            />
            <button type="submit">Login</button>
        </form>
    );
}
```

### 2. Form Validation

**useState** - Implements custom form validation with real-time error checking. Maintains separate state for form values and errors, validates on change and submit, and provides user feedback for invalid inputs.

```jsx
function SignupForm() {
    const [values, setValues] = useState({
        username: '',
        email: '',
        password: ''
    });

    const [errors, setErrors] = useState({});

    const validate = (name, value) => {
        switch (name) {
            case 'username':
                if (!value) return 'Username is required';
                if (value.length < 3) return 'Username must be at least 3 characters';
                break;
            case 'email':
                if (!value) return 'Email is required';
                if (!/\S+@\S+\.\S+/.test(value)) return 'Email is invalid';
                break;
            case 'password':
                if (!value) return 'Password is required';
                if (value.length < 8) return 'Password must be at least 8 characters';
                break;
        }
        return '';
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setValues(prev => ({ ...prev, [name]: value }));

        // Validate on change
        const error = validate(name, value);
        setErrors(prev => ({ ...prev, [name]: error }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Validate all fields
        const newErrors = {};
        Object.keys(values).forEach(key => {
            const error = validate(key, values[key]);
            if (error) newErrors[key] = error;
        });

        setErrors(newErrors);

        // Submit if no errors
        if (Object.keys(newErrors).length === 0) {
            console.log('Form is valid!', values);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <div>
                <input
                    name="username"
                    value={values.username}
                    onChange={handleChange}
                    placeholder="Username"
                />
                {errors.username && <span className="error">{errors.username}</span>}
            </div>

            <div>
                <input
                    name="email"
                    type="email"
                    value={values.email}
                    onChange={handleChange}
                    placeholder="Email"
                />
                {errors.email && <span className="error">{errors.email}</span>}
            </div>

            <div>
                <input
                    name="password"
                    type="password"
                    value={values.password}
                    onChange={handleChange}
                    placeholder="Password"
                />
                {errors.password && <span className="error">{errors.password}</span>}
            </div>

            <button type="submit">Sign Up</button>
        </form>
    );
}
```

### 3. Uncontrolled Components with Refs

**useRef** - Shows uncontrolled form inputs where the DOM maintains input values instead of React state. Refs provide direct access to input values on submit without managing state for each keystroke.

```jsx
function UncontrolledForm() {
    const emailRef = useRef();
    const passwordRef = useRef();

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log({
            email: emailRef.current.value,
            password: passwordRef.current.value
        });
    };

    return (
        <form onSubmit={handleSubmit}>
            <input ref={emailRef} type="email" />
            <input ref={passwordRef} type="password" />
            <button type="submit">Submit</button>
        </form>
    );
}
```

## 🎯 Common Interview Questions

### Q1: Controlled vs Uncontrolled components?

**Answer:**
- **Controlled**: React controls the value via state
- **Uncontrolled**: DOM controls the value, accessed via refs

### Q2: How to validate forms?

**Answer:**
1. Built-in HTML5 validation
2. Custom validation logic
3. Third-party libraries (Formik, React Hook Form)

## 🎓 Best Practices

1. **Use controlled components** for most cases
2. **Validate on change and submit**
3. **Provide clear error messages**
4. **Disable submit** while submitting
5. **Consider form libraries** for complex forms

---

[← Back to React](./README.md)
