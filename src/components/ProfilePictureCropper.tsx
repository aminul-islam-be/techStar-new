"use client";

import { useState } from "react";
import Cropper from "react-easy-crop";

type Props = {
  currentImage?: string;
  onSaved: (url: string) => void;
  onError: (message: string) => void;
};

type Area = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export default function ProfilePictureCropper({
  currentImage = "",
  onSaved,
  onError,
}: Props) {
  const [image, setImage] = useState("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  function selectImage(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    e.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      onError("Please select an image file.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      onError("Image must be smaller than 10 MB.");
      return;
    }

    setImage(URL.createObjectURL(file));
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setArea(null);
    setCropOpen(true);
  }

  function closeCrop() {
    if (image) URL.revokeObjectURL(image);
    setImage("");
    setCropOpen(false);
    setArea(null);
    setZoom(1);
  }

  async function createFile() {
    if (!image || !area) {
      throw new Error("Please adjust the picture first.");
    }

    const img = new Image();
    img.src = image;

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () =>
        reject(new Error("Unable to load image."));
    });

    const canvas = document.createElement("canvas");
    canvas.width = 500;
    canvas.height = 500;

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Unable to process image.");
    }

    ctx.drawImage(
      img,
      area.x,
      area.y,
      area.width,
      area.height,
      0,
      0,
      500,
      500
    );

    let quality = 0.85;
    let blob: Blob | null = null;

    while (quality >= 0.25) {
      blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", quality);
      });

      if (blob && blob.size <= 150 * 1024) break;

      quality -= 0.1;
    }

    if (!blob) {
      throw new Error("Unable to compress image.");
    }

    return new File(
      [blob],
      "profile-picture.jpg",
      { type: "image/jpeg" }
    );
  }

  async function upload() {
    try {
      setUploading(true);
      onError("");

      const file = await createFile();

      const cloudName =
        process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

      const preset =
        process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ||
        "techstar_profiles";

      if (!cloudName) {
        throw new Error(
          "Cloudinary cloud name is missing."
        );
      }

      const data = new FormData();
      data.append("file", file);
      data.append("upload_preset", preset);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: "POST",
          body: data,
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error?.message ||
          "Cloudinary upload failed."
        );
      }

      closeCrop();
      onSaved(String(result.secure_url));
    } catch (error) {
      onError(
        error instanceof Error
          ? error.message
          : "Unable to upload profile picture."
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            if (currentImage) setViewerOpen(true);
          }}
          className="h-28 w-28 overflow-hidden rounded-full border-4 border-blue-500/30 bg-slate-800"
        >
          {currentImage ? (
            <img
              src={currentImage}
              alt="Profile"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-5xl text-slate-500">
              👤
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() =>
            document
              .getElementById("profile-picture-file")
              ?.click()
          }
          className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full border-2 border-slate-950 bg-blue-600"
        >
          📷
        </button>

        <input
          id="profile-picture-file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={selectImage}
        />
      </div>

      {viewerOpen && currentImage && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setViewerOpen(false)}
        >
          <img
            src={currentImage}
            alt="Profile picture"
            className="h-[min(80vw,500px)] w-[min(80vw,500px)] rounded-full object-cover"
          />
        </div>
      )}

      {cropOpen && image && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/90 p-4">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 p-5">
            <h2 className="mb-4 text-center text-xl font-bold text-white">
              Adjust Profile Picture
            </h2>

            <div className="relative h-80 w-full overflow-hidden rounded-2xl bg-black">
              <Cropper
                image={image}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onCropComplete={(_, pixels) =>
                  setArea(pixels)
                }
                onZoomChange={setZoom}
              />
            </div>

            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) =>
                setZoom(Number(e.target.value))
              }
              className="mt-5 w-full"
            />

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={closeCrop}
                disabled={uploading}
                className="rounded-xl bg-slate-700 px-4 py-3 font-bold text-white"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={upload}
                disabled={uploading || !area}
                className="rounded-xl bg-blue-600 px-4 py-3 font-bold text-white"
              >
                {uploading ? "Uploading..." : "Apply"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
