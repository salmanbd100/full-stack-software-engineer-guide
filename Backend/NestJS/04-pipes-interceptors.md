# Pipes & Interceptors

## Overview

Pipes are used for data transformation and validation before it reaches the route handler. Interceptors add extra logic before and after method execution. Both are essential for building robust NestJS applications and are frequently covered in interviews.

## Pipes

### What is a Pipe?

A pipe is a class annotated with `@Injectable()` that implements the `PipeTransform` interface. Pipes have two typical use cases:
- **Transformation**: Transform input data to desired form
- **Validation**: Validate input data, throw exception if invalid

### Built-in Pipes

```typescript
import {
  ValidationPipe,
  ParseIntPipe,
  ParseBoolPipe,
  ParseArrayPipe,
  ParseUUIDPipe,
  DefaultValuePipe,
} from '@nestjs/common';

@Controller('users')
export class UsersController {
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return `User ${id}`;
  }

  @Get()
  findAll(@Query('active', ParseBoolPipe) active: boolean) {
    return `Active: ${active}`;
  }

  @Get('by-uuid/:id')
  findByUUID(@Param('id', ParseUUIDPipe) id: string) {
    return `UUID: ${id}`;
  }
}
```

### Validation Pipe

```typescript
// DTOs with class-validator
import { IsEmail, IsString, MinLength, IsInt, Min } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsInt()
  @Min(18)
  age: number;
}

// main.ts - Global validation
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error if non-whitelisted properties exist
      transform: true, // Auto-transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true, // Auto-convert types
      },
    }),
  );

  await app.listen(3000);
}

// Controller with validation
@Controller('users')
export class UsersController {
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    // createUserDto is already validated
    return this.usersService.create(createUserDto);
  }
}
```

### Custom Pipe

```typescript
// pipes/parse-int.pipe.ts
import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';

@Injectable()
export class ParseIntPipe implements PipeTransform<string, number> {
  transform(value: string, metadata: ArgumentMetadata): number {
    const val = parseInt(value, 10);

    if (isNaN(val)) {
      throw new BadRequestException('Validation failed. Expected number.');
    }

    return val;
  }
}

// Usage
@Get(':id')
findOne(@Param('id', ParseIntPipe) id: number) {
  return `User ${id}`;
}
```

### Transformation Pipe

```typescript
// pipes/trim.pipe.ts
import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

@Injectable()
export class TrimPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    if (typeof value === 'string') {
      return value.trim();
    }

    if (typeof value === 'object') {
      Object.keys(value).forEach((key) => {
        if (typeof value[key] === 'string') {
          value[key] = value[key].trim();
        }
      });
    }

    return value;
  }
}

// Usage
@Post()
create(@Body(TrimPipe) createUserDto: CreateUserDto) {
  return this.usersService.create(createUserDto);
}
```

### Schema Validation Pipe

```typescript
// pipes/joi-validation.pipe.ts
import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { ObjectSchema } from 'joi';

@Injectable()
export class JoiValidationPipe implements PipeTransform {
  constructor(private schema: ObjectSchema) {}

  transform(value: any, metadata: ArgumentMetadata) {
    const { error, value: validated } = this.schema.validate(value);

    if (error) {
      throw new BadRequestException('Validation failed', {
        cause: error,
        description: error.details.map((d) => d.message).join(', '),
      });
    }

    return validated;
  }
}

// Usage with Joi
import * as Joi from 'joi';

const createUserSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  age: Joi.number().integer().min(18).required(),
});

@Post()
create(
  @Body(new JoiValidationPipe(createUserSchema))
  createUserDto: CreateUserDto,
) {
  return this.usersService.create(createUserDto);
}
```

### Applying Pipes

```typescript
// Parameter-level
@Get(':id')
findOne(@Param('id', ParseIntPipe) id: number) {}

// Method-level
@Post()
@UsePipes(ValidationPipe)
create(@Body() createUserDto: CreateUserDto) {}

// Controller-level
@Controller('users')
@UsePipes(ValidationPipe)
export class UsersController {}

// Global-level
app.useGlobalPipes(new ValidationPipe());

// Or in module
@Module({
  providers: [
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
  ],
})
export class AppModule {}
```

## Interceptors

### What is an Interceptor?

An interceptor is a class annotated with `@Injectable()` that implements the `NestInterceptor` interface. Interceptors can:
- Add extra logic before/after method execution
- Transform the result returned from a function
- Transform exceptions thrown from a function
- Extend basic function behavior
- Completely override a function

### Basic Interceptor

```typescript
// interceptors/logging.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();
    const request = context.switchToHttp().getRequest();

    console.log(`Before... ${request.method} ${request.url}`);

    return next.handle().pipe(
      tap(() => {
        console.log(`After... ${Date.now() - now}ms`);
      }),
    );
  }
}
```

### Response Transformation Interceptor

```typescript
// interceptors/transform.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  data: T;
  statusCode: number;
  message: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => ({
        data,
        statusCode: context.switchToHttp().getResponse().statusCode,
        message: 'Success',
        timestamp: new Date().toISOString(),
      })),
    );
  }
}

// Usage
@Controller('users')
@UseInterceptors(TransformInterceptor)
export class UsersController {
  @Get()
  findAll() {
    return [{ id: 1, name: 'John' }];
  }
}

// Response:
// {
//   "data": [{ "id": 1, "name": "John" }],
//   "statusCode": 200,
//   "message": "Success",
//   "timestamp": "2024-01-01T00:00:00.000Z"
// }
```

