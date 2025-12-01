# NestJS Architecture & Modules

## Overview

NestJS is a progressive Node.js framework for building efficient, reliable, and scalable server-side applications. It uses TypeScript by default and combines elements of OOP (Object-Oriented Programming), FP (Functional Programming), and FRP (Functional Reactive Programming). Understanding its architecture is fundamental for interviews.

## Core Concepts

### Architecture Principles

NestJS is built around several key principles:
- **Modularity**: Applications are organized into modules
- **Dependency Injection**: Inversion of Control (IoC) pattern
- **TypeScript**: First-class TypeScript support
- **Decorators**: Metadata-driven development
- **Testability**: Built for unit and integration testing

## Modules

### What is a Module?

A module is a class annotated with `@Module()` decorator. Modules organize application structure and provide a way to group related components.

### Creating a Module

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [UsersModule, ProductsModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
```

### Module Metadata

```typescript
@Module({
  imports: [],      // Other modules whose exported providers are needed
  controllers: [],  // Controllers defined in this module
  providers: [],    // Providers (services) available in this module
  exports: [],      // Providers to be available in other modules
})
```

### Feature Module

```typescript
// users/users.module.ts
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService], // Export to make available in other modules
})
export class UsersModule {}
```

### Shared Modules

```typescript
// shared/shared.module.ts
import { Module } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { ConfigService } from './config.service';

@Module({
  providers: [DatabaseService, ConfigService],
  exports: [DatabaseService, ConfigService], // Share with other modules
})
export class SharedModule {}

// users/users.module.ts
@Module({
  imports: [SharedModule], // Import shared providers
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
```

### Global Modules

```typescript
// shared/shared.module.ts
import { Module, Global } from '@nestjs/common';

@Global() // Makes module global
@Module({
  providers: [ConfigService],
  exports: [ConfigService],
})
export class SharedModule {}

// Now ConfigService is available everywhere without importing
```

### Dynamic Modules

```typescript
// database/database.module.ts
import { Module, DynamicModule } from '@nestjs/common';
import { DatabaseService } from './database.service';

@Module({})
export class DatabaseModule {
  static forRoot(options: DatabaseOptions): DynamicModule {
    return {
      module: DatabaseModule,
      providers: [
        {
          provide: 'DATABASE_OPTIONS',
          useValue: options,
        },
        DatabaseService,
      ],
      exports: [DatabaseService],
    };
  }
}

// Usage
@Module({
  imports: [
    DatabaseModule.forRoot({
      host: 'localhost',
      port: 5432,
    }),
  ],
})
export class AppModule {}
```

## Dependency Injection

### What is Dependency Injection?

DI is a design pattern where dependencies are provided to a class rather than created by the class itself. NestJS has a built-in IoC container.

### Provider Registration

```typescript
// Basic provider
@Module({
  providers: [UsersService], // Shorthand
  // Equivalent to:
  providers: [
    {
      provide: UsersService,
      useClass: UsersService,
    },
  ],
})
export class UsersModule {}
```

### Injection Patterns

**1. Constructor Injection**
```typescript
@Injectable()
export class UsersService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
  ) {}

  async findAll() {
    const config = this.configService.get('database');
    return this.databaseService.query('SELECT * FROM users');
  }
}
```

**2. Property Injection**
```typescript
@Injectable()
export class UsersService {
  @Inject(DatabaseService)
  private readonly databaseService: DatabaseService;
}
```

### Provider Types

**1. Class Providers**
```typescript
providers: [
  {
    provide: UsersService,
    useClass: UsersService,
  },
]
```

**2. Value Providers**
```typescript
providers: [
  {
    provide: 'CONFIG',
    useValue: {
      apiKey: 'secret-key',
      timeout: 3000,
    },
  },
]

