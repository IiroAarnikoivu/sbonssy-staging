import { NextResponse } from "next/server";
import createClient from "@/lib/supabase/server";
import { sendEmail } from "@/lib/sendEmail";

export async function POST(request) {
  try {
    const { code, newPassword } = await request.json();

    // Validate input
    if (!code || !newPassword) {
      return NextResponse.json(
        { error: "Both code and new password are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Exchange the code for a session
    const { data: sessionData, error: codeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (codeError) {
      return NextResponse.json(
        { error: "Invalid or expired reset code", details: codeError.message },
        { status: 401 }
      );
    }

    // Update the user's password
    const {
      data: { user },
      error: updateError,
    } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update password", details: updateError.message },
        { status: 400 }
      );
    }

    await sendEmail({
      to: user.email,
      subject: "Your password has been updated",
      html: `
       <div style="font-family: Arial, sans-serif; background-color: white; color: black; padding: 20px; line-height: 1.6;">
  <div style="max-width: 600px; margin: auto;">
    <img src="https://res.cloudinary.com/dbtuvgdcc/image/upload/v1752661700/banner_photos/Sbonssy_logo_all_black_cprwob.png" 
         alt="Sbonssy Logo"
         style="max-width: 200px; height: auto; display: block; margin: 0 auto 20px auto;" />
     
    <p style="color: black; margin-bottom: 16px;">Hi ${
      user.email || "there"
    },</p>
    <p style="color: black; margin-bottom: 16px;">This is a confirmation that your password has been successfully changed.</p>
    <p style="color: black; margin-bottom: 24px;">If you didn't make this change, please contact us immediately.</p>
    
    <div style="text-align: center;">
      <a href="${process.env.NEXTAUTH_URL}"
         style="display: inline-block; padding: 12px 24px; background-color: #f26915; color: white; text-decoration: none; border-radius: 50px; font-weight: bold; margin: 20px 0;">
        Stay connected
      </a>
    </div>
    
    <p style="color: black; margin-top: 30px;">Best,<br>Team Sbonssy</p>
  </div>
</div>
      `,
    });

    return NextResponse.json(
      { message: "Password updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Password update error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
