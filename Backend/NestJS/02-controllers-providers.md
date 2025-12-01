# Controllers & Providers

## Overview

Controllers handle incoming requests and return responses to the client. Providers (services) contain business logic and can be injected into controllers or other providers. Understanding the separation of concerns between controllers and providers is fundamental to NestJS architecture.

## Controllers

### What is a Controller?

Controllers are responsible for handling incoming requests and returning responses. They use decorators to map routes to methods.

### Creating a Controller

```typescript
// users.controller.ts
import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }
}
```

### HTTP Method Decorators

```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Options,
  Head,
} from '@nestjs/common';

@Controller('users')
export class UsersController {
  @Get()           // GET /users
  findAll() {}

  @Get(':id')      // GET /users/:id
  findOne() {}

  @Post()          // POST /users
  create() {}

  @Put(':id')      // PUT /users/:id
  update() {}

  @Patch(':id')    // PATCH /users/:id
  partialUpdate() {}

  @Delete(':id')   // DELETE /users/:id
  remove() {}
}
```

### Request Decorators

```typescript
import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Headers,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Controller('users')
export class UsersController {
  // Route parameters
  @Get(':id')
  findOne(@Param('id') id: string) {
    return { id };
  }

  // Multiple parameters
  @Get(':userId/posts/:postId')
  findUserPost(
    @Param('userId') userId: string,
    @Param('postId') postId: string,
  ) {
    return { userId, postId };
  }

  // Query parameters
  @Get()
  findAll(
    @Query('page') page: number,
    @Query('limit') limit: number,
  ) {
    return { page, limit };
  }

  // Request body
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  // Headers
  @Get('profile')
  getProfile(@Headers('authorization') auth: string) {
    return { auth };
  }

  // Full request object
  @Get('info')
  getInfo(@Req() request: Request) {
    return {
      url: request.url,
      method: request.method,
    };
  }

  // Response object (use sparingly)
  @Get('custom')
  custom(@Res() response: Response) {
    response.status(200).json({ message: 'Custom response' });
  }
}
```

### Status Codes

```typescript
import { Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';

@Controller('users')
export class UsersController {
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
```

### Async Handlers

```typescript
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(): Promise<User[]> {
    return await this.usersService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<User> {
    return await this.usersService.findOne(id);
  }

  @Post()
  async create(@Body() createUserDto: CreateUserDto): Promise<User> {
    return await this.usersService.create(createUserDto);
  }
}
```

## Providers (Services)

### What is a Provider?

Providers are classes that can be injected as dependencies. The `@Injectable()` decorator marks a class as a provider.

### Creating a Service

```typescript
// users.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  private users: User[] = [];

  findAll(): User[] {
    return this.users;
  }

  findOne(id: string): User {
    const user = this.users.find(user => user.id === id);

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  create(createUserDto: CreateUserDto): User {
    const user: User = {
      id: Date.now().toString(),
      ...createUserDto,
      createdAt: new Date(),
    };

    this.users.push(user);
    return user;
  }

  update(id: string, updateUserDto: UpdateUserDto): User {
    const user = this.findOne(id);
    Object.assign(user, updateUserDto);
    return user;
  }

  remove(id: string): void {
    const index = this.users.findIndex(user => user.id === id);

    if (index === -1) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    this.users.splice(index, 1);
  }
}
```

### Service with Dependencies

```typescript
@Injectable()
export class UsersService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly emailService: EmailService,
    private readonly loggerService: LoggerService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    this.loggerService.log('Creating new user');

    const user = await this.databaseService.users.create(createUserDto);

    await this.emailService.sendWelcomeEmail(user.email);

    return user;
  }
}
```

## DTOs (Data Transfer Objects)

### Creating DTOs

```typescript
// dto/create-user.dto.ts
export class CreateUserDto {
  name: string;
  email: string;
  password: string;
  age?: number;
}

// dto/update-user.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {}
```

### DTOs with Validation

```typescript
// dto/create-user.dto.ts
import {
  IsEmail,
  IsString,
  IsInt,
  IsOptional,
  MinLength,
  Min,
  Max,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsInt()
  @Min(18)
  @Max(120)
  age?: number;
}
```

## Complete CRUD Example

```typescript
// users.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ): Promise<{ data: User[]; total: number }> {
    return await this.usersService.findAll(page, limit);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<User> {
    return await this.usersService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createUserDto: CreateUserDto): Promise<User> {
    return await this.usersService.create(createUserDto);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    return await this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.usersService.remove(id);
  }
}

// users.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async findAll(page: number, limit: number) {
    const [data, total] = await this.usersRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total };
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

## Scopes

### Provider Scope

```typescript
import { Injectable, Scope } from '@nestjs/common';

