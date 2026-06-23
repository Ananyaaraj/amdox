import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(amount));
}

export function formatDate(date: string | Date, fmt: "short" | "long" | "relative" = "short") {
  const d = new Date(date);
  if (fmt === "relative") {
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }
  return d.toLocaleDateString("en-US", fmt === "long"
    ? { day: "numeric", month: "long", year: "numeric" }
    : { day: "2-digit", month: "short", year: "numeric" }
  );
}

export function formatNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function statusColor(status: string) {
  const map: Record<string, string> = {
    ACTIVE: "text-green-600 bg-green-50",
    APPROVED: "text-green-600 bg-green-50",
    COMPLETED: "text-green-600 bg-green-50",
    PAID: "text-green-600 bg-green-50",
    DONE: "text-green-600 bg-green-50",
    DRAFT: "text-gray-600 bg-gray-50",
    PENDING: "text-yellow-600 bg-yellow-50",
    PROCESSING: "text-blue-600 bg-blue-50",
    IN_PROGRESS: "text-blue-600 bg-blue-50",
    OVERDUE: "text-red-600 bg-red-50",
    FAILED: "text-red-600 bg-red-50",
    CANCELLED: "text-red-600 bg-red-50",
    REJECTED: "text-red-600 bg-red-50",
    ON_HOLD: "text-orange-600 bg-orange-50",
    SENT: "text-purple-600 bg-purple-50",
  };
  return map[status] || "text-gray-600 bg-gray-50";
}

export function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export function debounce<T extends (...args: any[]) => any>(fn: T, delay: number) {
  let timer: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
