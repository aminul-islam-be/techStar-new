"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getCustomerUser, saveCustomerUser } from "@/lib/customerAuth";

type ProfileData = {
  profilePicture: string;
  fullName: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup: string;
  maritalStatus: string;
  country: string;
  division: string;
  permanentAddress: string;
  area: string;
  city: string;
  office: string;
  study: string;
};

const countries = [
  "Afghanistan",
  "Albania",
  "Algeria",
  "Andorra",
  "Angola",
  "Antigua and Barbuda",
  "Argentina",
  "Armenia",
  "Australia",
  "Austria",
  "Azerbaijan",
  "Bahamas",
  "Bahrain",
  "Bangladesh",
  "Barbados",
  "Belarus",
  "Belgium",
  "Belize",
  "Benin",
  "Bhutan",
  "Bolivia",
  "Bosnia and Herzegovina",
  "Botswana",
  "Brazil",
  "Brunei",
  "Bulgaria",
  "Burkina Faso",
  "Burundi",
  "Cambodia",
  "Cameroon",
  "Canada",
  "Chad",
  "Chile",
  "China",
  "Colombia",
  "Costa Rica",
  "Croatia",
  "Cuba",
  "Cyprus",
  "Czechia",
  "Denmark",
  "Egypt",
  "France",
  "Germany",
  "Ghana",
  "Greece",
  "Hungary",
  "Iceland",
  "India",
  "Indonesia",
  "Iran",
  "Iraq",
  "Ireland",
  "Italy",
  "Japan",
  "Jordan",
  "Kazakhstan",
  "Kenya",
  "Kuwait",
  "Malaysia",
  "Maldives",
  "Mexico",
  "Myanmar",
  "Nepal",
  "Netherlands",
  "New Zealand",
  "Nigeria",
  "Norway",
  "Oman",
  "Pakistan",
  "Philippines",
  "Poland",
  "Portugal",
  "Qatar",
  "Romania",
  "Russia",
  "Saudi Arabia",
  "Singapore",
  "South Africa",
  "South Korea",
  "Spain",
  "Sri Lanka",
  "Sweden",
  "Switzerland",
  "Thailand",
  "Turkey",
  "Ukraine",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
  "Vietnam",
  "Yemen",
  "Zambia",
  "Zimbabwe",
];

const divisions = [
  "Barishal",
  "Chattogram",
  "Dhaka",
  "Khulna",
  "Mymensingh",
  "Rajshahi",
  "Rangpur",
  "Sylhet",
];

const bloodGroups = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
];

function calculateAge(date: string) {
  if (!date) return null;

  const birth = new Date(date);
  const today = new Date();

  let age = today.getFullYear() - birth.getFullYear();

  const month = today.getMonth() - birth.getMonth();

  if (
    month < 0 ||
    (month === 0 && today.getDate() < birth.getDate())
  ) {
    age--;
  }

  return age >= 0 ? age : null;
}


