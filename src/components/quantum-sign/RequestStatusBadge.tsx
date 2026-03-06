import { Badge } from "@/components/ui/badge";
import { Clock, Eye, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

const STATUS_CONFIG = {
  PENDING: { label: 'Pending', variant: 'outline' as const, icon: Clock, className: 'border-yellow-500/50 text-yellow-500' },
  VIEWED: { label: 'Viewed', variant: 'outline' as const, icon: Eye, className: 'border-blue-500/50 text-blue-500' },
  SIGNED: { label: 'Signed', variant: 'outline' as const, icon: CheckCircle, className: 'border-green-500/50 text-green-500' },
  DECLINED: { label: 'Declined', variant: 'outline' as const, icon: XCircle, className: 'border-red-500/50 text-red-500' },
  EXPIRED: { label: 'Expired', variant: 'outline' as const, icon: AlertTriangle, className: 'border-muted-foreground/50 text-muted-foreground' },
};

interface RequestStatusBadgeProps {
  status: keyof typeof STATUS_CONFIG;
}

export function RequestStatusBadge({ status }: RequestStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={config.className}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  );
}
