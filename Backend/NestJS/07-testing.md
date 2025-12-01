# Testing in NestJS

## Overview

Testing is a crucial part of software development. NestJS provides excellent testing utilities out of the box with Jest integration. Understanding how to write unit and integration tests is essential for building reliable applications and is frequently covered in interviews.

## Testing Setup

### Built-in Testing

NestJS uses Jest by default. Configuration is already set up when you create a new NestJS project.

```json
// package.json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:debug": "node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand",
    "test:e2e": "jest --config ./test/jest-e2e.json"
  }
}
```

## Unit Testing

### Testing a Service

```typescript
// users.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { NotFoundException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;
  let repository: Repository<User>;

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      const users = [
        { id: '1', name: 'John', email: 'john@example.com' },
        { id: '2', name: 'Jane', email: 'jane@example.com' },
      ];

      mockRepository.find.mockResolvedValue(users);

      const result = await service.findAll();

      expect(result).toEqual(users);
      expect(mockRepository.find).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      const user = { id: '1', name: 'John', email: 'john@example.com' };

      mockRepository.findOne.mockResolvedValue(user);

      const result = await service.findOne('1');

      expect(result).toEqual(user);
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create and return a new user', async () => {
      const createUserDto = {
        name: 'John',
        email: 'john@example.com',
        password: 'password123',
      };

      const user = { id: '1', ...createUserDto };

      mockRepository.create.mockReturnValue(user);
      mockRepository.save.mockResolvedValue(user);

      const result = await service.create(createUserDto);

      expect(result).toEqual(user);
      expect(mockRepository.create).toHaveBeenCalledWith(createUserDto);
      expect(mockRepository.save).toHaveBeenCalledWith(user);
    });
  });

  describe('remove', () => {
    it('should remove a user', async () => {
      mockRepository.delete.mockResolvedValue({ affected: 1 });

      await service.remove('1');

      expect(mockRepository.delete).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException if user not found', async () => {
      mockRepository.delete.mockResolvedValue({ affected: 0 });

      await expect(service.remove('1')).rejects.toThrow(NotFoundException);
    });
  });
});
```

### Testing a Controller

```typescript
// users.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockUsersService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      const users = [{ id: '1', name: 'John' }];
      mockUsersService.findAll.mockResolvedValue(users);

      const result = await controller.findAll();

      expect(result).toEqual(users);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single user', async () => {
      const user = { id: '1', name: 'John' };
      mockUsersService.findOne.mockResolvedValue(user);

      const result = await controller.findOne('1');

      expect(result).toEqual(user);
      expect(service.findOne).toHaveBeenCalledWith('1');
    });
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const createUserDto = {
        name: 'John',
        email: 'john@example.com',
        password: 'password123',
      };

      const user = { id: '1', ...createUserDto };
      mockUsersService.create.mockResolvedValue(user);

      const result = await controller.create(createUserDto);

      expect(result).toEqual(user);
      expect(service.create).toHaveBeenCalledWith(createUserDto);
    });
  });
});
```

### Testing Guards

```typescript
// auth.guard.spec.ts
import { ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let jwtService: JwtService;

  beforeEach(() => {
    jwtService = new JwtService({ secret: 'test-secret' });
    guard = new AuthGuard(jwtService);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should return true for valid token', async () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {
            authorization: 'Bearer valid-token',
          },
        }),
      }),
    } as ExecutionContext;

    jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue({
      userId: '1',
      email: 'test@example.com',
    });

    const result = await guard.canActivate(mockContext);

    expect(result).toBe(true);
  });

  it('should throw UnauthorizedException for missing token', async () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {},
        }),
      }),
    } as ExecutionContext;

    await expect(guard.canActivate(mockContext)).rejects.toThrow(
      'No token provided',
    );
  });
});
```

## Integration Testing (E2E)

### Testing API Endpoints

