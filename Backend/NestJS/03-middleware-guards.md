# Middleware & Guards

## Overview

Middleware and Guards are part of NestJS's request processing pipeline. Middleware executes before route handlers, while Guards determine whether a request should be handled. Understanding both is crucial for authentication, authorization, and request processing.

## Middleware

### What is Middleware?

Middleware is a function that is called before the route handler. It has access to the request and response objects and the `next()` function.

### Creating Middleware

```typescript
// middleware/logger.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  }
}
```

### Applying Middleware

```typescript
// app.module.ts
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { LoggerMiddleware } from './middleware/logger.middleware';

@Module({
  imports: [UsersModule],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes('users'); // Apply to /users routes
  }
}
```

### Middleware Configuration

```typescript
// Apply to specific routes
consumer
  .apply(LoggerMiddleware)
  .forRoutes({ path: 'users', method: RequestMethod.GET });

// Apply to multiple routes
consumer
  .apply(LoggerMiddleware)
  .forRoutes('users', 'products', 'orders');

// Apply to specific controller
consumer
  .apply(LoggerMiddleware)
  .forRoutes(UsersController);

// Exclude routes
consumer
  .apply(LoggerMiddleware)
  .exclude(
    { path: 'users/public', method: RequestMethod.GET },
    'users/health',
  )
  .forRoutes(UsersController);

// Apply multiple middleware
consumer
  .apply(LoggerMiddleware, AuthMiddleware, CorsMiddleware)
  .forRoutes('*');
```

### Functional Middleware

```typescript
// middleware/simple-logger.middleware.ts
import { Request, Response, NextFunction } from '@nestjs/common';

export function simpleLogger(req: Request, res: Response, next: NextFunction) {
  console.log(`Request: ${req.method} ${req.url}`);
  next();
}

// Apply in module
consumer
  .apply(simpleLogger)
  .forRoutes('*');
```

### Middleware with Dependencies

```typescript
@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);
      req['user'] = await this.usersService.findOne(payload.sub);
      next();
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
```

### Global Middleware

```typescript
// main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Apply middleware globally
  app.use(logger);

  await app.listen(3000);
}
```

## Guards

### What is a Guard?

Guards determine whether a request should be processed by the route handler. They are executed after middleware but before interceptors and pipes.

### Creating a Guard

```typescript
// guards/auth.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    return this.validateRequest(request);
  }

  private validateRequest(request: any): boolean {
    // Validation logic
    return true;
  }
}
```

### JWT Authentication Guard

```typescript
// guards/jwt-auth.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });

      // Attach user to request
      request['user'] = payload;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    return true;
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
```

### Applying Guards

```typescript
// Controller-level guard
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  @Get()
  findAll() {
    return 'Protected route';
  }
}

// Method-level guard
@Controller('users')
export class UsersController {
  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return 'Protected route';
  }

  @Get('public')
  findPublic() {
    return 'Public route';
  }
}

// Global guard
// main.ts
app.useGlobalGuards(new JwtAuthGuard());

// Or in module
@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
```

### Role-Based Guard

```typescript
// guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}

// decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

// Usage
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  @Get('users')
  @Roles('admin', 'moderator')
  getUsers() {
    return 'Admin only';
  }
}
```

### Custom Decorator for User

```typescript
// decorators/user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const User = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);

// Usage
@Controller('profile')
export class ProfileController {
  @Get()
  @UseGuards(JwtAuthGuard)
  getProfile(@User() user: any) {
    return user;
  }

  @Get('email')
  @UseGuards(JwtAuthGuard)
  getEmail(@User('email') email: string) {
    return { email };
  }
}
```

## Execution Order

### Request Pipeline

```
Middleware → Guards → Interceptors (before) → Pipes → Route Handler → Interceptors (after) → Filters
```

### Example Pipeline

```typescript
// 1. Middleware
@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    console.log('1. Middleware executed');
    next();
  }
}

// 2. Guard
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    console.log('2. Guard executed');
    return true;
  }
}

// 3. Controller
@Controller('users')
@UseGuards(AuthGuard)
export class UsersController {
  @Get()
  findAll() {
    console.log('3. Route handler executed');
    return 'Users';
  }
}
```

## Advanced Patterns

### Combining Multiple Guards

```typescript
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard, ThrottlerGuard)
export class AdminController {
  @Get('users')
  @Roles('admin')
  getUsers() {
    return 'Admin users';
  }
}
```

