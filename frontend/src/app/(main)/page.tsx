"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  TreePine,
  Users,
  Image as ImageIcon,
  Newspaper,
  CalendarDays,
  BookOpen,
  UserCircle,
  Activity,
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface Stats {
  people: number;
  families: number;
  profiles: number;
  posts: number;
  events: number;
  media: number;
}

const STATS_CARDS = [
  {
    key: "people",
    title: "Thành viên",
    icon: UserCircle,
    color: "text-emerald-600",
    bg: "bg-emerald-500/10",
    hover: "hover:border-emerald-500/30 hover:bg-emerald-500/5",
    href: "/tree",
  },
  {
    key: "families",
    title: "Gia đình",
    icon: Users,
    color: "text-blue-600",
    bg: "bg-blue-500/10",
    hover: "hover:border-blue-500/30 hover:bg-blue-500/5",
    href: "/tree",
  },
  {
    key: "profiles",
    title: "Tài khoản",
    icon: Activity,
    color: "text-indigo-600",
    bg: "bg-indigo-500/10",
    hover: "hover:border-indigo-500/30 hover:bg-indigo-500/5",
    href: "/directory",
  },
  {
    key: "posts",
    title: "Bài viết",
    icon: Newspaper,
    color: "text-amber-600",
    bg: "bg-amber-500/10",
    hover: "hover:border-amber-500/30 hover:bg-amber-500/5",
    href: "/feed",
  },
  {
    key: "events",
    title: "Sự kiện",
    icon: CalendarDays,
    color: "text-rose-600",
    bg: "bg-rose-500/10",
    hover: "hover:border-rose-500/30 hover:bg-rose-500/5",
    href: "/events",
  },
  {
    key: "media",
    title: "Tư liệu",
    icon: ImageIcon,
    color: "text-fuchsia-600",
    bg: "bg-fuchsia-500/10",
    hover: "hover:border-fuchsia-500/30 hover:bg-fuchsia-500/5",
    href: "/media",
  },
] as const;

const QUICK_ACTIONS = [
  {
    title: "Cây Gia Phả",
    desc: "Khám phá sơ đồ cội nguồn",
    icon: TreePine,
    href: "/tree",
    color: "from-emerald-500 to-green-600",
  },
  {
    title: "Bảng Tin",
    desc: "Cập nhật hoạt động dòng họ",
    icon: Newspaper,
    href: "/feed",
    color: "from-blue-500 to-indigo-600",
  },
  {
    title: "Sự Kiện",
    desc: "Ngày giỗ chạp, họp mặt",
    icon: CalendarDays,
    href: "/events",
    color: "from-orange-500 to-rose-600",
  },
  {
    title: "Sách Gia Phả",
    desc: "Đọc gia phả dạng sách",
    icon: BookOpen,
    href: "/book",
    color: "from-purple-500 to-fuchsia-600",
  },
] as const;

export default function HomePage() {
  const [stats, setStats] = useState<Stats>({
    people: 0,
    families: 0,
    profiles: 0,
    posts: 0,
    events: 0,
    media: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const tables = [
          "people",
          "families",
          "profiles",
          "posts",
          "events",
          "media",
        ] as const;
        // Mặc định gọi "head: true" để lấy count thay vì tải data
        const promises = tables.map((t) =>
          supabase.from(t).select("*", { count: "exact", head: true }),
        );
        const results = await Promise.all(promises);

        const counts: Record<string, number> = {};
        tables.forEach((t, i) => {
          counts[t] = results[i].count || 0;
          if (results[i].error) {
            console.error(`Error fetching count for ${t}:`, results[i].error);
          }
        });
        setStats(counts as unknown as Stats);
      } catch (err) {
        console.error("fetchStats error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  return (
    <div className="space-y-8 pb-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-primary/10 via-primary/5 to-transparent p-8 md:p-12 border border-primary/10 shadow-sm">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium text-primary bg-primary/10 mb-6">
            👋 Chào mừng bạn trở lại
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground mb-4">
            Gia Phả Số <span className="text-primary">Dòng Họ Nguyễn</span>
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
            Nơi linh thiêng lưu giữ cội nguồn, gắn kết các thế hệ và phát huy
            truyền thống tốt đẹp của dòng tộc qua dòng chảy thời gian.
          </p>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-primary/15 rounded-full blur-3xl opacity-60 pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 -mb-16 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl opacity-50 pointer-events-none" />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" /> Tiện ích nhanh
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {QUICK_ACTIONS.map((action) => (
            <Link key={action.title} href={action.href} className="group block">
              <Card className="relative overflow-hidden border-transparent bg-muted/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <div
                  className={cn(
                    "absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-gradient-to-br",
                    action.color,
                  )}
                />
                <CardContent className="p-6">
                  <div
                    className={cn(
                      "inline-flex p-3 rounded-2xl mb-4 bg-gradient-to-br text-white shadow-sm",
                      action.color,
                    )}
                  >
                    <action.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors">
                    {action.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{action.desc}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Stats Overview */}
      <div>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <UserCircle className="h-5 w-5 text-primary" /> Bức tranh tổng quan
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {STATS_CARDS.map((stat) => (
            <Link key={stat.key} href={stat.href} className="block">
              <Card
                className={cn(
                  "transition-all duration-200 border-muted",
                  stat.hover,
                )}
              >
                <CardContent className="p-5 flex items-center gap-4">
                  <div className={cn("p-3 rounded-xl shrink-0", stat.bg)}>
                    <stat.icon className={cn("h-5 w-5", stat.color)} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-0.5">
                      {stat.title}
                    </p>
                    {loading ? (
                      <Skeleton className="h-7 w-16" />
                    ) : (
                      <h4 className="text-2xl font-bold text-foreground">
                        {stats[stat.key as keyof Stats].toLocaleString()}
                      </h4>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
