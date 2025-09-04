import { Switch, Route, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { AppShell } from "@/components/layout/AppShell";
import { FeedbackButton } from "@/components/feedback/FeedbackButton";

// Pages
import LoginPage from "@/pages/auth/login";
import SignupPage from "@/pages/auth/signup";
import DashboardPage from "@/pages/dashboard";
import CalendarPage from "@/pages/calendar";
import ContractsPage from "@/pages/contracts";
import ExpensesPage from "@/pages/expenses";
import ProfilePage from "@/pages/profile";
import NotFound from "@/pages/not-found";

function AppRoutes() {
  return (
    <Switch>

      <Route path="/auth/login" component={LoginPage} />
      <Route path="/auth/signup" component={SignupPage} />

      <Route path="/" component={() => <Redirect to="/dashboard" />} />
      <Route path="/dashboard" component={() => <AppShell><DashboardPage /></AppShell>} />
      <Route path="/calendar" component={() => <AppShell><CalendarPage /></AppShell>} />
      <Route path="/contracts" component={() => <AppShell><ContractsPage /></AppShell>} />
      <Route path="/expenses" component={() => <AppShell><ExpensesPage /></AppShell>} />
      <Route path="/profile" component={() => <AppShell><ProfilePage /></AppShell>} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <AppRoutes />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
