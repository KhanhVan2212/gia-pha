"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Contact,
  Search,
  User,
  Activity,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface DirectoryMember {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string;
  status: string;
  created_at: string;
}

export default function DirectoryPage() {
  const router = useRouter();
  const [members, setMembers] = useState<DirectoryMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("status", "active")
        .neq("role", "viewer")
        .order("created_at", { ascending: true });
      if (data) setMembers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const filtered = members.filter(
    (m) =>
      (m.display_name || "").toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()),
  );

  const getRoleBadge = (role: string) => {
    const roles: Record<string, { label: string; class: string; icon: any }> = {
      admin: {
        label: "Quản trị",
        class: "bg-rose-500/10 text-rose-600 border-rose-500/20",
        icon: ShieldCheck,
      },
      editor: {
        label: "Biên tập",
        class: "bg-amber-500/10 text-amber-600 border-amber-500/20",
        icon: UserCog,
      },
      member: {
        label: "Thành viên",
        class: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
        icon: User,
      },
    };
    const config = roles[role] || roles.member;
    return (
      <Badge
        variant="outline"
        className={cn(
          "font-medium gap-1 px-2 py-0.5 rounded-full",
          config.class,
        )}
      >
        <config.icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-8 pb-8">
      {/* Page Header - Tương tự Hero của Home nhưng nhỏ hơn */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-indigo-500/10 via-primary/5 to-transparent p-6 md:p-8 border border-primary/10 shadow-sm">
        <div className="relative z-10">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <Contact className="h-8 w-8 text-indigo-600" />
            Danh bạ dòng họ
          </h1>
          <p className="text-muted-foreground mt-2 max-w-xl">
            Kết nối và tìm kiếm thông tin liên lạc của các thành viên đã đăng ký
            trong hệ thống.
          </p>
        </div>
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Search Bar Section */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-11 rounded-xl border-muted bg-background focus-visible:ring-indigo-500"
          />
        </div>
        <div className="text-sm text-muted-foreground whitespace-nowrap">
          Hiển thị{" "}
          <span className="font-bold text-foreground">{filtered.length}</span>{" "}
          thành viên
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="border-muted bg-muted/20">
              <CardContent className="p-5 flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed bg-muted/30">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="p-4 rounded-full bg-background mb-4">
              <Search className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-medium">Không tìm thấy thành viên</h3>
            <p className="text-muted-foreground">
              Hãy thử tìm kiếm với từ khóa khác.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => (
            <Card
              key={m.id}
              className="group border-transparent bg-muted/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-indigo-500/20 cursor-pointer overflow-hidden rounded-2xl"
              onClick={() => router.push(`/directory/${m.id}`)}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center overflow-hidden relative shrink-0 border border-indigo-500/10 group-hover:scale-110 transition-transform duration-300">
                    {m.avatar_url ? (
                      <Image
                        src={m.avatar_url}
                        alt="Avatar"
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    ) : (
                      <User className="h-6 w-6 text-indigo-600" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-bold text-foreground truncate group-hover:text-indigo-600 transition-colors">
                        {m.display_name || m.email.split("@")[0]}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mb-3">
                      {m.email}
                    </p>
                    {getRoleBadge(m.role)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
