"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import { toast } from "sonner";
import { useRef } from "react";

export function NotificationBell() {
  const router = useRouter();
  const { user, isLoggedIn } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const notifiedIdsRef = useRef<Set<string>>(new Set());
  const firstFetchDone = useRef(false);

  useEffect(() => {
    if (!isLoggedIn || !user) return;

    const fetchCountAndNew = async () => {
      try {
        const { data, count } = await supabase
          .from("notifications")
          .select("*", { count: "exact" })
          .eq("user_id", user.id)
          .eq("is_read", false)
          .order("created_at", { ascending: false })
          .limit(10);

        setUnreadCount(count || 0);

        if (data) {
          if (!firstFetchDone.current) {
            data.forEach((n) => notifiedIdsRef.current.add(n.id));
            firstFetchDone.current = true;
          } else {
            data.forEach((n) => {
              if (!notifiedIdsRef.current.has(n.id)) {
                notifiedIdsRef.current.add(n.id);
                toast.info(n.title, {
                  description: n.body,
                  duration: Number.POSITIVE_INFINITY,
                  closeButton: true,
                  action: n.link
                    ? {
                        label: "Xem chi tiết",
                        onClick: () => router.push(n.link),
                      }
                    : undefined,
                });
              }
            });
          }
        }
      } catch {
        /* ignore */
      }
    };

    fetchCountAndNew();

    // Subscribe to realtime changes in notifications table
    const channel = supabase
      .channel("schema-db-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchCountAndNew();
        },
      )
      .subscribe();

    // Also listen to local custom events for instant updates from other components
    const handleLocalUpdate = () => {
      fetchCountAndNew();
    };
    window.addEventListener("notifications_read", handleLocalUpdate);

    // Poll every 15s for fallback quicker notification if realtime drops
    const interval = setInterval(fetchCountAndNew, 15000);
    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
      window.removeEventListener("notifications_read", handleLocalUpdate);
    };
  }, [isLoggedIn, user, router]);

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      onClick={() => router.push("/notifications")}
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] rounded-full h-5 w-5 flex items-center justify-center font-bold">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Button>
  );
}
