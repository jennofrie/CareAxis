"use client";

import { CheckCircle2, AlertTriangle, XCircle, MinusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCredentialStatus, getDaysUntilExpiry, formatDate } from "@/lib/staff-utils";

interface CredentialBadgeProps {
  value: string;
  expiryDate: string;
  label: string;
}

const STATUS_CONFIG = {
  valid: {
    icon: CheckCircle2,
    text: 'Valid',
    badge: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400',
    detail: 'text-emerald-600 dark:text-emerald-500',
  },
  expiring: {
    icon: AlertTriangle,
    text: 'Expiring Soon',
    badge: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400',
    detail: 'text-amber-600 dark:text-amber-500',
  },
  expired: {
    icon: XCircle,
    text: 'Expired',
    badge: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400',
    detail: 'text-red-600 dark:text-red-500',
  },
  missing: {
    icon: MinusCircle,
    text: 'Not Provided',
    badge: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
    detail: 'text-slate-400 dark:text-slate-500',
  },
} as const;

export function CredentialBadge({ value, expiryDate, label: _label }: CredentialBadgeProps) {
  const status = getCredentialStatus(expiryDate || null);
  const days = expiryDate ? getDaysUntilExpiry(expiryDate) : null;
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  let countdown: string | null = null;
  if (status === 'expired' && days !== null) {
    const n = Math.abs(days);
    countdown = `Expired ${n} day${n !== 1 ? 's' : ''} ago`;
  } else if (days !== null && days <= 60 && status !== 'missing') {
    countdown = `Expires in ${days} day${days !== 1 ? 's' : ''}`;
  }

  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span
        className={cn(
          'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium w-fit whitespace-nowrap',
          config.badge
        )}
      >
        <Icon className="w-3 h-3 flex-shrink-0" />
        {config.text}
      </span>

      {expiryDate && (
        <span className={cn('text-[11px]', config.detail)}>{formatDate(expiryDate)}</span>
      )}

      {countdown && (
        <span className="text-[10px] text-slate-400 dark:text-slate-500">{countdown}</span>
      )}

      {value && (
        <span
          className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate max-w-[120px]"
          title={value}
        >
          {value.length > 14 ? `${value.slice(0, 14)}…` : value}
        </span>
      )}
    </div>
  );
}
