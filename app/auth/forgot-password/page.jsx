"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Here you would implement your password reset logic
    console.log("Password reset requested for:", email);
    setIsSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-500 via-green-400 to-emerald-500 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg overflow-hidden shadow-xl">
        <div className="p-8">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Image 
                src="/image.png" 
                alt="Jargon AI Dashboard Logo" 
                width={120} 
                height={900} 
              />
            </div>
            <div className="text-sm text-gray-500 ml-auto">
              <Link href="/auth/signin" className="text-green-600 hover:underline text-sm">
                Back to Sign In
              </Link>
            </div>
          </div>

          {!isSubmitted ? (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-800">Forgot your password?</h1>
                <p className="text-gray-500 mt-2">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="focus001@gmail.com"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-lg transition duration-200"
                >
                  Reset Password
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-8 w-8 text-green-500" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M5 13l4 4L19 7" 
                  />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Check your email</h2>
              <p className="text-gray-600 mb-6">
                We sent a password reset link to<br />
                <span className="font-medium">{email}</span>
              </p>
              <p className="text-gray-500 text-sm">
                Didn't receive the email? Check your spam folder or{" "}
                <button 
                  type="button" 
                  onClick={() => setIsSubmitted(false)}
                  className="text-green-600 hover:underline"
                >
                  try again
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 