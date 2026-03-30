import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import User from "@/models/User";
import CSVUploadLog from "@/models/CSVUploadLog";
import { connectDB } from "@/lib/db";

// Test GET endpoint to verify route is working
export async function GET() {
  return NextResponse.json({
    success: true,
    message: "CSV upload endpoint is working",
    timestamp: new Date().toISOString(),
  });
}

// Supabase client will be initialized inside functions to avoid module-level errors

// Enhanced CSV parser function that handles both formats
function parseCSVData(csvText) {
  const lines = csvText.trim().split("\n");
  const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const values = [];
    let current = "";
    let inQuotes = false;

    for (let j = 0; j < lines[i].length; j++) {
      const char = lines[i][j];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim().replace(/^"|"$/g, "")); // Remove surrounding quotes
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/^"|"$/g, "")); // Remove surrounding quotes

    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });

    // Convert to standard format
    const standardRow = convertToStandardFormat(row, headers);
    if (standardRow) {
      data.push(standardRow);
    }
  }

  return data;
}

// Convert various CSV formats to standard {email, userType} format
function convertToStandardFormat(row, headers) {
  let email = "";
  let userType = "athlete"; // default

  // Try to find email in various column names
  if (row.email) {
    email = row.email;
  } else if (row.EmailAddress) {
    email = row.EmailAddress;
  } else if (row.Email) {
    email = row.Email;
  } else {
    return null; // Skip rows without email
  }

  // Try to find userType in various ways
  if (row.userType) {
    userType = row.userType;
  } else if (row.UserType) {
    userType = row.UserType;
  } else if (row.PublicData) {
    // Extract userType from JSON in PublicData
    try {
      const publicData = JSON.parse(row.PublicData);
      userType = publicData.userType || "athlete";
    } catch (error) {
      userType = "athlete";
    }
  }

  return {
    email: email.trim(),
    userType: userType.trim(),
    // Preserve all original CSV data
    originalData: row,
  };
}

// Helper function to determine role
function determineRole(userType) {
  const normalizedType = userType.toLowerCase().trim();

  if (normalizedType === "brand") {
    return "brand";
  } else if (normalizedType === "fan") {
    return "fan";
  } else {
    // For any other user type, default to sports-ambassador
    return "sports-ambassador";
  }
}

// Helper function to create user in Supabase
async function createSupabaseUser(email, password, csvRow, role) {
  try {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: false, // Set to false as per requirement
      user_metadata: {
        imported: true,
        imported_at: new Date().toISOString(),

        // Override/add essential user profile fields
        role: role,
        email: email,
        email_verified: false,
        phone_verified: false,
        isProfileCompleted: false,
      },
      // raw_user_meta_data: {
      //   // Spread all original CSV data at root level (like normal users)
      //   ...csvRow.originalData,
      //   // Override/add essential user profile fields
      //   role: role,
      //   email: email,
      //   email_verified: false,
      //   phone_verified: false,
      //   isProfileCompleted: false,
      //   // Add provider information
      //   provider: "email",
      //   providers: ["email"],
      //   // Keep processed info for reference
      //   imported_user_type: csvRow.userType,
      //   imported_at: new Date().toISOString(),
      // },
    });

    if (error) {
      console.error(`Supabase user creation error for ${email}:`, error);
      return { success: false, error: error.message };
    }

    return { success: true, user: data.user };
  } catch (error) {
    console.error(`Supabase user creation exception for ${email}:`, error);
    return { success: false, error: error.message };
  }
}

// Helper function to create user in MongoDB
async function createMongoUser(csvRow, supabaseUser, role) {
  try {
    const email = csvRow.email || "";

    // Minimal user data
    const userData = {
      email: email,
      supabaseId: supabaseUser.id,
      authProvider: "email",
      role: role,
      isProfileCompleted: false,
      stateId: 1, // Default to active
    };

    const user = new User(userData);
    await user.save();

    return { success: true, user };
  } catch (error) {
    console.error(`MongoDB user creation error for ${email}:`, error);
    return { success: false, error: error.message };
  }
}

