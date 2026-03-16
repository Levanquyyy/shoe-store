import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingBag, ChevronDown, X } from "lucide-react";

type SortOption = "name-asc" | "name-desc" | "price-asc" | "price-desc" | "newest";

export default function Shop() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split("?")[1] || "");
  const categoryId = searchParams.get("category") ? parseInt(searchParams.get("category")!) : undefined;

  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500]);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: products, isLoading: productsLoading } = trpc.products.list.useQuery({
    categoryId,
    minPrice: priceRange[0],
    maxPrice: priceRange[1],
    sizes: selectedSizes.length > 0 ? selectedSizes : undefined,
    search: searchQuery || undefined,
  });

  const { data: categories } = trpc.categories.list.useQuery();

  const sortedProducts = useMemo(() => {
    if (!products) return [];

    const sorted = [...products];
    switch (sortBy) {
      case "name-asc":
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case "name-desc":
        return sorted.sort((a, b) => b.name.localeCompare(a.name));
      case "price-asc":
        return sorted.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
      case "price-desc":
        return sorted.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
      case "newest":
      default:
        return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  }, [products, sortBy]);

  const allSizes = useMemo(() => {
    if (!products) return [];
    const sizes = new Set<string>();
    products.forEach((p: any) => {
      p.sizes?.forEach((s: any) => sizes.add(s));
    });
    return Array.from(sizes).sort();
  }, [products]);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="container flex items-center justify-between h-16">
          <Link href="/">
            <a className="text-2xl font-bold text-accent">FootWare</a>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/shop">
              <a className="text-accent font-semibold">Cửa hàng</a>
            </Link>
            <Link href="/wishlist">
              <a className="text-foreground hover:text-accent transition-colors">Yêu thích</a>
            </Link>
            <Link href="/account">
              <a className="text-foreground hover:text-accent transition-colors">Tài khoản</a>
            </Link>
            <Link href="/cart">
              <a className="text-foreground hover:text-accent transition-colors flex items-center gap-2">
                <ShoppingBag size={20} />
                Giỏ hàng
              </a>
            </Link>
          </div>
        </div>
      </nav>

      <div className="container py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">Mua sắm bộ sưu tập</h1>
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Tìm kiếm giày..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 border border-border rounded-lg bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar Filters */}
          <div className="lg:col-span-1">
            <div className="space-y-6 sticky top-24">
              {/* Category Filter */}
              <div>
                <h3 className="font-semibold text-foreground mb-4">Danh mục</h3>
                <div className="space-y-2">
                  <Link href="/shop">
                    <a className={`block px-3 py-2 rounded-lg transition-colors ${!categoryId ? "bg-accent text-accent-foreground" : "hover:bg-muted"}`}>
                      Tất cả danh mục
                    </a>
                  </Link>
                    {categories?.map((cat: any) => (
                    <Link key={cat.id} href={`/shop?category=${cat.id}`}>
                      <a className={`block px-3 py-2 rounded-lg transition-colors ${categoryId === cat.id ? "bg-accent text-accent-foreground" : "hover:bg-muted"}`}>
                        {cat.name}
                      </a>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Price Range Filter */}
              <div>
                <h3 className="font-semibold text-foreground mb-4">Khoảng giá</h3>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground block mb-1">Giá thấp nhất</label>
                      <input
                        type="number"
                        min="0"
                        max="500"
                        value={priceRange[0]}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          if (val <= priceRange[1]) {
                            setPriceRange([val, priceRange[1]]);
                          }
                        }}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground block mb-1">Giá cao nhất</label>
                      <input
                        type="number"
                        min="0"
                        max="500"
                        value={priceRange[1]}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 500;
                          if (val >= priceRange[0]) {
                            setPriceRange([priceRange[0], val]);
                          }
                        }}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                      />
                    </div>
                  </div>
                  <p className="text-sm text-accent font-semibold">
                    ${priceRange[0]} - ${priceRange[1]}
                  </p>
                </div>
              </div>

              {/* Size Filter */}
              {allSizes.length > 0 && (
                <div>
                  <h3 className="font-semibold text-foreground mb-4">Kích cỡ</h3>
                  <div className="grid grid-cols-3 gap-2">
                      {allSizes.map((size: any) => (
                      <button
                        key={size}
                        onClick={() =>
                          setSelectedSizes(
                            selectedSizes.includes(size)
                              ? selectedSizes.filter((s) => s !== size)
                              : [...selectedSizes, size]
                          )
                        }
                        className={`px-3 py-2 rounded-lg border transition-colors ${
                          selectedSizes.includes(size)
                            ? "bg-accent text-accent-foreground border-accent"
                            : "border-border hover:border-accent"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Clear Filters */}
              {(selectedSizes.length > 0 || priceRange[0] > 0 || priceRange[1] < 500 || searchQuery) && (
                <button
                  onClick={() => {
                    setSelectedSizes([]);
                    setPriceRange([0, 500]);
                    setSearchQuery("");
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  <X size={16} />
                  Xóa bộ lọc
                </button>
              )}
            </div>
          </div>

          {/* Products Grid */}
          <div className="lg:col-span-3">
            {/* Sort Options */}
            <div className="flex items-center justify-between mb-8">
              <p className="text-muted-foreground">
                Hiển thị {sortedProducts.length} {sortedProducts.length === 1 ? "sản phẩm" : "sản phẩm"}
              </p>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="appearance-none px-4 py-2 pr-10 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="newest">Mới nhất</option>
                  <option value="name-asc">Tên: A-Z</option>
                  <option value="name-desc">Tên: Z-A</option>
                  <option value="price-asc">Giá: Thấp đến cao</option>
                  <option value="price-desc">Giá: Cao đến thấp</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-muted-foreground" size={20} />
              </div>
            </div>

            {productsLoading ? (
              <div className="grid md:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-muted rounded-lg h-80 animate-pulse" />
                ))}
              </div>
            ) : sortedProducts.length > 0 ? (
              <div className="grid md:grid-cols-3 gap-6">
                {sortedProducts.map((product: any) => (
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
                          {product.stock === 0 && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <span className="text-white font-bold">Hết hàng</span>
                            </div>
                          )}
                        </div>
                        <div className="p-4 flex-1 flex flex-col">
                          <h3 className="font-semibold text-foreground mb-2 group-hover:text-accent transition-colors line-clamp-2">
                            {product.name}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-4 flex-1 line-clamp-2">
                            {product.description}
                          </p>
                          <div className="flex items-center justify-between pt-4 border-t border-border">
                            <span className="text-2xl font-bold text-accent">${product.price}</span>
                            <button
                              disabled={product.stock === 0}
                              className="bg-accent text-accent-foreground p-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                            >
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
                <ShoppingBag size={48} className="mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-lg">Không tìm thấy sản phẩm. Hãy thử điều chỉnh bộ lọc.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
