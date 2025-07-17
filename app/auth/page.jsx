"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function AuthPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const router = useRouter();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create account');
      }

      toast.success("Account created! Please check your email for verification code.");
      setShowVerification(true);
    } catch (error) {
      console.error("Sign up error:", error);
      toast.error(error.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/auth/confirm-signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          confirmationCode: verificationCode,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Verification failed');
      }

      toast.success("Email verified successfully! You can now sign in.");
      router.push("/auth/signin");
    } catch (error) {
      console.error("Verification error:", error);
      toast.error(error.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    try {
      const response = await fetch('/api/auth/resend-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to resend code');
      }
      
      toast.success("Verification code resent to your email.");
    } catch (error) {
      console.error("Resend code error:", error);
      toast.error(error.message || "Failed to resend verification code");
    }
  };

  if (showVerification) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-500 via-green-400 to-emerald-500 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-lg overflow-hidden shadow-xl">
          <div className="p-8">
            <div className="flex justify-center mb-8">
              <Image 
                src="/image.png" 
                alt="Jargon AI Dashboard Logo" 
                width={300} 
                height={200} 
              />
            </div>

            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-800">Verify Your Email</h1>
              <p className="text-gray-500 mt-2">Enter the verification code sent to {formData.email}</p>
            </div>

            <form onSubmit={handleVerification} className="space-y-4">
              <div>
                <label htmlFor="verificationCode" className="block text-gray-700 mb-2">
                  Verification Code
                </label>
                <input
                  type="text"
                  id="verificationCode"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter 6-digit code"
                  maxLength="6"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium py-3 rounded-lg transition duration-200"
              >
                {loading ? "Verifying..." : "Verify Email"}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={resendCode}
                className="text-green-600 hover:text-green-700 text-sm"
              >
                Didn't receive the code? Resend
              </button>
            </div>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setShowVerification(false)}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                Back to registration
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-500 via-green-400 to-emerald-500 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 bg-white rounded-lg overflow-hidden shadow-xl">
        {/* Left Side - Illustration */}
        <div className="hidden md:flex flex-col items-center justify-center p-10 bg-green-50 relative">
          <div className="absolute top-8 left-8">
            <div className="flex items-center gap-2">
              <Image 
                src="/image.png" 
                alt="Logo" 
                width={200} 
                height={1500} 
              />
            </div>
          </div>
          <div className="relative w-full h-80">
            <Image
              src="/auth-illustration.svg"
              alt="Authentication"
              fill
              className="object-contain"
              priority
            />
          </div>
          <div className="absolute w-full h-full">
            {/* Decorative diamond shapes */}
            <div className="absolute top-20 left-16 w-8 h-8 bg-green-200 rotate-45 opacity-50"></div>
            <div className="absolute bottom-32 right-16 w-12 h-12 bg-green-200 rotate-45 opacity-50"></div>
            <div className="absolute top-40 right-20 w-6 h-6 bg-green-200 rotate-45 opacity-50"></div>
            <div className="absolute bottom-20 left-20 w-10 h-10 bg-green-200 rotate-45 opacity-50"></div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="flex flex-col p-8 md:p-12">
          <div className="flex justify-between items-center mb-4">
            <div className="md:hidden mb-6">
              <div className="flex items-center gap-2">
                <Image 
                  src="/image.png" 
                  alt="Logo" 
                  width={200} 
                  height={1500} 
                />
              </div>
            </div>
            <div className="text-sm text-gray-500 ml-auto">
              Already have an account?{" "}
              <Link href="/auth/signin" className="text-green-600 font-medium hover:underline">
                SIGN IN
              </Link>
            </div>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800">Welcome to Jargon AI Dashboard</h1>
            <p className="text-gray-500 mt-1">Create your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter your full name"
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter your email address"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Minimum 8 characters"
                minLength="8"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Password must be at least 8 characters long
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium py-3 rounded-lg transition duration-200"
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              By creating an account, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
