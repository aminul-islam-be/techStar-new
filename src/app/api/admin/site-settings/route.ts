import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import connectDB from "@/lib/mongodb";
import SiteSettingsModel from "@/models/SiteSettings";
import { getAdminSession } from "@/lib/adminAuth";
import { SITE_SETTINGS_TAG, readSiteSettingsFromDb } from "@/lib/siteSettings";
import { validateSiteInput } from "@/lib/siteDefaults";

export const dynamic = "force-dynamic";

const noAuth = () => NextResponse.json({ success: false, message: "Admin login required." }, { status: 401 });

export async function GET() {
  if (!(await getAdminSession())) return noAuth();
  return NextResponse.json({ success: true, site: await readSiteSettingsFromDb() });
}

/** Saves the settings and clears the site's cache, so the new name shows everywhere at once. */
export async function PUT(request: NextRequest) {
  if (!(await getAdminSession())) return noAuth();

  const body = await request.json();
  const checked = validateSiteInput(body);
  if (!checked.ok || !checked.data) return NextResponse.json({ success: false, message: checked.message }, { status: 400 });
  const data = checked.data;

  await connectDB();
  await SiteSettingsModel.findOneAndUpdate(
    { key: "main" },
    { $set: data },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );

  // cache clearing: the stored settings AND every page that was already built with the old name
  revalidateTag(SITE_SETTINGS_TAG, { expire: 0 });
  revalidatePath("/", "layout");

  return NextResponse.json({ success: true, site: data });
}
