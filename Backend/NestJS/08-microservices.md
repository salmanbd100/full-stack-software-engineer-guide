# Microservices

## Overview

NestJS provides built-in support for microservices architecture. It supports multiple transport layers including TCP, Redis, NATS, MQTT, gRPC, and RabbitMQ. Understanding microservices patterns is essential for building scalable distributed systems and is frequently covered in senior-level interviews.

## Microservices vs Monolith

### Monolithic Architecture
- Single codebase
- Single deployment unit
- Easier to develop initially
- Simple testing
- Single database

### Microservices Architecture
- Multiple independent services
- Independent deployment
- Technology diversity
- Better scalability
- Distributed system complexity

## Setting Up Microservices

### Creating a Microservice

```typescript
// main.ts (microservice)
import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.TCP,
      options: {
        host: 'localhost',
        port: 3001,
      },
    },
  );

  await app.listen();
  console.log('Microservice is listening on port 3001');
}
bootstrap();
```

### Hybrid Application (HTTP + Microservice)

```typescript
// main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Add microservice
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: 'localhost',
      port: 3001,
    },
  });

  await app.startAllMicroservices();
  await app.listen(3000);

  console.log('HTTP server running on port 3000');
  console.log('Microservice listening on port 3001');
}
bootstrap();
```

## Message Patterns

### Request-Response Pattern

```typescript
// microservice controller
import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';

@Controller()
export class UsersController {
  @MessagePattern({ cmd: 'get_user' })
  getUser(data: { id: string }) {
    return {
      id: data.id,
      name: 'John Doe',
      email: 'john@example.com',
    };
  }

  @MessagePattern({ cmd: 'create_user' })
  createUser(data: CreateUserDto) {
    // Create user logic
    return {
      id: '123',
      ...data,
    };
  }
}

// client (API Gateway)
import { Controller, Get, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Controller('users')
export class UsersController {
  constructor(
    @Inject('USER_SERVICE')
    private readonly userService: ClientProxy,
  ) {}

  @Get(':id')
  async getUser(@Param('id') id: string) {
    return this.userService.send({ cmd: 'get_user' }, { id });
  }

  @Post()
  async createUser(@Body() createUserDto: CreateUserDto) {
    return this.userService.send({ cmd: 'create_user' }, createUserDto);
  }
}
```

### Event-Based Pattern

```typescript
// Publisher
import { EventPattern } from '@nestjs/microservices';

@Controller()
export class OrdersController {
  constructor(
    @Inject('NOTIFICATION_SERVICE')
    private readonly notificationService: ClientProxy,
  ) {}

  @Post()
  async createOrder(@Body() createOrderDto: CreateOrderDto) {
    const order = await this.ordersService.create(createOrderDto);

    // Emit event
    this.notificationService.emit('order_created', order);

    return order;
  }
}

// Subscriber
@Controller()
export class NotificationsController {
  @EventPattern('order_created')
  handleOrderCreated(data: any) {
    console.log('Order created:', data);
    // Send email, push notification, etc.
  }
}
```

## Transport Layers

### TCP Transport

```typescript
// Microservice
const app = await NestFactory.createMicroservice(AppModule, {
  transport: Transport.TCP,
  options: {
    host: 'localhost',
    port: 3001,
  },
});

// Client
@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'USER_SERVICE',
        transport: Transport.TCP,
        options: {
          host: 'localhost',
          port: 3001,
        },
      },
    ]),
  ],
})
export class AppModule {}
```

### Redis Transport

```typescript
// Install: npm install ioredis

// Microservice
const app = await NestFactory.createMicroservice(AppModule, {
  transport: Transport.REDIS,
  options: {
    host: 'localhost',
    port: 6379,
  },
});

// Client
ClientsModule.register([
  {
    name: 'REDIS_SERVICE',
    transport: Transport.REDIS,
    options: {
      host: 'localhost',
      port: 6379,
    },
  },
]);
```

### RabbitMQ Transport

```typescript
// Install: npm install amqplib amqp-connection-manager

// Microservice
const app = await NestFactory.createMicroservice(AppModule, {
  transport: Transport.RMQ,
  options: {
    urls: ['amqp://localhost:5672'],
    queue: 'users_queue',
    queueOptions: {
      durable: false,
    },
  },
});

// Client
ClientsModule.register([
  {
    name: 'USER_SERVICE',
    transport: Transport.RMQ,
    options: {
      urls: ['amqp://localhost:5672'],
      queue: 'users_queue',
      queueOptions: {
        durable: false,
      },
    },
  },
]);
```

### NATS Transport

