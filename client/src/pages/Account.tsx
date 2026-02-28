import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { ShoppingBag, LogOut, Package, User } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

export default function Account() {
  const { user, isAuthenticated, logout } = useAuth();
  const { data: orders } = trpc.orders.list.useQuery();
  const { mutate: logoutMutation } = trpc.auth.logout.useMutation({
    onSuccess: () => {
      toast.success("Logged out successfully");
      logout();
    },
  });

  const [activeTab, setActiveTab] = useState<"profile" | "orders">("profile");

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <nav className="bg-card border-b border-border">
          <div className="container flex items-center h-16">
            <Link href="/">
              <a className="text-2xl font-bold text-accent">FootWare</a>
            </Link>
          </div>
        </nav>
        <div className="container py-12 text-center">
          <h1 className="text-3xl font-bold text-foreground mb-4">Sign in to view your account</h1>
          <Link href="/">
            <a className="text-accent hover:opacity-80">Return to home</a>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-card border-b border-border sticky top-0 z-40">
        <div className="container flex items-center justify-between h-16">
          <Link href="/">
            <a className="text-2xl font-bold text-accent">FootWare</a>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/shop">
              <a className="text-foreground hover:text-accent transition-colors">Shop</a>
            </Link>
            <Link href="/cart">
              <a className="text-foreground hover:text-accent transition-colors flex items-center gap-2">
                <ShoppingBag size={20} />
                Cart
              </a>
            </Link>
          </div>
        </div>
      </nav>

      <div className="container py-12">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <Card className="p-6 sticky top-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center text-accent-foreground">
                  <User size={24} />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{user?.name || "User"}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>

              <div className="space-y-2 border-t border-border pt-4">
                <button
                  onClick={() => setActiveTab("profile")}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                    activeTab === "profile"
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  <User size={18} className="inline mr-2" />
                  Profile
                </button>
                <button
                  onClick={() => setActiveTab("orders")}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                    activeTab === "orders"
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  <Package size={18} className="inline mr-2" />
                  Orders
                </button>
              </div>

              <button
                onClick={() => logoutMutation()}
                className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-2 border border-border rounded-lg text-foreground hover:bg-muted transition-colors"
              >
                <LogOut size={18} />
                Logout
              </button>
            </Card>
          </div>

          <div className="md:col-span-3">
            {activeTab === "profile" ? (
              <Card className="p-8">
                <h2 className="text-2xl font-bold text-foreground mb-6">Profile Information</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Name</label>
                    <p className="text-lg font-semibold text-foreground">{user?.name || "Not set"}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Email</label>
                    <p className="text-lg font-semibold text-foreground">{user?.email || "Not set"}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Account Type</label>
                    <p className="text-lg font-semibold text-foreground capitalize">{user?.role || "user"}</p>
                  </div>
                  {user?.role === "admin" && (
                    <div className="mt-6 p-4 bg-accent/10 border border-accent rounded-lg">
                      <p className="text-sm text-accent font-semibold">Admin Access</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        You have administrative privileges. Visit the admin panel to manage products.
                      </p>
                      <Link href="/admin">
                        <a className="inline-block mt-3 px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:opacity-90 text-sm font-semibold">
                          Go to Admin Panel
                        </a>
                      </Link>
                    </div>
                  )}
                </div>
              </Card>
            ) : (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground mb-6">Order History</h2>
                {!orders || orders.length === 0 ? (
                  <Card className="p-12 text-center">
                    <Package size={48} className="mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">No orders yet</p>
                    <Link href="/shop">
                      <a className="inline-flex items-center justify-center px-6 py-3 bg-accent text-accent-foreground font-semibold rounded-lg hover:opacity-90">
                        Start Shopping
                      </a>
                    </Link>
                  </Card>
                ) : (
                  orders.map((order: any) => (
                    <Card key={order.id} className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-foreground">Order {order.orderNumber}</h3>
                          <p className="text-sm text-muted-foreground">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-accent">${order.total}</p>
                          <p className={`text-sm font-semibold ${
                            order.status === "delivered"
                              ? "text-green-600"
                              : order.status === "cancelled"
                              ? "text-red-600"
                              : "text-blue-600"
                          }`}>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </p>
                        </div>
                      </div>
                      <div className="border-t border-border pt-4">
                        <p className="text-sm text-muted-foreground mb-2">Shipping to:</p>
                        <p className="text-sm text-foreground">
                          {order.shippingAddress.fullName}<br />
                          {order.shippingAddress.address}<br />
                          {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
                        </p>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
