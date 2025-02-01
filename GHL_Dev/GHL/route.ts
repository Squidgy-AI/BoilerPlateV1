import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Load API Keys from environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY || "";
const HEYGEN_AVATAR_ID = "Abigail_expressive_2024112501"; // Replace with your actual avatar ID

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

export async function POST(request: NextRequest) {
    try {
        // Step 1: Validate input
        const { query } = await request.json();
        if (!query) {
            return NextResponse.json({ error: "Query is required" }, { status: 400 });
        }

        console.log("✅ Received query:", query);

        // Step 2: Fetch response from OpenAI
        const chatCompletion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: query }],
        });

        if (!chatCompletion.choices || chatCompletion.choices.length === 0) {
            throw new Error("OpenAI response is empty");
        }

        const aiResponse = chatCompletion.choices[0].message.content?.trim();
        console.log("🟢 OpenAI Response:", aiResponse);

        // Double-check that aiResponse is correctly passed to HeyGen
        if (!aiResponse || aiResponse.length < 5) { // Ensuring valid response
        throw new Error("Invalid AI response received from OpenAI");
        }
        // Step 3: Send OpenAI response to HeyGen to generate video
        const heyGenResponse = await fetch("https://api.heygen.com/v2/video/generate", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Api-Key": HEYGEN_API_KEY,
            },
            body: JSON.stringify({
                video_inputs: [
                    {
                        character: {
                            type: "avatar",
                            avatar_id: HEYGEN_AVATAR_ID,
                            avatar_style: "normal",
                           
                        },
                        voice: {
                            type: "text",
                            input_text: aiResponse,
                            voice_id: "26b2064088674c80b1e5fc5ab1a068eb" // Replace with your valid voice_id
                        },
                        
                        background: {
                            type: "color",
                            value: "#008000",
                        },
                    },
                ],
                dimension: {
                    width: 1280,
                    height: 720,
                },
            }),
        });

        const heyGenData = await heyGenResponse.json();
        console.log("🟡 HeyGen Response:", heyGenData);

        if (heyGenData.error) {
            console.error("❌ HeyGen API Error:", heyGenData.error);
            return NextResponse.json(
                { error: "HeyGen failed to generate video", details: heyGenData.error },
                { status: 500 }
            );
        }

        const videoId = heyGenData.data?.video_id || heyGenData.video_id;

        if (!videoId || typeof videoId !== "string") {
            console.error("🔴 HeyGen returned an invalid video_id:", heyGenData);
            throw new Error("HeyGen response missing or invalid video_id");
        }
        
        console.log("🟡 Using Video ID:", videoId);
        
        

       // Step 4: Poll HeyGen for video status until it's ready
let videoUrl: string | null = null;
let attempts = 0;
while (attempts < 10) { // Max 10 attempts
    await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds

    const videoStatusResponse = await fetch(
        `https://api.heygen.com/v1/video_status.get?video_id=${heyGenData.video_id}`,
        {
            method: "GET",
            headers: { "X-Api-Key": HEYGEN_API_KEY },
        }
    );

    const videoStatusData = await videoStatusResponse.json();
    console.log(`🔄 Video Processing Status: Attempt ${attempts + 1}`, videoStatusData);

    if (videoStatusData.video_url) {
        videoUrl = videoStatusData.video_url;
        break;
    }

    attempts++;
}


        // Step 5: Return video URL to frontend
        return NextResponse.json({ video_url: videoUrl });

    } catch (error: any) {
        console.error("❌ Error:", error.message, error.stack);
        return NextResponse.json(
            { error: "Request failed", details: error.message },
            { status: 500 }
        );
    }
}
