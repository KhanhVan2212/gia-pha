"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Newspaper,
  MessageCircle,
  Pin,
  Trash2,
  Send,
  User,
  Heart,
  Image as ImageIcon,
  X,
  Play,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Image from "next/image";
import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase";
import { CldUploadWidget, CldImage } from "next-cloudinary";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

// === Types ===
interface MediaItem {
  url: string;
  public_id: string;
  mime_type: string;
}

interface Post {
  id: string;
  author_id: string;
  author_name?: string;
  type: string;
  title: string | null;
  body: string;
  is_pinned: boolean;
  status: string;
  media: MediaItem[] | null;
  created_at: string;
  updated_at: string;
  author?: {
    email: string;
    display_name: string | null;
    role: string;
    avatar_url?: string | null;
  };
  comment_count?: number;
  like_count?: number;
  is_liked?: boolean;
}

interface Comment {
  id: string;
  author_id: string;
  author_name?: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  author?: {
    email: string;
    display_name: string | null;
    avatar_url?: string | null;
  };
}

// === Post Composer ===
function PostComposer({ onPostCreated }: { onPostCreated: () => void }) {
  const { user, profile, isLoggedIn } = useAuth();
  const [body, setBody] = useState("");
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async () => {
    if (!body.trim() || !user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("posts").insert({
        author_id: user.id,
        author_name: profile?.display_name || user.email?.split("@")[0],
        title: title.trim() || null,
        body: body.trim(),
        media: mediaList.length > 0 ? mediaList : null,
        type: "general",
        status: "published",
      });
      if (!error) {
        setBody("");
        setTitle("");
        setMediaList([]);
        setExpanded(false);
        onPostCreated();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadSuccess = (result: any) => {
    const info = result.info;
    const newItem: MediaItem = {
      url: info.secure_url,
      public_id: info.public_id,
      mime_type: info.resource_type === "video" ? `video/${info.format}` : `image/${info.format}`,
    };
    setMediaList((prev) => [...prev, newItem]);
    setExpanded(true);
  };

  if (!isLoggedIn) return null;

  return (
    <Card className="overflow-hidden border-transparent bg-muted/40 shadow-sm rounded-3xl transition-all duration-300 focus-within:bg-muted/60">
      <CardContent className="p-4 sm:p-6">
        <div className="flex gap-3 sm:gap-4">
          <div className="h-10 w-10 shrink-0 rounded-2xl bg-primary/10 flex items-center justify-center overflow-hidden relative border border-primary/5">
            {profile?.avatar_url ? (
              <Image src={profile.avatar_url} alt="Avatar" fill className="object-cover" unoptimized />
            ) : (
              <User className="h-5 w-5 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0 space-y-3">
            {expanded && (
              <Input
                placeholder="Tiêu đề (tùy chọn)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="border-0 bg-background/50 h-10 rounded-xl focus-visible:ring-1 ring-primary/20 placeholder:text-muted-foreground/50"
              />
            )}
            <Textarea
              placeholder="Bạn muốn chia sẻ điều gì với dòng họ?"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onFocus={() => setExpanded(true)}
              className="resize-none border-0 bg-background/50 p-3 sm:p-4 rounded-xl focus-visible:ring-1 ring-primary/20 min-h-[80px] text-sm sm:text-base"
              rows={expanded ? 4 : 2}
            />

            {mediaList.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {mediaList.map((m, idx) => (
                  <div key={idx} className="relative group h-16 w-16 sm:h-20 sm:w-20 rounded-xl overflow-hidden ring-1 ring-black/5">
                    {m.mime_type.startsWith("image") ? (
                      <CldImage src={m.public_id} alt="Preview" fill className="object-cover" />
                    ) : (
                      <div className="h-full w-full bg-black/10 flex items-center justify-center"><Play className="h-5 w-5 text-primary" /></div>
                    )}
                    <button
                      onClick={() => setMediaList(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {expanded && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                <CldUploadWidget
                  signatureEndpoint="/api/cloudinary/sign"
                  onSuccess={handleUploadSuccess}
                  onUploadAdded={() => setUploading(true)}
                  onQueuesEnd={() => setUploading(false)}
                  options={{ sources: ["local", "url", "camera"], multiple: true, maxFiles: 10 }}
                >
                  {({ open }) => (
                    <Button variant="ghost" size="sm" onClick={() => open()} disabled={uploading} className="rounded-full justify-start sm:justify-center">
                      <ImageIcon className="h-4 w-4 mr-2 text-primary" />
                      Thêm ảnh/video
                    </Button>
                  )}
                </CldUploadWidget>

                <div className="flex gap-2 ml-auto">
                  <Button variant="ghost" size="sm" onClick={() => { setExpanded(false); setMediaList([]); }} className="rounded-full">Hủy</Button>
                  <Button size="sm" onClick={handleSubmit} disabled={!body.trim() || submitting || uploading} className="rounded-full px-6 shadow-md shadow-primary/10">
                    <Send className="mr-2 h-4 w-4" />
                    {submitting ? "Đang gửi..." : "Đăng bài"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// === Comment Section ===
function CommentSection({ postId }: { postId: string }) {
  const { user, isLoggedIn, profile } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const { data: commentsData } = await supabase.from("comments").select("*").eq("post_id", postId).order("created_at", { ascending: true });
      if (!commentsData) return;

      const authorIds = [...new Set(commentsData.map((c) => c.author_id).filter(Boolean))];
      let profileMap: Record<string, any> = {};

      if (authorIds.length > 0) {
        const { data: profilesData } = await supabase.from("profiles").select("id, email, display_name, avatar_url").in("id", authorIds);
        profilesData?.forEach((p) => (profileMap[p.id] = p));
      }

      const merged = commentsData.map((c) => ({ ...c, author: profileMap[c.author_id] }));
      setComments(merged as Comment[]);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  const handleSubmit = async () => {
    if (!newComment.trim() || !user) return;
    const { error } = await supabase.from("comments").insert({
      post_id: postId,
      author_id: user.id,
      author_name: profile?.display_name || user.email?.split("@")[0],
      content: newComment.trim(),
    });
    if (!error) { setNewComment(""); fetchComments(); }
  };

  return (
    <div className="pt-4 mt-4 border-t border-muted-foreground/10 space-y-4">
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full rounded-2xl" />
          <Skeleton className="h-12 w-3/4 rounded-2xl" />
        </div>
      ) : (
        <div className="max-h-[400px] overflow-y-auto pr-2 space-y-4 custom-scrollbar">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3 group">
              <div className="h-8 w-8 rounded-xl bg-primary/5 shrink-0 relative overflow-hidden border border-black/5 mt-1">
                {c.author?.avatar_url ? (
                  <Image src={c.author.avatar_url} alt="Avt" fill className="object-cover" unoptimized />
                ) : (
                  <div className="flex items-center justify-center h-full w-full text-primary/40"><User className="h-4 w-4" /></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="bg-muted/30 p-3 rounded-2xl rounded-tl-none inline-block max-w-full">
                  <p className="text-[11px] font-bold text-primary mb-0.5 truncate">
                    {c.author_name || c.author?.display_name || "Thành viên"}
                  </p>
                  <p className="text-sm leading-relaxed break-words">{c.content}</p>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 ml-1 opacity-70">
                  {new Date(c.created_at).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
      {isLoggedIn && (
        <div className="flex gap-2 pt-2 items-center">
          <Input
            placeholder="Viết bình luận..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            className="rounded-full bg-muted/50 border-0 focus-visible:ring-1 ring-primary/30 h-10 text-sm"
          />
          <Button size="icon" onClick={handleSubmit} disabled={!newComment.trim()} className="rounded-full shrink-0 h-10 w-10 shadow-sm">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

// === Post Card ===
function PostCard({ post, onRefresh, onMediaClick }: { post: Post; onRefresh: () => void; onMediaClick: (m: MediaItem) => void }) {
  const { user, isAdmin, isLoggedIn } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [isLiked, setIsLiked] = useState(post.is_liked || false);
  const [likeCount, setLikeCount] = useState(post.like_count || 0);
  const [isLiking, setIsLiking] = useState(false);

  useEffect(() => {
    setIsLiked(post.is_liked || false);
    setLikeCount(post.like_count || 0);
  }, [post.is_liked, post.like_count]);

  const handleDelete = async () => {
    if (!confirm("Bạn có chắc xoá bài viết này không?")) return;
    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    if (!error) onRefresh();
  };

  const handleTogglePin = async () => {
    const { error } = await supabase.from("posts").update({ is_pinned: !post.is_pinned }).eq("id", post.id);
    if (!error) onRefresh();
  };

  const handleToggleLike = async () => {
    if (!isLoggedIn || !user || isLiking) return;
    setIsLiking(true);
    const newStatus = !isLiked;
    setIsLiked(newStatus);
    setLikeCount(prev => newStatus ? prev + 1 : Math.max(0, prev - 1));

    try {
      if (newStatus) {
        await supabase.from("post_likes").insert({ post_id: post.id, user_id: user.id });
      } else {
        await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
      }
    } catch {
      setIsLiked(!newStatus);
    } finally {
      setIsLiking(false);
    }
  };

  return (
    <Card className={cn(
      "border-transparent bg-muted/50 rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-lg",
      post.is_pinned && "ring-2 ring-primary/20 bg-primary/5 shadow-sm"
    )}>
      <CardHeader className="p-4 sm:p-5 pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-primary/10 flex items-center justify-center overflow-hidden relative shrink-0 border border-primary/5">
              {post.author?.avatar_url ? (
                <Image src={post.author.avatar_url} alt="Avatar" fill className="object-cover" unoptimized />
              ) : (
                <User className="h-6 w-6 text-primary" />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-foreground leading-tight truncate">
                {post.author_name || post.author?.display_name || "Thành viên"}
              </p>
              <p className="text-[11px] sm:text-[12px] text-muted-foreground mt-0.5">
                {new Date(post.created_at).toLocaleDateString("vi-VN", { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            {isAdmin && (
              <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 rounded-full" onClick={handleTogglePin}>
                <Pin className={cn("h-4 w-4", post.is_pinned && "text-primary fill-primary")} />
              </Button>
            )}
            {(isAdmin || user?.id === post.author_id) && (
              <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 rounded-full hover:text-destructive hover:bg-destructive/10" onClick={handleDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-5 pt-0">
        {post.is_pinned && <Badge className="mb-3 bg-primary/10 text-primary border-0 rounded-full text-[10px] px-2 py-0">📌 GHIM</Badge>}
        {post.title && <h3 className="text-base sm:text-lg font-extrabold mb-2 leading-tight break-words">{post.title}</h3>}
        <p className="text-[14px] sm:text-[15px] whitespace-pre-wrap text-foreground/80 leading-relaxed mb-4 break-words">{post.body}</p>
        
        {post.media && post.media.length > 0 && (
          <div className={cn("grid gap-1.5 sm:gap-2 rounded-2xl overflow-hidden border border-black/5", 
            post.media.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
            {post.media.slice(0, 4).map((m, i) => (
              <div 
                key={i} 
                className={cn("relative bg-muted cursor-pointer aspect-square overflow-hidden", post.media?.length === 1 && "aspect-video")}
                onClick={() => onMediaClick(m)}
              >
                {m.mime_type.startsWith("image") ? (
                  <CldImage src={m.public_id} alt="Content" fill className="object-cover hover:scale-110 transition-transform duration-700 ease-out" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-black/10">
                    <video src={m.url} className="w-full h-full object-cover opacity-50" />
                    <Play className="absolute h-10 w-10 text-white drop-shadow-lg" />
                  </div>
                )}
                {post.media!.length > 4 && i === 3 && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-xl backdrop-blur-[2px]">+{post.media!.length - 4}</div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 sm:gap-4 mt-5 pt-4 border-t border-muted-foreground/10">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleToggleLike} 
            className={cn("rounded-xl flex-1 h-10 transition-all", isLiked ? "text-rose-600 bg-rose-50 hover:bg-rose-100" : "text-muted-foreground")}
          >
            <Heart className={cn("mr-2 h-4 w-4 sm:h-5 sm:w-5 transition-transform", isLiked && "fill-current scale-110")} />
            <span className="text-xs sm:text-sm">{likeCount || ""} Thích</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowComments(!showComments)} 
            className={cn("rounded-xl flex-1 h-10 transition-all text-muted-foreground", showComments && "bg-primary/5 text-primary")}
          >
            <MessageCircle className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-xs sm:text-sm">{post.comment_count || ""} Bình luận</span>
          </Button>
        </div>

        {showComments && <CommentSection postId={post.id} />}
      </CardContent>
    </Card>
  );
}

// === Main Feed Page ===
export default function FeedPage() {
  const { user, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const { data: postsData } = await supabase.from("posts").select("*").eq("status", "published").order("is_pinned", { ascending: false }).order("created_at", { ascending: false });
      if (!postsData || postsData.length === 0) { setPosts([]); return; }

      const postIds = postsData.map((p) => p.id);
      const authorIds = [...new Set(postsData.map((p) => p.author_id).filter(Boolean))];

      const [profilesRes, commentsRes, likesRes] = await Promise.all([
        authorIds.length > 0 ? supabase.from("profiles").select("id, email, display_name, role, avatar_url").in("id", authorIds) : Promise.resolve({ data: [] }),
        supabase.from("comments").select("post_id").in("post_id", postIds),
        supabase.from("post_likes").select("post_id, user_id").in("post_id", postIds),
      ]);

      const profileMap: Record<string, any> = {};
      profilesRes.data?.forEach((p: any) => (profileMap[p.id] = p));

      const countMap: Record<string, number> = {};
      commentsRes.data?.forEach((c: any) => (countMap[c.post_id] = (countMap[c.post_id] || 0) + 1));

      const likeCountMap: Record<string, number> = {};
      const userLikedSet = new Set<string>();
      likesRes.data?.forEach((l: any) => {
        likeCountMap[l.post_id] = (likeCountMap[l.post_id] || 0) + 1;
        if (user && l.user_id === user.id) userLikedSet.add(l.post_id);
      });

      const merged: Post[] = postsData.map((p) => ({
        ...p,
        author: profileMap[p.author_id],
        comment_count: countMap[p.id] || 0,
        like_count: likeCountMap[p.id] || 0,
        is_liked: userLikedSet.has(p.id),
      }));

      setPosts(merged);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { if (!authLoading) fetchPosts(); }, [fetchPosts, authLoading]);

  return (
    <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8 pb-20 px-4">
      {/* Header đồng bộ Home */}
      <div className="relative overflow-hidden rounded-[2rem] bg-linear-to-br from-primary/10 via-primary/5 to-transparent p-6 sm:p-10 border border-primary/10 shadow-sm mt-4 sm:mt-6">
        <div className="relative z-10">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <Newspaper className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
            Bảng tin nội bộ
          </h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base max-w-md">Kết nối tình cảm gia đình, chia sẻ những khoảnh khắc và thông báo quan trọng của dòng tộc.</p>
        </div>
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 sm:w-64 sm:h-64 bg-primary/15 rounded-full blur-3xl pointer-events-none opacity-60" />
      </div>

      <PostComposer onPostCreated={fetchPosts} />

      {loading ? (
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-muted/20 p-6 rounded-3xl space-y-4">
               <div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-xl" /><div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-20" /></div></div>
               <Skeleton className="h-32 w-full rounded-2xl" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20 bg-muted/10 rounded-3xl border-2 border-dashed border-muted/30">
          <Newspaper className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-muted-foreground">Chưa có bài viết</h3>
          <p className="text-sm text-muted-foreground/60">Hãy là người đầu tiên chia sẻ kỷ niệm tại đây.</p>
        </div>
      ) : (
        <div className="space-y-6 sm:space-y-8">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onRefresh={fetchPosts} onMediaClick={setSelectedMedia} />
          ))}
        </div>
      )}

      {/* Lightbox Modal logic an toàn */}
      <Dialog open={!!selectedMedia} onOpenChange={() => setSelectedMedia(null)}>
        <DialogContent className="max-w-5xl p-0 bg-black/95 border-none shadow-none rounded-2xl sm:rounded-3xl overflow-hidden h-[auto] sm:h-[90vh]">
          <DialogHeader className="sr-only"><DialogTitle>Xem ảnh/video</DialogTitle></DialogHeader>
          {selectedMedia && (
            <div className="relative w-full h-full flex flex-col items-center justify-center p-2">
              <button 
                onClick={() => setSelectedMedia(null)}
                className="absolute top-4 right-4 z-50 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
              {selectedMedia.mime_type?.startsWith("image") ? (
                <div className="relative w-full h-full min-h-[300px]">
                   <CldImage src={selectedMedia.public_id} alt="Full" fill className="object-contain" unoptimized />
                </div>
              ) : (
                <video src={selectedMedia.url} controls autoPlay className="max-h-full w-full rounded-xl shadow-2xl" />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}