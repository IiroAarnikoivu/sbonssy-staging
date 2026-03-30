import { createClient } from "@supabase/supabase-js";
import User from "@/models/User";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Validate CSV row data
export function validateCSVRow(row, rowIndex) {
  const errors = [];

  // Required fields
  if (!row.email || !row.email.trim()) {
    errors.push(`Row ${rowIndex}: Email address is required`);
  }

  if (!row.userType || !row.userType.trim()) {
    errors.push(`Row ${rowIndex}: User type is required`);
  }

  // Email format validation
  if (row.email && !isValidEmail(row.email)) {
    errors.push(`Row ${rowIndex}: Invalid email format`);
  }

  return errors;
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Determine role based on user type
export function determineUserRole(userType) {
  const normalizedType = userType.toLowerCase().trim();
  
  if (normalizedType === 'brand') {
    return 'brand';
  } else if (normalizedType === 'fan') {
    return 'fan';
  } else {
    // For any other user type (athlete, coach, team, influencer, etc.)
    // Default to sports-ambassador
    return 'sports-ambassador';
  }
}


// Batch create users with progress tracking
export async function batchCreateUsers(csvData, onProgress) {
  const results = {
    total: csvData.length,
    successful: 0,
    failed: 0,
    errors: [],
    createdUsers: [],
  };

  for (let i = 0; i < csvData.length; i++) {
    const row = csvData[i];
    const email = row.email;

    try {
      // Validate row
      const validationErrors = validateCSVRow(row, i + 1);
      if (validationErrors.length > 0) {
        results.failed++;
        results.errors.push({
          row: i + 1,
          email: email || "N/A",
          error: validationErrors.join(", "),
        });
        continue;
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email: email });
      if (existingUser) {
        results.failed++;
        results.errors.push({
          row: i + 1,
          email: email,
          error: "User already exists in database",
        });
        continue;
      }

      // Determine role from userType
      const role = determineUserRole(row.userType);

      // Create Supabase user
      const { data: supabaseUser, error: supabaseError } =
        await supabase.auth.admin.createUser({
          email: email,
          password: email, // Password same as email
          email_confirm: false, // Not verified initially
          user_metadata: {
            imported: true,
            imported_at: new Date().toISOString(),
            original_user_type: row.userType,
          },
        });

      if (supabaseError) {
        results.failed++;
        results.errors.push({
          row: i + 1,
          error: `Supabase error: ${supabaseError.message}`,
        });
        continue;
      }

      // Create MongoDB user with minimal data
      const userData = {
        email: email,
        supabaseId: supabaseUser.user.id,
        authProvider: 'email',
        role: role,
        isProfileCompleted: false,
        stateId: 1, // Default to active
        termsAccepted: false, // Set to false since minimal data provided
        termsAcceptedAt: null,
      };

      const mongoUser = new User(userData);
      await mongoUser.save();

      results.successful++;
      results.createdUsers.push({
        email: email,
        role: role,
        supabaseId: supabaseUser.user.id,
        mongoId: mongoUser._id,
      });

      // Call progress callback if provided
      if (onProgress) {
        onProgress({
          processed: i + 1,
          total: csvData.length,
          successful: results.successful,
          failed: results.failed,
        });
      }
    } catch (error) {
      results.failed++;
      results.errors.push({
        row: i + 1,
        email: email || "N/A",
        error: `Unexpected error: ${error.message}`,
      });
      console.error(`Error processing row ${i + 1}:`, error);
    }
  }

  return results;
}

// Validate CSV headers
export function validateCSVHeaders(headers) {
  const requiredHeaders = [
    'email',
    'userType'
  ];

  const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
  
  if (missingHeaders.length > 0) {
    return {
      valid: false,
      error: `Missing required headers: ${missingHeaders.join(', ')}`
    };
  }

  return { valid: true };
}
