"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, parseCurrencyToAmount } from "@/utils/currency";
import { useUser } from "@/app/provider";
import { toast } from "sonner";

const JarSetupForm = ({ onSetupComplete }) => {
  const { user } = useUser();
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Default jar allocations
  const [jarAllocations, setJarAllocations] = useState({
    'Necessity': 55,
    'Play': 10,
    'Education': 10,
    'Investment': 10,
    'Charity': 5,
    'Savings': 10
  });

  const jarDescriptions = {
    'Necessity': 'Essential expenses like food, housing, utilities',
    'Play': 'Entertainment and leisure activities',
    'Education': 'Learning and skill development',
    'Investment': 'Long-term wealth building',
    'Charity': 'Giving back to the community',
    'Savings': 'Emergency fund and future goals'
  };

  const handleAllocationChange = (jarName, value) => {
    const numValue = parseFloat(value) || 0;
    setJarAllocations(prev => ({
      ...prev,
      [jarName]: numValue
    }));
  };

  const getTotalAllocation = () => {
    return Object.values(jarAllocations).reduce((sum, value) => sum + value, 0);
  };

  const formatMonthlyIncomeDisplay = () => {
    if (!monthlyIncome) return "";
    const amount = parseCurrencyToAmount(monthlyIncome);
    return formatCurrency(amount);
  };

  const calculateJarCapacity = (percentage) => {
    if (!monthlyIncome) return "0 ₫";
    const amount = parseCurrencyToAmount(monthlyIncome);
    const jarCapacity = Math.round((amount * percentage) / 100);
    return formatCurrency(jarCapacity);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!monthlyIncome) {
      toast.error("Please enter your monthly income");
      return;
    }

    const totalAllocation = getTotalAllocation();
    if (Math.abs(totalAllocation - 100) > 0.01) {
      toast.error(`Total allocation must equal 100%. Current total: ${totalAllocation.toFixed(1)}%`);
      return;
    }

    setIsLoading(true);
    try {
      const monthlyIncomeAmount = parseCurrencyToAmount(monthlyIncome);
      
      if (!monthlyIncomeAmount || monthlyIncomeAmount <= 0) {
        throw new Error("Invalid monthly income amount");
      }
      
      console.log("Setting up jars with:", {
        userId: user.id,
        monthlyIncomeAmount,
        jarAllocations
      });
      
      await setupUserJars(user.id, monthlyIncomeAmount, jarAllocations);
      
      toast.success("Jar setup completed successfully!");
      onSetupComplete();
    } catch (error) {
      console.error("Error setting up jars:", error);
      
      // Show more specific error messages
      if (error.message.includes('Total allocation must equal 100%')) {
        toast.error("Allocation percentages must total exactly 100%");
      } else if (error.message.includes('Invalid monthly income')) {
        toast.error("Please enter a valid monthly income amount");
      } else if (error.message) {
        toast.error(`Setup failed: ${error.message}`);
      } else {
      toast.error("Failed to setup jars. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const totalAllocation = getTotalAllocation();
  const isValidAllocation = Math.abs(totalAllocation - 100) < 0.01;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-green-700">
            Set Up Your Financial Jars
          </CardTitle>
          <CardDescription>
            Configure your monthly income and allocate percentages to each jar to start managing your finances effectively.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Monthly Income Input */}
            <div className="space-y-2">
              <Label htmlFor="monthlyIncome" className="text-lg font-semibold">
                Monthly Income
              </Label>
              <Input
                id="monthlyIncome"
                type="text"
                placeholder="Enter your monthly income (e.g., 20000000)"
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(e.target.value)}
                className="text-lg"
              />
              {monthlyIncome && (
                <p className="text-sm text-gray-600">
                  Formatted: {formatMonthlyIncomeDisplay()}
                </p>
              )}
            </div>

            {/* Jar Allocations */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-semibold">Jar Allocations</Label>
                <div className={`text-sm font-medium ${isValidAllocation ? 'text-green-600' : 'text-red-600'}`}>
                  Total: {totalAllocation.toFixed(1)}%
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(jarAllocations).map(([jarName, percentage]) => (
                  <Card key={jarName} className="border-2">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg text-gray-800">{jarName}</CardTitle>
                      <CardDescription className="text-sm">
                        {jarDescriptions[jarName]}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={percentage}
                          onChange={(e) => handleAllocationChange(jarName, e.target.value)}
                          className="w-20"
                        />
                        <span className="text-sm text-gray-600">%</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <strong>Capacity:</strong> {calculateJarCapacity(percentage)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-center pt-6">
              <Button
                type="submit"
                disabled={!isValidAllocation || !monthlyIncome || isLoading}
                className="w-full md:w-auto px-8 py-3 text-lg bg-green-600 hover:bg-green-700"
              >
                {isLoading ? "Setting up..." : "Complete Setup"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default JarSetupForm; 