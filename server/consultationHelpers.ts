/**
 * Pure-logic helpers for the Product Consultation feature.
 * No DB calls, no side-effects — safe to test without mocking.
 */

export type ConsultationStatus = "open" | "closed";

const VALID_STATUSES: ReadonlySet<string> = new Set<ConsultationStatus>(["open", "closed"]);

/**
 * Returns true when the given value is a valid ConsultationStatus string.
 */
export function isValidConsultationStatus(value: unknown): value is ConsultationStatus {
  return typeof value === "string" && VALID_STATUSES.has(value);
}

/**
 * Returns true when the given userId matches the userId stored on a message record.
 */
export function isMessageOwner(message: { userId: number }, userId: number): boolean {
  return message.userId === userId;
}

/**
 * Returns true when the given userId matches the userId stored on a consultation record.
 */
export function isConsultationOwner(consultation: { userId: number }, userId: number): boolean {
  return consultation.userId === userId;
}

/**
 * Returns true when `requestor` is allowed to access `consultation`.
 * Rules:
 *   - Admins can access any consultation.
 *   - Regular users can only access their own consultations.
 */
export function canAccessConsultation(
  consultation: { userId: number },
  requestor: { id: number; role: string }
): boolean {
  if (requestor.role === "admin") return true;
  return consultation.userId === requestor.id;
}
