import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { ConsultationModal } from "./ConsultationModal";

interface ConsultationButtonProps {
  productId: number;
  productName: string;
}

export function ConsultationButton({ productId, productName }: ConsultationButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingConsultation, setPendingConsultation] = useState<{
    id: number;
    productId: number;
    userId: number;
    status: "open" | "closed";
    createdAt: Date;
    updatedAt: Date;
  } | null>(null);

  const { user } = useAuth();

  const { data: consultations = [] } = trpc.consultation.getMyConsultations.useQuery(
    undefined,
    { enabled: !!user }
  );

  const activeConsultation =
    pendingConsultation ??
    (consultations as Array<{
      id: number;
      productId: number;
      userId: number;
      status: "open" | "closed";
      createdAt: Date;
      updatedAt: Date;
    }>).find((c) => c.productId === productId && c.status === "open") ??
    null;

  const hasActive = (consultations as Array<{ productId: number; status: string }>).some(
    (c) => c.productId === productId && c.status === "open"
  );

  const createConsultation = trpc.consultation.create.useMutation();

  const handleClick = () => {
    if (activeConsultation) {
      setModalOpen(true);
      return;
    }
    if (!user) return;
    createConsultation.mutate(
      { productId },
      {
        onSuccess: (created) => {
          if (created) {
            setPendingConsultation(created as typeof pendingConsultation);
          }
          setModalOpen(true);
        },
        onError: () => {
          // Still open modal so user sees feedback
          setModalOpen(true);
        },
      }
    );
  };

  return (
    <>
      <div className="relative inline-flex">
        <Button
          variant="outline"
          onClick={handleClick}
          disabled={createConsultation.isPending}
          className="flex items-center gap-2"
        >
          <MessageCircle size={18} />
          {createConsultation.isPending ? "Opening..." : "Get Consultation"}
        </Button>
        {hasActive && (
          <span
            data-testid="consultation-badge"
            className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center"
          >
            1
          </span>
        )}
      </div>

      {modalOpen && activeConsultation && (
        <ConsultationModal
          consultation={activeConsultation}
          productName={productName}
          onClose={() => {
            setModalOpen(false);
            setPendingConsultation(null);
          }}
        />
      )}
    </>
  );
}
