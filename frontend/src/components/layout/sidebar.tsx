"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  TreePine,
  Users,
  Image,
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
  { href: "/media", label: "Thư viện", icon: Image },
];

const adminItems = [
  { href: "/admin/people", label: "Quản lý Gia phả", icon: Users },
  { href: "/admin/users", label: "Quản lý Users", icon: Shield },
  { href: "/admin/edits", label: "Kiểm duyệt", icon: ClipboardCheck },
  { href: "/admin/audit", label: "Audit Log", icon: FileText },
  { href: "/admin/backup", label: "Backup", icon: Database },
];

export function Sidebar() {
  const pathname = usePathname();
  // Default to collapsed for all screen sizes, will expand on mount if desktop
  const [collapsed, setCollapsed] = useState(true);
  const { isAdmin } = useAuth();

  useEffect(() => {
    // Expand by default on tablet/desktop (>= 768px)
    if (window.innerWidth >= 768) {
      setCollapsed(false);
    }
  }, []);

  const toggle = useCallback(() => setCollapsed((v) => !v), []);
  const closeIfMobile = useCallback(() => {
    // Only auto-close on mobile (< 768px)
    if (window.innerWidth < 768) {
      setCollapsed(true);
    }
  }, []);

  return (
    <>
      {/* Mobile Toggle Trigger (only visible when sidebar is closed on mobile) */}
      <div
        className={cn(
          "md:hidden fixed bottom-6 left-6 z-60 transition-all duration-300",
          !collapsed
            ? "opacity-0 pointer-events-none scale-0"
            : "opacity-100 scale-100",
        )}
      >
        <Button
          variant="default"
          size="icon"
          className="h-12 w-12 rounded-full shadow-2xl bg-primary hover:bg-primary/90"
          onClick={toggle}
        >
          <ChevronRight className="h-6 w-6" />
        </Button>
      </div>

      <aside
        className={cn(
          "flex flex-col border-r bg-card transition-all duration-300 h-screen sticky top-0",
          // Desktop behavior
          collapsed ? "md:w-16" : "md:w-64",
          // Mobile behavior: hidden when collapsed, full screen when open
          collapsed
            ? "w-0 overflow-hidden border-none"
            : "fixed inset-0 z-50 w-full md:sticky md:z-auto md:w-64",
        )}
      >
        {/* Logo Section */}
        <div className="flex items-center justify-between px-4 py-4 border-b">
          <div className="flex items-center gap-2 overflow-hidden">
            <TreePine className="h-6 w-6 text-primary shrink-0" />
            <span
              className={cn(
                "font-bold text-lg whitespace-nowrap transition-all duration-300",
                collapsed ? "md:opacity-0 md:w-0" : "opacity-100 w-auto",
              )}
            >
              Gia phả họ Nguyễn
            </span>
          </div>
          {/* Close button for mobile menu */}
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={closeIfMobile}
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} onClick={closeIfMobile}>
                <span
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors cursor-pointer",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span
                    className={cn(
                      "transition-all duration-300 whitespace-nowrap overflow-hidden",
                      collapsed ? "md:opacity-0 md:w-0" : "opacity-100 w-auto",
                    )}
                  >
                    {item.label}
                  </span>
                </span>
              </Link>
            );
          })}

          {/* Admin section — only visible for admin users */}
          {isAdmin && (
            <>
              <div
                className={cn(
                  "pt-4 pb-2 transition-all duration-300 overflow-hidden",
                  collapsed ? "md:opacity-0 md:h-0" : "opacity-100 h-auto",
                )}
              >
                <span className="px-3 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                  Quản trị
                </span>
              </div>
              {collapsed && <div className="border-t my-2 md:block hidden" />}
              {adminItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeIfMobile}
                  >
                    <span
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors cursor-pointer",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span
                        className={cn(
                          "transition-all duration-300 whitespace-nowrap overflow-hidden",
                          collapsed
                            ? "md:opacity-0 md:w-0"
                            : "opacity-100 w-auto",
                        )}
                      >
                        {item.label}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* Desktop Collapse toggle */}
        <div className="border-t p-2 hidden md:block">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={toggle}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span className="ml-2">Thu gọn</span>
              </>
            )}
          </Button>
        </div>
      </aside>

      {/* Backdrop for mobile (optional but recommended) */}
      {!collapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={close}
        />
      )}
    </>
  );
}
