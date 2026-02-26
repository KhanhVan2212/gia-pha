"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  ImageIcon,
  Upload,
  Loader2,
  Play,
  Maximize2,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  User as UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase";
import { CldUploadWidget, CldImage } from "next-cloudinary";
import { cn } from "@/lib/utils";

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

const STATE_CONFIG: Record<
  string,
  { variant: string; label: string; icon: any; color: string }
> = {
  PENDING: {
    variant: "secondary",
    label: "Chờ duyệt",
    icon: Clock,
    color: "text-amber-600 bg-amber-50",
  },
  PUBLISHED: {
    variant: "default",
    label: "Đã duyệt",
    icon: CheckCircle2,
    color: "text-emerald-600 bg-emerald-50",
  },
  REJECTED: {
    variant: "destructive",
    label: "Từ chối",
    icon: XCircle,
    color: "text-rose-600 bg-rose-50",
  },
};

export default function MediaLibraryPage() {
  const { user, isAdmin, isLoggedIn } = useAuth();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("media")
      .select("*, uploader:profiles(display_name, email)")
      .eq("state", "PUBLISHED")
      .order("created_at", { ascending: false });

    if (data) setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  const handleUploadSuccess = async (result: any) => {
    if (!user) return;
    setUploading(true);
    try {
      const info = result.info;
      const { error } = await supabase.from("media").insert({
        file_name: info.original_filename + "." + info.format,
        mime_type:
          info.resource_type === "video"
            ? "video/" + info.format
            : "image/" + info.format,
        file_size: info.bytes,
        url: info.secure_url,
        public_id: info.public_id,
        width: info.width,
        height: info.height,
        state: "PENDING",
        uploader_id: user.id,
      });

      if (error) {
        toast.error("Lưu thất bại: " + error.message);
      } else {
        toast.success(
          "Tải lên thành công! Hình ảnh của bạn đang chờ quản trị viên phê duyệt.",
        );
      }
    } finally {
      setUploading(false);
    }
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "0 KB";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className="space-y-8 pb-10">
      {/* --- Header Section --- */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-primary/10 via-background to-transparent p-6 md:p-10 border border-primary/10 shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center rounded-full px-3 py-1 text-xs md:text-sm font-medium text-primary bg-primary/10 mb-2">
              <ImageIcon className="h-4 w-4 mr-2" /> Kho tư liệu dòng họ
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              Thư viện <span className="text-primary">Hình ảnh</span>
            </h1>
            <p className="text-muted-foreground max-w-xl text-sm md:text-base">
              Nơi lưu trữ những khoảnh khắc, thước phim và tài liệu quý giá của
              các thế hệ trong gia đình.
            </p>
          </div>

          {isLoggedIn && (
            <CldUploadWidget
              signatureEndpoint="/api/cloudinary/sign"
              onSuccess={handleUploadSuccess}
              options={{
                sources: ["local", "url", "camera"],
                multiple: true,
                maxFiles: 5,
              }}
            >
              {({ open }) => (
                <Button
                  onClick={() => open()}
                  disabled={uploading}
                  className="rounded-2xl h-12 px-6 shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
                >
                  {uploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Tải lên tư liệu
                </Button>
              )}
            </CldUploadWidget>
          )}
        </div>
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-primary/10 rounded-full blur-3xl opacity-50 pointer-events-none" />
      </div>

      {/* --- Media Grid --- */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Card
              key={i}
              className="aspect-square rounded-3xl animate-pulse bg-muted"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-muted/30 rounded-3xl border-2 border-dashed border-muted">
          <div className="p-4 bg-background rounded-full mb-4 shadow-sm">
            <ImageIcon className="h-10 w-10 text-muted-foreground opacity-20" />
          </div>
          <p className="text-muted-foreground font-medium">
            Chưa có hình ảnh hay video nào được đăng tải
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Hãy là người đầu tiên chia sẻ khoảnh khắc gia đình
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {items.map((item) => (
            <Card
              key={item.id}
              className="group relative overflow-hidden rounded-3xl border-muted transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-card"
            >
              {/* Media Preview */}
              <div
                className="relative aspect-square overflow-hidden bg-muted cursor-zoom-in"
                onClick={() => setSelectedItem(item)}
              >
                {item.public_id && item.mime_type?.startsWith("image") ? (
                  <CldImage
                    src={item.public_id}
                    alt={item.title || "Genealogy Media"}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                ) : item.mime_type?.startsWith("video") ? (
                  <div className="relative h-full w-full bg-slate-900 flex items-center justify-center">
                    <video
                      src={item.url || ""}
                      className="h-full w-full object-cover opacity-60"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Play className="h-5 w-5 text-white fill-white" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-muted/50">
                    <ImageIcon className="h-10 w-10 text-muted-foreground/30" />
                  </div>
                )}

                {/* Overlay Action */}
                <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                  <span className="text-white text-xs font-medium flex items-center gap-1">
                    <Maximize2 className="h-3 w-3" /> Xem chi tiết
                  </span>
                </div>
              </div>

              {/* Media Info */}
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    {formatSize(item.file_size)}
                  </span>
                  {item.state !== "PUBLISHED" && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] rounded-full border-none",
                        STATE_CONFIG[item.state]?.color,
                      )}
                    >
                      {STATE_CONFIG[item.state]?.label}
                    </Badge>
                  )}
                </div>

                <div className="space-y-2 pt-2 border-t border-muted/50">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <UserIcon className="h-3 w-3" />
                    <span className="text-xs truncate font-medium">
                      {item.uploader?.display_name || "Thành viên gia đình"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span className="text-[11px]">
                      {new Date(item.created_at).toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* --- Fullscreen Dialog --- */}
      <Dialog
        open={!!selectedItem}
        onOpenChange={(open) => !open && setSelectedItem(null)}
      >
        <DialogContent className="max-w-5xl p-0 bg-transparent border-none shadow-none flex items-center justify-center overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>{selectedItem?.file_name}</DialogTitle>
          </DialogHeader>

          {selectedItem && (
            <div className="relative w-full h-[85vh] flex flex-col items-center justify-center group">
              {selectedItem.mime_type?.startsWith("image") ? (
                <div className="relative w-full h-full">
                  <CldImage
                    src={selectedItem.public_id!}
                    alt="Full View"
                    fill
                    className="object-contain"
                    priority
                    sizes="100vw"
                  />
                </div>
              ) : (
                <video
                  src={selectedItem.url || ""}
                  controls
                  autoPlay
                  className="w-full h-full max-h-[80vh] object-contain rounded-2xl shadow-2xl bg-black"
                />
              )}

              {/* Image Info Panel in Dialog */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-2xl text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <p className="text-sm font-semibold">
                  {selectedItem.title || selectedItem.file_name}
                </p>
                <p className="text-[10px] text-white/60">
                  Đăng bởi {selectedItem.uploader?.display_name} •{" "}
                  {new Date(selectedItem.created_at).toLocaleDateString(
                    "vi-VN",
                  )}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
