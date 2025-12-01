# Database Integration

## Overview

NestJS provides excellent support for database integration through TypeORM, Mongoose, Sequelize, and other ORMs. Understanding how to integrate and work with databases is essential for backend development and is frequently covered in interviews.

## TypeORM Integration

### Setup

```bash
npm install @nestjs/typeorm typeorm mysql2
# or for PostgreSQL
npm install @nestjs/typeorm typeorm pg
# or for MongoDB
npm install @nestjs/typeorm typeorm mongodb
```

### Configuration

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'password',
      database: 'nest_db',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true, // Don't use in production
    }),
  ],
})
export class AppModule {}
```

### Using ConfigModule

```typescript
// app.module.ts
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: +configService.get<number>('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get('NODE_ENV') !== 'production',
        logging: configService.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

## Entities

### Creating an Entity

```typescript
// entities/user.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false }) // Exclude from queries by default
  password: string;

  @Column({ default: 'user' })
  role: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### Column Types

```typescript
@Entity()
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar', { length: 200 })
  name: string;

  @Column('text')
  description: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column('int')
  stock: number;

  @Column('json', { nullable: true })
  metadata: object;

  @Column('simple-array') // Stored as comma-separated values
  tags: string[];

  @Column('simple-json') // Stored as JSON string
  specifications: { weight: number; dimensions: string };

  @Column('date')
  releaseDate: Date;

  @Column('timestamp')
  lastRestocked: Date;
}
```

## Relationships

### One-to-Many / Many-to-One

```typescript
// entities/user.entity.ts
import { OneToMany } from 'typeorm';
import { Post } from './post.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @OneToMany(() => Post, (post) => post.author)
  posts: Post[];
}

// entities/post.entity.ts
import { ManyToOne } from 'typeorm';
import { User } from './user.entity';

@Entity()
export class Post {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @ManyToOne(() => User, (user) => user.posts)
  author: User;
}
```

### Many-to-Many

```typescript
// entities/student.entity.ts
import { ManyToMany, JoinTable } from 'typeorm';
import { Course } from './course.entity';

@Entity()
export class Student {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @ManyToMany(() => Course, (course) => course.students)
  @JoinTable() // Owner side of relationship
  courses: Course[];
}

// entities/course.entity.ts
@Entity()
export class Course {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @ManyToMany(() => Student, (student) => student.courses)
  students: Student[];
}
```

### One-to-One

```typescript
// entities/user.entity.ts
import { OneToOne, JoinColumn } from 'typeorm';
import { Profile } from './profile.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  email: string;

  @OneToOne(() => Profile, (profile) => profile.user)
  @JoinColumn()
  profile: Profile;
}

// entities/profile.entity.ts
@Entity()
export class Profile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  bio: string;

  @Column()
  avatar: string;

  @OneToOne(() => User, (user) => user.profile)
  user: User;
}
```

## Repository Pattern

### Using Repository

```typescript
// users.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

