"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
// Removed server-only import
import { useUser } from "@/app/provider";
import { toast } from "sonner";
import { Settings, Trash2, AlertTriangle, Shield, Database } from "lucide-react";

const SettingsDialog = ({ onDataDeleted }) => {
  const { user } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAllData = async () => {
    if (!user?.id) {
      toast.error("User not found");
      return;
    }

    // Convert user ID to integer
    const userId = parseInt(user.id);
    if (isNaN(userId)) {
      toast.error("Invalid user ID");
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/jars/delete-user-data?userId=${userId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete user data');
      }
      
      toast.success("All financial data has been deleted successfully");
      setIsOpen(false);
      if (onDataDeleted) {
        onDataDeleted(); // Refresh the dashboard
      }
    } catch (error) {
      console.error("Error deleting user data:", error);
      toast.error(`Failed to delete data: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Settings className="w-4 h-4 mr-2" />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Settings className="w-6 h-6" />
            Jar Settings
          </DialogTitle>
          <DialogDescription>
            Manage your financial jar settings and data.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 mt-6">
          {/* Data Management Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Database className="w-5 h-5" />
              Data Management
            </h3>
            
            {/* Delete All Data Option */}
            <Card className="border-red-200 bg-red-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-red-800 flex items-center gap-2">
                  <Trash2 className="w-5 h-5" />
                  Delete All Financial Data
                </CardTitle>
                <CardDescription className="text-red-700">
                  Permanently remove all your financial data including transactions, income history, and jar balances.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-red-100 border border-red-300 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-red-800">
                      <p className="font-semibold mb-1">⚠️ Warning: This action cannot be undone!</p>
                      <p>This will permanently delete:</p>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        <li>All transaction records</li>
                        <li>Monthly income history</li>
                        <li>Jar balances and configurations</li>
                        <li>Financial statistics and analytics</li>
                      </ul>
                      <p className="mt-2 font-medium">Your account will remain active, but all financial data will be lost.</p>
                    </div>
                  </div>
                </div>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      className="w-full"
                      disabled={isDeleting}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {isDeleting ? "Deleting..." : "Delete All Data"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2 text-red-800">
                        <AlertTriangle className="w-6 h-6" />
                        Confirm Data Deletion
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-base">
                        <div className="space-y-3">
                          <p>
                            You are about to <strong>permanently delete all your financial data</strong>. 
                            This action cannot be undone and will remove:
                          </p>
                          <ul className="list-disc list-inside space-y-1 text-sm bg-red-50 p-3 rounded border border-red-200">
                            <li>All transaction records</li>
                            <li>Monthly income entries</li>
                            <li>Jar balances and configurations</li>
                            <li>Financial analytics and history</li>
                          </ul>
                          <p className="text-red-700 font-medium">
                            Are you absolutely sure you want to proceed?
                          </p>
                        </div>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isDeleting}>
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteAllData}
                        disabled={isDeleting}
                        className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                      >
                        {isDeleting ? "Deleting..." : "Yes, Delete All Data"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </div>

          {/* Security Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Privacy & Security
            </h3>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Data Privacy</CardTitle>
                <CardDescription>
                  Your financial data is stored securely and is only accessible by you.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  All financial transactions and personal information are encrypted and stored according to best security practices.
                  We do not share your data with third parties.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog; 