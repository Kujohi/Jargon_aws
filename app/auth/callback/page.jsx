"use client";

import { clientAuthService } from "@/services/clientAuthService";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data: { session } } = clientAuthService.getSession();
        
        if (session?.access_token) {
          const { data: { user }, error } = await clientAuthService.getUser(session.access_token);
          if (user && !error) {
            // Create/update user in database
            const response = await fetch('/api/auth/user', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ user }),
            });

            if (!response.ok) {
              throw new Error('Failed to create/update user');
            }

            toast.success("Successfully signed in!");
            router.replace('/dashboard'); // Use replace to prevent back navigation
            return;
          }
        }
        
        // If no valid session, redirect to sign in
        toast.error("Authentication failed");
        clientAuthService.setSession(null); // Clear any invalid session
        router.replace('/auth/signin');
      } catch (error) {
        console.error('Error in auth callback:', error);
        toast.error("Authentication failed: " + error.message);
        clientAuthService.setSession(null);
        router.replace('/auth/signin');
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold mb-4">Completing sign in...</h1>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
      </div>
    </div>
  );
} 