# Exception Filters

## Overview

Exception filters handle exceptions thrown during request processing. They provide a way to control the exact flow and content of responses sent back when exceptions occur. Understanding exception handling is crucial for building robust applications and is frequently tested in interviews.

## Built-in HTTP Exceptions

### Standard HTTP Exceptions

```typescript
import {
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
  NotAcceptableException,
  RequestTimeoutException,
  ConflictException,
  GoneException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
  UnprocessableEntityException,
  InternalServerErrorException,
  NotImplementedException,
  BadGatewayException,
  ServiceUnavailableException,
  GatewayTimeoutException,
} from '@nestjs/common';

@Controller('users')
export class UsersController {
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findOne(id);

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    const existing = await this.usersService.findByEmail(createUserDto.email);

    if (existing) {
      throw new ConflictException('Email already exists');
    }

    return this.usersService.create(createUserDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @User() user: any) {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Only admins can delete users');
    }

    return this.usersService.remove(id);
  }
}
```

### Custom Exception Messages

```typescript
// Simple message
throw new BadRequestException('Invalid input');

// Custom response
throw new BadRequestException({
  statusCode: 400,
  message: 'Validation failed',
  errors: ['Email is invalid', 'Password too short'],
});

// With cause (for logging)
throw new BadRequestException('Invalid input', {
  cause: originalError,
  description: 'Detailed description'
});
```

## Exception Filters

### Creating a Custom Exception Filter

```typescript
// filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: exception.message,
    });
  }
}
```

### Catch All Exceptions

```typescript
// filters/all-exceptions.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: typeof message === 'string' ? message : message['message'],
    });
  }
}
```

### Enhanced Exception Filter with Logging

```typescript
// filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    // Log error
    this.logger.error(
      `${request.method} ${request.url}`,
      JSON.stringify(exceptionResponse),
      exception.stack,
    );

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message:
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message,
    };

    // Include stack trace in development
    if (process.env.NODE_ENV === 'development') {
      errorResponse['stack'] = exception.stack;
    }

    response.status(status).json(errorResponse);
  }
}
```

### Validation Exception Filter

```typescript
// filters/validation-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    // Extract validation errors
    const message = (exceptionResponse as any).message;
    const errors = Array.isArray(message) ? message : [message];

    response.status(status).json({
      statusCode: status,
      message: 'Validation failed',
      errors: errors,
      timestamp: new Date().toISOString(),
    });
  }
}
```

## Applying Exception Filters

```typescript
// Method-level
@Post()
@UseFilters(HttpExceptionFilter)
create(@Body() createUserDto: CreateUserDto) {
  return this.usersService.create(createUserDto);
}

// Controller-level
@Controller('users')
@UseFilters(HttpExceptionFilter)
export class UsersController {}

// Global-level in main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.listen(3000);
}

// Global-level in module
@Module({
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
```

## Custom Exceptions

### Creating Custom Exception Classes

```typescript
// exceptions/business.exception.ts
import { HttpException, HttpStatus } from '@nestjs/common';

export class BusinessException extends HttpException {
  constructor(message: string, statusCode: HttpStatus = HttpStatus.BAD_REQUEST) {
    super(
      {
        statusCode,
        message,
        error: 'Business Rule Violation',
      },
      statusCode,
    );
  }
}

// exceptions/insufficient-funds.exception.ts
export class InsufficientFundsException extends HttpException {
  constructor(required: number, available: number) {
    super(
      {
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        message: 'Insufficient funds',
        error: 'Payment Failed',
        details: {
          required,
          available,
          deficit: required - available,
        },
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

// Usage
@Post('transfer')
async transfer(@Body() transferDto: TransferDto) {
  const balance = await this.accountService.getBalance(transferDto.from);

  if (balance < transferDto.amount) {
    throw new InsufficientFundsException(transferDto.amount, balance);
  }

  return this.accountService.transfer(transferDto);
}
```

### Domain-Specific Exceptions

```typescript
// exceptions/user-exceptions.ts
import { HttpException, HttpStatus } from '@nestjs/common';

export class UserNotFoundException extends HttpException {
  constructor(userId: string) {
    super(
      {
        statusCode: HttpStatus.NOT_FOUND,
        message: `User with ID ${userId} not found`,
        error: 'User Not Found',
      },
      HttpStatus.NOT_FOUND,
    );
  }
}

export class EmailAlreadyExistsException extends HttpException {
  constructor(email: string) {
    super(
      {
        statusCode: HttpStatus.CONFLICT,
        message: `Email ${email} is already registered`,
        error: 'Duplicate Email',
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class InvalidPasswordException extends HttpException {
  constructor() {
    super(
      {
        statusCode: HttpStatus.UNAUTHORIZED,
        message: 'Invalid password',
        error: 'Authentication Failed',
      },
      HttpStatus.UNAUTHORIZED,
    );
  }
}

// Usage in service
async create(createUserDto: CreateUserDto): Promise<User> {
  const existing = await this.findByEmail(createUserDto.email);

  if (existing) {
    throw new EmailAlreadyExistsException(createUserDto.email);
  }

  return this.usersRepository.save(createUserDto);
}
```

