"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  Heart,
  Image as ImageIcon,
  FileText,
  History,
  Lock,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  Tag,
  MessageCircle,
  Calendar,
  Sparkles,
  Mail,
  Globe,
  Building2,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { zodiacYear } from "@/lib/genealogy-types";
import type { PersonDetail } from "@/lib/genealogy-types";
import { CommentSection } from "@/components/comment-section";
import { cn } from "@/lib/utils";

interface FamilyMember {
  handle: string;
  displayName: string;
  relType: string;
}

// Extends PersonDetail with extra DB columns not yet in the shared type
interface PersonFull extends PersonDetail {
  nick_name?: string;
  company?: string;
  zalo?: string;
  facebook?: string;
  current_address?: string;
  notes?: string;
}

export default function PersonProfilePage() {
  const params = useParams();
  const router = useRouter();
  const handle = params.handle as string;
  const [person, setPerson] = useState<PersonFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [familyDetails, setFamilyDetails] = useState<{
    parents: FamilyMember[];
    families: { handle: string; members: FamilyMember[] }[];
  }>({ parents: [], families: [] });

  useEffect(() => {
    const fetchPerson = async () => {
      try {
        const { supabase } = await import("@/lib/supabase");
        const { data, error } = await supabase
          .from("people")
          .select("*")
          .eq("handle", handle)
          .single();

        if (!error && data) {
          const row = data as Record<string, unknown>;
          let surname = row.surname as string | undefined;
          let firstName = row.first_name as string | undefined;
          if (!surname && !firstName && row.display_name) {
            const parts = (row.display_name as string).trim().split(/\s+/);
            surname = parts.length > 1 ? parts[0] : "";
            firstName = parts[parts.length - 1];
          }

          setPerson({
            ...row,
            displayName: row.display_name as string,
            surname,
            firstName,
            isLiving: row.is_living as boolean,
            isPrivacyFiltered: row.is_privacy_filtered as boolean,
            parentFamilies: (row.parent_families as string[]) || [],
            families: (row.families as string[]) || [],
            nick_name: row.nick_name as string | undefined,
            company: row.company as string | undefined,
            zalo: row.zalo as string | undefined,
            facebook: row.facebook as string | undefined,
            current_address: row.current_address as string | undefined,
            notes: row.notes as string | undefined,
          } as PersonFull);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPerson();
  }, [handle]);

  useEffect(() => {
    if (!person) return;
    const fetchFamilyDetails = async () => {
      try {
        const { supabase } = await import("@/lib/supabase");
        const parentsArr: FamilyMember[] = [];
        if ((person.parentFamilies?.length ?? 0) > 0) {
          const { data: famData } = await supabase
            .from("families")
            .select("father_handle, mother_handle")
            .in("handle", person.parentFamilies || []);

          if (famData) {
            const pHandles = famData.flatMap((f) =>
              [f.father_handle, f.mother_handle].filter(Boolean),
            );
            const { data: pPeople } = await supabase
              .from("people")
              .select("handle, display_name")
              .in("handle", pHandles);
            if (pPeople) {
              famData.forEach((f) => {
                if (f.father_handle) {
                  const p = pPeople.find((pp) => pp.handle === f.father_handle);
                  if (p)
                    parentsArr.push({
                      handle: p.handle,
                      displayName: p.display_name,
                      relType: "father",
                    });
                }
                if (f.mother_handle) {
                  const p = pPeople.find((pp) => pp.handle === f.mother_handle);
                  if (p)
                    parentsArr.push({
                      handle: p.handle,
                      displayName: p.display_name,
                      relType: "mother",
                    });
                }
              });
            }
          }
        }

        const detailedFamilies: { handle: string; members: FamilyMember[] }[] =
          [];
        if ((person.families?.length ?? 0) > 0) {
          const { data: famData } = await supabase
            .from("families")
            .select("*")
            .in("handle", person.families || []);
          if (famData) {
            for (const f of famData) {
              const spouseHandle =
                f.father_handle === person.handle
                  ? f.mother_handle
                  : f.father_handle;
              const childrenHandles = f.children || [];
              const allH = [spouseHandle, ...childrenHandles].filter(Boolean);
              const { data: pPeople } = await supabase
                .from("people")
                .select("handle, display_name")
                .in("handle", allH);
              const members: FamilyMember[] = [];
              if (pPeople) {
                if (spouseHandle) {
                  const s = pPeople.find((pp) => pp.handle === spouseHandle);
                  if (s)
                    members.push({
                      handle: s.handle,
                      displayName: s.display_name,
                      relType: "spouse",
                    });
                }
                childrenHandles.forEach((ch: string) => {
                  const c = pPeople.find((pp) => pp.handle === ch);
                  if (c)
                    members.push({
                      handle: c.handle,
                      displayName: c.display_name,
                      relType: "child",
                    });
                });
              }
              detailedFamilies.push({ handle: f.handle, members });
            }
          }
        }
        setFamilyDetails({ parents: parentsArr, families: detailedFamilies });
      } catch (err) {
        console.error(err);
      }
    };
    fetchFamilyDetails();
  }, [person]);

  if (loading)
    return (
      <div className="space-y-8 animate-pulse">
        <Skeleton className="h-48 w-full rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-96 col-span-2 rounded-3xl" />
          <Skeleton className="h-96 rounded-3xl" />
        </div>
      </div>
    );

  if (!person)
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="p-4 bg-muted rounded-full mb-4">
          <User className="h-10 w-10 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold">Không tìm thấy thành viên</h2>
        <Button variant="link" onClick={() => router.back()} className="mt-2">
          <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại
        </Button>
      </div>
    );

  const genderColor =
    person.gender === 1
      ? "text-blue-600 bg-blue-50"
      : "text-rose-600 bg-rose-50";

  return (
    <div className="space-y-8 pb-10">
      {/* --- HERO HEADER --- */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-primary/10 via-background to-transparent border border-primary/10 p-6 md:p-10 shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
            <div className={cn("p-5 rounded-3xl shadow-inner", genderColor)}>
              <User className="h-12 w-12" />
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                  {person.displayName}
                </h1>
                {person.isPrivacyFiltered && (
                  <Badge
                    variant="outline"
                    className="bg-amber-50 text-amber-600 border-amber-200 rounded-full py-1"
                  >
                    <Lock className="h-3 w-3 mr-1" /> Quyền riêng tư
                  </Badge>
                )}
                <Badge
                  className={cn(
                    "rounded-full",
                    person.isLiving ? "bg-emerald-500" : "bg-slate-500",
                  )}
                >
                  {person.isLiving ? "Còn sống" : "Đã mất"}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-muted-foreground font-medium">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-primary" /> Đời thứ{" "}
                  {person.generation || "?"}
                </span>
                {person.chi && (
                  <span className="flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-muted-foreground" />{" "}
                    Chi {person.chi}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-muted-foreground" />{" "}
                  {person.gender === 1 ? "Nam giới" : "Nữ giới"}
                </span>
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            className="rounded-2xl shadow-sm hover:bg-white"
            onClick={() => router.back()}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại
          </Button>
        </div>
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-primary/10 rounded-full blur-3xl opacity-50" />
      </div>

      {/* --- CONTENT TABS --- */}
      <Tabs defaultValue="overview" className="w-full">
        <div className="overflow-x-auto pb-2 scrollbar-hide">
          <TabsList className="bg-muted/50 p-1 rounded-2xl border w-full justify-start md:justify-center h-auto">
            <TabsTrigger
              value="overview"
              className="rounded-xl px-6 py-2.5 data-[state=active]:shadow-sm"
            >
              <User className="h-4 w-4 mr-2" /> Tổng quan
            </TabsTrigger>
            <TabsTrigger
              value="relationships"
              className="rounded-xl px-6 py-2.5 data-[state=active]:shadow-sm"
            >
              <Heart className="h-4 w-4 mr-2 text-rose-500" /> Quan hệ
            </TabsTrigger>
            <TabsTrigger
              value="media"
              className="rounded-xl px-6 py-2.5 data-[state=active]:shadow-sm"
            >
              <ImageIcon className="h-4 w-4 mr-2 text-blue-500" /> Tư liệu
            </TabsTrigger>
            <TabsTrigger
              value="comments"
              className="rounded-xl px-6 py-2.5 data-[state=active]:shadow-sm"
            >
              <MessageCircle className="h-4 w-4 mr-2 text-emerald-500" /> Trao
              đổi
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">
            <TabsContent
              value="overview"
              className="m-0 space-y-6 outline-none"
            >
              <Card className="rounded-3xl border-muted shadow-sm overflow-hidden">
                <CardHeader className="bg-muted/30 border-b">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" /> Thông tin cơ
                    bản
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 grid gap-6 sm:grid-cols-2">
                  <InfoItem
                    icon={<User className="h-4 w-4" />}
                    label="Họ và tên"
                    value={person.displayName}
                  />
                  {(person as any).nick_name && (
                    <InfoItem
                      icon={<Tag className="h-4 w-4" />}
                      label="Bí danh / Tên thường gọi"
                      value={(person as any).nick_name}
                    />
                  )}
                  <InfoItem
                    icon={<Sparkles className="h-4 w-4 text-primary" />}
                    label="Thế hệ (Đời)"
                    value={`Đời thứ ${person.generation || "?"}`}
                  />
                  {person.chi && (
                    <InfoItem
                      icon={<Sparkles className="h-4 w-4 text-amber-500" />}
                      label="Chi"
                      value={`Chi ${person.chi}`}
                    />
                  )}
                  <InfoItem
                    icon={<User className="h-4 w-4" />}
                    label="Giới tính"
                    value={person.gender === 1 ? "Nam" : "Nữ"}
                  />
                  <InfoItem
                    icon={<Calendar className="h-4 w-4" />}
                    label="Ngày sinh"
                    value={
                      person.birthDate ||
                      (person.birthYear
                        ? `${person.birthYear} (${zodiacYear(person.birthYear)})`
                        : "Chưa cập nhật")
                    }
                  />
                  <InfoItem
                    icon={<MapPin className="h-4 w-4" />}
                    label="Nơi sinh"
                    value={person.birthPlace || "—"}
                  />
                  {!person.isLiving && (
                    <>
                      <InfoItem
                        icon={<Calendar className="h-4 w-4 text-rose-500" />}
                        label="Ngày mất"
                        value={
                          person.deathDate ||
                          person.deathYear?.toString() ||
                          "—"
                        }
                      />
                      <InfoItem
                        icon={<MapPin className="h-4 w-4 text-rose-500" />}
                        label="Nơi an nghỉ"
                        value={person.deathPlace || "—"}
                      />
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-3xl border-muted shadow-sm">
                <CardHeader className="border-b bg-muted/30">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-primary" /> Sự nghiệp &
                    Học vấn
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <InfoItem
                      icon={<Briefcase className="h-4 w-4" />}
                      label="Nghề nghiệp"
                      value={person.occupation || "—"}
                    />
                    {(person as any).company && (
                      <InfoItem
                        icon={<Building2 className="h-4 w-4" />}
                        label="Công ty / Nơi làm việc"
                        value={(person as any).company}
                      />
                    )}
                    <InfoItem
                      icon={<GraduationCap className="h-4 w-4" />}
                      label="Học vấn"
                      value={person.education || "—"}
                    />
                    <InfoItem
                      icon={<MapPin className="h-4 w-4 text-amber-500" />}
                      label="Quê quán"
                      value={person.hometown || "—"}
                    />
                    {(person as any).current_address && (
                      <InfoItem
                        icon={<MapPin className="h-4 w-4 text-emerald-500" />}
                        label="Địa chỉ thường trú"
                        value={(person as any).current_address}
                      />
                    )}
                  </div>
                  {(person as any).notes && (
                    <>
                      <Separator className="bg-muted/50" />
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                          <BookOpen className="h-3.5 w-3.5" />
                          Tiểu sử & Ghi chú
                        </label>
                        <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-line">
                          {(person as any).notes}
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent
              value="relationships"
              className="m-0 space-y-6 outline-none"
            >
              <Card className="rounded-3xl border-muted shadow-sm">
                <CardHeader className="bg-muted/30 border-b">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Heart className="h-5 w-5 text-rose-500" /> Sơ đồ gia đình
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-8">
                  {/* Parents */}
                  <section>
                    <h3 className="text-sm font-bold text-muted-foreground mb-4 flex items-center gap-2">
                      <div className="w-1 h-4 bg-blue-500 rounded-full" /> Đấng
                      sinh thành
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {familyDetails.parents.length > 0 ? (
                        familyDetails.parents.map((p) => (
                          <Link key={p.handle} href={`/people/${p.handle}`}>
                            <div className="p-4 rounded-2xl border bg-blue-50/30 hover:bg-blue-50 hover:border-blue-200 transition-all flex items-center gap-3">
                              <div className="p-2 bg-white rounded-xl shadow-sm text-blue-600">
                                <User className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-[10px] font-bold text-blue-500 uppercase">
                                  {p.relType === "father" ? "Cha" : "Mẹ"}
                                </p>
                                <p className="font-semibold text-sm">
                                  {p.displayName}
                                </p>
                              </div>
                            </div>
                          </Link>
                        ))
                      ) : (
                        <p className="text-sm italic text-muted-foreground px-2">
                          Chưa cập nhật thông tin cha mẹ
                        </p>
                      )}
                    </div>
                  </section>

                  {/* Spouse & Kids */}
                  <section>
                    <h3 className="text-sm font-bold text-muted-foreground mb-4 flex items-center gap-2">
                      <div className="w-1 h-4 bg-rose-500 rounded-full" /> Tổ ấm
                      riêng
                    </h3>
                    {familyDetails.families.length > 0 ? (
                      <div className="space-y-4">
                        {familyDetails.families.map((f, i) => (
                          <div
                            key={f.handle}
                            className="p-5 rounded-3xl border border-dashed bg-muted/10 space-y-4"
                          >
                            <div className="flex flex-wrap gap-3">
                              {f.members.map((m: any) => (
                                <Link
                                  key={m.handle}
                                  href={`/people/${m.handle}`}
                                >
                                  <Badge
                                    variant={
                                      m.relType === "spouse"
                                        ? "default"
                                        : "secondary"
                                    }
                                    className="px-4 py-1.5 rounded-full cursor-pointer hover:opacity-80 transition-opacity"
                                  >
                                    <span className="opacity-70 mr-2">
                                      {m.relType === "spouse"
                                        ? "Bạn đời:"
                                        : "Con:"}
                                    </span>{" "}
                                    {m.displayName}
                                  </Badge>
                                </Link>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm italic text-muted-foreground px-2">
                        Chưa cập nhật thông tin gia đình riêng
                      </p>
                    )}
                  </section>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="comments" className="m-0 outline-none">
              <Card className="rounded-3xl border-muted shadow-sm overflow-hidden">
                <CardHeader className="bg-emerald-500/5 border-b">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-emerald-600" /> Trao
                    đổi dòng họ
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <CommentSection personHandle={handle} />
                </CardContent>
              </Card>
            </TabsContent>
          </div>

          {/* Sidebar Column */}
          <div className="space-y-6">
            <Card className="rounded-3xl border-muted shadow-sm">
              <CardHeader className="pb-3 border-b bg-muted/20">
                <CardTitle className="text-base flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary" /> Thông tin liên hệ
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                {person.isPrivacyFiltered ? (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                    <Lock className="h-4 w-4" />
                    <span>Thông tin được bảo mật</span>
                  </div>
                ) : (
                  <>
                    <ContactItem
                      icon={<Phone className="h-4 w-4" />}
                      label="Điện thoại"
                      value={person.phone}
                      href={person.phone ? `tel:${person.phone}` : undefined}
                    />
                    <ContactItem
                      icon={<Mail className="h-4 w-4" />}
                      label="Email"
                      value={person.email}
                      href={person.email ? `mailto:${person.email}` : undefined}
                    />
                    <ContactItem
                      icon={<Globe className="h-4 w-4 text-blue-500" />}
                      label="Zalo"
                      value={person.zalo}
                    />
                    <ContactItem
                      icon={<Globe className="h-4 w-4 text-blue-600" />}
                      label="Facebook"
                      value={person.facebook}
                      href={
                        person.facebook?.startsWith("http")
                          ? person.facebook
                          : undefined
                      }
                    />
                    {!(
                      person.phone ||
                      person.email ||
                      person.zalo ||
                      person.facebook
                    ) && (
                      <p className="text-xs text-muted-foreground italic">
                        Chưa cập nhật thông tin liên hệ
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-muted shadow-sm">
              <CardHeader className="pb-3 border-b bg-muted/20">
                <CardTitle className="text-base flex items-center gap-2">
                  <Tag className="h-4 w-4 text-primary" /> Phân loại
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <div className="flex flex-wrap gap-2">
                  {person.tags?.length ? (
                    person.tags.map((t) => (
                      <Badge
                        key={t}
                        variant="secondary"
                        className="rounded-lg bg-primary/5 text-primary border-none"
                      >
                        {t}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground italic">
                      Chưa có nhãn
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Tabs>
    </div>
  );
}

// --- HELPER COMPONENTS ---

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-1 p-2 rounded-lg bg-muted/50 text-muted-foreground">
        {icon}
      </div>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="text-sm font-semibold text-foreground/90 leading-tight mt-0.5">
          {value}
        </p>
      </div>
    </div>
  );
}

function ContactItem({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  href?: string;
}) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3 group">
      <div className="p-2 rounded-xl bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
        {icon}
      </div>
      <div className="flex-1 overflow-hidden">
        <p className="text-[10px] font-bold text-muted-foreground uppercase">
          {label}
        </p>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium truncate text-primary hover:underline block"
          >
            {value}
          </a>
        ) : (
          <p className="text-sm font-medium truncate">{value}</p>
        )}
      </div>
    </div>
  );
}
