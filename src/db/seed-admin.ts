import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as schema from './schema';
import { eq } from 'drizzle-orm';

dotenv.config();

async function seedAdmin() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ DATABASE_URL is not set in environment variables');
    process.exit(1);
  }

  const pool = new Pool({ connectionString });
  const db = drizzle(pool, { schema });

  const adminEmail = 'admin@castingexpo.com';
  const adminPassword = 'Admin@123';
  const adminFullName = 'Super Admin';

  try {
    // Check if admin already exists
    const [existing] = await db
      .select()
      .from(schema.adminUsers)
      .where(eq(schema.adminUsers.email, adminEmail))
      .limit(1);

    if (existing) {
      console.log(`⚠️  Admin user "${adminEmail}" already exists. Skipping.`);
    } else {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      const [admin] = await db
        .insert(schema.adminUsers)
        .values({
          email: adminEmail,
          password: hashedPassword,
          fullName: adminFullName,
          role: 'super_admin',
          isActive: true,
        })
        .returning();

      console.log('✅ Admin user created successfully:');
      console.log(`   Email:    ${admin.email}`);
      console.log(`   Name:     ${admin.fullName}`);
      console.log(`   Role:     ${admin.role}`);
      console.log(`   Password: ${adminPassword}`);
    }
  } catch (error) {
    console.error('❌ Error seeding admin:', error);
  } finally {
    await pool.end();
  }
}

seedAdmin();
