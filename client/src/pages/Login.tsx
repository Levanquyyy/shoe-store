import { useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import { getLoginUrl } from "@/const";
import { LogIn } from "lucide-react";

export default function Login() {
  const { isAuthenticated } = useAuth();

  // Redirect to home if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      window.location.href = "/";
    }
  }, [isAuthenticated]);

  const handleLogin = () => {
    try {
      const loginUrl = getLoginUrl();
      window.location.href = loginUrl;
    } catch (error) {
      console.error("Failed to generate login URL:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="container flex items-center justify-between h-16">
          <Link href="/">
            <a className="text-2xl font-bold text-accent">FootWare</a>
          </Link>
          <Link href="/">
            <a className="text-foreground hover:text-accent transition-colors">Back to Home</a>
          </Link>
        </div>
      </nav>

      {/* Login Card */}
      <div className="container flex items-center justify-center min-h-[calc(100vh-64px)]">
        <Card className="w-full max-w-md p-8">
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold text-foreground">Welcome Back</h1>
              <p className="text-muted-foreground">Sign in to your FootWare account</p>
            </div>

            {/* Login Button */}
            <Button
              onClick={handleLogin}
              className="w-full h-12 bg-accent hover:bg-accent/90 text-white"
            >
              <LogIn className="mr-2 h-5 w-5" />
              Sign in with OAuth
            </Button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-card text-muted-foreground">Or continue without account</span>
              </div>
            </div>

            {/* Continue as Guest */}
            <Link href="/shop">
              <Button variant="outline" className="w-full h-12">
                Continue Shopping
              </Button>
            </Link>

            {/* Footer */}
            <p className="text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <span className="text-accent cursor-pointer hover:underline" onClick={handleLogin}>
                Create one with OAuth
              </span>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}