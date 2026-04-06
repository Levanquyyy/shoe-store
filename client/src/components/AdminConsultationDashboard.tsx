import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { AdminConsultationDetail } from "./AdminConsultationDetail";

type ConsultationStatus = "open" | "closed";
type FilterStatus = "all" | ConsultationStatus;

interface ConsultationRow {
  id: number;
  productId: number;
  userId: number;
  status: ConsultationStatus;
  createdAt: Date;
  updatedAt: Date;
  product: { id: number; name: string; imageUrl: string | null };
  customer: { id: number; name: string; email: string };
  lastMessage: { message: string; createdAt: Date } | null;
}

const STATUS_BADGE_COLORS: Record<ConsultationStatus, string> = {
  open: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
  closed: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-100",
};

export function AdminConsultationDashboard() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [selectedConsultation, setSelectedConsultation] = useState<ConsultationRow | null>(null);

  const { data: consultations = [], isLoading } = trpc.consultation.adminGetAllConsultations.useQuery(
    {},
    { enabled: user?.role === "admin" }
  );

  if (user?.role !== "admin") {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-destructive mb-2">403 Forbidden</h2>
        <p className="text-muted-foreground">You do not have permission to view this page. Admin privileges required.</p>
      </div>
    );
  }

  const filtered: ConsultationRow[] = (consultations as ConsultationRow[]).filter((c) => {
    if (filter === "all") return true;
    return c.status === filter;
  });

  // When modal is open, render only the modal to avoid ambiguous button queries
  if (selectedConsultation) {
    return (
      <AdminConsultationDetail
        consultation={selectedConsultation}
        onClose={() => setSelectedConsultation(null)}
        hideCloseAction
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter tabs */}
      <div className="flex gap-2">
        {(["all", "open", "closed"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 rounded-lg font-semibold capitalize transition-colors ${
              filter === tab
                ? "bg-accent text-accent-foreground"
                : "bg-muted text-foreground hover:bg-accent/20"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filtered.length === 0 && (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No consultations found.</p>
        </Card>
      )}

      {/* List */}
      {!isLoading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((consultation) => (
            <Card
              key={consultation.id}
              className="p-4 cursor-pointer hover:border-accent transition-colors"
              onClick={() => setSelectedConsultation(consultation)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-semibold text-foreground truncate">
                      {consultation.product.name}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full font-semibold capitalize ${
                        STATUS_BADGE_COLORS[consultation.status]
                      }`}
                    >
                      {consultation.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {consultation.customer.name} &middot; {consultation.customer.email}
                  </p>
                  {consultation.lastMessage ? (
                    <p className="text-sm text-muted-foreground truncate">
                      {consultation.lastMessage.message}
                    </p>
                  ) : (
                    <p
                      className="text-sm text-muted-foreground italic"
                      data-testid={`no-last-message-${consultation.id}`}
                    >
                      No messages yet
                    </p>
                  )}
                </div>
                {consultation.lastMessage && (
                  <span
                    className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0"
                    data-testid={`last-message-time-${consultation.id}`}
                  >
                    {format(new Date(consultation.lastMessage.createdAt), "MMM d, HH:mm")}
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