export async function POST(request) {
  const startTime = Date.now();
  let uploadLog = null;

  // Wrap everything in try-catch to ensure we always return JSON
  try {
    // Check environment variables first
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase environment variables");
      console.error(
        "NEXT_PUBLIC_SUPABASE_URL:",
        !!process.env.NEXT_PUBLIC_SUPABASE_URL
      );
      console.error("SUPABASE_URL:", !!process.env.SUPABASE_URL);
      console.error(
        "SUPABASE_SERVICE_ROLE_KEY:",
        !!process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      return NextResponse.json(
        {
          success: false,
          error: "Server configuration error: Missing Supabase credentials",
        },
        { status: 500 }
      );
    }

    if (!process.env.MONGODB_URI) {
      console.error("Missing MongoDB URI");
      return NextResponse.json(
        {
          success: false,
          error: "Server configuration error: Missing database connection",
        },
        { status: 500 }
      );
    }

    // Try to connect to database
    try {
      await connectDB();
    } catch (dbError) {
      console.error("Database connection failed:", dbError);
      return NextResponse.json(
        {
          success: false,
          error: "Database connection failed",
          details: dbError.message,
        },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("csvFile");

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No CSV file provided" },
        { status: 400 }
      );
    }

    // Initialize upload log
    uploadLog = new CSVUploadLog({
      fileName: file.name,
      fileSize: file.size,
      uploadedBy: "admin", // TODO: Get actual admin user from session
      uploadStatus: "failed", // Will update on success
      totalRecords: 0,
      successfulRecords: 0,
      failedRecords: 0,
      errorDetails: [],
      createdUsers: [],
      csvHeaders: [],
      sampleData: {},
    });

    // Read file content
    let csvText;
    try {
      csvText = await file.text();
    } catch (fileError) {
      console.error("Error reading file:", fileError);
      return NextResponse.json(
        {
          success: false,
          error: "Error reading CSV file",
          details: fileError.message,
        },
        { status: 400 }
      );
    }

    // Parse CSV data
    let csvData;
    try {
      csvData = parseCSVData(csvText);

      // Update upload log with parsed data
      uploadLog.totalRecords = csvData.length;
      uploadLog.csvHeaders =
        csvData.length > 0
          ? Object.keys(csvData[0].originalData || csvData[0])
          : [];
      uploadLog.sampleData = csvData.slice(0, 3); // First 3 rows as sample
    } catch (parseError) {
      console.error("Error parsing CSV:", parseError);

      // Save error log
      uploadLog.errorDetails.push({
        row: 0,
        email: "N/A",
        error: `CSV parsing failed: ${parseError.message}`,
        errorType: "validation",
      });
      await uploadLog.save();

      return NextResponse.json(
        {
          success: false,
          error: "Error parsing CSV file",
          details: parseError.message,
        },
        { status: 400 }
      );
    }

    if (!csvData || csvData.length === 0) {
      uploadLog.errorDetails.push({
        row: 0,
        email: "N/A",
        error: "CSV file is empty or invalid",
        errorType: "validation",
      });
      await uploadLog.save();

      return NextResponse.json(
        { success: false, error: "CSV file is empty or invalid" },
        { status: 400 }
      );
    }

    const results = {
      total: csvData.length,
      successful: 0,
      failed: 0,
      errors: [],
    };

    // Process each row
    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      const email = row.email;

      if (!email || !email.includes("@")) {
        results.failed++;
        const errorObj = {
          row: i + 1,
          email: email || "N/A",
          error: "Missing or invalid email address",
          errorType: "validation",
        };
        results.errors.push(errorObj);
        uploadLog.errorDetails.push(errorObj);
        continue;
      }

      try {
        // Check if user already exists in MongoDB
        const existingUser = await User.findOne({ email: email });
        if (existingUser) {
          results.failed++;
          const errorObj = {
            row: i + 1,
            email: email,
            error: "User already exists in database",
            errorType: "duplicate",
          };
          results.errors.push(errorObj);
          uploadLog.errorDetails.push(errorObj);
          continue;
        }

        // Determine role from userType
        const role = determineRole(row.userType);

        // Create user in Supabase (password same as email)
        const supabaseResult = await createSupabaseUser(
          email,
          email,
          row,
          role
        );

        if (!supabaseResult.success) {
          results.failed++;
          const errorObj = {
            row: i + 1,
            email: email,
            error: `Supabase error: ${supabaseResult.error}`,
            errorType: "supabase",
          };
          results.errors.push(errorObj);
          uploadLog.errorDetails.push(errorObj);
          continue;
        }

        // Create user in MongoDB
        const mongoResult = await createMongoUser(
          row,
          supabaseResult.user,
          role
        );

        if (!mongoResult.success) {
          results.failed++;
          const errorObj = {
            row: i + 1,
            email: email,
            error: `MongoDB error: ${mongoResult.error}`,
            errorType: "mongodb",
          };
          results.errors.push(errorObj);
          uploadLog.errorDetails.push(errorObj);

          // Try to cleanup Supabase user if MongoDB creation failed
          try {
            const supabaseUrl =
              process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
            const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
            const supabase = createClient(supabaseUrl, supabaseServiceKey);
            await supabase.auth.admin.deleteUser(supabaseResult.user.id);
          } catch (cleanupError) {
            console.error(
              `Failed to cleanup Supabase user ${email}:`,
              cleanupError
            );
          }
          continue;
        }

        results.successful++;

        // Log successful user creation
        const createdUserObj = {
          email: email,
          role: role,
          supabaseId: supabaseResult.user.id,
          mongoId: mongoResult.user._id.toString(),
        };
        uploadLog.createdUsers.push(createdUserObj);
      } catch (error) {
        results.failed++;
        const errorObj = {
          row: i + 1,
          email: email,
          error: `Unexpected error: ${error.message}`,
          errorType: "unexpected",
        };
        results.errors.push(errorObj);
        uploadLog.errorDetails.push(errorObj);
        console.error(`Unexpected error processing ${email}:`, error);
      }
    }

    // Update upload log with final results
    uploadLog.successfulRecords = results.successful;
    uploadLog.failedRecords = results.failed;
    uploadLog.processingTime = Date.now() - startTime;

    // Determine upload status
    if (results.failed === 0) {
      uploadLog.uploadStatus = "completed";
    } else if (results.successful > 0) {
      uploadLog.uploadStatus = "partial";
    } else {
      uploadLog.uploadStatus = "failed";
    }

    // Save the upload log
    await uploadLog.save();

    return NextResponse.json({
      success: true,
      message: `CSV upload completed. ${results.successful} users created, ${results.failed} failed.`,
      results: results,
      uploadLogId: uploadLog._id, // Return log ID for reference
    });
  } catch (error) {
    console.error("=== CSV Upload Fatal Error ===", error);
    console.error("Error stack:", error.stack);

    // Save error log if uploadLog exists
    if (uploadLog) {
      try {
        uploadLog.uploadStatus = "failed";
        uploadLog.processingTime = Date.now() - startTime;
        uploadLog.errorDetails.push({
          row: 0,
          email: "N/A",
          error: `Fatal error: ${error.message}`,
          errorType: "unexpected",
        });
        await uploadLog.save();
      } catch (logError) {
        console.error("Failed to save error log:", logError);
      }
    }

    // Ensure we always return JSON, never HTML
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
