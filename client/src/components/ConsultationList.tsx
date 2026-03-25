import { useState } from "react";
import { MessageCircle, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { format } from "date-fns";
import { ConsultationModal } from "./ConsultationModal";

type FilterStatus = "all" | "open" | "closed";

interface ConsultationWithProduct {
  id: number;
  productId: number;
  userId: number;
  status: "open" | "closed";
  createdAt: Date;
  updatedAt: Date;
  product?: {
    id: number;
    name: string;
    slug: string;
  };
}

export function ConsultationList() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [selectedConsultation, setSelectedConsultation] =
    useState<ConsultationWithProduct | null>(null);

  const { data: consultations = [], isLoading } =
    trpc.consultation.getMyConsultations.useQuery(undefined, {
      enabled: !!user,
    });

  const filtered = (consultations as ConsultationWithProduct[]).filter((c) => {
    if (filter === "all") return true;
    return c.status === filter;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter buttons */}
      <div className="flex items-center gap-2">
        {(["all", "open", "closed"] as const).map((s) => (
          <Button
            key={s}
            variant={filter === s ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(s)}
            className="capitalize"
          >
            {s === "all" ? "All" : s === "open" ? "Open" : "Closed"}
          </Button>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <MessageCircle size={40} className="mx-auto mb-3 opacity-40" />
          <p>No consultations found.</p>
        </div>
      )}

      {/* Consultation rows */}
      <ul className="space-y-2">
        {filtered.map((c) => (
          <li key={c.id}>
            <button
              onClick={() => setSelectedConsultation(c)}
              className="w-full text-left p-4 rounded-lg border border-border bg-card hover:border-accent transition-colors space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">
                  {c.product?.name ?? `Product #${c.productId}`}
                </span>
                <span
                  className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                    c.status === "open"
                      ? "bg-green-100 text-green-700"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {c.status === "open" ? (
                    <Clock size={10} />
                  ) : (
                    <CheckCircle size={10} />
                  )}
                  {c.status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Last updated: {format(new Date(c.updatedAt), "MMM d, yyyy HH:mm")}
              </p>
            </button>
          </li>
        ))}
      </ul>

      {/* Modal */}
      {selectedConsultation && (
        <ConsultationModal
          consultation={selectedConsultation}
          productName={
            selectedConsultation.product?.name ??
            `Product #${selectedConsultation.productId}`
          }
          onClose={() => setSelectedConsultation(null)}
        />
      )}
    </div>
  );
}
