import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { ShoppingBag, Truck, RotateCcw, Award } from "lucide-react";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const { data: featuredProducts, isLoading: productsLoading } =
    trpc.products.featured.useQuery();
  const { data: categories } = trpc.categories.list.useQuery();

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="container flex items-center justify-between h-16">
          <Link href="/">
            <a className="text-2xl font-bold text-accent">SoleStyle</a>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/shop">
              <a className="text-foreground hover:text-accent transition-colors">Shop</a>
            </Link>
            {isAuthenticated ? (
              <>
                <Link href="/account">
                  <a className="text-foreground hover:text-accent transition-colors">Account</a>
                </Link>
                <Link href="/cart">
                  <a className="text-foreground hover:text-accent transition-colors flex items-center gap-2">
                    <ShoppingBag size={20} />
                    Cart
                  </a>
                </Link>
              </>
            ) : (
              <Link href="/auth/login">
                <a className="text-foreground hover:text-accent transition-colors">Sign In</a>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-accent/10 to-orange-500/5 py-20 md:py-32 overflow-hidden">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-foreground leading-tight">
                Step Into <span className="text-accent">Excellence</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl">
                Discover our curated collection of premium footwear. From casual comfort to elegant style, find the perfect shoe for every moment.
              </p>
              <div className="flex gap-4 pt-4">
                <Link href="/shop">
                  <a className="inline-flex items-center justify-center px-8 py-3 bg-accent text-accent-foreground font-semibold rounded-lg hover:opacity-90 transition-opacity">
                    Shop Now
                  </a>
                </Link>
                <button className="inline-flex items-center justify-center px-8 py-3 border-2 border-accent text-accent font-semibold rounded-lg hover:bg-accent/5 transition-colors">
                  Learn More
                </button>
              </div>
            </div>
            <div className="relative h-96 md:h-full">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-orange-500/20 rounded-3xl blur-3xl" />
              <div className="relative bg-gradient-to-br from-accent/10 to-orange-500/10 rounded-3xl h-full flex items-center justify-center border border-accent/20">
                <div className="text-center">
                  <ShoppingBag size={120} className="mx-auto text-accent/40 mb-4" />
                  <p className="text-muted-foreground">Premium Footwear Collection</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="bg-card border-b border-border py-12">
        <div className="container">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="flex items-center gap-4">
              <Truck className="text-accent" size={32} />
              <div>
                <h4 className="font-semibold text-foreground">Free Shipping</h4>
                <p className="text-sm text-muted-foreground">On orders over $100</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <RotateCcw className="text-accent" size={32} />
              <div>
                <h4 className="font-semibold text-foreground">Easy Returns</h4>
                <p className="text-sm text-muted-foreground">30-day return policy</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Award className="text-accent" size={32} />
              <div>
                <h4 className="font-semibold text-foreground">Quality Assured</h4>
                <p className="text-sm text-muted-foreground">Premium materials</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <ShoppingBag className="text-accent" size={32} />
              <div>
                <h4 className="font-semibold text-foreground">Secure Checkout</h4>
                <p className="text-sm text-muted-foreground">Safe transactions</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      {categories && categories.length > 0 && (
        <section className="py-16 md:py-24">
          <div className="container">
            <h2 className="text-4xl font-bold text-foreground mb-12 text-center">Shop by Category</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {categories.slice(0, 3).map((category) => (
                <Link key={category.id} href={`/shop?category=${category.id}`}>
                  <a className="group relative overflow-hidden rounded-2xl h-64 flex items-center justify-center bg-gradient-to-br from-accent/10 to-orange-500/10 border border-border hover:border-accent transition-colors">
                    <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-orange-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative text-center">
                      <h3 className="text-2xl font-bold text-foreground mb-2">{category.name}</h3>
                      <p className="text-muted-foreground group-hover:text-accent transition-colors">
                        Explore Collection →
                      </p>
                    </div>
                  </a>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section className="py-16 md:py-24 bg-card border-t border-border">
        <div className="container">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-4xl font-bold text-foreground">Featured Shoes</h2>
            <Link href="/shop">
              <a className="text-accent hover:text-accent/80 transition-colors font-semibold">
                View All →
              </a>
            </Link>
          </div>

          {productsLoading ? (
            <div className="grid md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-muted rounded-lg h-80 animate-pulse" />
              ))}
            </div>
          ) : featuredProducts && featuredProducts.length > 0 ? (
            <div className="grid md:grid-cols-4 gap-6">
              {featuredProducts.map((product) => (
                <Link key={product.id} href={`/product/${product.slug}`}>
                  <a className="group">
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col">
                      <div className="relative h-64 bg-muted overflow-hidden">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent/10 to-orange-500/10">
                            <ShoppingBag size={48} className="text-muted-foreground" />
                          </div>
                        )}
                        <div className="absolute top-4 right-4 bg-accent text-accent-foreground px-3 py-1 rounded-full text-sm font-semibold">
                          Featured
                        </div>
                      </div>
                      <div className="p-4 flex-1 flex flex-col">
                        <h3 className="font-semibold text-foreground mb-2 group-hover:text-accent transition-colors">
                          {product.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4 flex-1">
                          {product.description?.substring(0, 60)}...
                        </p>
                        <div className="flex items-center justify-between pt-4 border-t border-border">
                          <span className="text-2xl font-bold text-accent">${product.price}</span>
                          <button className="bg-accent text-accent-foreground p-2 rounded-lg hover:opacity-90 transition-opacity">
                            <ShoppingBag size={20} />
                          </button>
                        </div>
                      </div>
                    </Card>
                  </a>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No featured products available yet.</p>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-background py-12">
        <div className="container">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-bold mb-4">SoleStyle</h4>
              <p className="text-sm opacity-80">Premium footwear for every lifestyle.</p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Shop</h4>
              <ul className="space-y-2 text-sm opacity-80">
                <li><a href="/shop" className="hover:opacity-100">All Shoes</a></li>
                <li><a href="/shop" className="hover:opacity-100">New Arrivals</a></li>
                <li><a href="/shop" className="hover:opacity-100">Sale</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Support</h4>
              <ul className="space-y-2 text-sm opacity-80">
                <li><a href="#" className="hover:opacity-100">Contact Us</a></li>
                <li><a href="#" className="hover:opacity-100">Shipping Info</a></li>
                <li><a href="#" className="hover:opacity-100">Returns</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm opacity-80">
                <li><a href="#" className="hover:opacity-100">Privacy Policy</a></li>
                <li><a href="#" className="hover:opacity-100">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-background/20 pt-8 text-center text-sm opacity-80">
            <p>&copy; 2026 SoleStyle. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
