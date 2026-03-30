const { connectDB } = require("../db");
const mongoose = require("mongoose");
const User = mongoose.models.User || require("../../models/User");
const { sendEmail } = require("../sendEmail");
const moment = require("moment");
const cron = require("node-cron");

require("dotenv").config();

async function sendProfileReminderEmails() {
  try {
    await connectDB();

    const targetDate = moment().subtract(2, "days");
    const startOfTargetDate = targetDate.clone().startOf("day").toDate();
    const endOfTargetDate = targetDate.clone().endOf("day").toDate();

    const UserModel = mongoose.models.User || User;
    const users = await UserModel.find({
      isProfileCompleted: false,
      role: { $ne: "fan" },
      createdAt: {
        $gte: startOfTargetDate,
        $lte: endOfTargetDate,
      },
    });

    if (users.length === 0) {
      return;
    }

    for (const user of users) {
      // Build role-aware CTA: onboarding if incomplete, else role dashboard
      const baseUrl =
        process.env.NEXT_PUBLIC_SITE_URL ||
        process.env.NEXTAUTH_URL ||
        "http://localhost:3000";
      const normalizedBase = baseUrl.replace(/\/$/, "");
      const pathForUser = (role, isProfileCompleted) => {
        if (role === "brand" || role === "sports-ambassador") {
          return isProfileCompleted ? `/${role}` : `/onboarding/${role}`;
        }
        return `/${role || ""}`;
      };
      const ctaHref = `${normalizedBase}${pathForUser(
        user.role,
        !!user.isProfileCompleted
      )}`;
      // Role-specific email content
      let emailSubject, emailHtml;

      switch (user.role) {
        case "brand":
          emailSubject =
            "Complete your profile to start partnering with ambassadors";
          emailHtml = `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #000; background-color: #fff; margin: 0; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; text-align: center;">
      <img src="https://res.cloudinary.com/dbtuvgdcc/image/upload/v1752661700/banner_photos/Sbonssy_logo_all_black_cprwob.png" 
           alt="Sbonssy Logo"
           style="max-width: 200px; height: auto; display: block; margin: 0 auto 20px auto;" />
      
      <p style="color: #000; margin-bottom: 16px; font-size: 16px;">Hi ${
        user.email || "there"
      },</p>
      <p style="color: #000; margin-bottom: 24px; font-size: 16px;">You're just one step away from connecting with the creators. Complete your brand profile to start launching campaigns and building authentic partnerships.
</p>
      
      <div style="margin: 24px 0;">
        <a href="${ctaHref}" 
           style="display: inline-block; padding: 12px 24px; background-color: #f26915; 
           color: white; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 16px;">
           Complete Your Profile
        </a>
      </div>
      
      <p style="color: #000; margin-bottom: 0; font-size: 16px;">We can’t wait to see your campaigns!
</p>
      <p style="color: #000; margin-top: 30px; font-size: 16px;">Best,<br>Team Sbonssy</p>
    </div>
  </div>
            `;
          break;

        case "sports-ambassador":
          emailSubject = "Complete your profile to start earning";
          emailHtml = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #000; background-color: #fff; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; text-align: center;">
    <img src="https://res.cloudinary.com/dbtuvgdcc/image/upload/v1752661700/banner_photos/Sbonssy_logo_all_black_cprwob.png" 
         alt="Sbonssy Logo"
         style="max-width: 200px; height: auto; display: block; margin: 0 auto 20px auto;" />
    
    <p style="color: #000; margin-bottom: 16px; font-size: 16px;">Hi ${
      user.email || "Ambassador"
    },</p>
    <p style="color: #000; margin-bottom: 24px; font-size: 16px;">You're almost there! Complete your profile to start earning and get discovered.</p>
    
    <div style="margin: 24px 0;">
      <a href="${ctaHref}" 
         style="display: inline-block; padding: 12px 24px; background-color: #f26915; 
         color: white; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 16px;">
         Complete Your Profile
      </a>
    </div>
    
    <p style="color: #000; margin-bottom: 0; font-size: 16px;">We can't wait to see what you create!</p>
    <p style="color: #000; margin-top: 30px; font-size: 16px;">Best,<br>Team Sbonssy</p>
  </div>
</div>
          `;
          break;

        default:
          continue;
      }

      const emailContent = {
        to: user.email,
        subject: emailSubject,
        html: emailHtml,
      };

      try {
        await sendEmail(emailContent);
      } catch (emailError) {
        console.error(`Failed to send email to ${user.email}:`, emailError);
      }
    }
  } catch (error) {
    console.error("Error in sendProfileReminderEmails:", error);
  }
}
//At 09:00.
if (process.env.NODE_ENV === "production") {
  cron.schedule("0 9 * * *", async () => {
    await sendProfileReminderEmails();
  });
}