### Caching Interceptor

```typescript
// interceptors/cache.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private cache = new Map();

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const key = `${request.method}:${request.url}`;

    if (this.cache.has(key)) {
      console.log('Returning from cache');
      return of(this.cache.get(key));
    }

    return next.handle().pipe(
      tap((response) => {
        console.log('Storing in cache');
        this.cache.set(key, response);
      }),
    );
  }
}
```

### Timeout Interceptor

```typescript
// interceptors/timeout.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  RequestTimeoutException,
} from '@nestjs/common';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      timeout(5000), // 5 seconds
      catchError((err) => {
        if (err instanceof TimeoutError) {
          return throwError(() => new RequestTimeoutException());
        }
        return throwError(() => err);
      }),
    );
  }
}
```

### Error Handling Interceptor

```typescript
// interceptors/errors.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class ErrorsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((err) => {
        if (err instanceof HttpException) {
          return throwError(() => err);
        }

        return throwError(
          () =>
            new HttpException(
              'Internal server error',
              HttpStatus.INTERNAL_SERVER_ERROR,
            ),
        );
      }),
    );
  }
}
```

### Applying Interceptors

```typescript
// Method-level
@Get()
@UseInterceptors(LoggingInterceptor)
findAll() {}

// Controller-level
@Controller('users')
@UseInterceptors(LoggingInterceptor, TransformInterceptor)
export class UsersController {}

// Global-level
app.useGlobalInterceptors(new LoggingInterceptor());

// Or in module
@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
```

## Combining Pipes and Interceptors

```typescript
@Controller('users')
@UseInterceptors(LoggingInterceptor, TransformInterceptor)
export class UsersController {
  @Post()
  @UsePipes(ValidationPipe)
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get(':id')
  @UseInterceptors(CacheInterceptor)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }
}
```

## Advanced Examples

### Custom Validation Pipe with Detailed Errors

```typescript
@Injectable()
export class CustomValidationPipe implements PipeTransform<any> {
  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    const object = plainToInstance(metatype, value);
    const errors = await validate(object);

    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: this.formatErrors(errors),
      });
    }

    return value;
  }

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  private formatErrors(errors: ValidationError[]) {
    return errors.reduce((acc, err) => {
      acc[err.property] = Object.values(err.constraints || {});
      return acc;
    }, {});
  }
}
```

### Rate Limiting Interceptor

```typescript
@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  private requests = new Map<string, number[]>();
  private readonly limit = 10; // 10 requests
  private readonly window = 60000; // per minute

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const key = request.ip;
    const now = Date.now();

    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }

    const timestamps = this.requests.get(key)!;
    const recentRequests = timestamps.filter((t) => now - t < this.window);

    if (recentRequests.length >= this.limit) {
      throw new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS);
    }

    recentRequests.push(now);
    this.requests.set(key, recentRequests);

    return next.handle();
  }
}
```

## Interview Questions

### Q1: What is the difference between Pipes and Interceptors?

**Answer:**
- **Pipes**: Transform/validate input data BEFORE reaching handler
- **Interceptors**: Add logic BEFORE and AFTER handler execution

Pipes work on input, Interceptors work on input/output and can transform responses.

### Q2: What are the two main use cases for Pipes?

**Answer:**
1. **Transformation**: Transform input data (e.g., string to integer)
2. **Validation**: Validate input data and throw exception if invalid

### Q3: What is the execution order in the request pipeline?

**Answer:**
```
Middleware → Guards → Interceptors (before) → Pipes → Handler → Interceptors (after) → Filters
```

### Q4: How do you make a pipe global?

**Answer:**
```typescript
// main.ts
app.useGlobalPipes(new ValidationPipe());

// Or in module
@Module({
  providers: [
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
  ],
})
```

### Q5: What can Interceptors do that Pipes cannot?

**Answer:**
Interceptors can:
- Execute logic after handler completes
- Transform response data
- Handle exceptions
- Add timing/logging
- Cache responses
- Override method execution

## Best Practices

### ✅ Do's

1. **Use ValidationPipe globally**
2. **Use built-in pipes when possible**
3. **Keep pipes focused on single responsibility**
4. **Use interceptors for cross-cutting concerns**
5. **Transform responses consistently**
6. **Handle errors in interceptors**
7. **Use whitelist in ValidationPipe**

### ❌ Don'ts

1. **Don't put business logic in pipes**
2. **Don't skip validation**
3. **Don't forget to return next.handle()**
4. **Don't make interceptors too complex**
5. **Don't use pipes for authentication**
6. **Don't ignore transformation errors**

## Summary

- Pipes transform and validate input data
- Interceptors add logic before/after handlers
- Use ValidationPipe for DTO validation
- Use interceptors for logging, caching, transformation
- Pipes execute before handler, interceptors before AND after
- Apply at parameter, method, controller, or global level
- Keep both focused and single-purpose

---

[← Previous: Middleware & Guards](./03-middleware-guards.md) | [Next: Exception Filters →](./05-exception-filters.md)
