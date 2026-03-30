// createAdmin();
const { connectDB } = require("./src/lib/db");
const { default: User } = require("./src/models/User");
const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");

dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || "your-supabase-url";
const supabaseKey = process.env.SUPABASE_ANON_KEY || "your-supabase-anon-key";
const supabase = createClient(supabaseUrl, supabaseKey);

async function createAdmin() {
  try {
    await connectDB("Admin Task");

    // Define admin users to create
    const adminUsers = [
      {
        email: "iiro@sbonssy.com",
        name: "Iiro",
        password: process.env.ADMIN_PASSWORD || "Admin@123",
      },
      {
        email: "tom@sbonssy.com",
        name: "Tom",
        password: process.env.ADMIN_PASSWORD || "Admin@123",
      },
      {
        email: "marina@sbonssy.com",
        name: "Marina",
        password: process.env.ADMIN_PASSWORD || "Admin@123",
      },
    ];

    for (const adminUser of adminUsers) {
      // Check if this admin already exists
      const existingAdmin = await User.findOne({
        email: adminUser.email,
        role: "admin",
      });

      if (existingAdmin) {
        console.log(
          `Admin user ${adminUser.email} already exists, skipping...`,
        );
        continue;
      }

      console.log(`Creating admin user: ${adminUser.email}`);

      // Create admin user in Supabase auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: adminUser.email,
        password: adminUser.password,
        options: {
          data: {
            name: adminUser.name,
            is_super_admin: true,
            role: "admin",
            isProfileCompleted: true,
          },
        },
      });

      if (authError) {
        console.error(
          `Supabase auth error for ${adminUser.email}:`,
          authError.message,
        );
        continue; // Continue with next user instead of exiting
      }

      // Create user in MongoDB
      await User.create({
        email: adminUser.email,
        supabaseId: authData.user.id,
        authProvider: "email",
        role: "admin",
        isProfileCompleted: true,
        admin: {
          name: adminUser.name,
        },
      });

      console.log(`Successfully created admin user: ${adminUser.email}`);
    }

    console.log("Admin user creation process completed.");
    process.exit(0);
  } catch (error) {
    console.error("Error creating admin users:", error.message);
    process.exit(1);
  }
}

createAdmin();
