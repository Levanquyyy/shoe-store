import { useState, useRef, useEffect } from "react";
import { X, Send, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { format } from "date-fns";

const MAX_MESSAGE_LENGTH = 2000;

interface Consultation {
  id: number;
  productId: number;
  userId: number;
  status: "open" | "closed";
  createdAt: Date;
  updatedAt: Date;
}

interface ConsultationModalProps {
  consultation: Consultation;
  productName: string;
  onClose: () => void;
}

export function ConsultationModal({
  consultation,
  productName,
  onClose,
}: ConsultationModalProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  const { data: messages = [] } = trpc.consultation.getMessages.useQuery(
    { consultationId: consultation.id },
    { enabled: true }
  );

  const sendMessage = trpc.consultation.sendMessage.useMutation();
  const closeConsultation = trpc.consultation.close.useMutation();

  const isClosed = consultation.status === "closed";
  const isOwner = user?.id === consultation.userId;
  const isAdmin = user?.role === "admin";
  const canClose = (isOwner || isAdmin) && !isClosed;

  useEffect(() => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === "function") {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed || isClosed) return;

    setSendError(null);
    sendMessage.mutate(
      { consultationId: consultation.id, message: trimmed },
      {
        onSuccess: () => {
          setMessage("");
          utils.consultation.getMessages.invalidate({
            consultationId: consultation.id,
          });
        },
        onError: (err) => {
          setSendError(err.message || "Failed to send message");
        },
      }
    );
  };

  const handleClose = () => {
    closeConsultation.mutate(
      { consultationId: consultation.id },
      {
        onSuccess: () => {
          utils.consultation.getMyConsultations.invalidate();
          onClose();
        },
      }
    );
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_MESSAGE_LENGTH) {
      setMessage(value);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || isClosed) return;
    handleSend();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Consultation for ${productName}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div className="bg-background rounded-xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <MessageCircle size={20} className="text-accent" />
            <h2 className="font-semibold text-foreground">{productName}</h2>
            {isClosed && (
              <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                Closed
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {canClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                disabled={closeConsultation.isPending}
              >
                Close Consultation
              </Button>
            )}
            <button
              aria-label="Close"
              onClick={onClose}
              className="p-1.5 hover:bg-muted rounded-md transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Message list */}
        <div
          data-testid="message-list"
          className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-0"
        >
          {messages.map((msg) => {
            const isCurrentUser = msg.userId === user?.id;
            return (
              <div
                key={msg.id}
                data-testid={`message-bubble-${msg.id}`}
                className={`flex flex-col max-w-[75%] gap-1 ${
                  isCurrentUser
                    ? "self-end items-end"
                    : "self-start items-start"
                }`}
              >
                <div
                  className={`rounded-xl px-3 py-2 text-sm leading-relaxed ${
                    isCurrentUser
                      ? "bg-accent text-accent-foreground"
                      : "bg-muted text-foreground border border-border"
                  }`}
                >
                  {msg.message}
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {format(new Date(msg.createdAt), "HH:mm")}
                </span>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Error */}
        {sendError && (
          <div className="px-4 py-2 text-sm text-destructive bg-destructive/10">
            {sendError}
          </div>
        )}

        {/* Input area */}
        <form
          aria-label="Send message"
          onSubmit={handleFormSubmit}
          className="p-4 border-t border-border space-y-2"
        >
          <textarea
            value={message}
            onChange={handleMessageChange}
            disabled={isClosed}
            placeholder={isClosed ? "This consultation is closed." : "Type a message..."}
            rows={3}
            className="w-full resize-none rounded-lg border border-border bg-input px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {message.length} / {MAX_MESSAGE_LENGTH}
            </span>
            <Button
              type="submit"
              size="sm"
              disabled={isClosed || !message.trim() || sendMessage.isPending}
              className="flex items-center gap-2"
            >
              <Send size={14} />
              {sendMessage.isPending ? "Sending..." : "Send"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
