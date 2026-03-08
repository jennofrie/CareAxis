"use client";

import { Fragment } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
  SheetBody,
} from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  AlertCircle,
  Calendar,
  FileSignature,
  AlertTriangle,
  Info,
  Loader2,
} from "lucide-react";
import { useNotifications, type Notification, type NotificationType } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

interface NotificationPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const typeIcons: Record<NotificationType, React.ReactNode> = {
  budget_alert: <AlertTriangle className="w-4 h-4 text-amber-500" />,
  plan_review: <Calendar className="w-4 h-4 text-blue-500" />,
  signature_completed: <FileSignature className="w-4 h-4 text-green-500" />,
  signature_requested: <FileSignature className="w-4 h-4 text-indigo-500" />,
  system: <Info className="w-4 h-4 text-slate-500" />,
};

const typeLabels: Record<NotificationType, string> = {
  budget_alert: "Budget Alert",
  plan_review: "Plan Review",
  signature_completed: "Signature Completed",
  signature_requested: "Signature Requested",
  system: "System",
};

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
}: {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const handleClick = () => {
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }
    if (notification.action_url) {
      window.location.href = notification.action_url;
    }
  };

  return (
    <div
      className={cn(
        "group relative p-4 border-b border-slate-100 dark:border-slate-800 transition-colors",
        !notification.read && "bg-indigo-50/50 dark:bg-indigo-950/20",
        notification.action_url && "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
      )}
      onClick={handleClick}
    >
      <div className="flex gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {typeIcons[notification.type]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  "text-sm font-medium truncate",
                  notification.read
                    ? "text-slate-600 dark:text-slate-400"
                    : "text-slate-900 dark:text-slate-100"
                )}
              >
                {notification.title}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">
                {typeLabels[notification.type]}
              </p>
            </div>
            <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
              {formatTimeAgo(notification.created_at)}
            </span>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
            {notification.body}
          </p>
        </div>
      </div>

      {/* Action buttons - show on hover */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!notification.read && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMarkAsRead(notification.id);
            }}
            className="p-1.5 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors"
            title="Mark as read"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(notification.id);
          }}
          className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Unread indicator dot */}
      {!notification.read && (
        <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-indigo-500 rounded-full" />
      )}
    </div>
  );
}

export function NotificationPanel({ open, onOpenChange }: NotificationPanelProps) {
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  } = useNotifications();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col">
        <SheetHeader className="relative">
          <SheetTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
            {unreadCount > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 rounded-full">
                {unreadCount}
              </span>
            )}
          </SheetTitle>
          <SheetClose onClose={() => onOpenChange(false)} />
        </SheetHeader>

        {/* Actions bar */}
        {notifications.length > 0 && (
          <div className="flex items-center justify-between px-6 py-2 border-b border-slate-100 dark:border-slate-800">
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              className="text-xs h-7"
            >
              <CheckCheck className="w-3.5 h-3.5 mr-1" />
              Mark all read
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="text-xs h-7 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Clear all
            </Button>
          </div>
        )}

        <SheetBody className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
              <p className="text-sm text-slate-600 dark:text-slate-400">{error}</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <Bell className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                No notifications yet
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                You&apos;ll see budget alerts, plan reviews, and signature updates here
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                  onDelete={deleteNotification}
                />
              ))}
            </div>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
