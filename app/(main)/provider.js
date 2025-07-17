"use client";

import { SidebarProvider } from "@/components/ui/sidebar";
import React, { useEffect, useState } from "react";
import { AppSidebar } from "./_components/AppSideBar";
import { useRouter } from "next/navigation";
import { clientAuthService } from "@/services/clientAuthService";
import { useUser } from "@/app/provider";

function DashboardProvider({ children }){
    const router = useRouter();
    const { user } = useUser();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function checkAuth() {
            try {
                const { data: { session } } = clientAuthService.getSession();
                
                if (!session?.access_token) {
                    // Redirect to login page if not authenticated
                    router.replace('/auth/signin');
                    return;
                }
                
                // Verify token is still valid
                const { data: { user }, error } = await clientAuthService.getUser(session.access_token);
                if (error || !user) {
                    clientAuthService.setSession(null);
                    router.replace('/auth/signin');
                    return;
                }
                
                setIsLoading(false);
            } catch (error) {
                console.error('Error checking authentication:', error);
                router.replace('/auth/signin');
            }
        }
        
        checkAuth();
    }, [router]);

    // Show loading state while checking authentication
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-semibold mb-4">Loading...</h1>
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
                </div>
            </div>
        );
    }

    return(
        <SidebarProvider open={true} onOpenChange={() => {}}>
            <AppSidebar />
            <main className="w-full p-6">
                {children}
            </main>
        </SidebarProvider>
    );
}

export default DashboardProvider;