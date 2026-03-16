import { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { LogIn, UserPlus } from "lucide-react";

export default function Login() {
  const { isAuthenticated } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (isAuthenticated) {
      window.location.href = "/";
    }
  }, [isAuthenticated]);

  const utils = trpc.useUtils();
  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async () => {
      toast.success("Đăng nhập thành công");
      await utils.auth.me.invalidate();
      setTimeout(() => {
        window.location.reload();
      }, 600);
    },
    onError: (error) => {
      toast.error(error.message || "Đăng nhập thất bại");
    },
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: async () => {
      toast.success("Đăng ký thành công");
      await utils.auth.me.invalidate();
      setTimeout(() => {
        window.location.reload();
      }, 600);
    },
    onError: (error) => {
      toast.error(error.message || "Đăng ký thất bại");
    },
  });

  const isSubmitting = loginMutation.isPending || registerMutation.isPending;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (mode === "register") {
      if (formData.password !== formData.confirmPassword) {
        toast.error("Mật khẩu nhập lại không khớp");
        return;
      }
      registerMutation.mutate({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
      });
      return;
    }

    loginMutation.mutate({
      email: formData.email.trim(),
      password: formData.password,
    });
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
            <a className="text-foreground hover:text-accent transition-colors">Về trang chủ</a>
          </Link>
        </div>
      </nav>

      <div className="container flex items-center justify-center min-h-[calc(100vh-64px)]">
        <Card className="w-full max-w-md p-8">
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold text-foreground">
                {mode === "login" ? "Đăng nhập" : "Đăng ký"}
              </h1>
              <p className="text-muted-foreground">
                {mode === "login"
                  ? "Đăng nhập vào tài khoản FootWare"
                  : "Tạo tài khoản FootWare mới"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`rounded-md py-2 text-sm font-semibold transition-colors ${
                  mode === "login" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                Đăng nhập
              </button>
              <button
                type="button"
                onClick={() => setMode("register")}
                className={`rounded-md py-2 text-sm font-semibold transition-colors ${
                  mode === "register" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                Đăng ký
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Họ và tên</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Nhập họ và tên"
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="email@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Mật khẩu</label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="Nhập mật khẩu"
                  required
                />
              </div>

              {mode === "register" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nhập lại mật khẩu</label>
                  <Input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))
                    }
                    placeholder="Nhập lại mật khẩu"
                    required
                  />
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 bg-accent hover:bg-accent/90 text-white"
              >
                {mode === "login" ? (
                  <>
                    <LogIn className="mr-2 h-5 w-5" />
                    {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-5 w-5" />
                    {isSubmitting ? "Đang tạo tài khoản..." : "Đăng ký"}
                  </>
                )}
              </Button>
            </form>

            <Link href="/shop">
              <Button variant="outline" className="w-full h-12">
                Tiếp tục mua sắm không cần đăng nhập
              </Button>
            </Link>

            <p className="text-center text-sm text-muted-foreground">
              {mode === "login" ? "Chưa có tài khoản? " : "Đã có tài khoản? "}
              <span
                className="text-accent cursor-pointer hover:underline"
                onClick={() => setMode(mode === "login" ? "register" : "login")}
              >
                {mode === "login" ? "Đăng ký ngay" : "Đăng nhập"}
              </span>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}