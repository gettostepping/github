"use client";

import Link from "next/link";
import React from "react";

export default function NotSignedIn() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 text-center px-6 relative">
      {/* Card */}
      <div className="bg-neutral-900/60 border border-neutral-700 rounded-2xl p-10 backdrop-blur-sm shadow-xl max-w-lg w-full">
        <h1 className="text-5xl font-bold text-white mb-4">
          Welcome to <span className="text-brand-400">Reminiscent</span>
        </h1>
        <p className="text-lg text-neutral-400 mb-8">
          Sign in to explore trending movies and TV shows, save your favorites,
          and access personalized recommendations.
        </p>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/auth/signin"
            className="px-6 py-3 text-lg font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-all duration-200"
          >
            Sign In
          </Link>
          <Link
            href="/auth/register"
            className="px-6 py-3 text-lg font-semibold text-white bg-neutral-700 hover:bg-neutral-600 rounded-lg transition-all duration-200"
          >
            Create Account
          </Link>
        </div>

        <div className="mt-8">
          <p className="text-sm text-neutral-500">
            <Link
              href="https://youtube.com"
              className="text-brand-400 hover:underline"
            >
              Join Our Community!
            </Link>
          </p>
        </div>
      </div>

      {/* Subtle gradient glow */}
      <div className="absolute w-[600px] h-[600px] bg-brand-500/10 blur-[200px] rounded-full -z-10"></div>
    </main>
  );
}
