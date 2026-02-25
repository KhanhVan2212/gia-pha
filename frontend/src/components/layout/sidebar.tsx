"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  TreePine,
  Users,
  Image as ImageIcon,
  Shield,
  FileText,
  Database,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  ClipboardCheck,
  Contact,
  Newspaper,
  CalendarDays,
  X,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/components/auth-provider";

const navItems = [
  { href: "/", label: "Trang chủ", icon: Home },
  { href: "/feed", label: "Bảng tin", icon: Newspaper },
  { href: "/directory", label: "Danh bạ", icon: Contact },
  { href: "/events", label: "Sự kiện", icon: CalendarDays },
  { href: "/tree", label: "Cây gia phả", icon: TreePine },
  { href: "/book", label: "Sách gia phả", icon: BookOpen },
  { href: "/people", label: "Thành viên", icon: Users },
  { href: "/media", label: "Thư viện", icon: ImageIcon },
];

const adminItems = [
  { href: "/admin/people", label: "Quản lý gia phả", icon: Users },
  { href: "/admin/users", label: "Quản lý người dùng", icon: Shield },
  { href: "/admin/edits", label: "Kiểm duyệt", icon: ClipboardCheck },
  { href: "/admin/audit", label: "Lịch sử hoạt động", icon: FileText },
  { href: "/admin/backup", label: "Sao lưu", icon: Database },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(true);
  const { isAdmin } = useAuth();

  useEffect(() => {
    if (window.innerWidth >= 1024) {
      setCollapsed(false);
    }
  }, []);

  const toggle = useCallback(() => setCollapsed((v) => !v), []);
  const closeSidebar = useCallback(() => setCollapsed(true), []);

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        className={cn(
          "lg:hidden fixed top-4 left-4 z-[60] flex items-center justify-center h-10 w-10 rounded-xl border shadow-md transition-all duration-300",
          "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800",
          !collapsed
            ? "opacity-0 pointer-events-none scale-75"
            : "opacity-100 scale-100",
        )}
        onClick={toggle}
      >
        <Menu className="h-5 w-5 text-slate-600 dark:text-slate-400" />
      </button>

      {/* Backdrop */}
      {!collapsed && (
        <div
          className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-300"
          onClick={closeSidebar}
        />
      )}

      <aside
        className={cn(
          "flex flex-col border-r transition-all duration-300 h-screen sticky top-0 z-50",
          "bg-background/80 backdrop-blur-xl border-slate-200 dark:border-slate-800",
          collapsed ? "w-0 md:w-20" : "w-full md:w-72",
          collapsed
            ? "-translate-x-full md:translate-x-0 overflow-hidden"
            : "fixed inset-y-0 left-0 translate-x-0 md:sticky",
        )}
      >
        {/* Logo Section */}
        <div
          className={cn(
            "flex items-center py-5 border-b border-slate-100 dark:border-slate-800",
            collapsed ? "justify-center px-0" : "justify-between px-6",
          )}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-2 bg-primary/10 dark:bg-primary/20 rounded-xl shrink-0">
              <TreePine className="h-6 w-6 text-primary" />
            </div>
            <span
              className={cn(
                "font-extrabold text-lg whitespace-nowrap transition-all duration-300 bg-linear-to-r from-primary to-emerald-600 dark:from-emerald-400 dark:to-cyan-400 bg-clip-text text-transparent",
                collapsed ? "md:opacity-0 md:w-0" : "opacity-100 w-auto",
              )}
            >
              Gia phả họ Nguyễn
            </span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={closeSidebar}
          >
            <X className="h-5 w-5 text-slate-500 dark:text-slate-400" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto custom-scrollbar">
          <div
            className={cn(
              "mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 transition-opacity",
              collapsed ? "opacity-0" : "opacity-100",
            )}
          >
            Menu chính
          </div>

          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <NavItem
                key={item.href}
                item={item}
                isActive={isActive}
                collapsed={collapsed}
                onClick={closeSidebar}
              />
            );
          })}

          {isAdmin && (
            <div className="pt-6">
              <div
                className={cn(
                  "mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-rose-400 dark:text-rose-500 transition-opacity",
                  collapsed ? "opacity-0" : "opacity-100",
                )}
              >
                Quản trị viên
              </div>
              <div className="space-y-1.5">
                {adminItems.map((item) => (
                  <NavItem
                    key={item.href}
                    item={item}
                    isActive={pathname.startsWith(item.href)}
                    collapsed={collapsed}
                    onClick={closeSidebar}
                    variant="admin"
                  />
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* Collapse toggle */}
        <div className="border-t border-slate-100 dark:border-slate-800 p-4 hidden lg:block">
          <Button
            variant="ghost"
            className={cn(
              "w-full h-11 transition-all duration-300 rounded-xl justify-start px-3 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary dark:hover:text-primary",
              collapsed && "justify-center px-0",
            )}
            onClick={toggle}
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <>
                <ChevronLeft className="h-5 w-5 shrink-0" />
                <span className="ml-3 font-medium text-sm">Thu gọn menu</span>
              </>
            )}
          </Button>
        </div>
      </aside>
    </>
  );
}

function NavItem({
  item,
  isActive,
  collapsed,
  onClick,
  variant = "default",
}: any) {
  return (
    <Link
      href={item.href}
      onClick={() => {
        if (window.innerWidth < 1024) onClick();
      }}
    >
      <span
        className={cn(
          "group relative flex items-center h-11 rounded-xl px-3 transition-all duration-300 cursor-pointer overflow-hidden",
          isActive
            ? variant === "admin"
              ? "bg-rose-50 dark:bg-rose-500/20 text-rose-600 dark:text-white shadow-sm"
              : "bg-primary/10 dark:bg-primary/20 text-primary dark:text-white shadow-sm"
            : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100",
          collapsed && "justify-center px-0",
        )}
      >
        {isActive && (
          <div
            className={cn(
              "absolute left-0 w-1 h-6 rounded-r-full",
              variant === "admin" ? "bg-rose-500" : "bg-primary",
            )}
          />
        )}

        <item.icon
          className={cn(
            "h-5 w-5 shrink-0 transition-transform duration-300 group-hover:scale-110",
            isActive &&
              (variant === "admin"
                ? "scale-110 text-rose-600 dark:text-white"
                : "scale-110 text-primary dark:text-white"),
            !isActive && "text-slate-500 dark:text-slate-400",
          )}
        />

        <span
          className={cn(
            "ml-3 font-semibold text-sm transition-all duration-300 whitespace-nowrap",
            collapsed ? "md:opacity-0 md:w-0" : "opacity-100 w-auto",
          )}
        >
          {item.label}
        </span>

        {collapsed && (
          <div className="absolute left-16 bg-slate-900 dark:bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity hidden lg:block whitespace-nowrap z-[100] border border-slate-700">
            {item.label}
          </div>
        )}
      </span>
    </Link>
  );
}
