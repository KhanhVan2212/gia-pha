"use client";

import { useEffect, useState, useCallback } from "react";
import { Check, X, MessageSquarePlus, User, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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

export default function AdminEditsPage() {
  const { isAdmin, loading: authLoading, user, profile, role } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"edits" | "posts" | "events">(
    "edits",
  );
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("pending");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  // Pending counts — fetched once on mount so all tabs show correct numbers immediately
  const [pendingCounts, setPendingCounts] = useState({
    edits: 0,
    posts: 0,
    events: 0,
  });

  // Fetch pending counts for ALL tabs at once (so badges are correct from the start)
  const fetchPendingCounts = useCallback(async () => {
    const [editRes, postRes, eventRes] = await Promise.all([
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
    ]);
    setPendingCounts({
      edits: editRes.count ?? 0,
      posts: postRes.count ?? 0,
      events: eventRes.count ?? 0,
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
      } else if (activeTab === "events") {
        const eventStatus = action === "approved" ? "published" : "rejected";
        await supabase
          .from("events")
          .update({
            status: eventStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);
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
                    (activeTab === "posts" || activeTab === "events")
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
            : events
        ).length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center h-48 text-muted-foreground">
            <p className="text-sm">
              Không có nội dung nào{" "}
              {filter !== "all"
                ? `(${statusLabels[filter === "approved" && (activeTab === "posts" || activeTab === "events") ? "published" : filter]})`
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
        </div>
      )}
    </div>
  );
}
