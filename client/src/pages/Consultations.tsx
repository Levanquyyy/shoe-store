import { Link } from "wouter";
import { MessageCircle, ChevronLeft, ShoppingBag } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { ConsultationList } from "@/components/ConsultationList";

export default function Consultations() {
  const { isAuthenticated, loading } = useAuth({ redirectOnUnauthenticated: true });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="bg-card border-b border-border sticky top-0 z-40">
        <div className="container flex items-center justify-between h-16">
          <Link href="/">
            <a className="text-2xl font-bold text-accent">FootWare</a>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/shop">
              <a className="text-foreground hover:text-accent transition-colors">Shop</a>
            </Link>
            <Link href="/consultations">
              <a className="text-accent font-semibold flex items-center gap-1">
                <MessageCircle size={16} />
                Consultations
              </a>
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

      <div className="container py-8 max-w-2xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground">
          <Link href="/">
            <a className="hover:text-accent">Home</a>
          </Link>
          <span>/</span>
          <span className="text-foreground">My Consultations</span>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <MessageCircle size={24} className="text-accent" />
          <h1 className="text-2xl font-bold text-foreground">My Consultations</h1>
        </div>

        <ConsultationList />
      </div>
    </div>
  );
}
