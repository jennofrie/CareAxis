import { Badge } from "@/components/ui/Badge";
import { Clock, Eye, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

const STATUS_CONFIG = {
  PENDING: { label: 'Pending', icon: Clock, className: 'border border-yellow-500/50 text-yellow-500 bg-yellow-500/10' },
  VIEWED: { label: 'Viewed', icon: Eye, className: 'border border-blue-500/50 text-blue-500 bg-blue-500/10' },
  SIGNED: { label: 'Signed', icon: CheckCircle, className: 'border border-green-500/50 text-green-500 bg-green-500/10' },
  DECLINED: { label: 'Declined', icon: XCircle, className: 'border border-red-500/50 text-red-500 bg-red-500/10' },
  EXPIRED: { label: 'Expired', icon: AlertTriangle, className: 'border border-muted-foreground/50 text-muted-foreground bg-muted/20' },
};

interface RequestStatusBadgeProps {
  status: keyof typeof STATUS_CONFIG;
}

export function RequestStatusBadge({ status }: RequestStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  const Icon = config.icon;

  return (
    <Badge className={config.className}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  );
}
