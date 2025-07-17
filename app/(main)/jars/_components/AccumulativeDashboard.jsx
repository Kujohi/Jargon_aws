"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils/currency";
import { RefreshCw, Settings, TrendingUp, TrendingDown, Wallet, PiggyBank, Calendar, History } from "lucide-react";
import AddIncomeForm from "./AddIncomeForm";
import SettingsDialog from "./SettingsDialog";

const AccumulativeDashboard = ({ dashboardData, isRefreshing, onRefresh }) => {

  const getJarStatusColor = (balance) => {
    if (balance <= 0) return "text-red-600";
    if (balance <= 500000) return "text-yellow-600"; // Less than 500k VND
    return "text-green-600";
  };

  const getJarStatusBadge = (balance) => {
    if (balance <= 0) return <Badge variant="destructive">Empty</Badge>;
    if (balance <= 500000) return <Badge variant="secondary">Low Balance</Badge>;
    return <Badge variant="default">Healthy</Badge>;
  };

  const getJarIcon = (jarName) => {
    const icons = {
      'Necessity': '🏠',
      'Play': '🎮',
      'Education': '📚',
      'Investment': '📈',
      'Charity': '❤️',
      'Savings': '💰'
    };
    return icons[jarName] || '💼';
  };

  // If no data is available, show loading state
  if (!dashboardData) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
        <p className="text-gray-500">Loading jar data...</p>
      </div>
    );
  }

  const { user: userData, jars, incomeHistory, lifetimeBalance } = dashboardData;

  // Validate required data
  if (!jars || !Array.isArray(jars) || jars.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">No jar data available. Please try refreshing the page.</p>
      </div>
    );
  }
  
  // Check if this is a new user (no income added yet)
  const isNewUser = !incomeHistory || incomeHistory.length === 0;

  // Get latest allocation percentages from most recent income entry
  const getLastAllocations = () => {
    if (incomeHistory && incomeHistory.length > 0) {
      return incomeHistory[0].allocation_percentages;
    }
    return {};
  };

  // Calculate safe lifetime balance values
  const safeLifetimeBalance = {
    lifetimeIncome: parseInt(lifetimeBalance?.totalIncome) || 0,
    lifetimeExpenses: parseInt(lifetimeBalance?.totalSpent) || 0,
    totalBalance: parseInt(lifetimeBalance?.currentBalance) || 0
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Accumulative Financial Jars</h1>
          <p className="text-gray-600">
            Track your growing savings across all categories
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <AddIncomeForm 
            lastIncomeAllocations={getLastAllocations()}
            onIncomeAdded={onRefresh}
          />
          <SettingsDialog onDataDeleted={onRefresh} />
        </div>
      </div>

      {/* Welcome Message for New Users */}
      {isNewUser && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 border-2 border-green-200">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-green-800 mb-2">Welcome to Your Financial Jars! 🎉</h2>
            <p className="text-green-700 mb-4">
              Your jars are ready and waiting. Start by adding your first monthly income to begin building your savings.
            </p>
            <div className="flex justify-center">
              <AddIncomeForm 
                lastIncomeAllocations={getLastAllocations()}
                onIncomeAdded={onRefresh}
              />
            </div>
          </div>
        </div>
      )}

      {/* Lifetime Balance Section */}
      {!isNewUser && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
          <h2 className="text-xl font-bold text-blue-800 mb-4 flex items-center gap-2">
            <PiggyBank className="w-6 h-6" />
            Financial Overview
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Card className="bg-white border-green-200 col-span-1 md:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-green-600">Total Income Added</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(safeLifetimeBalance.lifetimeIncome)}
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-white border-red-200 col-span-1 md:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-red-600">Total Spent</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(safeLifetimeBalance.lifetimeExpenses)}
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-white border-blue-200 col-span-1 md:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-blue-600">Total Balance (All Jars)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${safeLifetimeBalance.totalBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {formatCurrency(safeLifetimeBalance.totalBalance)}
                </p>
              </CardContent>
            </Card>
          </div>
          
          {/* This Month Summary */}
          <div className="mt-4 p-4 bg-white rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-2">This Month's Activity</h3>
            
            {/* Monthly Jar Details */}
            <div className="mt-4">
              <h4 className="font-medium text-blue-700 mb-2">Monthly Jar Breakdown</h4>
              <div className="space-y-3">
                {jars.map((jar) => {
                  // Calculate jar remaining capacity percentage (100% to 0%)
                  const monthlyIncome = parseInt(jar.income_this_month) || 0; // total added this month
                  const spentThisMonth = parseInt(jar.spent_this_month) || 0;
                  const usedPercentage = monthlyIncome > 0 
                    ? Math.min(100, Math.round((spentThisMonth / monthlyIncome) * 100))
                    : 0;
                  const remainingPercentage = 100 - usedPercentage;
                    
                  return (
                    <div key={`monthly-${jar.category_id}`} className="bg-gray-50 p-3 rounded border border-gray-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="flex items-center gap-1">
                          <span className="text-lg">{getJarIcon(jar.category_name)}</span>
                          <span className="font-medium">{jar.category_name}</span>
                        </span>
                        <span className="text-xs font-medium">
                          {remainingPercentage}% Remaining
                        </span>
                      </div>
                      
                      {/* Progress bar for capacity usage */}
                      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                        <div 
                          className={`h-2.5 rounded-full ${remainingPercentage <= 10 ? 'bg-red-500' : remainingPercentage <= 30 ? 'bg-yellow-500' : 'bg-green-500'}`}
                          style={{ width: `${remainingPercentage}%` }}
                        ></div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500">Monthly Allocation:</span>
                          <p className="font-medium text-green-600">{formatCurrency(monthlyIncome)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Spent This Month:</span>
                          <p className="font-medium text-red-600">{formatCurrency(spentThisMonth)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Remaining:</span>
                          <p className="font-medium text-blue-600">{formatCurrency(monthlyIncome - spentThisMonth)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Income History */}
      {incomeHistory && incomeHistory.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <History className="w-5 h-5" />
            Recent Income Additions
          </h2>
          <div className="space-y-4">
            {incomeHistory.slice(0, 3).map((entry) => (
              <Card key={entry.id} className="bg-white">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">
                    {new Date(entry.month_year).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(parseInt(entry.total_income_cents) || 0)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Added on {new Date(entry.created_at).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Jar Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {jars.map((jar) => {
          const currentBalance = parseInt(jar.current_balance_cents) || 0;
          const totalIncome = parseInt(jar.total_income_cents) || 0;
          const totalSpent = parseInt(jar.total_spent_cents) || 0;
          const latestAllocation = parseFloat(jar.latest_allocation_percentage) || 0;
          const incomeThisMonth = parseInt(jar.income_this_month) || 0;
          const spentThisMonth = parseInt(jar.spent_this_month) || 0;

          return (
            <Card key={jar.category_id} className="border-2 hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getJarIcon(jar.category_name)}</span>
                    <CardTitle className="text-lg">{jar.category_name}</CardTitle>
                  </div>
                  {getJarStatusBadge(currentBalance)}
                </div>
                <CardDescription>{jar.category_description}</CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Current Balance - Most Important */}
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-700">Current Balance:</span>
                    <span className={`text-xl font-bold ${getJarStatusColor(currentBalance)}`}>
                      {formatCurrency(currentBalance)}
                    </span>
                  </div>
                </div>

                {/* Latest Allocation */}
                {latestAllocation > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Latest Allocation:</span>
                    <span className="font-semibold">{latestAllocation}%</span>
                  </div>
                )}

                {/* Financial Details */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-green-500" />
                      Total Income:
                    </span>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(totalIncome)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1">
                      <TrendingDown className="w-3 h-3 text-red-500" />
                      Total Spent:
                    </span>
                    <span className="font-semibold text-red-600">
                      {formatCurrency(totalSpent)}
                    </span>
                  </div>
                  {incomeThisMonth > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">This Month Income:</span>
                      <span className="font-semibold text-green-600">
                        {formatCurrency(incomeThisMonth)}
                      </span>
                    </div>
                  )}
                  {spentThisMonth > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">This Month Spent:</span>
                      <span className="font-semibold text-red-600">
                        {formatCurrency(spentThisMonth)}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default AccumulativeDashboard;