"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import {
  Check,
  X,
  MessageSquarePlus,
  User,
  ShieldAlert,
  ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CldImage } from "next-cloudinary";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Contribution {
  id: string;
  author_id: string;
  author_email: string;
  person_handle: string;
  person_name: string;
  field_name: string;
  field_label: string;
  old_value: string | null;
  new_value: string;
  note: string | null;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
}

interface Post {
  id: string;
  author_id: string;
  title: string | null;
  body: string;
  media: { url: string; mime_type: string; public_id: string }[] | null;
  status: "pending" | "published" | "rejected";
  created_at: string;
  author?: { email: string; display_name: string | null };
}

interface EventItem {
  id: string;
  title: string;
  description: string | null;
  start_at: string;
  location: string | null;
  type: string;
  status: string;
  creator_id: string;
  author_name?: string;
  created_at: string;
}

interface MediaItem {
  id: string;
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
  url: string | null;
  public_id: string | null;
  width: number | null;
  height: number | null;
  title: string | null;
  description: string | null;
  state: string;
  uploader_id: string | null;
  created_at: string;
  uploader?: { display_name: string | null; email: string };
}

export default function AdminEditsPage() {
  const { isAdmin, loading: authLoading, user, role } = useAuth();
  const router = useRouter();
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [activeTab, setActiveTab] = useState<
    "edits" | "posts" | "events" | "media"
  >("edits");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("pending");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [selectedMedia, setSelectedMedia] = useState<{
    url?: string;
    public_id?: string;
    mime_type?: string;
  } | null>(null);
  // Pending counts — fetched once on mount so all tabs show correct numbers immediately
  const [pendingCounts, setPendingCounts] = useState({
    edits: 0,
    posts: 0,
    events: 0,
    media: 0,
  });

  // Fetch pending counts for ALL tabs at once (so badges are correct from the start)
  const fetchPendingCounts = useCallback(async () => {
    const [editRes, postRes, eventRes, mediaRes] = await Promise.all([
      supabase
        .from("contributions")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("media")
        .select("id", { count: "exact", head: true })
        .eq("state", "PENDING"),
    ]);
    setPendingCounts({
      edits: editRes.count ?? 0,
      posts: postRes.count ?? 0,
      events: eventRes.count ?? 0,
      media: mediaRes.count ?? 0,
    });
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === "edits") {
        let query = supabase
          .from("contributions")
          .select("*")
          .order("created_at", { ascending: false });
        if (filter !== "all") query = query.eq("status", filter);
        const { data, error: fetchErr } = await query;
        if (fetchErr) throw fetchErr;
        setContributions((data as Contribution[]) || []);
      } else if (activeTab === "posts") {
        // Try join with profiles first
        let query = supabase
          .from("posts")
          .select("*, author:profiles(email, display_name)")
          .order("created_at", { ascending: false });
        if (filter !== "all") {
          const postFilter = filter === "approved" ? "published" : filter;
          query = query.eq("status", postFilter);
        }
        const { data, error: fetchErr } = await query;

        if (fetchErr || !data) {
          // Fallback: fetch posts without join, then manually fetch profiles
          console.warn("Join with profiles failed, using fallback:", fetchErr);
          let simpleQuery = supabase
            .from("posts")
            .select("*")
            .order("created_at", { ascending: false });
          if (filter !== "all") {
            const postFilter = filter === "approved" ? "published" : filter;
            simpleQuery = simpleQuery.eq("status", postFilter);
          }
          const { data: simpleData, error: simpleErr } = await simpleQuery;
          if (simpleErr) throw simpleErr;

          // Fetch profiles for all unique author_ids
          const authorIds = [
            ...new Set(
              (simpleData || [])
                .map((p: Record<string, string>) => p.author_id)
                .filter(Boolean),
            ),
          ];
          const profileMap: Record<
            string,
            { email: string; display_name: string | null }
          > = {};
          if (authorIds.length > 0) {
            const { data: profiles } = await supabase
              .from("profiles")
              .select("id, email, display_name")
              .in("id", authorIds);
            for (const pr of profiles || []) {
              profileMap[
                (
                  pr as {
                    id: string;
                    email: string;
                    display_name: string | null;
                  }
                ).id
              ] = pr as { email: string; display_name: string | null };
            }
          }
          const enriched = (simpleData || []).map(
            (p: Record<string, unknown>) => ({
              ...p,
              author: profileMap[p.author_id as string] || null,
            }),
          );
          setPosts(enriched as Post[]);
        } else {
          setPosts((data as Post[]) || []);
        }
      } else if (activeTab === "events") {
        // Fetch events and join with profiles to get author name
        let query = supabase
          .from("events")
          .select("*, creator:profiles(email, display_name)")
          .order("created_at", { ascending: false });
        if (filter !== "all") {
          const eventFilter = filter === "approved" ? "published" : filter;
          query = query.eq("status", eventFilter);
        }
        const { data, error: fetchErr } = await query;
        if (fetchErr) {
          // Fallback: simple fetch without join
          let simpleQuery = supabase
            .from("events")
            .select("*")
            .order("created_at", { ascending: false });
          if (filter !== "all") {
            const eventFilter = filter === "approved" ? "published" : filter;
            simpleQuery = simpleQuery.eq("status", eventFilter);
          }
          const { data: simpleData, error: simpleErr } = await simpleQuery;
          if (simpleErr) throw simpleErr;
          setEvents((simpleData as EventItem[]) || []);
        } else {
          // Merge author_name from profile join
          const enriched = (data || []).map((e: Record<string, unknown>) => ({
            ...e,
            author_name:
              (e.creator as { display_name?: string; email?: string } | null)
                ?.display_name ||
              (
                e.creator as { display_name?: string; email?: string } | null
              )?.email?.split("@")[0] ||
              e.author_name ||
              null,
          }));
          setEvents(enriched as EventItem[]);
        }
      } else if (activeTab === "media") {
        let query = supabase
          .from("media")
          .select("*, uploader:profiles(display_name, email)")
          .order("created_at", { ascending: false });
        if (filter !== "all") {
          const mediaFilter =
            filter === "approved"
              ? "PUBLISHED"
              : filter === "pending"
                ? "PENDING"
                : "REJECTED";
          query = query.eq("state", mediaFilter);
        }
        const { data, error: fetchErr } = await query;
        if (fetchErr) throw fetchErr;
        setMedia((data as MediaItem[]) || []);
      }
      // Refresh pending counts after any action
      fetchPendingCounts();
    } catch (err: unknown) {
      console.error("Error fetching admin data:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Lỗi không xác định khi tải dữ liệu",
      );
    } finally {
      setLoading(false);
    }
  }, [activeTab, filter, fetchPendingCounts]);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      console.warn("Access denied: User is not an admin.");
      return;
    }
    if (!authLoading && isAdmin) {
      fetchPendingCounts();
      fetchData();
    }
  }, [authLoading, isAdmin, fetchData, fetchPendingCounts]);

  const handleAction = async (id: string, action: "approved" | "rejected") => {
    setProcessingId(id);
    try {
      if (activeTab === "edits") {
        await supabase
          .from("contributions")
          .update({
            status: action,
            admin_note: adminNotes[id] || null,
            reviewed_by: user?.id,
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", id);
      } else if (activeTab === "posts") {
        const postStatus = action === "approved" ? "published" : "rejected";
        await supabase
          .from("posts")
          .update({
            status: postStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);

        if (action === "approved") {
          const post = posts.find((p) => p.id === id);
          const authorName =
            post?.author?.display_name ||
            post?.author?.email?.split("@")[0] ||
            "Thành viên";
          await supabase.rpc("notify_all_users", {
            p_title: "Bảng tin mới",
            p_body: `${authorName} đã đăng bài viết mới`,
            p_type: "NEW_POST",
            p_link: "/feed",
          });
        }
      } else if (activeTab === "events") {
        const eventStatus = action === "approved" ? "published" : "rejected";
        await supabase
          .from("events")
          .update({
            status: eventStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);

        if (action === "approved") {
          const evt = events.find((e) => e.id === id);
          const authorName = evt?.author_name || "Thành viên";
          await supabase.rpc("notify_all_users", {
            p_title: "Sự kiện mới",
            p_body: `${authorName} đã thêm sự kiện mới`,
            p_type: "NEW_EVENT",
            p_link: "/events",
          });
        }
      } else if (activeTab === "media") {
        const mediaState = action === "approved" ? "PUBLISHED" : "REJECTED";
        await supabase.from("media").update({ state: mediaState }).eq("id", id);
      }
      fetchData();
    } catch (err) {
      console.error("Error updating status:", err);
    } finally {
      setProcessingId(null);
    }
  };

  const statusColors: Record<string, string> = {
    pending:
      "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
    approved:
      "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
    published:
      "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
    rejected:
      "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
  };

  const statusLabels: Record<string, string> = {
    pending: "Chờ duyệt",
    approved: "Đã duyệt",
    published: "Đã đăng",
    rejected: "Từ chối",
  };

  if (authLoading)
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <ShieldAlert className="h-6 w-6" /> Quyền truy cập bị từ chối
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">
              Tài khoản này không có quyền Quản trị viên trong hệ thống
              Database.
            </p>
            <div className="bg-white/50 dark:bg-black/20 p-4 rounded-lg text-xs font-mono space-y-1 border">
              <p>Email: {user?.email}</p>
              <p>
                Role hiện tại:{" "}
                <span className="font-bold text-red-600">{role || "null"}</span>
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Vui lòng kiểm tra lại SQL đã chạy và đảm bảo email của bạn khớp
              chính xác.
            </p>
            <Button onClick={() => router.push("/")}>Về trang chủ</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <MessageSquarePlus className="h-5 w-5" /> Kiểm duyệt nội dung
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-muted p-1 rounded-lg">
            <button
              onClick={() => {
                setActiveTab("edits");
                setFilter("pending");
              }}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                activeTab === "edits"
                  ? "bg-background shadow-sm"
                  : "hover:text-primary",
              )}
            >
              Chỉnh sửa (
              {activeTab === "edits"
                ? contributions.filter((c) => c.status === "pending").length
                : pendingCounts.edits}
              )
            </button>
            <button
              onClick={() => {
                setActiveTab("posts");
                setFilter("pending");
              }}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                activeTab === "posts"
                  ? "bg-background shadow-sm"
                  : "hover:text-primary",
              )}
            >
              Bài viết (
              {activeTab === "posts"
                ? posts.filter((p) => p.status === "pending").length
                : pendingCounts.posts}
              )
            </button>
            <button
              onClick={() => {
                setActiveTab("events");
                setFilter("pending");
              }}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                activeTab === "events"
                  ? "bg-background shadow-sm"
                  : "hover:text-primary",
              )}
            >
              Sự kiện (
              {activeTab === "events"
                ? events.filter((e) => e.status === "pending").length
                : pendingCounts.events}
              )
            </button>
            <button
              onClick={() => {
                setActiveTab("media");
                setFilter("pending");
              }}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                activeTab === "media"
                  ? "bg-background shadow-sm"
                  : "hover:text-primary",
              )}
            >
              Thư viện ảnh (
              {activeTab === "media"
                ? media.filter((m) => m.state === "PENDING").length
                : pendingCounts.media}
              )
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-b pb-2">
        <div className="flex items-center gap-1 text-xs">
          {(["pending", "approved", "rejected", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-full font-medium transition-colors",
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted",
              )}
            >
              {f === "all"
                ? "Tất cả"
                : statusLabels[
                    f === "approved" &&
                    (activeTab === "posts" ||
                      activeTab === "events" ||
                      activeTab === "media")
                      ? "published"
                      : f
                  ]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </div>
      ) : (activeTab === "edits"
          ? contributions
          : activeTab === "posts"
            ? posts
            : activeTab === "events"
              ? events
              : media
        ).length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center h-48 text-muted-foreground">
            <p className="text-sm">
              Không có nội dung nào{" "}
              {filter !== "all"
                ? `(${statusLabels[filter === "approved" && (activeTab === "posts" || activeTab === "events" || activeTab === "media") ? "published" : filter]})`
                : ""}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {activeTab === "edits" &&
            contributions.map((c) => (
              <Card
                key={c.id}
                className={cn(
                  "transition-all",
                  c.status === "pending" ? "border-amber-300 shadow-sm" : "",
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className={statusColors[c.status]}
                        >
                          {statusLabels[c.status]}
                        </Badge>
                        <span className="text-xs font-semibold">
                          {c.person_name || c.person_handle}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          → {c.field_label || c.field_name}
                        </span>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Giá trị mới:
                        </p>
                        <p className="text-sm font-medium">{c.new_value}</p>
                        {c.note && (
                          <p className="text-xs text-muted-foreground mt-2 italic">
                            📝 {c.note}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span>Từ: {c.author_email}</span>
                        <span>•</span>
                        <span>
                          {new Date(c.created_at).toLocaleString("vi-VN")}
                        </span>
                      </div>
                    </div>
                    {c.status === "pending" && (
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <Input
                          placeholder="Ghi chú..."
                          className="text-xs h-7 w-32"
                          value={adminNotes[c.id] || ""}
                          onChange={(e) =>
                            setAdminNotes((prev) => ({
                              ...prev,
                              [c.id]: e.target.value,
                            }))
                          }
                        />
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-green-600 hover:bg-green-700"
                          onClick={() => handleAction(c.id, "approved")}
                          disabled={processingId === c.id}
                        >
                          <Check className="w-3 h-3 mr-1" /> Duyệt
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs text-red-600 border-red-200"
                          onClick={() => handleAction(c.id, "rejected")}
                          disabled={processingId === c.id}
                        >
                          <X className="w-3 h-3 mr-1" /> Từ chối
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

          {activeTab === "posts" &&
            posts.map((p) => (
              <Card
                key={p.id}
                className={cn(
                  "transition-all",
                  p.status === "pending" ? "border-amber-300 shadow-sm" : "",
                )}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {p.author?.display_name ||
                            p.author?.email?.split("@")[0] ||
                            "Người dùng #" + p.author_id?.slice(0, 6)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(p.created_at).toLocaleString("vi-VN")}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className={statusColors[p.status]}>
                      {statusLabels[p.status]}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    {p.title && (
                      <h3 className="font-semibold text-sm">{p.title}</h3>
                    )}
                    <p className="text-sm text-foreground line-clamp-3 leading-relaxed whitespace-pre-wrap">
                      {p.body}
                    </p>
                  </div>

                  {/* Media Preview cho bài viết */}
                  {p.media && p.media.length > 0 && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-3 pt-2">
                      {p.media.map((m, idx) => (
                        <div
                          key={idx}
                          onClick={() => setSelectedMedia(m)}
                          className="relative aspect-square w-full rounded-md overflow-hidden bg-black/5 border cursor-pointer hover:opacity-90 transition-opacity"
                        >
                          {m.mime_type?.startsWith("image") ? (
                            <CldImage
                              src={m.public_id}
                              alt="Post media preview"
                              fill
                              className="object-cover"
                              sizes="150px"
                            />
                          ) : m.mime_type?.startsWith("video") ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                              <video
                                src={m.url}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute h-8 w-8 bg-black/50 text-white flex items-center justify-center rounded-full pointer-events-none text-xs">
                                ▶
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}

                  {p.status === "pending" && (
                    <div className="flex gap-2 justify-end pt-2 border-t mt-4">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleAction(p.id, "rejected")}
                        disabled={processingId === p.id}
                      >
                        <X className="w-3 h-3 mr-1" /> Từ chối
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 text-xs bg-green-600 hover:bg-green-700"
                        onClick={() => handleAction(p.id, "approved")}
                        disabled={processingId === p.id}
                      >
                        <Check className="w-3 h-3 mr-1" /> Duyệt & Đăng
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

          {activeTab === "events" &&
            events.map((e) => (
              <Card
                key={e.id}
                className={cn(
                  "transition-all",
                  e.status === "pending" ? "border-amber-300 shadow-sm" : "",
                )}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {e.author_name || "Ẩn danh"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(e.created_at).toLocaleString("vi-VN")}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className={statusColors[e.status]}>
                      {statusLabels[e.status] || e.status}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <Badge variant="secondary" className="text-[10px]">
                      {e.type}
                    </Badge>
                    <h3 className="font-semibold text-sm">{e.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      📍 {e.location || "Không có địa điểm"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ⏰ {new Date(e.start_at).toLocaleString("vi-VN")}
                    </p>
                    {e.description && (
                      <p className="text-sm text-foreground line-clamp-2 mt-2">
                        {e.description}
                      </p>
                    )}
                  </div>
                  {e.status === "pending" && (
                    <div className="flex gap-2 justify-end pt-2 border-t mt-4">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleAction(e.id, "rejected")}
                        disabled={processingId === e.id}
                      >
                        <X className="w-3 h-3 mr-1" /> Từ chối
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 text-xs bg-green-600 hover:bg-green-700"
                        onClick={() => handleAction(e.id, "approved")}
                        disabled={processingId === e.id}
                      >
                        <Check className="w-3 h-3 mr-1" /> Duyệt & Đăng
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

          {activeTab === "media" && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 border-none shadow-none">
              {media.map((m) => (
                <Card
                  key={m.id}
                  className={cn(
                    "transition-all overflow-hidden flex flex-col",
                    m.state === "PENDING" ? "border-amber-300 shadow-sm" : "",
                  )}
                >
                  <div
                    className="relative aspect-square w-full bg-muted border-b flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() =>
                      setSelectedMedia({
                        url: m.url || undefined,
                        public_id: m.public_id || undefined,
                        mime_type: m.mime_type || undefined,
                      })
                    }
                  >
                    {m.public_id && m.mime_type?.startsWith("image") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.url || ""}
                        alt={m.file_name}
                        className="w-full h-full object-cover"
                      />
                    ) : m.public_id && m.mime_type?.startsWith("video") ? (
                      <video
                        src={m.url || ""}
                        controls
                        className="w-full h-full object-contain bg-black"
                      />
                    ) : (
                      <ImageIcon className="h-10 w-10 text-muted-foreground/50" />
                    )}
                  </div>
                  <CardContent className="p-3 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <p
                          className="font-medium text-xs truncate"
                          title={m.file_name}
                        >
                          {m.file_name}
                        </p>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] px-1 h-4",
                            statusColors[m.state.toLowerCase()] || "",
                          )}
                        >
                          {statusLabels[m.state.toLowerCase()] || m.state}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground mb-2">
                        Từ:{" "}
                        {m.uploader?.display_name ||
                          m.uploader?.email?.split("@")[0] ||
                          "Ẩn danh"}
                      </p>
                    </div>

                    {m.state === "PENDING" && (
                      <div className="flex gap-2 justify-end pt-2 border-t mt-auto">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[10px] text-red-600 border-red-200 px-2"
                          onClick={() => handleAction(m.id, "rejected")}
                          disabled={processingId === m.id}
                        >
                          <X className="w-3 h-3 mr-1" /> Từ chối
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 text-[10px] bg-green-600 hover:bg-green-700 px-2"
                          onClick={() => handleAction(m.id, "approved")}
                          disabled={processingId === m.id}
                        >
                          <Check className="w-3 h-3 mr-1" /> Duyệt
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lightbox Modal để xem trước Media (Ảnh/Video) Full màn hình */}
      <Dialog
        open={!!selectedMedia}
        onOpenChange={(open) => !open && setSelectedMedia(null)}
      >
        <DialogContent className="max-w-4xl p-1 bg-transparent border-none shadow-none">
          <DialogHeader className="sr-only">
            <DialogTitle>View Media</DialogTitle>
          </DialogHeader>
          {selectedMedia && (
            <div className="relative w-full h-[80vh] flex flex-col items-center justify-center">
              {selectedMedia.mime_type?.startsWith("image") &&
              selectedMedia.public_id ? (
                <div className="relative w-full h-full">
                  <CldImage
                    src={selectedMedia.public_id!}
                    alt="Full size media"
                    fill
                    className="object-contain"
                    sizes="(max-width: 1200px) 100vw, 1200px"
                    unoptimized
                  />
                </div>
              ) : selectedMedia.mime_type?.startsWith("video") &&
                selectedMedia.url ? (
                <video
                  src={selectedMedia.url || ""}
                  controls
                  autoPlay
                  className="w-full h-full max-h-[80vh] object-contain bg-black rounded-xl shadow-2xl"
                />
              ) : (
                <div className="p-8 bg-card rounded-xl shadow-xl flex flex-col items-center gap-4 text-muted-foreground">
                  <ImageIcon className="h-16 w-16" />
                  <p>
                    Không thể tải khung xem trước hoặc file không đúng định
                    dạng.
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
