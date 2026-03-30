require("dotenv").config();
const cron = require("node-cron");
const { sendEmail } = require("../sendEmail");
const { createAdminClient } = require("../supabase/admin");

// Function to filter target users
function filterTargetUsers(users) {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  return users.filter((user) => {
    const createdAt = new Date(user.created_at);
    const isInTimeWindow =
      createdAt < twentyFourHoursAgo && createdAt > fortyEightHoursAgo;

    // Case 1: Not verified at all
    const isUnverified = !user.email_confirmed_at;

    // Case 2: Verified but never signed in
    const verifiedButNoLogin = user.email_confirmed_at && !user.last_sign_in_at;

    return isInTimeWindow && (isUnverified || verifiedButNoLogin);
  });
}

// Function to determine email type and content
function getEmailContent(user) {
  const isVerified = !!user.email_confirmed_at;
  const neverSignedIn = isVerified && !user.last_sign_in_at;

  let subject, html, text;

  if (!isVerified) {
    // Unverified users
    subject = "Still interested in joining Sbonssy?";
    html = `
     <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #000; background-color: #fff; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto;">
    <img src="https://res.cloudinary.com/dbtuvgdcc/image/upload/v1752661700/banner_photos/Sbonssy_logo_all_black_cprwob.png" 
         alt="Sbonssy Logo"
         style="max-width: 200px; height: auto; display: block; margin: 0 auto 20px auto;" />
    
    <p style="color: #000; margin-bottom: 16px;">Hi ${
      user.user_metadata?.name || "there"
    },</p>
    <p style="color: #000; margin-bottom: 24px;">We noticed you didn't finish setting up your account. Please verify your account and start!</p>
    
    <div style="text-align: center; margin: 24px 0;">
      <a href="${process.env.NEXTAUTH_URL}" 
         style="display: inline-block; padding: 12px 24px; background-color: #f26915; 
         color: white; text-decoration: none; border-radius: 50px; font-weight: bold;">
         Complete Your Setup
      </a>
    </div>
    
    <p style="color: #000; margin-bottom: 0;">Need help? We're just a message away.</p>
    <p style="color: #000; margin-top: 30px;">Best,<br>Team Sbonssy</p>
  </div>
</div>
    `;
  } else if (neverSignedIn) {
    // Verified but never signed in
    subject = "Still interested in joining Sbonssy?";
    html = `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #000; background-color: #fff; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto;">
    <img src="https://res.cloudinary.com/dbtuvgdcc/image/upload/v1752661700/banner_photos/Sbonssy_logo_all_black_cprwob.png" 
         alt="Sbonssy Logo"
         style="max-width: 200px; height: auto; display: block; margin: 0 auto 20px auto;" />
    
    <p style="color: #000; margin-bottom: 16px;">Hi ${
      user.user_metadata?.name || "there"
    },</p>
    <p style="color: #000; margin-bottom: 24px;">We noticed you didn't finish setting up your account. Pick up right where you left off:</p>
    
    <div style="text-align: center; margin: 24px 0;">
      <a href="${process.env.NEXTAUTH_URL}" 
         style="display: inline-block; padding: 12px 24px; background-color: #f26915; 
         color: white; text-decoration: none; border-radius: 50px; font-weight: bold;">
         Complete Your Setup
      </a>
    </div>
    
    <p style="color: #000; margin-bottom: 0;">Need help? We're just a message away.</p>
    <p style="color: #000; margin-top: 30px;">Best,<br>Team Sbonssy</p>
  </div>
</div>
    `;
    // text = `We noticed you verified your email but haven't logged in yet.
    // Your account is ready to use!\n\n
    // Login here: ${process.env.NEXT_PUBLIC_SITE_URL}/login`;
  }

  return {
    to: user.email,
    subject,
    html,
    text,
  };
}

async function sendReminderEmail(user, supabase) {
  const emailContent = getEmailContent(user);

  try {
    const result = await sendEmail(emailContent);
    if (result.success) {

      // Update user metadata
      await supabase.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...user.user_metadata,
          last_reminder_type: user.email_confirmed_at
            ? "post-verification"
            : "pre-verification",
          last_reminder_sent_at: new Date().toISOString(),
          reminder_count: (user.user_metadata?.reminder_count || 0) + 1,
        },
      });
    } else {
      //   console.error(`Failed to send email to ${user.email}:`, result.error);
    }
  } catch (error) {
    // console.error(`Error sending email to ${user.email}:`, error);
  }
}

async function processUnverifiedUsers() {
  try {
    const supabase = await createAdminClient();
    const {
      data: { users },
      error,
    } = await supabase.auth.admin.listUsers();

    if (error) throw error;

    const targetUsers = filterTargetUsers(users);

    if (targetUsers.length === 0) {
      return;
    }


    for (const user of targetUsers) {
      const reminderType = user.email_confirmed_at
        ? "verified but not signed in"
        : "not verified";

      await sendReminderEmail(user, supabase);
    }
  } catch (error) {
    console.error("Error processing users:", error);
  }
}

// At 09:00.
if (process.env.NODE_ENV === "production") {
  cron.schedule("0 9 * * *", () => {
    processUnverifiedUsers();
  });
}

// Initial run
// processUnverifiedUsers();
