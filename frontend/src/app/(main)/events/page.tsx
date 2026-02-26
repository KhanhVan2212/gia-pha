"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  MapPin,
  Clock,
  Users,
  Plus,
  User,
  ChevronRight,
  Info,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

// === Types ===
interface EventItem {
  id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string | null;
  location: string | null;
  type: string;
  is_recurring: boolean;
  creator_id: string;
  author_name?: string;
  status: string;
  created_at: string;
  creator?: { display_name: string | null; email: string };
  rsvp_count?: number;
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

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("vi-VN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// === Create Event Dialog ===
function CreateEventDialog({ onCreated }: { onCreated: () => void }) {
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState("MEETING");

  const handleSubmit = async () => {
    if (!title.trim() || !startAt || !user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("events").insert({
        title: title.trim(),
        description: description.trim() || null,
        start_at: new Date(startAt).toISOString(),
        location: location.trim() || null,
        type,
        creator_id: user.id,
        author_name: profile?.display_name || user.email?.split("@")[0],
        status: "pending",
      });
      if (!error) {
        setOpen(false);
        setTitle("");
        setDescription("");
        setStartAt("");
        setLocation("");
        onCreated();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-full shadow-lg shadow-orange-500/20 bg-orange-600 hover:bg-orange-700 transition-all active:scale-95">
          <Plus className="mr-2 h-4 w-4" />
          Tạo sự kiện
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-orange-600" />
            Lên lịch sự kiện họ
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium ml-1">
              Tên sự kiện <span className="text-rose-500">*</span>
            </label>
            <Input
              placeholder="Ví dụ: Giỗ tổ dòng họ..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-xl bg-muted/50 border-transparent focus:bg-background transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium ml-1">
              Thời gian <span className="text-rose-500">*</span>
            </label>
            <Input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              className="rounded-xl bg-muted/50 border-transparent focus:bg-background transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium ml-1">Phân loại</label>
            <select
              className="w-full rounded-xl border-transparent bg-muted/50 px-3 py-2 text-sm focus:ring-2 ring-orange-500/20 outline-none transition-all"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {Object.entries(typeLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.emoji} {v.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium ml-1">Địa điểm</label>
            <Input
              placeholder="Địa chỉ diễn ra..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="rounded-xl bg-muted/50 border-transparent focus:bg-background transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium ml-1">Mô tả thêm</label>
            <Textarea
              placeholder="Thông tin chi tiết cho bà con..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-xl bg-muted/50 border-transparent focus:bg-background transition-all"
              rows={3}
            />
          </div>
          <Button
            className="w-full rounded-xl h-11 bg-orange-600 hover:bg-orange-700 mt-2 font-bold transition-all"
            onClick={handleSubmit}
            disabled={!title.trim() || !startAt || submitting}
          >
            {submitting ? "Đang xử lý..." : "Gửi yêu cầu duyệt"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// === Event Card ===
function EventCard({ event }: { event: EventItem }) {
  const router = useRouter();
  const tl = typeLabels[event.type] || typeLabels.OTHER;

  return (
    <Card
      className="group border-transparent bg-muted/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer overflow-hidden rounded-3xl"
      onClick={() => router.push(`/events/${event.id}`)}
    >
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row h-full">
          {/* Cột thời gian bên trái (Desktop) hoặc thanh trên (Mobile) */}
          <div className="w-full sm:w-32 bg-orange-600 text-white p-4 flex flex-col items-center justify-center text-center sm:rounded-r-3xl shrink-0">
            <span className="text-xs font-medium uppercase opacity-80">
              {new Date(event.start_at).toLocaleDateString("vi-VN", {
                month: "short",
              })}
            </span>
            <span className="text-3xl font-black">
              {new Date(event.start_at).getDate()}
            </span>
            <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full mt-1">
              {formatTime(event.start_at)}
            </span>
          </div>

          <div className="p-5 flex-1 min-w-0 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1 min-w-0">
                <Badge
                  variant="outline"
                  className={cn("rounded-full font-medium py-0 px-2", tl.class)}
                >
                  {tl.emoji} {tl.label}
                </Badge>
                <h3 className="text-lg font-extrabold text-foreground truncate group-hover:text-orange-600 transition-colors leading-tight">
                  {event.title}
                </h3>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground/30 group-hover:translate-x-1 transition-transform shrink-0" />
            </div>

            {event.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                {event.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-y-2 gap-x-4 pt-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 text-orange-500" />
                <span className="truncate">
                  {event.location || "Liên hệ ban tổ chức"}
                </span>
              </div>
              {event.rsvp_count !== undefined && event.rsvp_count > 0 && (
                <div className="flex items-center gap-1.5 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  <Users className="h-3.5 w-3.5" />
                  {event.rsvp_count} người tham gia
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-muted-foreground/5">
              <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center overflow-hidden relative border border-black/5">
                <User className="h-3 w-3 text-muted-foreground" />
              </div>
              <span className="text-[11px] text-muted-foreground">
                Đăng bởi{" "}
                <span className="font-bold text-foreground/80">
                  {event.author_name || "Ẩn danh"}
                </span>
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// === Main Page ===
export default function EventsPage() {
  const { isLoggedIn, isViewer } = useAuth();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("events")
        .select("*, creator:profiles(display_name, email)")
        .eq("status", "published")
        .order("start_at", { ascending: false });
      if (data) setEvents(data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-[2rem] bg-linear-to-br from-orange-500/10 via-rose-500/5 to-transparent p-8 md:p-12 border border-orange-500/10 shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
              <CalendarDays className="h-8 w-8 text-orange-600" />
              Sự kiện dòng họ
            </h1>
            <p className="text-muted-foreground mt-3 text-lg leading-relaxed">
              Cập nhật lịch giỗ chạp, họp mặt và các hoạt động văn hóa tâm linh
              gắn kết các thành viên.
            </p>
          </div>
          <div className="shrink-0">
            {isLoggedIn && !isViewer && (
              <CreateEventDialog onCreated={fetchEvents} />
            )}
          </div>
        </div>
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none opacity-60" />
        <div className="absolute bottom-0 left-1/4 -mb-16 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none opacity-50" />
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 px-2">
          <div className="h-8 w-1.5 bg-orange-600 rounded-full" />
          <h2 className="text-xl font-bold">Lịch trình sắp tới</h2>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-40 w-full rounded-3xl" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <Card className="border-dashed bg-muted/20 rounded-[2rem]">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mb-6">
                <CalendarDays className="h-10 w-10 text-muted-foreground/30" />
              </div>
              <h3 className="text-xl font-bold mb-2">Chưa có sự kiện nào</h3>
              <p className="text-muted-foreground max-w-xs mx-auto">
                Hiện tại chưa có sự kiện nào được lên lịch. Bạn có thể tự mình
                tạo sự kiện mới!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>

      {/* Info Footer */}
      <div className="bg-muted/30 border border-muted-foreground/5 rounded-2xl p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-orange-600 mt-0.5 shrink-0" />
        <p className="text-sm text-muted-foreground italic">
          Các sự kiện do thành viên tạo sẽ cần được Ban quản trị phê duyệt trước
          khi hiển thị công khai trên lịch chung của dòng họ.
        </p>
      </div>
    </div>
  );
}