## Complete Exception Handling System

```typescript
// filters/all-exceptions.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string | object;
    let errorName: string;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : exceptionResponse;
      errorName = exception.name;
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = exception.message;
      errorName = exception.name;

      // Log unexpected errors
      this.logger.error(
        `Unexpected error: ${exception.message}`,
        exception.stack,
      );
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      errorName = 'UnknownError';

      this.logger.error('Unknown exception', JSON.stringify(exception));
    }

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      error: errorName,
    };

    // Include request details in development
    if (process.env.NODE_ENV === 'development') {
      errorResponse['body'] = request.body;
      errorResponse['query'] = request.query;
      errorResponse['params'] = request.params;

      if (exception instanceof Error) {
        errorResponse['stack'] = exception.stack;
      }
    }

    response.status(status).json(errorResponse);
  }
}
```

## Error Response Formats

### Consistent Error Format

```typescript
interface ErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
  details?: any;
}

// Example responses:
// 404 Not Found
{
  "statusCode": 404,
  "message": "User with ID 123 not found",
  "error": "Not Found",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/users/123"
}

// 400 Validation Error
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/users",
  "details": [
    "email must be a valid email",
    "password must be at least 8 characters"
  ]
}

// 500 Internal Server Error (Production)
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Internal Server Error",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/users"
}
```

## Best Practices Example

```typescript
// Complete setup
// main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        const messages = errors.map(
          (error) => `${error.property}: ${Object.values(error.constraints || {}).join(', ')}`,
        );

        return new BadRequestException({
          message: 'Validation failed',
          errors: messages,
        });
      },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  await app.listen(3000);
}
bootstrap();
```

## Interview Questions

### Q1: What is an Exception Filter?

**Answer:**
An Exception Filter handles exceptions thrown during request processing. It implements the `ExceptionFilter` interface and uses `@Catch()` decorator to specify which exceptions to catch.

```typescript
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    // Handle exception
  }
}
```

### Q2: How do you create a custom exception?

**Answer:**
Extend `HttpException` or its subclasses:

```typescript
export class UserNotFoundException extends HttpException {
  constructor(userId: string) {
    super(`User ${userId} not found`, HttpStatus.NOT_FOUND);
  }
}
```

### Q3: What is the difference between @Catch() and @Catch(HttpException)?

**Answer:**
- `@Catch()`: Catches all exceptions (no parameter)
- `@Catch(HttpException)`: Catches only `HttpException` and its subclasses

### Q4: How do you apply an exception filter globally?

**Answer:**
```typescript
// In main.ts
app.useGlobalFilters(new AllExceptionsFilter());

// Or in module
@Module({
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
```

### Q5: What is ArgumentsHost?

**Answer:**
`ArgumentsHost` provides methods to retrieve the arguments being passed to a handler. It allows switching between HTTP, RPC, and WebSockets contexts.

```typescript
const ctx = host.switchToHttp();
const request = ctx.getRequest();
const response = ctx.getResponse();
```

## Best Practices

### ✅ Do's

1. **Use global exception filters**
2. **Create domain-specific exceptions**
3. **Log errors appropriately**
4. **Return consistent error format**
5. **Hide sensitive info in production**
6. **Use appropriate HTTP status codes**
7. **Include timestamps and request paths**
8. **Validate input with pipes**

### ❌ Don'ts

1. **Don't expose stack traces in production**
2. **Don't leak sensitive information**
3. **Don't ignore exceptions**
4. **Don't use generic error messages**
5. **Don't forget to log errors**
6. **Don't return HTML in API errors**

## Summary

- Exception filters handle thrown exceptions
- Use `@Catch()` to specify exception types
- Create custom exceptions extending HttpException
- Apply filters at method, controller, or global level
- Return consistent error response format
- Log errors for debugging
- Hide sensitive info in production
- Use appropriate HTTP status codes

---

[← Previous: Pipes & Interceptors](./04-pipes-interceptors.md) | [Next: Database Integration →](./06-database.md)
