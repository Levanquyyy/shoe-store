import { useState, useRef } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Plus, X, Upload, Package, DollarSign, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import CategoryManager from "@/components/CategoryManager";
import OrderManager from "@/components/OrderManager";
import { AdminConsultationDashboard } from "@/components/AdminConsultationDashboard";
import { ProductStatsCard } from "@/components/ProductStatsCard";
import { ProductTable, type Product } from "@/components/ProductTable";

type AdminTab = "orders" | "categories" | "products" | "consultations";

const TAB_LABELS: Record<AdminTab, string> = {
  orders: "Đơn hàng",
  categories: "Danh mục",
  products: "Sản phẩm",
  consultations: "Tư vấn khách",
};

export default function Admin() {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>("orders");
  const { data: products, refetch: refetchProducts } = trpc.products.list.useQuery({});
  const { data: categories } = trpc.categories.list.useQuery();
  const { mutate: deleteProduct } = trpc.admin.products.delete.useMutation({
    onSuccess: () => {
      toast.success("Xóa sản phẩm thành công");
      refetchProducts();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Không thể xóa sản phẩm";
      toast.error(message);
    },
  });

  const [showForm, setShowForm] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    categoryId: "",
    sizes: "",
    stock: "",
    imageUrl: "",
    featured: 0,
  });

  const { mutate: createProduct, isPending } = trpc.admin.products.create.useMutation({
    onSuccess: () => {
      toast.success("Tạo sản phẩm thành công");
      setFormData({
        name: "",
        description: "",
        price: "",
        categoryId: "",
        sizes: "",
        stock: "",
        imageUrl: "",
        featured: 0,
      });
      setImagePreview(null);
      setShowForm(false);
      refetchProducts();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Không thể tạo sản phẩm";
      toast.error(message);
    },
  });

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn tệp hình ảnh");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Kích thước ảnh phải nhỏ hơn 5MB");
      return;
    }

    setIsUploadingImage(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formDataToSend,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      setFormData({ ...formData, imageUrl: data.url });

      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      toast.success("Tải ảnh lên thành công");
    } catch (error) {
      toast.error("Không thể tải ảnh lên");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.imageUrl) {
      toast.error("Vui lòng tải ảnh lên");
      return;
    }

    const slug = formData.name.toLowerCase().replace(/\s+/g, "-");
    createProduct({
      name: formData.name,
      slug,
      description: formData.description,
      price: formData.price,
      categoryId: parseInt(formData.categoryId),
      sizes: formData.sizes.split(",").map((s) => s.trim()),
      stock: parseInt(formData.stock),
      imageUrl: formData.imageUrl,
      featured: formData.featured,
    });
  };

  if (!isAuthenticated || user?.role !== "admin") {
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
          <h1 className="text-3xl font-bold text-foreground mb-4">Yêu cầu quyền quản trị</h1>
          <p className="text-muted-foreground mb-6">Bạn cần đăng nhập với tài khoản quản trị viên.</p>
          <Link href="/">
            <a className="text-accent hover:opacity-80">Về trang chủ</a>
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
            <a className="text-2xl font-bold text-accent">FootWare Admin</a>
          </Link>
          <Link href="/account">
            <a className="text-foreground hover:text-accent transition-colors">Quay lại tài khoản</a>
          </Link>
        </div>
      </nav>

      <div className="container py-8">
        {/* Tab navigation */}
        <div role="tablist" className="flex gap-2 mb-8 border-b border-border pb-0">
          {(Object.keys(TAB_LABELS) as AdminTab[]).map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              data-active={activeTab === tab ? "true" : "false"}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 font-semibold transition-colors rounded-t-lg border-b-2 -mb-px ${
                activeTab === tab
                  ? "border-accent text-accent bg-background"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "orders" && <OrderManager />}

        {activeTab === "categories" && <CategoryManager />}

        {activeTab === "products" && (
          <div data-testid="product-manager">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold text-foreground">Quản lý sản phẩm</h1>
              <button
                onClick={() => setShowForm(!showForm)}
                className="flex items-center gap-2 px-5 py-2.5 bg-accent text-accent-foreground font-semibold rounded-lg hover:opacity-90 transition-opacity"
              >
                <Plus size={18} />
                Thêm sản phẩm
              </button>
            </div>

            {/* Stats cards */}
            {(() => {
              const productList: Product[] = products ?? [];
              const totalProducts = productList.length;
              const totalStockValue = productList.reduce(
                (sum, p) => sum + parseFloat(p.price) * p.stock,
                0
              );
              const lowStockCount = productList.filter((p) => p.stock > 0 && p.stock <= 10).length;
              const outOfStockCount = productList.filter((p) => p.stock === 0).length;

              return (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
                  <ProductStatsCard
                    label="Tổng sản phẩm"
                    value={totalProducts}
                    icon={<Package size={18} />}
                    variant="accent"
                    subtext={`${outOfStockCount} hết hàng`}
                  />
                  <ProductStatsCard
                    label="Giá trị kho"
                    value={`$${totalStockValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    icon={<DollarSign size={18} />}
                    variant="default"
                    subtext="Tổng giá trị tồn kho"
                  />
                  <ProductStatsCard
                    label="Cảnh báo tồn kho thấp"
                    value={lowStockCount}
                    icon={<AlertTriangle size={18} />}
                    variant={lowStockCount > 0 ? "warning" : "default"}
                    subtext={lowStockCount > 0 ? "Cần bổ sung hàng" : "Tồn kho ổn định"}
                  />
                </div>
              );
            })()}


            {showForm && (
              <Card className="p-8 mb-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-foreground">Thêm sản phẩm mới</h2>
                  <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                    <X size={24} />
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">Tên sản phẩm</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">Danh mục</label>
                      <select
                        value={formData.categoryId}
                        onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                        required
                        className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                      >
                        <option value="">Chọn danh mục</option>
                        {categories?.map((cat: { id: number; name: string }) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">Mô tả</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">Giá</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        required
                        className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">Tồn kho</label>
                      <input
                        type="number"
                        value={formData.stock}
                        onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                        required
                        className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">Kích cỡ (cách nhau bởi dấu phẩy)</label>
                      <input
                        type="text"
                        placeholder="36, 37, 38, 39, 40"
                        value={formData.sizes}
                        onChange={(e) => setFormData({ ...formData, sizes: e.target.value })}
                        required
                        className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="featured"
                      checked={formData.featured === 1}
                      onChange={(e) => setFormData({ ...formData, featured: e.target.checked ? 1 : 0 })}
                      className="w-4 h-4 rounded border-border cursor-pointer"
                    />
                    <label htmlFor="featured" className="text-sm font-semibold text-foreground cursor-pointer">
                      Đánh dấu sản phẩm nổi bật
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">Ảnh sản phẩm</label>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageSelect}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploadingImage}
                          className="w-full px-4 py-2 border-2 border-dashed border-border rounded-lg text-foreground hover:border-accent transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          <Upload size={20} />
                          {isUploadingImage ? "Đang tải lên..." : "Chọn để tải ảnh"}
                        </button>
                      </div>
                      {imagePreview && (
                        <div className="w-24 h-24 rounded-lg overflow-hidden border border-border">
                          <img src={imagePreview} alt="Xem trước" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isPending || isUploadingImage}
                    className="w-full px-6 py-3 bg-accent text-accent-foreground font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {isPending ? "Đang tạo..." : "Tạo sản phẩm"}
                  </button>
                </form>
              </Card>
            )}

            {/* Product table */}
            <ProductTable
              products={(products ?? []) as Product[]}
              onEdit={() => {
                toast.info("Chức năng chỉnh sửa đang phát triển");
              }}
              onDelete={(id) => deleteProduct({ id })}
            />
          </div>
        )}

        {activeTab === "consultations" && <AdminConsultationDashboard />}
      </div>
    </div>
  );
}
