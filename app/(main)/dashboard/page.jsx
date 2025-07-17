"use client";
import React from "react";
import BannerContainer from "./_components/BannerContainer";
import { User } from "lucide-react";
import { useUser } from "@/app/provider";

function Dashboard() {
  const { user } = useUser();

  return (
    <div className="space-y-8">
      <BannerContainer />
      
      {/* Account Status */}
      {user && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Account Status</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-700">{user.name || user.email}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 mb-1">Welcome Back!</p>
              <p className="text-xs text-gray-400">Ready to manage your finances</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Welcome Message */}
      <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Welcome to Jargon AI Dashboard</h2>
        <p className="text-gray-600 mb-6">
          Your financial management hub is ready. Start exploring the features available to help you manage your finances effectively.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold text-gray-800 mb-2">Financial Overview</h4>
            <p className="text-sm text-gray-600">Track your account balance and recent transactions</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold text-gray-800 mb-2">Goal Setting</h4>
            <p className="text-sm text-gray-600">Set and monitor your financial goals</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold text-gray-800 mb-2">Insights</h4>
            <p className="text-sm text-gray-600">Get personalized financial insights and recommendations</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;