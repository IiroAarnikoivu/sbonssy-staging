const cron = require("node-cron");
const mongoose = require("mongoose");
const { sendEmail } = require("../sendEmail");
const moment = require("moment");

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    // Proper model initialization
    if (!mongoose.models.User) {
      const User = require("../../models/User");
      mongoose.model("User", User.schema);
    }
    if (!mongoose.models.CampaignInteraction) {
      const CampaignInteraction = require("../../models/CampaignInteraction");
      mongoose.model("CampaignInteraction", CampaignInteraction.schema);
    }
  } catch (err) {
    process.exit(1);
  }
};

const findInactiveAmbassadors = async () => {
  try {
    const targetDate = moment().subtract(5, "days");
    const startOfTargetDate = targetDate.clone().startOf("day").toDate();
    const endOfTargetDate = targetDate.clone().endOf("day").toDate();

    const UserModel = mongoose.model("User");
    return await UserModel.aggregate([
      {
        $match: {
          isProfileCompleted: true,
          createdAt: { $gte: startOfTargetDate, $lte: endOfTargetDate },
          role: { $nin: ["brand", "admin"] },
        },
      },
      {
        $lookup: {
          from: "campaigninteractions",
          localField: "_id",
          foreignField: "userId",
          as: "campaigns",
        },
      },
      {
        $match: {
          campaigns: { $size: 0 },
        },
      },
    ]);
  } catch (error) {
    throw error;
  }
};

// Send reminder email to inactive ambassadors
const sendReminderEmails = async (users) => {
  const results = [];

  for (const user of users) {
    try {
      let userName = "";
      if (user.athlete) userName = user.athlete.name;
      else if (user.influencer) userName = user.influencer.name;
      else if (user.coach) userName = user.coach.name;
      else if (user.team) userName = user.team.name;
      else if (user.exAthlete) userName = user.exAthlete.name;
      else if (user.paraAthlete) userName = user.paraAthlete.name;

      if (!userName) userName = "there";

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

      const emailContent = {
        to: user.email,
        subject: "Explore your favorites and make an impact",
        html: `
       <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #000; background-color: #fff; margin: 0; padding: 0;">
            <div style="width: 100%; max-width: 600px; margin: 0 auto; padding: 20px;">
               <img src="https://res.cloudinary.com/dbtuvgdcc/image/upload/v1752661700/banner_photos/Sbonssy_logo_all_black_cprwob.png" 
                 alt="Sbonssy Logo"
                 style="max-width: 200px; height: auto; display: block; margin: 0 auto 20px auto;" />
    
               <p style="color: #000; margin-bottom: 16px;">Hi ${userName},</p>
               <p style="color: #000; margin-bottom: 16px; font-weight: bold;">Welcome aboard! Here's how to start earning:</p>
               <ul style="padding-left: 20px; color: #000; margin-bottom: 24px;">
                   <li style="margin-bottom: 8px;">Go to your 'My Account'</li>
                   <li style="margin-bottom: 8px;">Browse campaigns and create your first affiliate link</li>
                   <li>Share it with your followers</li>
               </ul>
    
            <div style="text-align: center;">
               <a href="${ctaHref}"
                 style="display: inline-block; padding: 12px 24px; background-color: #f26915; color: white; text-decoration: none; border-radius: 50px; font-weight: bold; margin: 20px 0;">
                 Get Started
               </a>
           </div>
    
            <p style="color: #000; margin-bottom: 0;">We're here if you need help,</p>
            <p style="color: #000; margin-top: 30px;">Best,<br>Team Sbonssy</p>
            </div>
       </div>
          `,
      };

      const result = await sendEmail(emailContent);
      results.push({
        userId: user._id,
        email: user.email,
        success: result.success,
        error: result.error,
      });
    } catch (error) {
      results.push({
        userId: user._id,
        email: user.email,
        success: false,
        error: error.message,
      });
    }
  }

  return results;
};

const runInactiveAmbassadorCheck = async () => {
  try {
    await connectDB();

    const inactiveUsers = await findInactiveAmbassadors();
    if (inactiveUsers.length > 0) {
      await sendReminderEmails(inactiveUsers);
    }
  } catch (error) {
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
};

// Schedule every minute with immediate first run
const scheduleTestJob = () => {
  // Run immediately
  // runInactiveAmbassadorCheck();

  //  At 09:00.
  cron.schedule("0 9 * * *", runInactiveAmbassadorCheck, {
    scheduled: true,
  });
};

// Start the job
if (process.env.NODE_ENV === "production") {
  scheduleTestJob();
}
