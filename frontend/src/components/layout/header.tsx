"use client";

import { Moon, Sun, LogOut, User, LogIn, Bell } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationBell } from "@/components/notification-bell";
import { useAuth } from "@/components/auth-provider";
import { cn } from "@/lib/utils";

const PAGE_TITLES: Record<string, string> = {
  "/": "Tổng quan hệ thống",
  "/feed": "Bảng tin dòng tộc",
  "/directory": "Danh bạ thành viên",
  "/events": "Sự kiện & Giỗ chạp",
  "/tree": "Cây gia phả số",
  "/book": "Sách gia phả điện tử",
  "/people": "Danh sách thành viên",
  "/media": "Thư viện tư liệu",
  "/admin/people": "Quản trị Gia phả",
  "/admin/users": "Quản lý người dùng",
};

export function Header() {
  const { theme, setTheme } = useTheme();
  const { isLoggedIn, profile, isAdmin, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const currentPageTitle = PAGE_TITLES[pathname] || "Thông tin chi tiết";

  const initials = profile?.display_name
    ? profile.display_name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : profile?.email?.slice(0, 2).toUpperCase() || "?";

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-40 flex h-[70px] sm:h-[81px] items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-background/80 backdrop-blur-md px-4 lg:px-8 transition-all">
      {/* --- Left side --- */}
      <div className="flex items-center gap-4">
        <div className="w-10 lg:hidden" />
        <div className="flex flex-col">
          <h1 className="text-sm lg:text-base font-bold text-slate-900 dark:text-slate-100 leading-none">
            {currentPageTitle}
          </h1>
          <p className="text-[10px] lg:text-xs text-slate-400 dark:text-slate-500 font-medium mt-1 uppercase tracking-wider hidden sm:block">
            Gia phả họ Nguyễn
          </p>
        </div>
      </div>

      {/* --- Right side --- */}
      <div className="flex items-center gap-1.5 lg:gap-3">
        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 lg:h-10 lg:w-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500 dark:text-slate-400"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="h-[1.1rem] w-[1.1rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.1rem] w-[1.1rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Chuyển đổi giao diện</span>
        </Button>

        {/* Notifications */}
        <div className="relative group">
          <NotificationBell />
        </div>

        <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1 lg:mx-2 hidden sm:block" />

        {isLoggedIn ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-9 lg:h-11 px-1.5 lg:px-2 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-2"
              >
                <Avatar className="h-7 w-7 lg:h-8 lg:w-8 rounded-xl border border-slate-200 dark:border-slate-700">
                  {profile?.avatar_url ? (
                    <div className="relative w-full h-full">
                      <Image
                        src={profile.avatar_url}
                        alt="Avatar"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <AvatarFallback className="bg-primary/10 dark:bg-primary/20 text-primary text-[10px] font-bold">
                      {initials}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="hidden md:flex flex-col items-start pr-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-tight">
                    {profile?.display_name?.split(" ").pop() || "Thành viên"}
                  </span>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-tighter">
                    Tài khoản
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              className="w-64 mt-2 p-2 rounded-[20px] shadow-2xl bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-2"
              align="end"
            >
              <DropdownMenuLabel className="font-normal p-3">
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 rounded-xl border border-slate-200 dark:border-slate-700">
                      <AvatarFallback className="bg-primary text-white font-bold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <p className="text-sm font-bold leading-none text-slate-900 dark:text-slate-100">
                        {profile?.display_name || "Thành viên"}
                      </p>
                      <p className="text-xs leading-none text-slate-400 dark:text-slate-500 mt-1.5 truncate max-w-[140px]">
                        {profile?.email}
                      </p>
                    </div>
                  </div>
                  {isAdmin && (
                    <span className="text-[9px] font-bold text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-lg px-2 py-0.5 w-fit uppercase tracking-wider">
                      Quản trị viên
                    </span>
                  )}
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />

              <div className="p-1">
                <DropdownMenuItem
                  onClick={() => router.push("/profile")}
                  className="rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary-foreground hover:bg-primary/5 dark:hover:bg-primary/20 cursor-pointer transition-colors"
                >
                  <User className="mr-3 h-4 w-4" />
                  Hồ sơ cá nhân
                </DropdownMenuItem>
              </div>

              <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />

              <div className="p-1">
                <DropdownMenuItem
                  className="rounded-xl px-3 py-2.5 text-sm font-medium text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/20 cursor-pointer transition-colors"
                  onClick={handleSignOut}
                >
                  <LogOut className="mr-3 h-4 w-4" />
                  Đăng xuất hệ thống
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            variant="default"
            size="sm"
            className="rounded-xl px-5 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 h-9 lg:h-10 transition-all font-semibold"
            onClick={() => router.push("/login")}
          >
            <LogIn className="h-4 w-4 mr-2" /> Đăng nhập
          </Button>
        )}
      </div>
    </header>
  );
}
