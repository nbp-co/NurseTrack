import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User, Settings, Bell, Shield, LogOut, Save } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

const profileFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  role: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileFormSchema>;

export default function ProfilePage() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState({
    pushNotifications: false,
    emailReminders: true,
    shiftUpdates: true,
    contractDeadlines: true,
  });

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      role: user?.role || "",
    },
  });

  const handleProfileUpdate = async (data: ProfileFormData) => {
    // In a real app, this would call an API to update the user profile
    toast({
      title: "Profile updated",
      description: "Your profile has been updated successfully.",
    });
  };

  const handleLogout = async () => {
    await logout();
    setLocation("/auth/login");
    toast({
      title: "Signed out",
      description: "You have been signed out successfully.",
    });
  };

  const handleNotificationToggle = (key: keyof typeof notifications) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
    
    toast({
      title: "Notification settings updated",
      description: "Your notification preferences have been saved.",
    });
  };

  return (
    <>
      <AppHeader 
        title="Profile"
        subtitle="Manage your account settings and preferences"
      />

      <div className="lg:px-8 px-4 py-6 max-w-4xl">
        {/* Profile Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="w-5 h-5 mr-2" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleProfileUpdate)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter your full name" 
                            {...field} 
                            data-testid="input-profile-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input 
                            type="email"
                            placeholder="Enter your email" 
                            {...field} 
                            data-testid="input-profile-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Professional Role</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., RN, ICU" 
                            {...field} 
                            data-testid="input-profile-role"
                          />
                        </FormControl>
                        <FormDescription>
                          Your nursing specialty or department
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button type="submit" data-testid="button-save-profile">
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="w-5 h-5 mr-2" />
              Notification Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-sm font-medium text-gray-900" data-testid="label-push-notifications">
                  Push Notifications
                </label>
                <p className="text-sm text-gray-500">
                  Get notified about shift updates and reminders (Coming Soon)
                </p>
              </div>
              <Switch
                checked={notifications.pushNotifications}
                onCheckedChange={() => handleNotificationToggle('pushNotifications')}
                disabled
                data-testid="switch-push-notifications"
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-sm font-medium text-gray-900" data-testid="label-email-reminders">
                  Email Reminders
                </label>
                <p className="text-sm text-gray-500">
                  Receive email notifications for upcoming shifts
                </p>
              </div>
              <Switch
                checked={notifications.emailReminders}
                onCheckedChange={() => handleNotificationToggle('emailReminders')}
                data-testid="switch-email-reminders"
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-sm font-medium text-gray-900" data-testid="label-shift-updates">
                  Shift Updates
                </label>
                <p className="text-sm text-gray-500">
                  Get notified when shifts are added, changed, or cancelled
                </p>
              </div>
              <Switch
                checked={notifications.shiftUpdates}
                onCheckedChange={() => handleNotificationToggle('shiftUpdates')}
                data-testid="switch-shift-updates"
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-sm font-medium text-gray-900" data-testid="label-contract-deadlines">
                  Contract Deadlines
                </label>
                <p className="text-sm text-gray-500">
                  Reminders about upcoming contract end dates
                </p>
              </div>
              <Switch
                checked={notifications.contractDeadlines}
                onCheckedChange={() => handleNotificationToggle('contractDeadlines')}
                data-testid="switch-contract-deadlines"
              />
            </div>
          </CardContent>
        </Card>

        {/* Security & Privacy */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="w-5 h-5 mr-2" />
              Security & Privacy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-gray-900">Change Password</p>
                <p className="text-sm text-gray-500">Update your account password</p>
              </div>
              <Button variant="outline" disabled data-testid="button-change-password">
                Change Password
              </Button>
            </div>

            <Separator />

            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-gray-900">Two-Factor Authentication</p>
                <p className="text-sm text-gray-500">Add an extra layer of security (Coming Soon)</p>
              </div>
              <Button variant="outline" disabled data-testid="button-setup-2fa">
                Setup 2FA
              </Button>
            </div>

            <Separator />

            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-gray-900">Data Export</p>
                <p className="text-sm text-gray-500">Download your data in a portable format</p>
              </div>
              <Button variant="outline" disabled data-testid="button-export-data">
                Export Data
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Account Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Account Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between py-4">
              <div>
                <p className="text-sm font-medium text-gray-900">Sign Out</p>
                <p className="text-sm text-gray-500">Sign out of your NurseTrack account</p>
              </div>
              <Button 
                variant="outline" 
                onClick={handleLogout}
                data-testid="button-sign-out"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