### Conditional Guard

```typescript
@Injectable()
export class ConditionalGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.get<boolean>(
      'isPublic',
      context.getHandler(),
    );

    if (isPublic) {
      return true;
    }

    // Apply authentication
    const request = context.switchToHttp().getRequest();
    return !!request.user;
  }
}

// Public decorator
export const Public = () => SetMetadata('isPublic', true);

// Usage
@Controller('users')
@UseGuards(ConditionalGuard)
export class UsersController {
  @Get()
  findAll() {
    return 'Protected';
  }

  @Get('public')
  @Public()
  findPublic() {
    return 'Public';
  }
}
```

### Permission-Based Guard

```typescript
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.get<string[]>(
      'permissions',
      context.getHandler(),
    );

    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    return requiredPermissions.every((permission) =>
      user.permissions?.includes(permission),
    );
  }
}

// Permissions decorator
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata('permissions', permissions);

// Usage
@Controller('posts')
export class PostsController {
  @Post()
  @RequirePermissions('posts.create')
  create(@Body() createPostDto: CreatePostDto) {
    return this.postsService.create(createPostDto);
  }

  @Delete(':id')
  @RequirePermissions('posts.delete')
  remove(@Param('id') id: string) {
    return this.postsService.remove(id);
  }
}
```

## Complete Auth Example

```typescript
// guards/jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is public
    const isPublic = this.reflector.get<boolean>(
      'isPublic',
      context.getHandler(),
    );

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);
      request['user'] = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractToken(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}

// guards/roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      'roles',
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    const hasRole = requiredRoles.some((role) =>
      user.roles?.includes(role),
    );

    if (!hasRole) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}

// decorators/public.decorator.ts
export const Public = () => SetMetadata('isPublic', true);

// decorators/roles.decorator.ts
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

// Usage in controller
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  @Get()
  @Roles('admin', 'user')
  findAll() {
    return 'All users';
  }

  @Get('public')
  @Public()
  findPublic() {
    return 'Public data';
  }

  @Post()
  @Roles('admin')
  create(@Body() createUserDto: CreateUserDto) {
    return 'Create user';
  }
}
```

## Interview Questions

### Q1: What is the difference between Middleware and Guards?

**Answer:**
- **Middleware**: Executes before routing, has access to request/response, calls `next()`
- **Guards**: Execute after middleware, determine if route should be handled, return boolean

Middleware is for general processing, Guards are for authorization decisions.

### Q2: When does a Guard execute in the request pipeline?

**Answer:**
Guards execute after all middleware but before interceptors and pipes:
```
Middleware → Guards → Interceptors → Pipes → Handler
```

### Q3: How do you create a role-based guard?

**Answer:**
```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get('roles', context.getHandler());
    const user = context.switchToHttp().getRequest().user;
    return roles.some(role => user.roles.includes(role));
  }
}
```

### Q4: How do you make a route public when using global guards?

**Answer:**
Use a custom decorator with Reflector:

```typescript
export const Public = () => SetMetadata('isPublic', true);

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.get('isPublic', context.getHandler());
    if (isPublic) return true;
    // Check authentication
  }
}
```

### Q5: Can you apply multiple guards to a route?

**Answer:**
Yes, they execute in order:

```typescript
@UseGuards(AuthGuard, RolesGuard, ThrottlerGuard)
@Controller('admin')
export class AdminController {}
```

## Best Practices

### ✅ Do's

1. **Use Guards for authorization**
2. **Use Middleware for general processing**
3. **Keep guards focused and single-purpose**
4. **Use custom decorators with Reflector**
5. **Apply guards at appropriate level (global/controller/method)**
6. **Return boolean from guards**
7. **Throw appropriate exceptions**

### ❌ Don'ts

1. **Don't put business logic in guards**
2. **Don't use Guards for logging (use Middleware)**
3. **Don't forget to handle edge cases**
4. **Don't skip authentication checks**
5. **Don't over-complicate guard logic**

## Summary

- Middleware executes before routing, for general processing
- Guards determine authorization, execute after middleware
- Use Reflector for custom decorators
- Guards return boolean or throw exceptions
- Apply at global, controller, or method level
- Combine multiple guards for complex authorization
- Use custom decorators for cleaner code

---

[← Previous: Controllers & Providers](./02-controllers-providers.md) | [Next: Pipes & Interceptors →](./04-pipes-interceptors.md)
