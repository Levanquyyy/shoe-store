import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Plus, Edit2, Trash2, X } from "lucide-react";
import { toast } from "sonner";

export default function CategoryManager() {
  const { data: categories, refetch: refetchCategories } = trpc.categories.list.useQuery();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
  });

  const { mutate: createCategory, isPending: isCreating } = trpc.admin.categories.create.useMutation({
    onSuccess: () => {
      toast.success("Tạo danh mục thành công");
      setFormData({ name: "", slug: "", description: "" });
      setShowForm(false);
      refetchCategories();
    },
    onError: (error: any) => {
      toast.error(error.message || "Không thể tạo danh mục");
    },
  });

  const { mutate: updateCategory, isPending: isUpdating } = trpc.admin.categories.update.useMutation({
    onSuccess: () => {
      toast.success("Cập nhật danh mục thành công");
      setFormData({ name: "", slug: "", description: "" });
      setEditingId(null);
      refetchCategories();
    },
    onError: (error: any) => {
      toast.error(error.message || "Không thể cập nhật danh mục");
    },
  });

  const { mutate: deleteCategory } = trpc.admin.categories.delete.useMutation({
    onSuccess: () => {
      toast.success("Xóa danh mục thành công");
      refetchCategories();
    },
    onError: (error: any) => {
      toast.error(error.message || "Không thể xóa danh mục");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.slug) {
      toast.error("Vui lòng điền đầy đủ trường bắt buộc");
      return;
    }

    if (editingId) {
      updateCategory({
        id: editingId,
        name: formData.name,
        slug: formData.slug,
        description: formData.description,
      });
    } else {
      createCategory({
        name: formData.name,
        slug: formData.slug,
        description: formData.description,
      });
    }
  };

  const handleEdit = (category: any) => {
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || "",
    });
    setEditingId(category.id);
    setShowForm(true);
  };

  const handleCancel = () => {
    setFormData({ name: "", slug: "", description: "" });
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <div className="space-y-8 mb-12">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-foreground">Quản lý danh mục</h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-6 py-3 bg-accent text-accent-foreground font-semibold rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus size={20} />
            Thêm danh mục
          </button>
        )}
      </div>

      {showForm && (
        <Card className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-foreground">
              {editingId ? "Chỉnh sửa danh mục" : "Thêm danh mục mới"}
            </h3>
            <button onClick={handleCancel} className="text-muted-foreground hover:text-foreground">
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Tên *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ví dụ: Giày chạy bộ"
                  className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Slug *</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="vi-du: giay-chay-bo"
                  className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Mô tả</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="Mô tả danh mục (không bắt buộc)"
                className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isCreating || isUpdating}
                className="px-6 py-2 bg-accent text-accent-foreground font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {editingId ? "Cập nhật" : "Tạo mới"}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-2 border border-border text-foreground font-semibold rounded-lg hover:bg-muted transition-colors"
              >
                Hủy
              </button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid gap-4">
        {categories?.map((category: any) => (
          <Card key={category.id} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-foreground">{category.name}</h3>
                <p className="text-sm text-muted-foreground">Slug: {category.slug}</p>
                {category.description && (
                  <p className="text-sm text-foreground mt-2">{category.description}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(category)}
                  className="p-2 text-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => deleteCategory({ id: category.id })}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </Card>
        ))}

        {!categories || categories.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Chưa có danh mục nào. Hãy tạo danh mục đầu tiên!</p>
          </Card>
        )}
      </div>
    </div>
  );
}