async function compressImage(file: File): Promise<File> {
  const MAX_SIZE = 145 * 1024;

  const imageUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>(
      (resolve, reject) => {
        const img = new Image();

        img.onload = () => resolve(img);
        img.onerror = () =>
          reject(new Error("Unable to read image."));

        img.src = imageUrl;
      }
    );

    let width = image.naturalWidth;
    let height = image.naturalHeight;

    const maxDimension = 1200;

    if (width > maxDimension || height > maxDimension) {
      const ratio =
        Math.min(
          maxDimension / width,
          maxDimension / height
        );

      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    const canvas = document.createElement("canvas");

    let quality = 0.85;

    for (let attempt = 0; attempt < 8; attempt++) {
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error(
          "Your browser does not support image compression."
        );
      }

      context.clearRect(
        0,
        0,
        width,
        height
      );

      context.drawImage(
        image,
        0,
        0,
        width,
        height
      );

      const blob = await new Promise<Blob | null>(
        (resolve) =>
          canvas.toBlob(
            resolve,
            "image/jpeg",
            quality
          )
      );

      if (!blob) {
        throw new Error(
          "Unable to compress image."
        );
      }

      if (blob.size <= MAX_SIZE) {
        return new File(
          [blob],
          "profile-picture.jpg",
          {
            type: "image/jpeg",
          }
        );
      }

      quality -= 0.08;

      if (quality < 0.35) {
        width = Math.round(width * 0.85);
        height = Math.round(height * 0.85);
        quality = 0.7;
      }
    }

    const finalBlob =
      await new Promise<Blob | null>(
        (resolve) =>
          canvas.toBlob(
            resolve,
            "image/jpeg",
            0.3
          )
      );

    if (!finalBlob) {
      throw new Error(
        "Unable to compress image."
      );
    }

    return new File(
      [finalBlob],
      "profile-picture.jpg",
      {
        type: "image/jpeg",
      }
    );
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

export default function ProfilePage() {
  const [form, setForm] = useState<ProfileData>({
    profilePicture: "",
    fullName: "",
    phone: "",
    email: "",
    dateOfBirth: "",
    gender: "",
    bloodGroup: "",
    maritalStatus: "",
    country: "Bangladesh",
    division: "",
    permanentAddress: "",
    area: "",
    city: "",
    office: "",
    study: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showPicture, setShowPicture] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const user = getCustomerUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    try {
      const response = await fetch("/api/profile", {
        headers: {
          "x-user-id": user.id,
        },
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to load profile."
        );
      }

      setForm({
        profilePicture:
          data.user.profilePicture || "",
        fullName: data.user.fullName || "",
        phone: data.user.phone || "",
        email: data.user.email || "",
        dateOfBirth: data.user.dateOfBirth || "",
        gender: data.user.gender || "",
        bloodGroup: data.user.bloodGroup || "",
        maritalStatus: data.user.maritalStatus || "",
        country: data.user.country || "Bangladesh",
        division: data.user.division || "",
        permanentAddress:
          data.user.permanentAddress || "",
        area: data.user.area || "",
        city: data.user.city || "",
        office: data.user.office || "",
        study: data.user.study || "",
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load profile."
      );
    } finally {
      setLoading(false);
    }
  }

  function updateField(
    field: keyof ProfileData,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  const age = useMemo(
    () => calculateAge(form.dateOfBirth),
    [form.dateOfBirth]
  );


  useEffect(() => {
    if (age === null) return;

    setForm((current) => {
      if (current.maritalStatus === "married") {
        return current;
      }

      const defaultStatus =
        age >= 30 ? "unmarried" : "single";

      if (current.maritalStatus === defaultStatus) {
        return current;
      }

      return {
        ...current,
        maritalStatus: defaultStatus,
      };
    });
  }, [age]);

  async function saveProfile(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const user = getCustomerUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    try {
      setSaving(true);
      setMessage("");
      setError("");

      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id,
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to update profile."
        );
      }

      saveCustomerUser({
        ...user,
        fullName: data.user.fullName,
        phone: data.user.phone,
        email: data.user.email || "",
      });

      setMessage("Profile updated successfully.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update profile."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-20 text-white">
        <div className="mx-auto max-w-xl text-center">
          <div className="text-5xl">👤</div>
          <h1 className="mt-5 text-2xl font-bold">
            Loading profile...
          </h1>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">

        <Link
          href="/"
          className="text-sm text-slate-400 hover:text-white"
        >
          ← Back to Home
        </Link>

        <div className="mt-5 flex flex-col items-center">

          <label
            htmlFor="profile-picture"
            className="group relative cursor-pointer"
          >
            <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-blue-500/30 bg-slate-800 shadow-xl">

              {form.profilePicture ? (
                <img
                  src={form.profilePicture}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-5xl text-slate-500">
                  👤
                </span>
              )}

            </div>

            <div className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full border-2 border-slate-950 bg-blue-600 text-lg shadow-lg transition group-hover:bg-blue-500">
              📷
            </div>

            <input
              id="profile-picture"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];

                if (!file) return;

                if (!file.type.startsWith("image/")) {
                  setError("Please select an image file.");
                  return;
                }

                if (file.size > 10 * 1024 * 1024) {
                  setError("Image must be smaller than 10 MB.");
                  return;
                }

                try {
                  setError("");
                  setMessage("Uploading profile picture...");

                  const compressedFile =
                    await compressImage(file);

                  const cloudName =
                    process.env
                      .NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

                  const uploadPreset =
                    process.env
                      .NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ||
                    "techstar_profiles";

                  if (!cloudName) {
                    throw new Error(
                      "Cloudinary cloud name is missing."
                    );
                  }

                  const formData = new FormData();

                  formData.append(
                    "file",
                    compressedFile
                  );

                  formData.append(
                    "upload_preset",
                    uploadPreset
                  );

                  const uploadResponse =
                    await fetch(
                      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
                      {
                        method: "POST",
                        body: formData,
                      }
                    );

                  const uploadData =
                    await uploadResponse.json();

                  if (!uploadResponse.ok) {
                    throw new Error(
                      uploadData.error?.message ||
                        "Cloudinary upload failed."
                    );
                  }

                  const uploadedUrl =
                    uploadData.secure_url;

                  // Cloudinary AI background removal.
                  // The original uploaded image remains stored,
                  // while this URL displays the background-removed version.
                  const backgroundRemovedUrl =
                    uploadedUrl.replace(
                      "/upload/",
                      "/upload/e_background_removal/"
                    );

                  const user = getCustomerUser();

                  if (!user) {
                    window.location.href = "/login";
                    return;
                  }

                  const profileResponse =
                    await fetch("/api/profile", {
                      method: "PATCH",
                      headers: {
                        "Content-Type":
                          "application/json",
                        "x-user-id": user.id,
                      },
                      body: JSON.stringify({
                        profilePicture:
                          backgroundRemovedUrl,
                      }),
                    });

                  const profileData =
                    await profileResponse.json();

                  if (
                    !profileResponse.ok ||
                    !profileData.success
                  ) {
                    throw new Error(
                      profileData.message ||
                        "Unable to save profile picture."
                    );
                  }

                  setForm((current) => ({
                    ...current,
                    profilePicture:
                      backgroundRemovedUrl,
                  }));

                  setMessage(
                    "Profile picture uploaded successfully."
                  );
                } catch (err) {
                  setMessage("");

                  setError(
                    err instanceof Error
                      ? err.message
                      : "Unable to upload profile picture."
                  );
                }

                e.target.value = "";
              }}
            />
          </label>

          <h1 className="mt-4 text-3xl font-extrabold">
            My Profile
          </h1>

          <p className="mt-2 text-center text-sm text-slate-500">
            Click the picture to change your profile photo.
          </p>
        </div>

        {message && (
          <div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            ✓ {message}
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            ⚠️ {error}
          </div>
        )}

        <form
          onSubmit={saveProfile}
          className="mt-6 rounded-3xl border border-white/[0.08] bg-slate-900/70 p-5 sm:p-7"
        >

          <h2 className="text-lg font-bold">
            Personal Information
          </h2>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Full Name *
              </label>

              <input
                value={form.fullName}
                onChange={(e) =>
                  updateField("fullName", e.target.value)
                }
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Phone Number
              </label>

              <input
                value={form.phone}
                disabled
                className="w-full cursor-not-allowed rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Email Address
              </label>

              <input
                type="email"
                value={form.email}
                onChange={(e) =>
                  updateField("email", e.target.value)
                }
                placeholder="example@email.com"
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Date of Birth
              </label>

              <input
                type="date"
                value={form.dateOfBirth}
                onChange={(e) =>
                  updateField(
                    "dateOfBirth",
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
              />

              {age !== null && (
                <p className="mt-2 text-xs text-blue-300">
                  Age: {age} years
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Gender
              </label>

              <select
                value={form.gender}
                onChange={(e) =>
                  updateField("gender", e.target.value)
                }
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="others">Others</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Blood Group
              </label>

              <select
                value={form.bloodGroup}
                onChange={(e) =>
                  updateField(
                    "bloodGroup",
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
              >
                <option value="">
                  Select Blood Group
                </option>

                {bloodGroups.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Marital Status
              </label>

              <select
                value={form.maritalStatus}
                onChange={(e) =>
                  updateField(
                    "maritalStatus",
                    e.target.value
                  )
                }
                required
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
              >
                <option value="" disabled>
                  Select Marital Status
                </option>
                <option value="married">
                  Married
                </option>
                <option value="unmarried">
                  Unmarried
                </option>
                <option value="single">
                  Single
                </option>
              </select>

              {age !== null && (
                <p className="mt-2 text-[11px] text-slate-500">
                  Default:{" "}
                  {age >= 30
                    ? "Unmarried"
                    : "Single"}
                </p>
              )}
            </div>

          </div>


          <div className="mt-8 border-t border-white/[0.08] pt-7">

            <h2 className="text-lg font-bold">
              Address Information
            </h2>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Country
                </label>

                <select
                  value={form.country}
                  onChange={(e) => {
                    const country = e.target.value;

                    setForm((current) => ({
                      ...current,
                      country,
                      division:
                        country === "Bangladesh"
                          ? current.division
                          : "",
                    }));
                  }}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
                >
                  {countries.map((country) => (
                    <option
                      key={country}
                      value={country}
                    >
                      {country}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Division / State / Province
                </label>

                {form.country === "Bangladesh" ? (
                  <select
                    value={form.division}
                    onChange={(e) =>
                      updateField(
                        "division",
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="">
                      Select Division
                    </option>

                    {divisions.map((division) => (
                      <option
                        key={division}
                        value={division}
                      >
                        {division}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={form.division}
                    onChange={(e) =>
                      updateField(
                        "division",
                        e.target.value
                      )
                    }
                    placeholder="State / Province / Region"
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  />
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-semibold">
                  Permanent Address
                </label>

                <textarea
                  value={form.permanentAddress}
                  onChange={(e) =>
                    updateField(
                      "permanentAddress",
                      e.target.value
                    )
                  }
                  rows={3}
                  placeholder="House, Road, Village, etc."
                  className="w-full resize-none rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Area / Thana
                </label>

                <input
                  value={form.area}
                  onChange={(e) =>
                    updateField("area", e.target.value)
                  }
                  placeholder="Area / Thana"
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  City
                </label>

                <input
                  value={form.city}
                  onChange={(e) =>
                    updateField("city", e.target.value)
                  }
                  placeholder="City"
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
                />
              </div>

            </div>
          </div>


          <div className="mt-8 border-t border-white/[0.08] pt-7">

            <h2 className="text-lg font-bold">
              Education & Work
            </h2>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Office / Workplace
                </label>

                <input
                  value={form.office}
                  onChange={(e) =>
                    updateField(
                      "office",
                      e.target.value
                    )
                  }
                  placeholder="Office / Workplace"
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Study
                </label>

                <select
                  value={form.study}
                  onChange={(e) =>
                    updateField(
                      "study",
                      e.target.value
                    )
                  }
                  required
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
                >
                  <option value="" disabled>
                    Select Education Level
                  </option>

                  <option value="School">
                    School
                  </option>

                  <option value="College">
                    College
                  </option>

                  <option value="University">
                    University
                  </option>

                  <option value="Madrasha">
                    Madrasha
                  </option>
                </select>
              </div>

            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-8 w-full rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-extrabold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>

        </form>
      </div>
    </main>
  );
}
