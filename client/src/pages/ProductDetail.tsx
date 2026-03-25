import { useEffect, useState } from "react";
import { useRoute, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingBag, ChevronLeft, Heart } from "lucide-react";
import { toast } from "sonner";
import { ConsultationButton } from "@/components/ConsultationButton";

export default function ProductDetail() {
  const [match, params] = useRoute("/product/:slug");
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);

  const { data: product, isLoading } = trpc.products.bySlug.useQuery(
    { slug: params?.slug || "" },
    { enabled: !!params?.slug }
  );

  useEffect(() => {
    if (!product) return;
    const wishlist = JSON.parse(localStorage.getItem("wishlist") || "[]");
    setIsWishlisted(wishlist.includes(product.id));
  }, [product]);

  const { mutate: addToCart, isPending } = trpc.cart.add.useMutation({
    onSuccess: () => {
      toast.success("Đã thêm vào giỏ hàng");
      setSelectedSize("");
      setQuantity(1);
    },
    onError: (error) => {
      toast.error(error.message || "Không thể thêm vào giỏ");
    },
  });

  const handleAddToCart = () => {
    if (!selectedSize) {
      toast.error("Vui lòng chọn kích cỡ");
      return;
    }
    if (!product) return;

    addToCart({
      productId: product.id,
      quantity,
      selectedSize,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Đang tải sản phẩm...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <nav className="bg-card border-b border-border">
          <div className="container flex items-center h-16">
            <Link href="/shop">
              <a className="flex items-center gap-2 text-accent hover:opacity-80 transition-opacity">
                <ChevronLeft size={20} />
                Quay lại cửa hàng
              </a>
            </Link>
          </div>
        </nav>
        <div className="container py-12 text-center">
          <h1 className="text-3xl font-bold text-foreground mb-4">Không tìm thấy sản phẩm</h1>
          <Link href="/shop">
            <a className="text-accent hover:opacity-80">Về cửa hàng</a>
          </Link>
        </div>
      </div>
    );
  }

  const galleryImages = product.galleryImages && product.galleryImages.length > 0
    ? product.galleryImages
    : product.imageUrl
    ? [product.imageUrl]
    : [];
  const stock = product.stock ?? 0;

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
              <a className="text-foreground hover:text-accent transition-colors">Cửa hàng</a>
            </Link>
            <Link href="/wishlist">
              <a className="text-foreground hover:text-accent transition-colors">Yêu thích</a>
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

      <div className="container py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-8 text-sm text-muted-foreground">
          <Link href="/">
            <a className="hover:text-accent">Trang chủ</a>
          </Link>
          <span>/</span>
          <Link href="/shop">
            <a className="hover:text-accent">Cửa hàng</a>
          </Link>
          <span>/</span>
          <span className="text-foreground">{product.name}</span>
        </div>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Image Gallery */}
          <div className="space-y-4">
            {galleryImages.length > 0 ? (
              <>
                <div className="relative h-96 md:h-full bg-muted rounded-lg overflow-hidden">
                  <img
                    src={galleryImages[0]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                {galleryImages.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {galleryImages.map((img, idx) => (
                      <button
                        key={idx}
                        className="relative h-24 bg-muted rounded-lg overflow-hidden border-2 border-transparent hover:border-accent transition-colors"
                      >
                        <img src={img} alt={`View ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="h-96 md:h-full bg-gradient-to-br from-accent/10 to-orange-500/10 rounded-lg flex items-center justify-center">
                <ShoppingBag size={64} className="text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">{product.name}</h1>
              <div className="flex items-center gap-4">
                <span className="text-3xl font-bold text-accent">${product.price}</span>
                {stock > 0 ? (
                  <span className="text-sm font-semibold text-green-600 bg-green-100 px-3 py-1 rounded-full">
                    Còn hàng ({stock} sản phẩm)
                  </span>
                ) : (
                  <span className="text-sm font-semibold text-red-600 bg-red-100 px-3 py-1 rounded-full">
                    Hết hàng
                  </span>
                )}
              </div>
            </div>

            {product.description && (
              <div>
                <h3 className="font-semibold text-foreground mb-2">Mô tả</h3>
                <p className="text-muted-foreground leading-relaxed">{product.description}</p>
              </div>
            )}

            {/* Size Selection */}
            {product.sizes && product.sizes.length > 0 && (
              <div>
                <h3 className="font-semibold text-foreground mb-4">Chọn kích cỡ</h3>
                <div className="grid grid-cols-4 gap-3">
                  {product.sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`py-3 rounded-lg border-2 font-semibold transition-colors ${
                        selectedSize === size
                          ? "bg-accent text-accent-foreground border-accent"
                          : "border-border text-foreground hover:border-accent"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity Selection */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Số lượng</h3>
                <span className="text-sm text-muted-foreground">
                  Tồn kho: {stock}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  −
                </button>
                <span className="text-xl font-semibold text-foreground w-8 text-center">{quantity}</span>
                <button
                  onClick={() => {
                    if (quantity < stock) {
                      setQuantity(quantity + 1);
                    } else {
                      toast.error(`Chỉ còn ${stock} sản phẩm`);
                    }
                  }}
                  disabled={quantity >= stock}
                  className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  +
                </button>
              </div>
              {quantity > stock && (
                <p className="text-sm text-red-500 mt-2">
                  Không thể vượt quá tồn kho ({stock})
                </p>
              )}
            </div>

            {/* Add to Cart Button */}
            <div className="flex gap-4 pt-6">
              <button
                onClick={handleAddToCart}
                disabled={!selectedSize || stock === 0 || isPending}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-accent text-accent-foreground font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ShoppingBag size={20} />
                {isPending ? "Đang thêm..." : "Thêm vào giỏ"}
              </button>
              <button
                onClick={() => {
                  if (!product) return;
                  const wishlist = JSON.parse(localStorage.getItem("wishlist") || "[]");
                  if (isWishlisted) {
                    const updated = wishlist.filter((id: number) => id !== product.id);
                    localStorage.setItem("wishlist", JSON.stringify(updated));
                    setIsWishlisted(false);
                    toast.success("Đã xóa khỏi danh sách yêu thích");
                  } else {
                    wishlist.push(product.id);
                    localStorage.setItem("wishlist", JSON.stringify(wishlist));
                    setIsWishlisted(true);
                    toast.success("Đã thêm vào danh sách yêu thích");
                  }
                }}
                className="px-6 py-4 border-2 border-border rounded-lg hover:border-accent transition-colors"
              >
                <Heart size={20} className={isWishlisted ? "fill-current text-accent" : "text-foreground"} />
              </button>
              <ConsultationButton productId={product.id} productName={product.name} />
            </div>

            {/* Product Details */}
            <Card className="p-6 space-y-4">
              <div>
                <h4 className="font-semibold text-foreground mb-2">Miễn phí vận chuyển</h4>
                <p className="text-sm text-muted-foreground">Cho đơn từ $100</p>
              </div>
              <div className="border-t border-border pt-4">
                <h4 className="font-semibold text-foreground mb-2">Đổi trả dễ dàng</h4>
                <p className="text-sm text-muted-foreground">Chính sách đổi trả 30 ngày</p>
              </div>
              <div className="border-t border-border pt-4">
                <h4 className="font-semibold text-foreground mb-2">Thanh toán an toàn</h4>
                <p className="text-sm text-muted-foreground">Giao dịch bảo mật 100%</p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
