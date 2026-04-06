import { useState } from "react";
import { X, Send } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { format } from "date-fns";

const MAX_MESSAGE_LENGTH = 2000;

type ConsultationStatus = "open" | "closed";

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

interface AdminConsultationDetailProps {
  consultation: ConsultationRow;
  onClose: () => void;
  /** When true, hides the "Close Consultation" action button (used in embedded contexts) */
  hideCloseAction?: boolean;
}

export function AdminConsultationDetail({
  consultation,
  onClose,
  hideCloseAction = false,
}: AdminConsultationDetailProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const { data: messages = [] } = trpc.consultation.getMessages.useQuery({
    consultationId: consultation.id,
  });

  const sendMessage = trpc.consultation.sendMessage.useMutation();
  const closeConsultation = trpc.consultation.close.useMutation();

  const isClosed = consultation.status === "closed";
  const isAdmin = user?.role === "admin";

  const handleSend = () => {
    if (!message.trim()) return;
    setSendError(null);
    sendMessage.mutate(
      { consultationId: consultation.id, message: message.trim() },
      {
        onSuccess: () => {
          setMessage("");
          utils.consultation.getMessages.invalidate();
          utils.consultation.adminGetAllConsultations.invalidate();
        },
        onError: (e: Error) => {
          setSendError(e.message);
        },
      }
    );
  };

  const handleClose = () => {
    closeConsultation.mutate(
      { consultationId: consultation.id },
      {
        onSuccess: () => {
          utils.consultation.adminGetAllConsultations.invalidate();
          onClose();
        },
      }
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div className="bg-background rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-border">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            {consultation.product.imageUrl && (
              <img
                src={consultation.product.imageUrl}
                alt={consultation.product.name}
                className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-foreground text-lg truncate">
                {consultation.product.name}
              </h2>
              <p className="text-sm text-muted-foreground">
                {consultation.customer.name} &middot; {consultation.customer.email}
              </p>
              <span
                className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full font-semibold capitalize ${
                  isClosed
                    ? "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-100"
                    : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                }`}
              >
                {consultation.status}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
            {isAdmin && !isClosed && !hideCloseAction && (
              <button
                onClick={handleClose}
                className="px-3 py-1.5 text-sm font-semibold bg-destructive text-destructive-foreground rounded-lg hover:opacity-90 transition-opacity"
              >
                Close Consultation
              </button>
            )}
            <button
              aria-label="Close"
              onClick={onClose}
              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {(messages as Array<{
            id: number;
            consultationId: number;
            userId: number;
            message: string;
            createdAt: Date;
          }>).map((msg) => {
            const isAdminMsg = msg.userId === user?.id && user?.role === "admin";
            const isCustomer = msg.userId === consultation.userId && msg.userId !== user?.id;
            const senderLabel = isAdminMsg ? "Admin" : "Customer";

            return (
              <div
                key={msg.id}
                data-testid={`message-bubble-${msg.id}`}
                className={`flex flex-col gap-1 ${isAdminMsg ? "items-end" : "items-start"}`}
              >
                <span className="text-xs text-muted-foreground font-semibold px-1">
                  {senderLabel}
                </span>
                <div
                  className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${
                    isAdminMsg
                      ? "bg-accent text-accent-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {msg.message}
                </div>
                <span
                  className="text-xs text-muted-foreground px-1"
                  data-testid={`message-time-${msg.id}`}
                >
                  {format(new Date(msg.createdAt), "HH:mm")}
                </span>
              </div>
            );
          })}
        </div>

        {/* Reply area */}
        <div className="p-6 border-t border-border space-y-2">
          {sendError && (
            <p className="text-sm text-destructive">{sendError}</p>
          )}
          {isClosed && (
            <p className="text-sm text-muted-foreground italic">
              Replies are disabled for this thread.
            </p>
          )}
          <div className="flex gap-3">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
              disabled={isClosed}
              rows={2}
              placeholder={isClosed ? "Consultation closed" : "Type your reply..."}
              className="flex-1 resize-none px-3 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50 text-sm"
            />
            <button
              onClick={handleSend}
              disabled={!message.trim() || sendMessage.isPending || isClosed}
              className="px-4 py-2 bg-accent text-accent-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2 self-end"
            >
              <Send size={16} />
              {sendMessage.isPending ? "Sending..." : "Send"}
            </button>
          </div>
          <p className="text-xs text-muted-foreground text-right">
            {message.length} / {MAX_MESSAGE_LENGTH}
          </p>
        </div>
      </div>
    </div>
  );
}
