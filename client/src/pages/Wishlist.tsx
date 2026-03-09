import { useState, useEffect } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Heart, Trash2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Wishlist() {
  const { isAuthenticated } = useAuth();
  const [wishlistIds, setWishlistIds] = useState<number[]>([]);
  const [quantity, setQuantity] = useState<Record<number, number>>({});

  const { data: products } = trpc.products.list.useQuery({});

  useEffect(() => {
    // Load wishlist from localStorage
    const saved = JSON.parse(localStorage.getItem("wishlist") || "[]");
    setWishlistIds(saved);

    // Initialize quantity
    const qty: Record<number, number> = {};
    saved.forEach((id: number) => {
      qty[id] = 1;
    });
    setQuantity(qty);
  }, []);

  const { mutate: addToCart, isPending } = trpc.cart.add.useMutation({
    onSuccess: () => {
      toast.success("Added to cart!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add to cart");
    },
  });

  const handleRemoveWishlist = (productId: number) => {
    const updated = wishlistIds.filter((id) => id !== productId);
    setWishlistIds(updated);
    localStorage.setItem("wishlist", JSON.stringify(updated));
    toast.success("Removed from wishlist");
  };

  const handleAddToCart = (product: any) => {
    addToCart({
      productId: product.id,
      quantity: quantity[product.id] || 1,
      selectedSize: product.sizes?.[0] || "M",
    });
  };

  const wishlistProducts = products?.filter((p: any) => wishlistIds.includes(p.id)) || [];

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
          <h1 className="text-3xl font-bold text-foreground mb-4">Sign in to view your wishlist</h1>
          <Link href="/">
            <a className="text-accent hover:opacity-80">Return to home</a>
          </Link>
        </div>
      </div>
    );
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
        <div className="mb-8">
          <button
            onClick={() => (window.location.href = "/shop")}
            className="flex items-center gap-2 text-accent hover:opacity-80 transition-opacity mb-4"
          >
            <ArrowLeft size={20} />
            Back to Shop
          </button>
          <h1 className="text-4xl font-bold text-foreground">My Wishlist</h1>
          <p className="text-muted-foreground mt-2">{wishlistProducts.length} items saved</p>
        </div>

        {wishlistProducts.length === 0 ? (
          <div className="text-center py-12">
            <Heart size={64} className="mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Your wishlist is empty</h2>
            <p className="text-muted-foreground mb-6">Start adding items to your wishlist</p>
            <Link href="/shop">
              <a className="inline-flex items-center justify-center px-6 py-3 bg-accent text-accent-foreground font-semibold rounded-lg hover:opacity-90 transition-opacity">
                Continue Shopping
              </a>
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {wishlistProducts.map((product: any) => (
              <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                {/* Product Image */}
                <div className="relative w-full h-48 bg-muted overflow-hidden">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag size={40} className="text-muted-foreground" />
                    </div>
                  )}
                  <button
                    onClick={() => handleRemoveWishlist(product.id)}
                    className="absolute top-3 right-3 p-2 bg-red-500/90 text-white rounded-full hover:bg-red-600 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                {/* Product Info */}
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold text-foreground line-clamp-2">{product.name}</h3>
                    <p className="text-lg font-bold text-accent mt-1">${product.price}</p>
                  </div>

                  {/* Stock Status */}
                  <div>
                    {product.stock > 0 ? (
                      <p className="text-sm text-green-600 dark:text-green-400">In Stock ({product.stock})</p>
                    ) : (
                      <p className="text-sm text-red-600 dark:text-red-400">Out of Stock</p>
                    )}
                  </div>

                  {/* Quantity Selector */}
                  {product.stock > 0 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          setQuantity({
                            ...quantity,
                            [product.id]: Math.max(1, (quantity[product.id] || 1) - 1),
                          })
                        }
                        className="px-2 py-1 border border-border rounded hover:bg-muted"
                      >
                        −
                      </button>
                      <span className="px-3">{quantity[product.id] || 1}</span>
                      <button
                        onClick={() => {
                          const newQty = (quantity[product.id] || 1) + 1;
                          if (newQty <= product.stock) {
                            setQuantity({ ...quantity, [product.id]: newQty });
                          }
                        }}
                        className="px-2 py-1 border border-border rounded hover:bg-muted"
                      >
                        +
                      </button>
                    </div>
                  )}

                  {/* Add to Cart Button */}
                  <Button
                    onClick={() => handleAddToCart(product)}
                    disabled={product.stock === 0 || isPending}
                    className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                  >
                    <ShoppingBag size={18} className="mr-2" />
                    Add to Cart
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
