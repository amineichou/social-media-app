import bcrypt from 'bcrypt';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

export async function initializeAdmin() {
  try {
    // Check if any admin user already exists
    const existingAdmin = await User.findOne({ where: { isAdmin: true } });
    
    if (existingAdmin) {
      console.log('✅ Admin user already exists');
      return;
    }

    // Get admin credentials from environment variables
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminFirstName = process.env.ADMIN_FIRST_NAME || 'Admin';
    const adminLastName = process.env.ADMIN_LAST_NAME || 'User';

    if (!adminUsername || !adminEmail || !adminPassword) {
      console.warn('⚠️  Admin credentials not found in .env file. Skipping admin creation.');
      console.warn('   Please set ADMIN_USERNAME, ADMIN_EMAIL, and ADMIN_PASSWORD in .env');
      return;
    }

    // Validate password strength
    if (adminPassword.length < 8) {
      console.error('❌ Admin password must be at least 8 characters long');
      return;
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Create the admin user
    const adminUser = await User.create({
      firstName: adminFirstName,
      lastName: adminLastName,
      username: adminUsername,
      email: adminEmail,
      passwordHash: hashedPassword,
      birthday: '1990-01-01', // Default birthday
      gender: 'male', // Default gender
      isAdmin: true,
      isBanned: false,
      lastActive: new Date()
    });

    console.log('✅ Admin user created successfully');
    console.log(`   Username: ${adminUser.username}`);
    console.log(`   Email: ${adminUser.email}`);
    console.log('🔐 Admin password is set from environment variables');
    
  } catch (error) {
    console.error('❌ Error initializing admin user:', error.message);
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      console.error('   Admin username or email already exists');
    }
  }
}

export async function createAdminUserIfNeeded() {
  // This function is kept for backward compatibility but calls the secure version
  await initializeAdmin();
}
