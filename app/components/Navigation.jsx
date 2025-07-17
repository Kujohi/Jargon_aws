"use client";

import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { useUser } from "../provider";
import { User, LogOut } from "lucide-react";
import { clientAuthService } from "@/services/clientAuthService";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const Navigation = () => {
  const { user, setUser } = useUser();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      // Use client auth service for logout
      clientAuthService.signOut();
      setUser(null);
      toast.success("Logged out successfully");
      router.push("/");
    } catch (error) {
      toast.error("Error logging out: " + error.message);
    }
  };

  return (
    <nav className="w-full py-4 px-6 md:px-12 flex justify-between items-center bg-gradient-to-br from-green-50 to-green-100">
      {/* Left spacer */}
      <div className="flex-1"></div>
      
      {/* Centered title */}
      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold text-green-700">Jargon AI<span className="text-green-500">Dashboard</span></span>
      </div>
      
      {/* Right section - User info */}
      <div className="flex-1 flex justify-end">
      {user ? (
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <User className="w-5 h-5 text-gray-600" />
            <span className="text-sm text-gray-700">{user.name || user.email}</span>
          </div>
          <Button
            onClick={handleLogout}
            variant="ghost"
            size="sm"
            className="text-red-500 hover:text-red-600"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="flex space-x-2">
          <Link href="/auth/signin">
            <Button variant="ghost" className="text-green-600 hover:text-green-700">
              Sign In
            </Button>
          </Link>
          <Link href="/auth">
            <Button className="bg-green-600 hover:bg-green-700 text-white">
              Get Started
            </Button>
          </Link>
        </div>
      )}
      </div>
    </nav>
  );
};

export default Navigation; 