/**
 * Order Status State Machine
 *
 * Valid statuses and their allowed next transitions.
 * Rules:
 *  - Orders can only move to the NEXT status in the sequence.
 *  - No skipping steps.
 *  - No going backward.
 *  - "cancelled" is a terminal state reachable only from "pending" or "processing".
 *  - "delivered" is a terminal state with no further transitions.
 */

export type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled";

/**
 * Defines which statuses are reachable from a given current status.
 * Only the immediately next status is valid (no skipping).
 */
export const ORDER_STATUS_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  pending: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

/**
 * The canonical ordered sequence for display purposes (excluding cancelled).
 */
export const ORDER_STATUS_SEQUENCE: readonly OrderStatus[] = [
  "pending",
  "processing",
  "shipped",
  "delivered",
];

export const ORDER_STATUS_LABELS: Readonly<Record<OrderStatus, string>> = {
  pending: "Chờ xử lý",
  processing: "Đang xử lý",
  shipped: "Đang giao",
  delivered: "Đã giao",
  cancelled: "Đã hủy",
};

export const ORDER_STATUS_COLORS: Readonly<Record<OrderStatus, string>> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
  processing: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
  shipped: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100",
  delivered: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
};

/**
 * Returns true if transitioning from `from` to `to` is a valid move.
 */
export function isValidTransition(from: OrderStatus, to: OrderStatus): boolean {
  const allowed = ORDER_STATUS_TRANSITIONS[from];
  return allowed.includes(to);
}

/**
 * Returns the single "next step" status in the main forward sequence,
 * or null if the order is in a terminal state (delivered or cancelled).
 */
export function getNextStatus(current: OrderStatus): OrderStatus | null {
  const idx = ORDER_STATUS_SEQUENCE.indexOf(current);
  if (idx === -1 || idx === ORDER_STATUS_SEQUENCE.length - 1) {
    return null;
  }
  return ORDER_STATUS_SEQUENCE[idx + 1];
}

/**
 * Returns a human-readable error message for an invalid transition attempt.
 */
export function getTransitionErrorMessage(from: OrderStatus, to: OrderStatus): string {
  if (from === to) {
    return `Order is already in status "${ORDER_STATUS_LABELS[from]}".`;
  }
  const allowed = ORDER_STATUS_TRANSITIONS[from];
  if (allowed.length === 0) {
    return `Order status "${ORDER_STATUS_LABELS[from]}" is a terminal state and cannot be changed.`;
  }
  const allowedLabels = allowed.map((s) => `"${ORDER_STATUS_LABELS[s]}"`).join(" or ");
  return `Cannot transition from "${ORDER_STATUS_LABELS[from]}" to "${ORDER_STATUS_LABELS[to]}". Allowed next status: ${allowedLabels}.`;
}
