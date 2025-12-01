# Mongoose ODM

## Schema Definition

```javascript
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  age: { type: Number, min: 18 },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
```

## CRUD Operations

```javascript
// Create
const user = await User.create({ name: "John", email: "john@example.com" });

// Find
const users = await User.find({ age: { $gt: 18 } });
const user = await User.findById(id);

// Update
await User.findByIdAndUpdate(id, { name: "Jane" }, { new: true });

// Delete
await User.findByIdAndDelete(id);
```

## Validation

```javascript
const schema = new Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    validate: {
      validator: (v) => /\S+@\S+\.\S+/.test(v),
      message: 'Invalid email'
    }
  }
});
```

## Middleware

```javascript
// Pre save hook
userSchema.pre('save', async function() {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
});

// Post save hook
userSchema.post('save', function(doc) {
  console.log('User saved:', doc._id);
});
```

## Population

```javascript
const postSchema = new Schema({
  title: String,
  author: { type: Schema.Types.ObjectId, ref: 'User' }
});

// Populate author
const posts = await Post.find().populate('author');
```

---

[← Previous: Indexing](./04-indexing.md) | [Next: Redis →](./06-redis.md)