```typescript
// Install: npm install nats

// Microservice
const app = await NestFactory.createMicroservice(AppModule, {
  transport: Transport.NATS,
  options: {
    servers: ['nats://localhost:4222'],
  },
});

// Client
ClientsModule.register([
  {
    name: 'NATS_SERVICE',
    transport: Transport.NATS,
    options: {
      servers: ['nats://localhost:4222'],
    },
  },
]);
```

## gRPC

### Setting Up gRPC

```bash
npm install @grpc/grpc-js @grpc/proto-loader
```

### Proto File

```protobuf
// users.proto
syntax = "proto3";

package users;

service UsersService {
  rpc FindOne (UserById) returns (User) {}
  rpc FindAll (Empty) returns (Users) {}
  rpc CreateUser (CreateUserRequest) returns (User) {}
}

message UserById {
  string id = 1;
}

message Empty {}

message User {
  string id = 1;
  string name = 2;
  string email = 3;
}

message Users {
  repeated User users = 1;
}

message CreateUserRequest {
  string name = 1;
  string email = 2;
  string password = 3;
}
```

### gRPC Microservice

```typescript
// main.ts
import { join } from 'path';

const app = await NestFactory.createMicroservice<MicroserviceOptions>(
  AppModule,
  {
    transport: Transport.GRPC,
    options: {
      package: 'users',
      protoPath: join(__dirname, '../proto/users.proto'),
      url: 'localhost:5000',
    },
  },
);

// controller
import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';

@Controller()
export class UsersController {
  @GrpcMethod('UsersService', 'FindOne')
  findOne(data: { id: string }) {
    return {
      id: data.id,
      name: 'John Doe',
      email: 'john@example.com',
    };
  }

  @GrpcMethod('UsersService', 'FindAll')
  findAll() {
    return {
      users: [
        { id: '1', name: 'John', email: 'john@example.com' },
        { id: '2', name: 'Jane', email: 'jane@example.com' },
      ],
    };
  }

  @GrpcMethod('UsersService', 'CreateUser')
  createUser(data: CreateUserRequest) {
    return {
      id: '123',
      ...data,
    };
  }
}
```

### gRPC Client

```typescript
// app.module.ts
ClientsModule.register([
  {
    name: 'USER_PACKAGE',
    transport: Transport.GRPC,
    options: {
      package: 'users',
      protoPath: join(__dirname, '../proto/users.proto'),
      url: 'localhost:5000',
    },
  },
]);

// controller
@Controller('users')
export class UsersController {
  constructor(
    @Inject('USER_PACKAGE')
    private readonly client: ClientGrpc,
  ) {}

  private usersService: any;

  onModuleInit() {
    this.usersService = this.client.getService<any>('UsersService');
  }

  @Get(':id')
  getUser(@Param('id') id: string) {
    return this.usersService.FindOne({ id });
  }

  @Get()
  getAllUsers() {
    return this.usersService.FindAll({});
  }

  @Post()
  createUser(@Body() createUserDto: CreateUserDto) {
    return this.usersService.CreateUser(createUserDto);
  }
}
```

## API Gateway Pattern

```typescript
// api-gateway/src/main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  await app.listen(3000);
  console.log('API Gateway running on port 3000');
}

// api-gateway/src/app.module.ts
@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'USER_SERVICE',
        transport: Transport.TCP,
        options: { host: 'localhost', port: 3001 },
      },
      {
        name: 'ORDER_SERVICE',
        transport: Transport.TCP,
        options: { host: 'localhost', port: 3002 },
      },
      {
        name: 'PAYMENT_SERVICE',
        transport: Transport.TCP,
        options: { host: 'localhost', port: 3003 },
      },
    ]),
  ],
  controllers: [UsersController, OrdersController, PaymentsController],
})
export class AppModule {}

// api-gateway/src/users/users.controller.ts
@Controller('users')
export class UsersController {
  constructor(
    @Inject('USER_SERVICE')
    private readonly userService: ClientProxy,
  ) {}

  @Get()
  getAllUsers() {
    return this.userService.send({ cmd: 'get_users' }, {});
  }

  @Get(':id')
  getUser(@Param('id') id: string) {
    return this.userService.send({ cmd: 'get_user' }, { id });
  }

  @Post()
  createUser(@Body() createUserDto: CreateUserDto) {
    return this.userService.send({ cmd: 'create_user' }, createUserDto);
  }
}
```

## Error Handling

### Microservice Errors