```typescript
// test/users.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../src/users/entities/user.entity';

describe('UsersController (e2e)', () => {
  let app: INestApplication;
  let userRepository;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    userRepository = moduleFixture.get(getRepositoryToken(User));

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await userRepository.clear();
  });

  describe('/users (POST)', () => {
    it('should create a new user', () => {
      const createUserDto = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
      };

      return request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.name).toEqual(createUserDto.name);
          expect(res.body.email).toEqual(createUserDto.email);
          expect(res.body).not.toHaveProperty('password');
          expect(res.body).toHaveProperty('id');
        });
    });

    it('should return 400 for invalid email', () => {
      const createUserDto = {
        name: 'John Doe',
        email: 'invalid-email',
        password: 'password123',
      };

      return request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(400);
    });

    it('should return 409 for duplicate email', async () => {
      const createUserDto = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
      };

      // Create first user
      await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(201);

      // Try to create duplicate
      return request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(409);
    });
  });

  describe('/users (GET)', () => {
    it('should return an array of users', async () => {
      // Create test users
      await userRepository.save([
        { name: 'John', email: 'john@example.com', password: 'pass123' },
        { name: 'Jane', email: 'jane@example.com', password: 'pass123' },
      ]);

      return request(app.getHttpServer())
        .get('/users')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body).toHaveLength(2);
        });
    });
  });

  describe('/users/:id (GET)', () => {
    it('should return a user by id', async () => {
      const user = await userRepository.save({
        name: 'John',
        email: 'john@example.com',
        password: 'pass123',
      });

      return request(app.getHttpServer())
        .get(`/users/${user.id}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toEqual(user.id);
          expect(res.body.name).toEqual(user.name);
        });
    });

    it('should return 404 for non-existent user', () => {
      return request(app.getHttpServer())
        .get('/users/non-existent-id')
        .expect(404);
    });
  });

  describe('/users/:id (DELETE)', () => {
    it('should delete a user', async () => {
      const user = await userRepository.save({
        name: 'John',
        email: 'john@example.com',
        password: 'pass123',
      });

      await request(app.getHttpServer())
        .delete(`/users/${user.id}`)
        .expect(204);

      const deletedUser = await userRepository.findOne({ where: { id: user.id } });
      expect(deletedUser).toBeNull();
    });
  });
});
```

### Testing with Authentication

```typescript
describe('Protected Routes (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Get auth token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123',
      });

    authToken = loginResponse.body.token;
  });

  it('should access protected route with valid token', () => {
    return request(app.getHttpServer())
      .get('/profile')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
  });

  it('should deny access without token', () => {
    return request(app.getHttpServer())
      .get('/profile')
      .expect(401);
  });

  it('should deny access with invalid token', () => {
    return request(app.getHttpServer())
      .get('/profile')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
  });
});
```

## Mocking

### Mock Providers

```typescript
const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock-token'),
  verify: jest.fn().mockReturnValue({ userId: '1' }),
};

const module = await Test.createTestingModule({
  providers: [
    AuthService,
    {
      provide: JwtService,
      useValue: mockJwtService,
    },
  ],
}).compile();
```

### Mock Database

```typescript
const mockUsersRepository = {
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  delete: jest.fn(),
};

const module = await Test.createTestingModule({
  providers: [
    UsersService,
    {
      provide: getRepositoryToken(User),
      useValue: mockUsersRepository,
    },
  ],
}).compile();
```

## Test Utilities

### Creating Test Helpers

```typescript
// test/helpers.ts
export const createMockExecutionContext = (request: any): ExecutionContext => {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
    }),
    getClass: () => ({}),
    getHandler: () => ({}),
  } as ExecutionContext;
};

export const mockUser = {
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'user',
};

export const mockAuthToken = 'mock-auth-token';
```

## Coverage

### Running Coverage

```bash
npm run test:cov
```

### Coverage Configuration

```javascript
// jest.config.js
module.exports = {
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.spec.ts',
    '!**/*.e2e-spec.ts',
    '!**/node_modules/**',
    '!**/dist/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

## Interview Questions

### Q1: How do you test a service that depends on a repository?

**Answer:**
Mock the repository:

```typescript
const mockRepository = { find: jest.fn(), save: jest.fn() };

const module = await Test.createTestingModule({
  providers: [
    UsersService,
    {
      provide: getRepositoryToken(User),
      useValue: mockRepository,
    },
  ],
}).compile();
```

### Q2: What is the difference between unit tests and e2e tests?

**Answer:**
- **Unit tests**: Test individual components in isolation, fast, many
- **E2E tests**: Test entire application flow, slower, fewer, use real HTTP requests

### Q3: How do you create a testing module?

**Answer:**
```typescript
const module = await Test.createTestingModule({
  controllers: [UsersController],
  providers: [UsersService],
}).compile();
```

### Q4: How do you test protected routes in e2e tests?

**Answer:**
Get auth token and include in request:

```typescript
const response = await request(app.getHttpServer())
  .post('/auth/login')
  .send({ email, password });

const token = response.body.token;

await request(app.getHttpServer())
  .get('/profile')
  .set('Authorization', `Bearer ${token}`)
  .expect(200);
```

### Q5: What should you test in a NestJS application?

**Answer:**
- Service business logic
- Controller request/response handling
- Guards authorization logic
- Pipes validation/transformation
- E2E API endpoints
- Error handling

## Best Practices

### ✅ Do's

1. **Write tests for all services**
2. **Mock external dependencies**
3. **Test error cases**
4. **Use descriptive test names**
5. **Keep tests isolated**
6. **Aim for high coverage (80%+)**
7. **Test edge cases**
8. **Use beforeEach for setup**

### ❌ Don'ts

1. **Don't test implementation details**
2. **Don't skip error testing**
3. **Don't use real database in unit tests**
4. **Don't write dependent tests**
5. **Don't ignore test failures**
6. **Don't over-mock**

## Summary

- NestJS uses Jest for testing
- Unit tests for services, controllers, guards
- E2E tests for API endpoints
- Mock dependencies with Test.createTestingModule
- Use supertest for E2E HTTP testing
- Aim for high test coverage
- Test both success and error cases
- Keep tests isolated and maintainable

---

[← Previous: Database Integration](./06-database.md) | [Next: Microservices →](./08-microservices.md)
