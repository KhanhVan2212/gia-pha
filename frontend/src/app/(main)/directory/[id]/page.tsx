'use client';

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, User, Mail, Calendar, Shield, Loader2, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/lib/supabase";

export default function MemberDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [member, setMember] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMember = useCallback(async () => {
    if (!params.id) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", params.id)
        .single();
      if (data) setMember(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchMember();
  }, [fetchMember]);

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Đang tải thông tin...</p>
      </div>
    );

  if (!member)
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <div className="bg-destructive/10 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
          <User className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-xl font-bold">Không tìm thấy thành viên</h2>
        <p className="text-muted-foreground mb-6">Dữ liệu có thể đã bị xóa hoặc đường dẫn không chính xác.</p>
        <Button onClick={() => router.push("/directory")}>Quay lại danh bạ</Button>
      </div>
    );

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        className="group hover:bg-transparent p-0"
        onClick={() => router.push("/directory")}
      >
        <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
        Quay lại danh sách
      </Button>

      <Card className="overflow-hidden border-none shadow-xl ring-1 ring-border">
        {/* Profile Header Background */}
        <div className="h-32 bg-gradient-to-r from-primary/20 via-primary/10 to-background border-b" />
        
        <CardContent className="relative px-6 pb-8">
          {/* Avatar Positioned Overlap */}
          <div className="relative -top-12 flex flex-col items-center sm:items-start sm:flex-row sm:gap-6">
            <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-background shadow-lg">
              <AvatarImage src={member.avatar_url} className="object-cover" />
              <AvatarFallback className="text-2xl font-bold bg-primary/5 text-primary">
                {(member.display_name || member.email).substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="mt-14 sm:mt-16 text-center sm:text-left space-y-1 flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">
                  {member.display_name || member.email.split("@")[0]}
                </h1>
                <Badge variant="secondary" className="w-fit mx-auto sm:mx-0 bg-primary/10 text-primary border-none hover:bg-primary/20 capitalize px-3">
                  <Shield className="mr-1 h-3 w-3" />
                  {member.role}
                </Badge>
              </div>
              <p className="text-muted-foreground flex items-center justify-center sm:justify-start gap-1.5">
                <Mail className="h-4 w-4" />
                {member.email}
              </p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            <div className="p-4 rounded-xl bg-muted/50 border space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Ngày tham gia
              </p>
              <p className="font-semibold text-sm italic">
                {new Date(member.created_at).toLocaleDateString("vi-VN", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-muted/50 border space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                Trạng thái tài khoản
              </p>
              <p className="font-semibold text-sm">Đang hoạt động</p>
            </div>
          </div>

          {/* Action Footer (Optional) */}
          <div className="mt-8 flex gap-3">
            <Button className="flex-1 sm:flex-none bg-primary hover:bg-primary/90">
              Gửi tin nhắn
            </Button>
            <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => window.print()}>
              Xuất hồ sơ
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Footer Info */}
      <p className="text-center text-xs text-muted-foreground italic">
        Thông tin được bảo mật bởi hệ thống quản trị nội bộ.
      </p>
    </div>
  );
}