// Injection
constructor(@Inject('CONFIG') private config: any) {}
```

**3. Factory Providers**
```typescript
providers: [
  {
    provide: 'CONNECTION',
    useFactory: async (optionsProvider: OptionsProvider) => {
      const options = await optionsProvider.get();
      return await createConnection(options);
    },
    inject: [OptionsProvider],
  },
]
```

**4. Alias Providers**
```typescript
providers: [
  UsersService,
  {
    provide: 'AliasedUsersService',
    useExisting: UsersService,
  },
]
```

## Project Structure

### Recommended Structure

```
src/
├── app.module.ts
├── main.ts
├── common/
│   ├── decorators/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   ├── pipes/
│   └── middleware/
├── config/
│   ├── app.config.ts
│   └── database.config.ts
├── modules/
│   ├── users/
│   │   ├── dto/
│   │   │   ├── create-user.dto.ts
│   │   │   └── update-user.dto.ts
│   │   ├── entities/
│   │   │   └── user.entity.ts
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   ├── users.module.ts
│   │   └── users.controller.spec.ts
│   └── products/
│       ├── dto/
│       ├── entities/
│       ├── products.controller.ts
│       ├── products.service.ts
│       └── products.module.ts
└── shared/
    ├── services/
    └── shared.module.ts
```

## Main Application File

### Bootstrap

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('api');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS
  app.enableCors();

  await app.listen(3000);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
```

## Configuration Module

### Using ConfigModule

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      ignoreEnvFile: process.env.NODE_ENV === 'production',
    }),
  ],
})
export class AppModule {}

// Using config in service
@Injectable()
export class AppService {
  constructor(private configService: ConfigService) {}

  getDatabaseHost(): string {
    return this.configService.get<string>('DATABASE_HOST');
  }
}
```

### Custom Configuration

```typescript
// config/database.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
}));

// app.module.ts
import databaseConfig from './config/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [databaseConfig],
    }),
  ],
})
export class AppModule {}

// Usage
@Injectable()
export class DatabaseService {
  constructor(
    @Inject(databaseConfig.KEY)
    private dbConfig: ConfigType<typeof databaseConfig>,
  ) {}

  connect() {
    console.log(`Connecting to ${this.dbConfig.host}:${this.dbConfig.port}`);
  }
}
```

## Module Organization Patterns

### Feature-Based Organization

```typescript
// Order module with nested features
@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem]),
    UsersModule,
    ProductsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrderItemsService],
  exports: [OrdersService],
})
export class OrdersModule {}
```

### Core vs Feature Modules

```typescript
// Core module - shared across entire app
@Global()
@Module({
  providers: [LoggerService, ConfigService],
  exports: [LoggerService, ConfigService],
})
export class CoreModule {}

// Feature module - specific business logic
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

## Interview Questions

### Q1: What is a module in NestJS?

**Answer:**
A module is a class annotated with `@Module()` decorator that groups related components (controllers, providers). Modules organize application structure and manage dependencies.

```typescript
@Module({
  imports: [],      // Other modules
  controllers: [],  // HTTP route handlers
  providers: [],    // Services, repositories
  exports: [],      // Providers to share
})
export class UsersModule {}
```

### Q2: What is dependency injection and how does NestJS implement it?

**Answer:**
DI is a design pattern where dependencies are injected rather than created. NestJS uses decorators and a built-in IoC container.

```typescript
@Injectable()
export class UsersService {
  constructor(private readonly database: DatabaseService) {}
}
```

### Q3: What is the difference between imports and providers in a module?

**Answer:**
- **imports**: Other modules whose exported providers you need
- **providers**: Services/classes that belong to this module

### Q4: How do you make a provider available to other modules?

**Answer:**
Add it to the `exports` array:

```typescript
@Module({
  providers: [UsersService],
  exports: [UsersService], // Now available to importing modules
})
export class UsersModule {}
```

### Q5: What is a global module?

**Answer:**
A module decorated with `@Global()` that makes its providers available everywhere without needing to import it.

```typescript
@Global()
@Module({
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}
```

## Best Practices

### ✅ Do's

1. **One module per feature/domain**
2. **Use dependency injection**
3. **Export only what's necessary**
4. **Use global modules sparingly**
5. **Follow single responsibility principle**
6. **Use TypeScript types**
7. **Organize by feature, not by type**

### ❌ Don'ts

1. **Don't create circular dependencies**
2. **Don't export everything**
3. **Don't put all logic in controllers**
4. **Don't make too many global modules**
5. **Don't skip module organization**

## Summary

- Modules organize NestJS applications into cohesive blocks
- Dependency injection manages component dependencies
- Use feature modules for business logic
- Use shared/global modules for cross-cutting concerns
- Follow modular architecture principles
- Leverage TypeScript and decorators
- Keep modules focused and cohesive

---

[← Back to Backend](../README.md) | [Next: Controllers & Providers →](./02-controllers-providers.md)
