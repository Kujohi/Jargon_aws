"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { clientAuthService } from "@/services/clientAuthService";

export default function SignInPage() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const router = useRouter();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const result = await response.json();
      
      if (!response.ok || !result.data?.session) {
        throw new Error(result.error || 'Authentication failed');
      }

      // Store session using clientAuthService
      clientAuthService.setSession(result.data.session);
      
      // Get user info and store it
      const { data: { user }, error } = await clientAuthService.getUser(result.data.session.access_token);
      if (error || !user) {
        throw new Error('Failed to get user info');
      }

      toast.success("Signed in successfully!");
      router.push("/dashboard");
    } catch (error) {
      console.error("Sign in error:", error);
      toast.error(error.message || "Failed to sign in");
      // Clear any partial session data on error
      clientAuthService.setSession(null);
    } finally {
      setLoading(false);
    }
  };

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
            <h1 className="text-2xl font-bold text-gray-800">Welcome to Jargon AI Dashboard</h1>
            <p className="text-gray-500 mt-2">Sign in to get started</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="Enter your email"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Enter your password"
                className="mt-1"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-4"
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/auth/forgot-password" className="text-green-600 hover:text-green-700 text-sm">
              Forgot your password?
            </Link>
          </div>

          <div className="mt-4 text-center">
            <span className="text-gray-500 text-sm">Don't have an account? </span>
            <Link href="/auth" className="text-green-600 hover:text-green-700 text-sm font-medium">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 