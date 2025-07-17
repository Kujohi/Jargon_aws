"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatCurrency, parseCurrencyToAmount } from "@/utils/currency";
import { useUser } from "@/app/provider";
import { toast } from "sonner";
import { Plus, DollarSign, Calendar } from "lucide-react";

const AddIncomeForm = ({ lastIncomeAllocations, onIncomeAdded }) => {
  const { user } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM format
  const [isLoading, setIsLoading] = useState(false);
  
  // Initialize jar allocations with last used values or defaults
  const [jarAllocations, setJarAllocations] = useState(() => {
    if (lastIncomeAllocations && Object.keys(lastIncomeAllocations).length > 0) {
      return lastIncomeAllocations;
    }
    
    return {
      'Necessity': 55,
      'Play': 10,
      'Education': 10,
      'Investment': 10,
      'Charity': 5,
      'Savings': 10
    };
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

  const calculateJarAmount = (percentage) => {
    if (!monthlyIncome) return "0 ₫";
    const amount = parseCurrencyToAmount(monthlyIncome);
    const jarAmount = Math.round((amount * percentage) / 100);
    return formatCurrency(jarAmount);
  };

  const getMonthDisplayName = () => {
    const date = new Date(selectedMonth + '-01');
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
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
      
      // Convert user ID to integer
      const userId = parseInt(user.id);
      if (isNaN(userId)) {
        throw new Error('Invalid user ID');
      }
      
      console.log("Adding monthly income:", {
        userId,
        monthlyIncomeAmount,
        jarAllocations,
        month: selectedMonth + '-01'
      });
      
      const response = await fetch('/api/jars/income', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          monthYear: selectedMonth + '-01',
          totalIncomeCents: monthlyIncomeAmount, // Remove the *100 multiplication since VND doesn't use cents
          allocationPercentages: jarAllocations
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add monthly income');
      }
      
      toast.success(`Monthly income for ${getMonthDisplayName()} added successfully! Money has been allocated to your jars.`);
      setIsOpen(false);
      setMonthlyIncome("");
      onIncomeAdded();
    } catch (error) {
      console.error("Error adding monthly income:", error);
      
      if (error.message.includes('Total allocation must equal 100%')) {
        toast.error("Allocation percentages must total exactly 100%");
      } else if (error.message.includes('Invalid monthly income')) {
        toast.error("Please enter a valid monthly income amount");
      } else if (error.message.includes('already exists')) {
        toast.error("Income for this month already exists. Please select a different month.");
      } else if (error.message) {
        toast.error(`Failed to add income: ${error.message}`);
      } else {
        toast.error("Failed to add income. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const totalAllocation = getTotalAllocation();
  const isValidAllocation = Math.abs(totalAllocation - 100) < 0.01;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2 bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4" />
          Add Monthly Income
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-green-700 flex items-center gap-2">
            <DollarSign className="w-6 h-6" />
            Add Monthly Income to Jars
          </DialogTitle>
          <DialogDescription>
            Add your income for a specific month and allocate it to your jars. This will increase your jar balances with the allocated amounts.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Month Selection */}
          <div className="space-y-2">
            <Label htmlFor="selectedMonth" className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Month
            </Label>
            <Input
              id="selectedMonth"
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-lg"
            />
            <p className="text-sm text-gray-600">
              Selected: {getMonthDisplayName()}
            </p>
          </div>

          {/* Monthly Income Input */}
          <div className="space-y-2">
            <Label htmlFor="monthlyIncome" className="text-lg font-semibold">
              Monthly Income Amount
            </Label>
            <Input
              id="monthlyIncome"
              type="text"
              placeholder="Enter your income amount (e.g., 20000000)"
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
                <Card key={jarName} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={jarName} className="font-semibold">
                        {jarName}
                      </Label>
                      <span className="text-sm text-green-600 font-medium">
                        + {calculateJarAmount(percentage)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600">
                      {jarDescriptions[jarName]}
                    </p>
                    
                    <div className="flex items-center space-x-2">
                      <Input
                        id={jarName}
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={percentage}
                        onChange={(e) => handleAllocationChange(jarName, e.target.value)}
                        className="w-20"
                      />
                      <span className="text-sm font-medium">%</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Summary */}
          {monthlyIncome && isValidAllocation && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 mb-2">Income Allocation Summary</h3>
              <p className="text-sm text-green-700">
                Your {formatMonthlyIncomeDisplay()} for {getMonthDisplayName()} will be added to your jars according to the percentages above. Your jar balances will increase by the allocated amounts.
              </p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isValidAllocation || isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? "Adding..." : "Add Income to Jars"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddIncomeForm; 