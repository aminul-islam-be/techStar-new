import { NextRequest, NextResponse } from "next/server";

const MODEL = "nvidia/nemotron-3-ultra-550b-a55b:free";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          message: "AI service is not configured. Please add OPENROUTER_API_KEY.",
        },
        { status: 500 }
      );
    }

    const body = await req.json();
    const messages = Array.isArray(body?.messages) ? body.messages : [];

    if (!messages.length) {
      return NextResponse.json(
        { success: false, message: "No message provided." },
        { status: 400 }
      );
    }

    const safeMessages = messages
      .filter(
        (m: unknown) =>
          typeof m === "object" &&
          m !== null &&
          "role" in m &&
          "content" in m
      )
      .slice(-20);

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
          "X-Title": "TechStar AI Assistant",
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: "system",
              content:
                "You are TechStar AI Assistant. Help users with electrical, electronics, technology, products, shopping and general questions. Be helpful, accurate and concise. Reply in the same language as the user. TechStar's default website language is English, but users may communicate in Bangla, Banglish or other languages.",
            },
            ...safeMessages,
          ],
          temperature: 0.7,
          max_tokens: 2048,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message:
            data?.error?.message ||
            "Unable to get a response from the AI service.",
        },
        { status: response.status }
      );
    }

    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { success: false, message: "AI returned an empty response." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: content,
    });
  } catch (error) {
    console.error("AI Chat Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while connecting to the AI.",
      },
      { status: 500 }
    );
  }
}
