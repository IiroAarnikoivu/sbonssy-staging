import { sendEmail } from "./sendEmail";

export async function sendWelcomeEmail(user, role) {
  const image = `https://res.cloudinary.com/dbtuvgdcc/image/upload/v1752661700/banner_photos/Sbonssy_logo_all_black_cprwob.png`;
  const firstName = user.user_metadata?.first_name || 
                    user.user_metadata?.full_name?.split(" ")[0] || 
                    user.user_metadata?.name?.split(" ")[0] || 
                    "there";
                    
  const baseUrl = process.env.NEXTAUTH_URL  || "http://localhost:3000";
  const subject = "Welcome to Sbonssy – Let’s get you set up";
  
  let contentHtml = "";
  let rolePath = role || "dashboard";

  if (role === "brand") {
    contentHtml = `
      <ul style="padding-left: 20px; color: #000; margin-bottom: 20px;">
        <li>Build your profile and set up a campaign</li>
        <li>Partner with ambassadors</li>
        <li>Support sports while boosting your sales</li>
      </ul>
    `;
    rolePath = "brand";
  } else if (role === "sports-ambassador") {
    contentHtml = `
      <ul style="padding-left: 20px; color: #000; margin-bottom: 20px;">
        <li>Create a standout profile to attract top brands</li>
        <li>Explore campaigns and collaborate with your favorites</li>
        <li>Share your unique links and start earning</li>
      </ul>
    `;
    rolePath = "sports-ambassador";
  } else {
    // Default to Fan content
    rolePath = "fan";
    contentHtml = `
      <ul style="padding-left: 20px; color: #000; margin-bottom: 20px;">
        <li>Explore deals and follow your favorite ambassadors</li>
        <li>Find your favorite products and start shopping</li>
        <li>Support your favorite ambassadors and make an impact</li>
      </ul>
    `;
  }

  // Use /role as the get started button route as requested
  const getStartedUrl = `${baseUrl}/${rolePath}`;

  return await sendEmail({
    to: user.email,
    subject: subject,
    text: `Hi ${firstName}, We’re excited to have you here! Get started at ${getStartedUrl}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #000; background-color: #fff; margin: 0; padding: 0;">
        <div style="width: 100%; max-width: 600px; margin: 0 auto; padding: 20px;">
          <img src="${image}" alt="Sbonssy Logo" style="max-width: 200px; height: auto; margin-bottom: 20px;">
          <h2 style="color: #000; margin-bottom: 16px;">Welcome to Sbonssy – Let’s get you set up</h2>
          <p style="color: #000; margin-bottom: 16px;">Hi ${firstName},</p>
          <p style="color: #000; margin-bottom: 16px;">We’re excited to have you here! Here’s how to get started:</p>
          
          ${contentHtml}

          <a href="${getStartedUrl}" 
             style="display: inline-block; padding: 12px 24px; background-color: #f26915; color: #fff; text-decoration: none; border-radius: 4px; font-weight: bold;">
             Get Started
          </a>
          
          <p style="color: #000; margin-top: 30px;">Best,<br>Team Sbonssy</p>
        </div>
      </div>
    `,
  });
}
