# ORMs (TypeORM/Sequelize)

## Overview

ORM (Object-Relational Mapping) maps objects to database tables, allowing developers to work with databases using programming language constructs instead of SQL.

## TypeORM

### Setup

```typescript
// Entity
@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @OneToMany(() => Post, post => post.author)
  posts: Post[];
}
```

### Basic Operations

```typescript
// Find all
const users = await userRepository.find();

// Find one
const user = await userRepository.findOne({ where: { id: 1 } });

// Create
const user = userRepository.create({ name: 'John', email: 'john@example.com' });
await userRepository.save(user);

// Update
await userRepository.update({ id: 1 }, { name: 'Jane' });

// Delete
await userRepository.delete({ id: 1 });
```

### Relations

```typescript
// Find with relations
const user = await userRepository.findOne({
  where: { id: 1 },
  relations: ['posts']
});

// Query builder
const users = await userRepository
  .createQueryBuilder('user')
  .leftJoinAndSelect('user.posts', 'post')
  .where('user.age > :age', { age: 18 })
  .getMany();
```

## Sequelize

### Setup

```javascript
const User = sequelize.define('User', {
  name: DataTypes.STRING,
  email: { type: DataTypes.STRING, unique: true }
});

const Post = sequelize.define('Post', {
  title: DataTypes.STRING,
  content: DataTypes.TEXT
});

User.hasMany(Post);
Post.belongsTo(User);
```

### Basic Operations

```javascript
// Find all
const users = await User.findAll();

// Find one
const user = await User.findByPk(1);

// Create
const user = await User.create({ name: 'John', email: 'john@example.com' });

// Update
await User.update({ name: 'Jane' }, { where: { id: 1 } });

// Delete
await User.destroy({ where: { id: 1 } });
```

### Queries

```javascript
// With relations
const users = await User.findAll({
  include: [Post]
});

// With conditions
const users = await User.findAll({
  where: {
    age: { [Op.gt]: 18 },
    country: 'USA'
  },
  order: [['name', 'ASC']],
  limit: 10
});
```

## Interview Questions

**Q: What is an ORM?**
A: Object-Relational Mapping tool that maps database tables to classes/objects, allowing database operations using programming language instead of SQL.

**Q: Advantages of ORMs?**
A:
- Database agnostic
- Prevents SQL injection
- Less boilerplate
- Type safety (TypeScript)
- Migrations support

**Q: Disadvantages of ORMs?**
A:
- Performance overhead
- Complex queries harder
- Learning curve
- Less control over SQL

**Q: When to use raw SQL vs ORM?**
A: Use raw SQL for complex queries, bulk operations, performance-critical sections. Use ORM for CRUD operations and standard queries.

## Best Practices

✅ Use migrations for schema changes
✅ Eager load relations when needed
✅ Use query builders for complex queries
✅ Index foreign keys
✅ Use transactions for multiple operations
❌ Don't load unnecessary relations
❌ Don't ignore N+1 problems
❌ Don't bypass validation

---

[← Previous: PostgreSQL](./05-postgresql.md) | [Next: Migrations →](./07-migrations.md)