```typescript
// Microservice
import { RpcException } from '@nestjs/microservices';

@Controller()
export class UsersController {
  @MessagePattern({ cmd: 'get_user' })
  async getUser(data: { id: string }) {
    const user = await this.usersService.findOne(data.id);

    if (!user) {
      throw new RpcException({
        statusCode: 404,
        message: `User with ID ${data.id} not found`,
      });
    }

    return user;
  }
}

// Client
@Get(':id')
async getUser(@Param('id') id: string) {
  try {
    return await firstValueFrom(
      this.userService.send({ cmd: 'get_user' }, { id }),
    );
  } catch (error) {
    throw new NotFoundException(error.message);
  }
}
```

## Service Discovery

### Consul Integration

```bash
npm install consul
```

```typescript
// service-discovery.service.ts
import * as Consul from 'consul';

@Injectable()
export class ServiceDiscoveryService {
  private consul: Consul.Consul;

  constructor() {
    this.consul = new Consul({
      host: 'localhost',
      port: 8500,
    });
  }

  async registerService(name: string, port: number) {
    await this.consul.agent.service.register({
      name,
      address: 'localhost',
      port,
      check: {
        http: `http://localhost:${port}/health`,
        interval: '10s',
      },
    });
  }

  async getService(name: string) {
    const result = await this.consul.health.service({
      service: name,
      passing: true,
    });

    if (result.length === 0) {
      throw new Error(`Service ${name} not found`);
    }

    return result[0];
  }
}
```

## Microservices Best Practices

### 1. Service Communication

```typescript
// Use timeouts
this.userService.send({ cmd: 'get_user' }, { id }).pipe(
  timeout(5000),
  catchError(err => {
    throw new RequestTimeoutException('User service timeout');
  }),
);

// Retry logic
this.userService.send({ cmd: 'get_user' }, { id }).pipe(
  retry(3),
  catchError(err => {
    throw new ServiceUnavailableException('User service unavailable');
  }),
);
```

### 2. Health Checks

```typescript
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
```

### 3. Circuit Breaker Pattern

```bash
npm install opossum
```

```typescript
import * as CircuitBreaker from 'opossum';

@Injectable()
export class UserServiceClient {
  private breaker: CircuitBreaker;

  constructor(
    @Inject('USER_SERVICE')
    private readonly userService: ClientProxy,
  ) {
    this.breaker = new CircuitBreaker(
      async (data) => {
        return firstValueFrom(
          this.userService.send({ cmd: 'get_user' }, data),
        );
      },
      {
        timeout: 3000,
        errorThresholdPercentage: 50,
        resetTimeout: 30000,
      },
    );

    this.breaker.fallback(() => ({ id: data.id, name: 'Unknown' }));
  }

  async getUser(id: string) {
    return await this.breaker.fire({ id });
  }
}
```

## Interview Questions

### Q1: What is a microservice?

**Answer:**
A microservice is an independently deployable service that focuses on a specific business capability. It runs in its own process and communicates via network protocols like HTTP, TCP, or message queues.

### Q2: What transport layers does NestJS support?

**Answer:**
- TCP
- Redis
- NATS
- MQTT
- RabbitMQ (AMQP)
- gRPC
- Kafka

### Q3: What is the difference between send() and emit()?

**Answer:**
- `send()`: Request-response pattern, waits for response
- `emit()`: Event-based pattern, fire-and-forget

### Q4: What is an API Gateway?

**Answer:**
An API Gateway is a single entry point for all clients. It routes requests to appropriate microservices, handles authentication, rate limiting, and aggregates responses.

### Q5: How do you handle errors in microservices?

**Answer:**
Use `RpcException` in microservice and catch it in client:

```typescript
// Microservice
throw new RpcException({ statusCode: 404, message: 'Not found' });

// Client
try {
  return await firstValueFrom(this.service.send({ cmd: 'get' }, data));
} catch (error) {
  throw new NotFoundException(error.message);
}
```

## Best Practices

### ✅ Do's

1. **Use API Gateway pattern**
2. **Implement health checks**
3. **Use timeouts and retries**
4. **Implement circuit breakers**
5. **Log all service communication**
6. **Use service discovery**
7. **Version your APIs**
8. **Implement distributed tracing**

### ❌ Don'ts

1. **Don't share databases between services**
2. **Don't create too many microservices**
3. **Don't skip error handling**
4. **Don't forget timeouts**
5. **Don't ignore monitoring**
6. **Don't create circular dependencies**

## Summary

- NestJS supports multiple transport layers
- Use API Gateway for single entry point
- Implement request-response and event patterns
- gRPC for high-performance communication
- Handle errors with RpcException
- Implement circuit breakers and retries
- Use service discovery for dynamic routing
- Monitor and trace all service communication

---

[← Previous: Testing](./07-testing.md) | [Back to Backend →](../README.md)
