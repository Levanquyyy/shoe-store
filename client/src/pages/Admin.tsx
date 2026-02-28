import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Plus, Edit2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Admin() {
  const { user, isAuthenticated } = useAuth();
  const { data: products, refetch: refetchProducts } = trpc.products.list.useQuery({});
  const { data: categories } = trpc.categories.list.useQuery();
  const { mutate: deleteProduct } = trpc.admin.products.delete.useMutation({
    onSuccess: () => {
      toast.success("Product deleted successfully");
      refetchProducts();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete product");
    },
  });

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    categoryId: "",
    sizes: "",
    stock: "",
    imageUrl: "",
  });

  const { mutate: createProduct, isPending } = trpc.admin.products.create.useMutation({
    onSuccess: () => {
      toast.success("Product created successfully");
      setFormData({
        name: "",
        description: "",
        price: "",
        categoryId: "",
        sizes: "",
        stock: "",
        imageUrl: "",
      });
      setShowForm(false);
      refetchProducts();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create product");
    },
  });

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-background">
        <nav className="bg-card border-b border-border">
          <div className="container flex items-center h-16">
            <Link href="/">
              <a className="text-2xl font-bold text-accent">SoleStyle</a>
            </Link>
          </div>
        </nav>
        <div className="container py-12 text-center">
          <h1 className="text-3xl font-bold text-foreground mb-4">Admin Access Required</h1>
          <p className="text-muted-foreground mb-6">You do not have permission to access this page.</p>
          <Link href="/">
            <a className="text-accent hover:opacity-80">Return to home</a>
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: any) => {
    e.preventDefault();
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
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-card border-b border-border sticky top-0 z-40">
        <div className="container flex items-center justify-between h-16">
          <Link href="/">
            <a className="text-2xl font-bold text-accent">SoleStyle Admin</a>
          </Link>
          <Link href="/account">
            <a className="text-foreground hover:text-accent transition-colors">Back to Account</a>
          </Link>
        </div>
      </nav>

      <div className="container py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-foreground">Product Management</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-6 py-3 bg-accent text-accent-foreground font-semibold rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus size={20} />
            Add Product
          </button>
        </div>

        {showForm && (
          <Card className="p-8 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-foreground">Add New Product</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Product Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Category</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value="">Select a category</option>
                    {categories?.map((cat: any) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Price</label>
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
                  <label className="block text-sm font-semibold text-foreground mb-2">Stock</label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Sizes (comma-separated)</label>
                  <input
                    type="text"
                    placeholder="6, 7, 8, 9, 10"
                    value={formData.sizes}
                    onChange={(e) => setFormData({ ...formData, sizes: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Image URL</label>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full px-6 py-3 bg-accent text-accent-foreground font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isPending ? "Creating..." : "Create Product"}
              </button>
            </form>
          </Card>
        )}

        <div className="space-y-4">
          {products && products.length > 0 ? (
            products.map((product: any) => (
              <Card key={product.id} className="p-6 flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground text-lg">{product.name}</h3>
                  <p className="text-sm text-muted-foreground">{product.description?.substring(0, 100)}...</p>
                  <div className="flex gap-6 mt-2 text-sm">
                    <span className="text-accent font-semibold">${product.price}</span>
                    <span className="text-muted-foreground">Stock: {product.stock}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="p-2 text-muted-foreground hover:text-accent transition-colors">
                    <Edit2 size={20} />
                  </button>
                  <button
                    onClick={() => deleteProduct({ id: product.id })}
                    className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </Card>
            ))
          ) : (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">No products yet. Create one to get started!</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
