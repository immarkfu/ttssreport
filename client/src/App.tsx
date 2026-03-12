import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import Home from "./pages/Home";
import ConfigTags from "./pages/ConfigTags";
import Login from "./pages/Login";
import Register from "./pages/Register";
import UserManagement from "./pages/UserManagement";
import WechatCallback from "./pages/WechatCallback";
import Watchlist from "./pages/Watchlist";
import Admin from "./pages/Admin";

import ProtectedRoute from "./components/ProtectedRoute";

function Router() {
  return (
    <Switch>
      <Route path={"/login"} component={Login} />
      <Route path={"/register"} component={Register} />
      <Route path={"/wechat-success"} component={WechatCallback} />
      <Route path={"/"}>
        <ProtectedRoute><Home /></ProtectedRoute>
      </Route>
      <Route path={"/config-tags"}>
        <ProtectedRoute><ConfigTags /></ProtectedRoute>
      </Route>
      <Route path={"/watchlist"}>
        <ProtectedRoute><Watchlist /></ProtectedRoute>
      </Route>
      <Route path={"/admin"}>
        <ProtectedRoute requireAdmin><Admin /></ProtectedRoute>
      </Route>
      <Route path={"/user-management"}>
        <ProtectedRoute requireAdmin><UserManagement /></ProtectedRoute>
      </Route>
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider
          defaultTheme="light"
        >
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
