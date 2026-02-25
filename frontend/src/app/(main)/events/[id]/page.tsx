"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  CalendarDays,
  MapPin,
  Clock,
  Users,
  ArrowLeft,
  Check,
  X,
  HelpCircle,
  Loader2,
  User,
  Share2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

// === Interfaces ===
interface Profile {
  display_name: string | null;
  email: string;
  avatar_url?: string | null;
}

interface EventData {
  id: string;
  title: string;
  description: string | null;
  start_at: string;
  location: string | null;
  type: string;
  creator: Profile;
}

interface RSVP {
  id: string;
  user_id: string;
  status: string;
  user: Profile;
}

const typeLabels: Record<
  string,
  { label: string; emoji: string; class: string }
> = {
  MEMORIAL: {
    label: "Giỗ chạp",
    emoji: "🕯️",
    class: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  },
  MEETING: {
    label: "Họp họ",
    emoji: "🤝",
    class: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  FESTIVAL: {
    label: "Lễ hội",
    emoji: "🎊",
    class: "bg-rose-500/10 text-rose-600 border-rose-500/20",
  },
  OTHER: {
    label: "Khác",
    emoji: "📅",
    class: "bg-slate-500/10 text-slate-600 border-slate-500/20",
  },
};

const rsvpOptions = [
  {
    status: "GOING",
    label: "Tham gia",
    icon: Check,
    activeClass:
      "bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-200",
  },
  {
    status: "MAYBE",
    label: "Có thể",
    icon: HelpCircle,
    activeClass:
      "bg-amber-500 text-white hover:bg-amber-600 shadow-md shadow-amber-200",
  },
  {
    status: "NOT_GOING",
    label: "Vắng mặt",
    icon: X,
    activeClass:
      "bg-rose-600 text-white hover:bg-rose-700 shadow-md shadow-rose-200",
  },
];

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoggedIn } = useAuth();
  const [event, setEvent] = useState<EventData | null>(null);
  const [rsvps, setRsvps] = useState<RSVP[]>([]);
  const [myRsvp, setMyRsvp] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchEvent = useCallback(async () => {
    if (!params.id) return;
    setLoading(true);
    try {
      const { data: eventData } = await supabase
        .from("events")
        .select("*, creator:profiles(display_name, email, avatar_url)")
        .eq("id", params.id)
        .single();

      if (eventData) setEvent(eventData as EventData);

      const { data: rsvpData } = await supabase
        .from("event_rsvps")
        .select("*, user:profiles(display_name, email, avatar_url)")
        .eq("event_id", params.id);

      if (rsvpData) {
        setRsvps(rsvpData as RSVP[]);
        if (user) {
          const mine = (rsvpData as RSVP[]).find((r) => r.user_id === user.id);
          if (mine) setMyRsvp(mine.status);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [params.id, user]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  const handleRsvp = async (status: string) => {
    if (!user || !params.id) return;
    const { error } = await supabase
      .from("event_rsvps")
      .upsert(
        { event_id: params.id, user_id: user.id, status },
        { onConflict: "event_id,user_id" },
      );

    if (!error) {
      setMyRsvp(status);
      fetchEvent();
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-orange-600" />
        <p className="text-sm text-muted-foreground animate-pulse">
          Đang tải chi tiết sự kiện...
        </p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-20 space-y-4">
        <div className="bg-muted w-20 h-20 rounded-full flex items-center justify-center mx-auto">
          <CalendarDays className="h-10 w-10 text-muted-foreground/50" />
        </div>
        <h2 className="text-xl font-bold">Không tìm thấy sự kiện</h2>
        <Button variant="outline" onClick={() => router.push("/events")}>
          Quay lại danh sách
        </Button>
      </div>
    );
  }

  const tl = typeLabels[event.type] || typeLabels.OTHER;
  const goingCount = rsvps.filter((r) => r.status === "GOING").length;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      {/* Navigation */}
      <div className="flex items-center justify-between px-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/events")}
          className="rounded-full hover:bg-background shadow-sm border border-transparent hover:border-muted"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại
        </Button>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Share2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Main Info Card */}
      <Card className="border-transparent bg-muted/50 rounded-[2.5rem] overflow-hidden shadow-sm">
        <CardHeader className="p-6 md:p-10 pb-4">
          <Badge
            variant="outline"
            className={cn(
              "w-fit mb-4 px-3 py-1 rounded-full font-bold",
              tl.class,
            )}
          >
            {tl.emoji} {tl.label}
          </Badge>
          <CardTitle className="text-2xl md:text-4xl font-black tracking-tight leading-tight">
            {event.title}
          </CardTitle>
          <div className="flex items-center gap-2 mt-4 text-muted-foreground">
            <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center border border-orange-200">
              <User className="h-4 w-4 text-orange-600" />
            </div>
            <p className="text-sm">
              Tổ chức bởi{" "}
              <span className="font-bold text-foreground">
                {event.creator?.display_name || "Ban quản trị"}
              </span>
            </p>
          </div>
        </CardHeader>

        <CardContent className="p-6 md:p-10 pt-0 space-y-8">
          {/* Description */}
          {event.description && (
            <div className="bg-background/60 p-5 rounded-3xl border border-muted-foreground/5 leading-relaxed text-foreground/80">
              {event.description}
            </div>
          )}

          {/* Quick Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-4 p-4 bg-background/40 rounded-2xl ring-1 ring-black/5">
              <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  Thời gian
                </p>
                <p className="text-sm font-bold">
                  {new Date(event.start_at).toLocaleString("vi-VN", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-background/40 rounded-2xl ring-1 ring-black/5">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                <MapPin className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  Địa điểm
                </p>
                <p className="text-sm font-bold truncate">
                  {event.location || "Tại nhà văn hóa dòng họ"}
                </p>
              </div>
            </div>
          </div>

          {/* RSVP Actions */}
          {isLoggedIn ? (
            <div className="space-y-4 pt-4 border-t border-muted-foreground/10">
              <h3 className="text-center font-bold text-sm text-muted-foreground uppercase tracking-widest">
                Bạn sẽ tham gia chứ?
              </h3>
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                {rsvpOptions.map((opt) => {
                  const isActive = myRsvp === opt.status;
                  return (
                    <Button
                      key={opt.status}
                      variant="outline"
                      onClick={() => handleRsvp(opt.status)}
                      className={cn(
                        "flex-col h-20 sm:h-24 gap-2 rounded-2xl transition-all border-muted-foreground/10 bg-background/50",
                        isActive
                          ? opt.activeClass
                          : "hover:border-orange-500/30 hover:bg-orange-50/50",
                      )}
                    >
                      <opt.icon
                        className={cn(
                          "h-5 w-5 sm:h-6 sm:w-6",
                          isActive ? "animate-bounce" : "text-muted-foreground",
                        )}
                      />
                      <span className="text-[11px] sm:text-xs font-bold">
                        {opt.label}
                      </span>
                    </Button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-orange-50 rounded-2xl text-center">
              <p className="text-sm text-orange-700 font-medium">
                Vui lòng đăng nhập để đăng ký tham gia sự kiện này.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* RSVP List Section */}
      <Card className="border-transparent bg-muted/50 rounded-[2.5rem] shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between p-6 pb-2">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Danh sách tham gia
          </CardTitle>

          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 rounded-full">
            {goingCount} người đi
          </Badge>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          {rsvps.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {rsvps.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-3 bg-background/40 rounded-2xl ring-1 ring-black/5"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center border border-black/5 relative overflow-hidden text-[10px]">
                      {r.user?.display_name?.[0]?.toUpperCase() || (
                        <User className="h-4 w-4" />
                      )}
                    </div>
                    <span className="text-sm font-medium truncate max-w-[120px]">
                      {r.user?.display_name || r.user?.email.split("@")[0]}
                    </span>
                  </div>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-[10px] rounded-full px-2 py-0",
                      r.status === "GOING"
                        ? "bg-emerald-500/10 text-emerald-600"
                        : r.status === "MAYBE"
                          ? "bg-amber-500/10 text-amber-600"
                          : "bg-rose-500/10 text-rose-600",
                    )}
                  >
                    {r.status === "GOING"
                      ? "Sẽ đi"
                      : r.status === "MAYBE"
                        ? "Có thể"
                        : "Vắng"}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center text-muted-foreground text-sm italic">
              Chưa có ai phản hồi cho sự kiện này.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
