import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "pandaverse-gharana-portal",
      version: "0.1.0",
    },
    { status: 200 }
  );
}
