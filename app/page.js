"use client";

import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { useUser } from "./provider";
import { User } from "lucide-react";

export default function Home() {
  const { user } = useUser();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-green-50 to-green-100 text-gray-800">
      {/* Hero Section */}
      <div className="flex flex-col items-center text-center px-6 md:px-12 pt-16 pb-10">
        <p className="text-sm uppercase tracking-wider text-green-600 mb-2">Jargon AI DASHBOARD</p>
        <h1 className="text-5xl md:text-6xl font-bold text-gray-800 max-w-4xl mb-6">
          Your Financial Management Hub
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mb-10">
          Jargon AI Dashboard is your comprehensive financial management platform—track your accounts, set goals, and get personalized insights to achieve financial success
        </p>
        <Link
          href="/dashboard"
        >
          <Button className="h-12 w-50 px-6 py-3 bg-green-600 rounded-md text-white font-medium hover:bg-green-700 transition">
            Access Dashboard
          </Button>
        </Link>
      </div>

      {/* Features Section */}
      <div className="w-full text-center px-6 md:px-12 py-16">
        <h2 className="text-3xl font-bold mb-4">
          What can you do with Jargon AI Dashboard?
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Manage your finances effectively with comprehensive tools and insights designed for your success
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 max-w-6xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-3">Financial Overview</h3>
            <p className="text-gray-600">Get a comprehensive view of your accounts, balances, and recent transactions all in one place.</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-3">Smart Insights</h3>
            <p className="text-gray-600">Receive personalized financial insights and recommendations to optimize your spending and savings.</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-3">Goal Tracking</h3>
            <p className="text-gray-600">Set financial goals and track your progress with visual indicators and milestone celebrations.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
