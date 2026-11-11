import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // Returns device sessions list (synthetic dev demonstration)
  return NextResponse.json({
    sessions: [
      {
        id: "sess-1",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
        ipAddress: "192.168.1.104",
        isCurrent: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: "sess-2",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15",
        ipAddress: "172.56.21.90",
        isCurrent: false,
        createdAt: new Date(Date.now() - 7200000).toISOString(),
      },
    ],
  });
}