// DEFAULT - Single instance shared across entire application
@Injectable({ scope: Scope.DEFAULT })
export class UsersService {}

// REQUEST - New instance for each request
@Injectable({ scope: Scope.REQUEST })
export class RequestScopedService {}

// TRANSIENT - New instance every time it's injected
@Injectable({ scope: Scope.TRANSIENT })
export class TransientService {}
```

## Custom Providers

### Factory Providers

```typescript
// users.module.ts
import { Module } from '@nestjs/common';

@Module({
  providers: [
    {
      provide: 'CONNECTION',
      useFactory: async () => {
        const connection = await createConnection();
        return connection;
      },
    },
    UsersService,
  ],
})
export class UsersModule {}

// Usage in service
@Injectable()
export class UsersService {
  constructor(@Inject('CONNECTION') private connection: any) {}
}
```

### Async Providers

```typescript
@Module({
  providers: [
    {
      provide: 'ASYNC_CONNECTION',
      useFactory: async (configService: ConfigService) => {
        const config = configService.get('database');
        return await createConnection(config);
      },
      inject: [ConfigService],
    },
  ],
})
export class DatabaseModule {}
```

## Response Handling

### Returning Different Response Types

```typescript
@Controller('users')
export class UsersController {
  // Return object (auto-serialized to JSON)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return { id, name: 'John' };
  }

  // Return array
  @Get()
  async findAll() {
    return [{ id: 1 }, { id: 2 }];
  }

  // Return Promise
  @Get('async')
  async getAsync(): Promise<User> {
    return await this.usersService.findOne('1');
  }

  // Return Observable (RxJS)
  @Get('observable')
  getObservable(): Observable<User[]> {
    return of([{ id: 1, name: 'John' }]);
  }
}
```

### Custom Response

```typescript
import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Controller('users')
export class UsersController {
  @Get('custom')
  custom(@Res() res: Response) {
    res.status(HttpStatus.OK).json({
      message: 'Custom response',
      data: [],
    });
  }
}
```

## Interview Questions

### Q1: What is the difference between Controllers and Providers?

**Answer:**
- **Controllers**: Handle HTTP requests and responses, routing
- **Providers**: Contain business logic, can be injected as dependencies

Controllers are thin and delegate work to services (providers).

### Q2: What is the @Injectable() decorator?

**Answer:**
`@Injectable()` marks a class as a provider that can be managed by NestJS dependency injection system and injected into other classes.

```typescript
@Injectable()
export class UsersService {
  // Service logic
}
```

### Q3: How do you inject a service into a controller?

**Answer:**
Through constructor injection:

```typescript
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
}
```

### Q4: What are DTOs and why use them?

**Answer:**
DTOs (Data Transfer Objects) define the shape of data sent over the network. They provide:
- Type safety
- Validation
- Documentation
- Separation of API contract from internal models

### Q5: What is the difference between @Param() and @Query()?

**Answer:**
- `@Param()`: Extracts route parameters from URL path (`/users/:id`)
- `@Query()`: Extracts query string parameters (`/users?page=1&limit=10`)

```typescript
@Get(':id')
findOne(@Param('id') id: string) {} // /users/123

@Get()
findAll(@Query('page') page: number) {} // /users?page=2
```

## Best Practices

### ✅ Do's

1. **Keep controllers thin** - delegate to services
2. **Use DTOs for input validation**
3. **Use async/await for async operations**
4. **Inject dependencies through constructor**
5. **Use appropriate HTTP status codes**
6. **Return promises or observables**
7. **Keep business logic in services**

### ❌ Don'ts

1. **Don't put business logic in controllers**
2. **Don't use @Res() unless necessary**
3. **Don't skip validation**
4. **Don't mix concerns**
5. **Don't forget error handling**
6. **Don't expose internal errors**

## Summary

- Controllers handle HTTP requests and routing
- Providers (services) contain business logic
- Use dependency injection for loose coupling
- DTOs define data shape and validation
- Keep controllers thin, services fat
- Use decorators for routing and parameter extraction
- Return appropriate HTTP status codes
- Separate concerns between layers

---

[← Previous: Architecture & Modules](./01-architecture.md) | [Next: Middleware & Guards →](./03-middleware-guards.md)