// users.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async findAll(): Promise<User[]> {
    return await this.usersRepository.find();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.usersRepository.create(createUserDto);
    return await this.usersRepository.save(user);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    Object.assign(user, updateUserDto);
    return await this.usersRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const result = await this.usersRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
  }
}
```

### Query Methods

```typescript
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  // Find all
  async findAll() {
    return await this.usersRepository.find();
  }

  // Find with relations
  async findWithPosts(id: string) {
    return await this.usersRepository.findOne({
      where: { id },
      relations: ['posts'],
    });
  }

  // Find with conditions
  async findActive() {
    return await this.usersRepository.find({
      where: { isActive: true },
    });
  }

  // Find with select
  async findEmails() {
    return await this.usersRepository.find({
      select: ['id', 'email'],
    });
  }

  // Find with order
  async findAllSorted() {
    return await this.usersRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  // Find with pagination
  async findPaginated(page: number, limit: number) {
    return await this.usersRepository.find({
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  // Count
  async count() {
    return await this.usersRepository.count();
  }

  // Find and count
  async findAndCount(page: number, limit: number) {
    return await this.usersRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
    });
  }
}
```

### Query Builder

```typescript
async findAdvanced(filters: any) {
  const query = this.usersRepository
    .createQueryBuilder('user')
    .leftJoinAndSelect('user.posts', 'post')
    .where('user.isActive = :isActive', { isActive: true });

  if (filters.search) {
    query.andWhere('(user.name LIKE :search OR user.email LIKE :search)', {
      search: `%${filters.search}%`,
    });
  }

  if (filters.role) {
    query.andWhere('user.role = :role', { role: filters.role });
  }

  if (filters.sortBy) {
    query.orderBy(`user.${filters.sortBy}`, filters.sortOrder || 'ASC');
  }

  return await query.getMany();
}

// Complex query
async getUserStats(userId: string) {
  return await this.usersRepository
    .createQueryBuilder('user')
    .select('user.id')
    .addSelect('COUNT(post.id)', 'postCount')
    .addSelect('AVG(post.likes)', 'avgLikes')
    .leftJoin('user.posts', 'post')
    .where('user.id = :userId', { userId })
    .groupBy('user.id')
    .getRawOne();
}
```

## Transactions

```typescript
import { DataSource } from 'typeorm';

@Injectable()
export class UsersService {
  constructor(
    private dataSource: DataSource,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async createUserWithProfile(
    createUserDto: CreateUserDto,
    createProfileDto: CreateProfileDto,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = queryRunner.manager.create(User, createUserDto);
      await queryRunner.manager.save(user);

      const profile = queryRunner.manager.create(Profile, {
        ...createProfileDto,
        user,
      });
      await queryRunner.manager.save(profile);

      await queryRunner.commitTransaction();

      return user;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // Using @Transaction decorator
  @Transaction()
  async transfer(
    @TransactionRepository(Account) accountRepository: Repository<Account>,
    fromId: string,
    toId: string,
    amount: number,
  ) {
    const fromAccount = await accountRepository.findOne({ where: { id: fromId } });
    const toAccount = await accountRepository.findOne({ where: { id: toId } });

    fromAccount.balance -= amount;
    toAccount.balance += amount;

    await accountRepository.save([fromAccount, toAccount]);
  }
}
```

## Migrations

### Creating Migrations

```bash
# Generate migration from entity changes
npm run typeorm migration:generate -- -n CreateUsersTable

# Create empty migration
npm run typeorm migration:create -- -n AddEmailToUsers

# Run migrations
npm run typeorm migration:run

# Revert last migration
npm run typeorm migration:revert
```

### Migration File

```typescript
// migrations/1234567890-CreateUsersTable.ts
import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateUsersTable1234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'email',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'password',
            type: 'varchar',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('users');
  }
}
```

## Mongoose Integration

### Setup

```bash
npm install @nestjs/mongoose mongoose
```

### Configuration

```typescript
// app.module.ts
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://localhost/nest'),
  ],
})
export class AppModule {}
```

### Schema

```typescript
// schemas/user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({ default: 'user' })
  role: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
```

### Service with Mongoose

```typescript
// users.service.ts
import { Model } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const createdUser = new this.userModel(createUserDto);
    return createdUser.save();
  }

  async findAll(): Promise<User[]> {
    return this.userModel.find().exec();
  }

  async findOne(id: string): Promise<User> {
    return this.userModel.findById(id).exec();
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    return this.userModel
      .findByIdAndUpdate(id, updateUserDto, { new: true })
      .exec();
  }

  async remove(id: string): Promise<User> {
    return this.userModel.findByIdAndDelete(id).exec();
  }
}
```

## Interview Questions

### Q1: How do you integrate TypeORM with NestJS?

**Answer:**
1. Install packages: `@nestjs/typeorm typeorm database-driver`
2. Import TypeOrmModule in AppModule
3. Create entities
4. Import entities in feature modules with `TypeOrmModule.forFeature()`

### Q2: What is the Repository pattern?

**Answer:**
Repository pattern abstracts data access logic. In NestJS, inject repository with `@InjectRepository()`:

```typescript
constructor(
  @InjectRepository(User)
  private usersRepository: Repository<User>,
) {}
```

### Q3: How do you handle transactions in TypeORM?

**Answer:**
Use QueryRunner or @Transaction decorator:

```typescript
const queryRunner = this.dataSource.createQueryRunner();
await queryRunner.startTransaction();
try {
  // operations
  await queryRunner.commitTransaction();
} catch {
  await queryRunner.rollbackTransaction();
}
```

### Q4: What is the difference between `find()` and `findOne()`?

**Answer:**
- `find()`: Returns array of entities
- `findOne()`: Returns single entity or null

### Q5: How do you define relationships in TypeORM?

**Answer:**
Use decorators: `@OneToMany`, `@ManyToOne`, `@ManyToMany`, `@OneToOne`

```typescript
@OneToMany(() => Post, (post) => post.author)
posts: Post[];
```

## Best Practices

### ✅ Do's

1. **Use migrations in production**
2. **Index frequently queried fields**
3. **Use transactions for multi-step operations**
4. **Eager load relations only when needed**
5. **Use query builder for complex queries**
6. **Validate data with DTOs**
7. **Use soft deletes for important data**

### ❌ Don'ts

1. **Don't use synchronize in production**
2. **Don't forget to handle relations**
3. **Don't load unnecessary data**
4. **Don't skip error handling**
5. **Don't expose password fields**
6. **Don't forget indexes**

## Summary

- TypeORM and Mongoose are main ORMs for NestJS
- Use Repository pattern for data access
- Define entities/schemas with decorators
- Use relations to model associations
- Handle transactions for data consistency
- Use migrations for schema changes
- Query Builder for complex queries
- Follow best practices for production

---

[← Previous: Exception Filters](./05-exception-filters.md) | [Next: Testing →](./07-testing.md)
