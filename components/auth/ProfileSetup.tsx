"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/shared/input";
import ImageSVG from "@/public/svg/Image";
import UserSVG from "@/public/svg/User";

const ProfileSetup = ({ onNext }: { onNext: () => void }) => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setLoading(false);
    onNext();
  };

  return (
    <section className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-1 pb-10">
          <h1 className="text-lg font-semibold text-foreground">
            Create your profile
          </h1>
          <h2 className="text-lg font-semibold text-muted-foreground opacity-70">
            This is how you’ll appear in Squircle
          </h2>
        </div>

        <div className="flex flex-col items-center pb-5">
          <label className="relative w-16 h-16 cursor-pointer overflow-hidden rounded-full border-2 border-dashed border-border flex items-center justify-center group">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Profile preview"
                className="object-cover w-full h-full transition-transform duration-200 group-hover:scale-105"
              />
            ) : (
              <UserSVG className="w-10 h-10 text-muted-foreground transition-transform duration-200 group-hover:scale-110" fill="currentColor" />
            )}

            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-50 transition-opacity rounded-full flex items-center justify-center">
              <span className="text-xs text-white font-medium">{previewUrl ? "Change" : "Add"}</span>
            </div>

            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setImage(e.target.files ? e.target.files[0] : null)}
            />
          </label>

          <button
            type="button"
            onClick={() => document.querySelector<HTMLInputElement>("input[type=file]")?.click()}
            className="flex items-center gap-1 mt-4 text-xs font-medium cursor-pointer text-muted-foreground p-0.5 px-1.5 rounded border border-border bg-muted hover:bg-muted/90 hover:text-foreground transition-colors"
          >
            <ImageSVG className="w-3.5 h-3.5" fill="currentColor" />
            {previewUrl ? "Change photo" : "Add a photo"}
          </button>
        </div>


        <div className="space-y-4">
          <Input
            label="First name"
            id="firstName"
            placeholder="Enter your first name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />

          <Input
            label="Last name"
            id="lastName"
            placeholder="Enter your last name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>

        <Button
          className="w-full"
          disabled={!firstName || !lastName || loading}
          onClick={handleContinue}
        >
          {loading ? "Saving..." : "Continue"}
        </Button>
      </div>
    </section>
  );
};

export default ProfileSetup;