"use client";

import { useEffect, useState } from "react";
import Cropper from "react-easy-crop";

type Area = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type ProfilePictureCropperProps = {
  currentImage?: string;
  onSaved: (url: string) => void;
  onError?: (message: string) => void;
};

export default function ProfilePictureCropper({
  currentImage = "",
  onSaved,
  onError,
}: ProfilePictureCropperProps) {
  const [selectedImage, setSelectedImage] =
    useState<string>("");

  const [crop, setCrop] = useState({
    x: 0,
    y: 0,
  });

  const [zoom, setZoom] = useState(1);

  const [croppedAreaPixels, setCroppedAreaPixels] =
    useState<Area | null>(null);

  const [showCropper, setShowCropper] =
    useState(false);

  const [showViewer, setShowViewer] =
    useState(false);

  const [uploading, setUploading] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    return () => {
      if (selectedImage) {
        URL.revokeObjectURL(selectedImage);
      }
    };
  }, [selectedImage]);

  function showError(message: string) {
    setError(message);

    if (onError) {
      onError(message);
    }
  }

  function handlePictureSelect(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    setError("");

    if (!file.type.startsWith("image/")) {
      showError(
        "Please select a valid image."
      );
      return;
    }

    if (
      file.size >
      10 * 1024 * 1024
    ) {
      showError(
        "Image size must be less than 10 MB."
      );
      return;
    }

    const imageUrl =
      URL.createObjectURL(file);

    setSelectedImage(imageUrl);

    setCrop({
      x: 0,
      y: 0,
    });

    setZoom(1);

    setCroppedAreaPixels(null);

    setShowCropper(true);
  }

  function closeCropper() {
    if (selectedImage) {
      URL.revokeObjectURL(
        selectedImage
      );
    }

    setSelectedImage("");

    setShowCropper(false);

    setCroppedAreaPixels(null);

    setZoom(1);

    setError("");
  }

  function handleCropComplete(
    _area: Area,
    pixels: Area
  ) {
    setCroppedAreaPixels(pixels);
  }

  async function createCroppedFile(): Promise<File> {
    if (
      !selectedImage ||
      !croppedAreaPixels
    ) {
      throw new Error(
        "Please adjust the image first."
      );
    }

    const image =
      new Image();

    image.src = selectedImage;

    await new Promise<void>(
      (resolve, reject) => {
        image.onload = () => {
          resolve();
        };

        image.onerror = () => {
          reject(
            new Error(
              "Unable to load image."
            )
          );
        };
      }
    );

    const canvas =
      document.createElement(
        "canvas"
      );

    const outputSize = 500;

    canvas.width = outputSize;
    canvas.height = outputSize;

    const context =
      canvas.getContext("2d");

    if (!context) {
      throw new Error(
        "Unable to process image."
      );
    }

    context.drawImage(
      image,
      croppedAreaPixels.x,
      croppedAreaPixels.y,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
      0,
      0,
      outputSize,
      outputSize
    );

    let quality = 0.9;

    let blob: Blob | null = null;

    while (
      quality >= 0.2
    ) {
      blob =
        await new Promise<Blob | null>(
          (resolve) => {
            canvas.toBlob(
              resolve,
              "image/jpeg",
              quality
            );
          }
        );

      if (
        blob &&
        blob.size <=
          150 * 1024
      ) {
        break;
      }

      quality -= 0.1;
    }

    if (!blob) {
      throw new Error(
        "Unable to compress image."
      );
    }

    return new File(
      [blob],
      "profile-picture.jpg",
      {
        type: "image/jpeg",
      }
    );
  }

  async function uploadCroppedImage() {
    try {
      setUploading(true);

      setError("");

      const croppedFile =
        await createCroppedFile();

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

      const formData =
        new FormData();

      formData.append(
        "file",
        croppedFile
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

      if (
        !uploadResponse.ok
      ) {
        throw new Error(
          uploadData.error?.message ||
            "Cloudinary upload failed."
        );
      }

      if (
        !uploadData.secure_url
      ) {
        throw new Error(
          "Cloudinary did not return an image URL."
        );
      }

      const uploadedUrl =
        String(
          uploadData.secure_url
        );

      closeCropper();

      onSaved(
        uploadedUrl
      );
    } catch (err) {
      showError(
        err instanceof Error
          ? err.message
          : "Unable to upload profile picture."
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <div className="relative inline-block">
        <button
          type="button"
          onClick={() => {
            if (currentImage) {
              setShowViewer(true);
            }
          }}
          className="relative h-28 w-28 overflow-hidden rounded-full border-4 border-blue-500/30 bg-slate-800 shadow-xl"
          aria-label="View profile picture"
        >
          {currentImage ? (
            <img
              src={currentImage}
              alt="Profile picture"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-5xl">
              👤
            </div>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            document
              .getElementById(
                "profile-picture-file"
              )
              ?.click();
          }}
          className="absolute bottom-0 right-0 flex h-10 w-10 items-center justify-center rounded-full border-2 border-slate-950 bg-blue-600 text-lg text-white shadow-lg"
          aria-label="Change profile picture"
        >
          📷
        </button>

        <input
          id="profile-picture-file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={
            handlePictureSelect
          }
        />
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-500">
          {error}
        </p>
      )}

      {showViewer &&
        currentImage && (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4"
            onClick={() =>
              setShowViewer(false)
            }
          >
            <div
              className="relative"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <img
                src={currentImage}
                alt="Profile picture"
                className="h-[min(80vw,500px)] w-[min(80vw,500px)] rounded-full object-cover shadow-2xl"
              />

              <button
                type="button"
                onClick={() =>
                  setShowViewer(false)
                }
                className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center rounded-full bg-black/80 text-2xl text-white"
                aria-label="Close"
              >
                ×
              </button>
            </div>
          </div>
        )}

      {showCropper &&
        selectedImage && (
          <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/90 p-4">
            <div className="w-full max-w-md rounded-3xl bg-slate-900 p-5 shadow-2xl">
              <h2 className="mb-2 text-center text-xl font-bold text-white">
                Adjust Profile Picture
              </h2>

              <p className="mb-4 text-center text-sm text-slate-400">
                Drag the image and use zoom to
                fit it perfectly.
              </p>

              <div className="relative h-80 w-full overflow-hidden rounded-2xl bg-black">
                <Cropper
                  image={selectedImage}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  restrictPosition={true}
                  onCropChange={
                    setCrop
                  }
                  onCropComplete={
                    handleCropComplete
                  }
                  onZoomChange={
                    setZoom
                  }
                />
              </div>

              <div className="mt-5">
                <div className="mb-2 flex justify-between text-sm text-slate-400">
                  <span>
                    Zoom
                  </span>

                  <span>
                    {zoom.toFixed(1)}x
                  </span>
                </div>

                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.1"
                  value={zoom}
                  onChange={(event) =>
                    setZoom(
                      Number(
                        event.target.value
                      )
                    )
                  }
                  className="w-full"
                />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={
                    closeCropper
                  }
                  disabled={
                    uploading
                  }
                  className="rounded-xl bg-slate-700 px-4 py-3 font-bold text-white"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={
                    uploadCroppedImage
                  }
                  disabled={
                    uploading ||
                    !croppedAreaPixels
                  }
                  className="rounded-xl bg-blue-600 px-4 py-3 font-bold text-white disabled:opacity-50"
                >
                  {uploading
                    ? "Uploading..."
                    : "Apply"}
                </button>
              </div>
            </div>
          </div>
        )}
    </>
  );
  }
