"use client";

import { useEffect, useState, useCallback, ReactNode } from "react";
import {
  Bell,
  CheckCheck,
  ExternalLink,
  FileText,
  Calendar,
  MessageCircle,
  CheckCircle,
  Settings,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

const getTypeIcon = (type: string): ReactNode => {
  switch (type) {
    case "NEW_POST":
      return <FileText className="h-5 w-5 text-blue-500" />;
    case "NEW_EVENT":
      return <Calendar className="h-5 w-5 text-green-500" />;
    case "NEW_COMMENT":
      return <MessageCircle className="h-5 w-5 text-amber-500" />;
    case "RSVP_UPDATE":
      return <CheckCircle className="h-5 w-5 text-emerald-500" />;
    case "SYSTEM":
      return <Settings className="h-5 w-5 text-slate-500" />;
    case "EVENT_REMINDER":
      return <Bell className="h-5 w-5 text-rose-500" />;
    default:
      return <Bell className="h-5 w-5 text-primary" />;
  }
};

export default function NotificationsPage() {
  const router = useRouter();
  const { user, isLoggedIn } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setNotifications(data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );
    window.dispatchEvent(new Event("notifications_read"));
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    window.dispatchEvent(new Event("notifications_read"));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Thông báo
          </h1>
          <p className="text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} chưa đọc` : "Tất cả đã đọc"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            <CheckCheck className="h-4 w-4 mr-1" />
            Đánh dấu tất cả đã đọc
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Chưa có thông báo nào</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => (
            <Card
              key={notif.id}
              className={`cursor-pointer transition-colors ${!notif.is_read ? "bg-primary/5 border-primary/20" : ""}`}
              onClick={() => {
                if (!notif.is_read) markAsRead(notif.id);
                if (notif.link) router.push(notif.link);
              }}
            >
              <CardContent className="p-4 flex items-start gap-3">
                <div className="mt-0.5 shrink-0 bg-background rounded-full p-2 border shadow-sm">
                  {getTypeIcon(notif.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{notif.title}</span>
                    {!notif.is_read && (
                      <Badge variant="default" className="text-xs">
                        Mới
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {notif.body}
                  </p>
                  <span className="text-xs text-muted-foreground font-medium">
                    {(() => {
                      const d = new Date(notif.created_at);
                      const time = d.toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                      return `${time} ${d.getDate()} thg ${d.getMonth() + 1}`;
                    })()}
                  </span>
                </div>
                {notif.link && (
                  <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
