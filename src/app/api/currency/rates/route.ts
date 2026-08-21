import { NextResponse } from "next/server";

export async function GET() {
  try {
    const response = await fetch(
      "https://open.er-api.com/v6/latest/BDT",
      {
        next: {
          revalidate: 3600,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Unable to load currency rates.");
    }

    const data = await response.json();

    if (
      data.result !== "success" ||
      !data.rates
    ) {
      throw new Error("Invalid currency rate response.");
    }

    return NextResponse.json({
      success: true,
      base: "BDT",
      rates: data.rates,
    });
  } catch (error) {
    console.error("Currency rate error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load currency rates.",
      },
      { status: 500 }
    );
  }
}
