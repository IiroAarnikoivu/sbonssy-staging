const cron = require("node-cron");
const mongoose = require("mongoose");
const { sendEmail } = require("../sendEmail");
const User = require("../../models/User");
const Campaign = require("../../models/Campaign");
const moment = require("moment");

// Cron job to run daily at 9 AM
if (process.env.NODE_ENV === "production")
  cron.schedule("0 9 * * *", async () => {
    try {
      // Connect to MongoDB if not already connected
      if (mongoose.connection.readyState !== 1) {
        await mongoose.connect(process.env.MONGODB_URI);
      }

      // Ensure models are registered
      if (!mongoose.models.User) {
        mongoose.model("User", User.schema);
      }
      if (!mongoose.models.Campaign) {
        mongoose.model("Campaign", Campaign.schema);
      }

    // Calculate time 5 days ago (24h window)
    const targetDate = moment().subtract(5, "days");
    const startOfTargetDate = targetDate.clone().startOf("day").toDate();
    const endOfTargetDate = targetDate.clone().endOf("day").toDate();

    // Find brands with completed profiles who haven't created campaigns
    const brands = await mongoose.model("User").find({
      role: "brand",
      isProfileCompleted: true,
      updatedAt: { $gte: startOfTargetDate, $lte: endOfTargetDate },
    });

    for (const brand of brands) {
      const campaignCount = await mongoose.model("Campaign").countDocuments({
        brandId: brand._id,
      });

      if (campaignCount === 0) {
        const result = await sendEmail({
          to: brand.email,
          subject: "Welcome! Start collaborating with ambassadors",

          html: `
             <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #000; background-color: #fff; margin: 0; padding: 0;">
            <div style="width: 100%; max-width: 600px; margin: 0 auto; padding: 20px;">
               <img src="https://res.cloudinary.com/dbtuvgdcc/image/upload/v1752661700/banner_photos/Sbonssy_logo_all_black_cprwob.png" 
                 alt="Sbonssy Logo"
                 style="max-width: 200px; height: auto; display: block; margin: 0 auto 20px auto;" />
    
               <p style="color: #000; margin-bottom: 16px;">Hi ${
                 brand?.brand?.companyName || "there"
               },</p>
               <p style="color: #000; margin-bottom: 16px; font-weight: bold;">Let’s get your brand set up for success:</p>
               <ul style="padding-left: 20px; color: #000; margin-bottom: 24px;">
                   <li>Launch a campaign to kick-off partnerships</li>
                   <li style="margin-bottom: 8px;">Set up tracking and commissions</li>
                   <li style="margin-bottom: 8px;">Connect with ambassadors</li>
               </ul>
               
            <div style="text-align: center;">
               <a href="${process.env.NEXTAUTH_URL}"
                 style="display: inline-block; padding: 12px 24px; background-color: #f26915; color: white; text-decoration: none; border-radius: 50px; font-weight: bold; margin: 20px 0;">
                 Get Started
               </a>
           </div>
    
            <p style="color: #000; margin-bottom: 0;">Looking forward to your success,</p>
            <p style="color: #000; margin-top: 30px;">Best,<br>Team Sbonssy</p>
            </div>
       </div>
          `,
        });

        if (result.success) {
        } else {
          console.error(
            `Failed to send email to ${brand.email}: ${result.error}`
          );
        }
      }
    }
  } catch (error) {
    console.error("Error in campaign reminder cron job:", error);
  }
});

// Keep the process running
process.on("SIGINT", () => {
  mongoose.connection.close();
  process.exit(0);
});

process.on("SIGTERM", () => {
  mongoose.connection.close();
  process.exit(0);
});

// Initial connection and test run (optional)
(async () => {
  try {
    // await mongoose.connect(process.env.MONGODB_URI);
    // Optional: Run immediately for testing (comment out in production)
    // const fiveDaysAgo = new Date();
    // fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    // const brands = await mongoose.model("User").find({
    //   role: "brand",
    //   isProfileCompleted: true,
    //   updatedAt: { $lte: fiveDaysAgo },
    // });
  } catch (error) {
    console.error("Initialization error:", error);
  }
})();
