import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { dataSourceOptions } from '../../../config/typeorm.config';

async function seed() {
  const dataSource = new DataSource(dataSourceOptions);
  await dataSource.initialize();
  console.log('📦 Connected to database. Starting seed...');

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // ── 1. Permissions ───────────────────────────────────────────
    const permissions = [
      { name: 'auth:refresh', description: 'Refresh access token' },
      { name: 'user:read', description: 'View user list and profiles' },
      { name: 'user:create', description: 'Create new users' },
      { name: 'user:update', description: 'Update user profiles' },
      { name: 'user:delete', description: 'Delete users' },
      { name: 'user:manage-roles', description: 'Assign/remove roles from users' },
      { name: 'job:create', description: 'Create new jobs' },
      { name: 'job:read', description: 'View job list and details' },
      { name: 'job:update', description: 'Update job details' },
      { name: 'job:delete', description: 'Delete jobs' },
      { name: 'job:assign-reporter', description: 'Assign reporter to job' },
      { name: 'job:assign-editor', description: 'Assign editor to job' },
      { name: 'job:update-status', description: 'Update job status' },
      { name: 'payment:read', description: 'View payment records' },
      { name: 'payment:mark-paid', description: 'Mark payments as paid' },
      { name: 'payment:read-own', description: 'View own payment records' },
      { name: 'role:read', description: 'View roles' },
      { name: 'role:manage', description: 'Create/edit/delete roles and permissions' },
    ];

    for (const perm of permissions) {
      await queryRunner.query(
        `INSERT INTO permissions (name, description)
         VALUES ($1, $2)
         ON CONFLICT (name) DO NOTHING`,
        [perm.name, perm.description],
      );
    }
    console.log('✅ Permissions seeded');

    // ── 2. Roles ──────────────────────────────────────────────────
    const roles = [
      { name: 'ADMIN', description: 'Full system access', is_system: true },
      { name: 'MANAGER', description: 'Manage jobs and assignments', is_system: true },
      { name: 'REPORTER', description: 'Court reporter, does transcription', is_system: true },
      { name: 'EDITOR', description: 'Reviews and edits transcripts', is_system: true },
    ];

    for (const role of roles) {
      await queryRunner.query(
        `INSERT INTO roles (name, description, is_system)
         VALUES ($1, $2, $3)
         ON CONFLICT (name) DO NOTHING`,
        [role.name, role.description, role.is_system],
      );
    }
    console.log('✅ Roles seeded');

    // ── 3. Role-Permission Mappings ───────────────────────────────
    // ADMIN: all permissions
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
      WHERE r.name = 'ADMIN'
      ON CONFLICT DO NOTHING
    `);

    // MANAGER permissions
    const managerPerms = [
      'auth:refresh', 'user:read',
      'job:create', 'job:read', 'job:update', 'job:delete',
      'job:assign-reporter', 'job:assign-editor', 'job:update-status',
      'payment:read', 'payment:mark-paid',
    ];
    await queryRunner.query(
      `INSERT INTO role_permissions (role_id, permission_id)
       SELECT r.id, p.id FROM roles r JOIN permissions p
         ON p.name = ANY($1::text[])
       WHERE r.name = 'MANAGER'
       ON CONFLICT DO NOTHING`,
      [managerPerms],
    );

    // REPORTER permissions
    const reporterPerms = ['auth:refresh', 'job:read', 'job:update-status', 'payment:read-own'];
    await queryRunner.query(
      `INSERT INTO role_permissions (role_id, permission_id)
       SELECT r.id, p.id FROM roles r JOIN permissions p
         ON p.name = ANY($1::text[])
       WHERE r.name = 'REPORTER'
       ON CONFLICT DO NOTHING`,
      [reporterPerms],
    );

    // EDITOR permissions
    const editorPerms = ['auth:refresh', 'job:read', 'job:update-status', 'payment:read-own'];
    await queryRunner.query(
      `INSERT INTO role_permissions (role_id, permission_id)
       SELECT r.id, p.id FROM roles r JOIN permissions p
         ON p.name = ANY($1::text[])
       WHERE r.name = 'EDITOR'
       ON CONFLICT DO NOTHING`,
      [editorPerms],
    );
    console.log('✅ Role-Permission mappings seeded');

    // ── 4. Default Admin User ──────────────────────────────────────
    const adminEmail = 'admin@court.com';
    const adminPassword = 'Admin@1234!';
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    const existing = await queryRunner.query(
      'SELECT id FROM users WHERE email = $1',
      [adminEmail],
    );

    if (existing.length === 0) {
      const [adminUser] = await queryRunner.query(
        `INSERT INTO users (email, password_hash, full_name, status)
         VALUES ($1, $2, $3, 'ACTIVE')
         RETURNING id`,
        [adminEmail, passwordHash, 'Super Admin'],
      );

      const [adminRole] = await queryRunner.query(
        'SELECT id FROM roles WHERE name = $1',
        ['ADMIN'],
      );

      await queryRunner.query(
        'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
        [adminUser.id, adminRole.id],
      );

      console.log(`✅ Default admin created: ${adminEmail} / ${adminPassword}`);
    } else {
      console.log('ℹ️  Admin user already exists, skipping');
    }

    // ── 5. Default Settings ────────────────────────────────────────
    const settingsExisting = await queryRunner.query('SELECT id FROM settings LIMIT 1');
    if (settingsExisting.length === 0) {
      await queryRunner.query(
        `INSERT INTO settings ("reporterRatePerMinute", "editorFlatRate", "defaultRoleName", "paymentDueDays")
         VALUES ($1, $2, $3, $4)`,
        [50000, 500000, 'REPORTER', 30]
      );
      console.log('✅ Default settings seeded (Rates in IDR)');
    } else {
      console.log('ℹ️  Settings already exist, skipping');
    }

    await queryRunner.commitTransaction();
    console.log('\n🎉 Seed completed successfully!');
  } catch (err) {
    await queryRunner.rollbackTransaction();
    console.error('❌ Seed failed:', err);
    throw err;
  } finally {
    await queryRunner.release();
    await dataSource.destroy();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
