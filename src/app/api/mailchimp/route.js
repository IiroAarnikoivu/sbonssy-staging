export async function POST(request) {
  try {
    const { email } = await request.json();

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Valid email is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const AUDIENCE_ID = process.env.MAILCHIMP_AUDIENCE_ID;
    const API_KEY = process.env.MAILCHIMP_API_KEY;
    const DATACENTER = process.env.MAILCHIMP_API_SERVER;

    if (!AUDIENCE_ID || !API_KEY || !DATACENTER) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const url = `https://${DATACENTER}.api.mailchimp.com/3.0/lists/${AUDIENCE_ID}/members`;

    const data = {
      email_address: email,
      status: "subscribed",
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`anystring:${API_KEY}`).toString(
          "base64"
        )}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Mailchimp error:", errorData);

      if (errorData.title === "Member Exists") {
        return new Response(
          JSON.stringify({ error: "You are already subscribed." }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      throw new Error(errorData.title || "Failed to subscribe");
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Server error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message || "Server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
