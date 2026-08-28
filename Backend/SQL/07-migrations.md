# Migrations & Seeds

## Migrations

Database migrations are version control for your database schema. They track and apply incremental changes to the database structure.

### Why Migrations?

- Version control for database schema
- Reproducible database setup
- Team collaboration
- Rollback capability
- Environment consistency

### TypeORM Migrations

```bash
# Generate migration from entity changes
npm run typeorm migration:generate -- -n CreateUsersTable

# Create empty migration
npm run typeorm migration:create -- -n AddEmailIndex

# Run migrations
npm run typeorm migration:run

# Revert last migration
npm run typeorm migration:revert
```

### Migration File

```typescript
import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateUsersTable1234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true },
          { name: 'email', type: 'varchar', isUnique: true },
          { name: 'name', type: 'varchar' },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' }
        ]
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('users');
  }
}
```

### Adding Columns

```typescript
export class AddPhoneToUsers1234567891 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'phone',
        type: 'varchar',
        isNullable: true
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'phone');
  }
}
```

### Sequelize Migrations

```bash
# Create migration
npx sequelize-cli migration:generate --name create-users-table

# Run migrations
npx sequelize-cli db:migrate

# Undo last migration
npx sequelize-cli db:migrate:undo
```

```typescript
import { DataTypes, type QueryInterface } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('users', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
    },
    name: DataTypes.STRING,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  });
}

// Every up() needs a down() that undoes exactly what it did — nothing more.
export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('users');
}
```

## Seeds

Seeds populate database with initial or test data.

### TypeORM Seeds

```typescript
import { Factory, Seeder } from 'typeorm-seeding';
import { User } from '../entities/User';

export default class CreateUsers implements Seeder {
  public async run(factory: Factory): Promise<void> {
    await factory(User)().createMany(10);
  }
}
```

### Sequelize Seeds

```bash
# Create seeder
npx sequelize-cli seed:generate --name demo-users

# Run all seeders
npx sequelize-cli db:seed:all

# Run specific seeder
npx sequelize-cli db:seed --seed 20231201-demo-users.js
```

```typescript
import type { QueryInterface } from 'sequelize';

interface SeedUser {
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function up(queryInterface: QueryInterface): Promise<void> {
  const now: Date = new Date();
  const rows: SeedUser[] = [
    { name: 'John', email: 'john@example.com', createdAt: now, updatedAt: now },
    { name: 'Jane', email: 'jane@example.com', createdAt: now, updatedAt: now },
  ];
  await queryInterface.bulkInsert('users', rows);
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.bulkDelete('users', {}, {});
}
```

## Interview Questions

**Q: What are database migrations?**
A: Version-controlled schema changes that can be applied and rolled back. Track database evolution over time.

**Q: Why use migrations?**
A: Version control, reproducibility, team collaboration, environment consistency, rollback capability.

**Q: What's the difference between migrations and seeds?**
A: Migrations change schema structure, seeds insert initial/test data.

**Q: How do you handle migration conflicts?**
A: Communicate with team, merge carefully, test locally, use migration timestamps, revert if needed.

## Best Practices

✅ One logical change per migration
✅ Write reversible migrations (up/down)
✅ Test migrations locally
✅ Never edit applied migrations
✅ Use transactions
✅ Backup before production migrations
❌ Don't skip migrations
❌ Don't modify executed migrations
❌ Don't mix schema and data changes

---

[← Previous: ORMs](./06-orms.md) | [Next: Query Optimization →](./08-optimization.md)
