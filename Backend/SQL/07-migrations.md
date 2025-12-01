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

```javascript
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      email: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false
      },
      name: Sequelize.STRING,
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('users');
  }
};
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

```javascript
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('users', [
      { name: 'John', email: 'john@example.com', createdAt: new Date(), updatedAt: new Date() },
      { name: 'Jane', email: 'jane@example.com', createdAt: new Date(), updatedAt: new Date() }
    ]);
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('users', null, {});
  }
};
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
