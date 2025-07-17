"use client"
import { UserDetailContext } from "@/context/UserDetailContext";
import { DataRefreshProvider } from "@/context/DataRefreshContext";
import { clientAuthService } from "@/services/clientAuthService";
import React, { useContext, useEffect, useState } from "react";

function Provider({ children }) {
  const [user, setUser] = useState()

  useEffect(() => {
    // Check if user is authenticated first
    const checkAuth = async () => {
      const { data: { session } } = clientAuthService.getSession();
      if (session?.access_token) {
        const { data: { user }, error } = await clientAuthService.getUser(session.access_token);
        if (user && !error) {
          CreateNewUser(user, session.access_token);
        }
      }
    };
    
    checkAuth();
  }, []);

  const CreateNewUser = async (authUser, accessToken) => {
    try {
      // Use API endpoint to create or get user
      const response = await fetch('/api/auth/user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user: authUser }),
      });

      if (!response.ok) {
        throw new Error('Failed to create/get user');
      }

      const { user: dbUser } = await response.json();
      console.log("User from database:", dbUser);
      setUser(dbUser);
    } catch (error) {
      console.error("Error in CreateNewUser:", error);
    }
  };

  // Function to refresh user data
  const refreshUser = async () => {
    if (!user?.email) return;
    
    try {
      const { data: { session } } = clientAuthService.getSession();
      if (!session?.access_token) return;

      const response = await fetch('/api/auth/user', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const { user: refreshedUser } = await response.json();
        setUser(refreshedUser);
      }
    } catch (error) {
      console.error("Error refreshing user:", error);
    }
  };

  return (
    <UserDetailContext.Provider value={{ user, setUser, refreshUser }}>
      <DataRefreshProvider>
      <div>{children}</div>
      </DataRefreshProvider>
    </UserDetailContext.Provider>
  );
}

export default Provider;

export const useUser = () => {
  const context = useContext(UserDetailContext);
  return context
}