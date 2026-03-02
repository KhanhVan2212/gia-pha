"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { Loader2, ShieldAlert } from "lucide-react";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isMember, signOut } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  // If still loading auth state, or if we need to redirect, show a spinner
  if (loading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // If authenticated but NOT a member (e.g. viewer, guest), block access
  if (user && !isMember) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
          <ShieldAlert className="h-10 w-10 text-destructive" />
        </div>
        <h1 className="mt-6 text-2xl font-bold tracking-tight">
          Quyền truy cập bị từ chối
        </h1>
        <p className="mt-2 text-muted-foreground max-w-md mx-auto">
          Tài khoản của bạn đang chờ phê duyệt hoặc không có quyền Thành viên
          (Member) để xem nội dung gia phả. Vui lòng liên hệ Quản trị viên.
        </p>
        <button
          onClick={async () => {
            await signOut();
            router.push("/login");
          }}
          className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          Đăng xuất
        </button>
      </div>
    );
  }

  // If authenticated and isMember, render children
  return <>{children}</>;
}
