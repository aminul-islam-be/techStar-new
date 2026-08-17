import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(request: Request) {
  try {
      await connectDB();

          const setupKey = request.headers.get("x-admin-setup-key");
              const requiredKey = process.env.ADMIN_SETUP_KEY;

                  if (!requiredKey || setupKey !== requiredKey) {
                        return NextResponse.json(
                                { success: false, message: "Unauthorized." },
                                        { status: 401 }
                                              );
                                                  }

                                                      const body = await request.json();

                                                          const phone = String(body.phone || "").trim();
                                                              const password = String(body.password || "");

                                                                  if (!phone || !password || password.length < 8) {
                                                                        return NextResponse.json(
                                                                                {
                                                                                          success: false,
                                                                                                    message: "Valid phone and password are required.",
                                                                                                            },
                                                                                                                    { status: 400 }
                                                                                                                          );
                                                                                                                              }

                                                                                                                                  const hashedPassword = await bcrypt.hash(password, 12);

                                                                                                                                      // First look for the phone number.
                                                                                                                                          // If it already exists, make that account admin.
                                                                                                                                              // If it doesn't exist, create a new admin account.
                                                                                                                                                  let admin = await User.findOne({ phone });

                                                                                                                                                      if (!admin) {
                                                                                                                                                            admin = new User({
                                                                                                                                                                    fullName: "TechStar Admin",
                                                                                                                                                                            phone,
                                                                                                                                                                                    password: hashedPassword,
                                                                                                                                                                                            role: "admin",
                                                                                                                                                                                                    active: true,
                                                                                                                                                                                                          });
                                                                                                                                                                                                              } else {
                                                                                                                                                                                                                    admin.password = hashedPassword;
                                                                                                                                                                                                                          admin.role = "admin";
                                                                                                                                                                                                                                admin.active = true;
                                                                                                                                                                                                                                    }

                                                                                                                                                                                                                                        await admin.save();

                                                                                                                                                                                                                                            return NextResponse.json({
                                                                                                                                                                                                                                                  success: true,
                                                                                                                                                                                                                                                        message: "Admin credentials updated successfully.",
                                                                                                                                                                                                                                                              phone: admin.phone,
                                                                                                                                                                                                                                                                  });
                                                                                                                                                                                                                                                                    } catch (error) {
                                                                                                                                                                                                                                                                        console.error("Admin reset error:", error);

                                                                                                                                                                                                                                                                            return NextResponse.json(
                                                                                                                                                                                                                                                                                  {
                                                                                                                                                                                                                                                                                          success: false,
                                                                                                                                                                                                                                                                                                  message: "Unable to update admin credentials.",
                                                                                                                                                                                                                                                                                                        },
                                                                                                                                                                                                                                                                                                              { status: 500 }
                                                                                                                                                                                                                                                                                                                  );
                                                                                                                                                                                                                                                                                                                    }
                                                                                                                                                                                                                                                                                                                    }