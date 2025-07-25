const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;
export async function POST() {
  try {
    if (!HEYGEN_API_KEY) {
      throw new Error("API key is missing from .env");
    }

    const baseApiUrl = process.env.NEXT_PUBLIC_BASE_API_URL || "https://api.heygen.com";

    const res = await fetch(`${baseApiUrl}/v1/streaming.create_token`, {
      method: "POST",
      headers: {
        "x-api-key": HEYGEN_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        test: false // Set test=false to use production credits instead of test credits
      })
    });

    console.log("Token Response Status:", res.status);

    const data = await res.json();

    return new Response(JSON.stringify({ token: data.data.token }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error("Error retrieving access token:", error);
    return new Response("Failed to retrieve access token", {
      status: 500,
    });
  }
}