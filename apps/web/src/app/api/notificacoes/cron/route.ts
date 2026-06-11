import { NextRequest, NextResponse } from "next/server";
import { checkAllTriggers } from "@/lib/notifications/engine";

/**
 * POST /api/notificacoes/cron
 * Cron endpoint — called by external scheduler (e.g. cron-job.org, Vercel Cron)
 * or by the system's internal scheduler every hour.
 * 
 * Security: requires CRON_SECRET header to prevent unauthorized calls.
 */
export async function POST(req: NextRequest) {
  const cronSecret = req.headers.get("x-cron-secret");
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await checkAllTriggers();
    return NextResponse.json({
      success: true,
      triggered: results.length,
      details: results,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Notification cron error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
