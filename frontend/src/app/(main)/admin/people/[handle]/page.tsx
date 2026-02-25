"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Loader2,
  User,
  Phone,
  MapPin,
  Briefcase,
  BookOpen,
  Lock,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase";

// ── Full person row from DB ──────────────────────────────────────────────
interface PersonFull {
  handle: string;
  display_name: string;
  gender: number;
  generation: number;
  birth_year?: number;
  birth_date?: string;
  birth_place?: string;
  death_year?: number;
  death_date?: string;
  death_place?: string;
  is_living: boolean;
  is_privacy_filtered: boolean;
  is_patrilineal: boolean;
  nick_name?: string;
  phone?: string;
  email?: string;
  zalo?: string;
  facebook?: string;
  current_address?: string;
  hometown?: string;
  occupation?: string;
  company?: string;
  education?: string;
  notes?: string;
  gramps_id?: string;
  created_at?: string;
  updated_at?: string;
}

// ── Form state mirrors DB columns as strings (for inputs) ────────────────
interface FormState {
  display_name: string;
  nick_name: string;
  gender: number;
  is_living: boolean;
  is_privacy_filtered: boolean;
  birth_year: string;
  birth_date: string;
  birth_place: string;
  death_year: string;
  death_date: string;
  death_place: string;
  phone: string;
  email: string;
  zalo: string;
  facebook: string;
  current_address: string;
  hometown: string;
  occupation: string;
  company: string;
  education: string;
  notes: string;
}

function personToForm(p: PersonFull): FormState {
  return {
    display_name: p.display_name ?? "",
    nick_name: p.nick_name ?? "",
    gender: p.gender ?? 1,
    is_living: p.is_living ?? true,
    is_privacy_filtered: p.is_privacy_filtered ?? false,
    birth_year: p.birth_year?.toString() ?? "",
    birth_date: p.birth_date ?? "",
    birth_place: p.birth_place ?? "",
    death_year: p.death_year?.toString() ?? "",
    death_date: p.death_date ?? "",
    death_place: p.death_place ?? "",
    phone: p.phone ?? "",
    email: p.email ?? "",
    zalo: p.zalo ?? "",
    facebook: p.facebook ?? "",
    current_address: p.current_address ?? "",
    hometown: p.hometown ?? "",
    occupation: p.occupation ?? "",
    company: p.company ?? "",
    education: p.education ?? "",
    notes: p.notes ?? "",
  };
}

// ── Section heading component ────────────────────────────────────────────
function SectionHeading({
  icon: Icon,
  title,
}: {
  icon: React.ElementType;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 pb-2 border-b mb-3">
      <Icon className="h-4 w-4 text-primary" />
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    </div>
  );
}

// ── Field component ──────────────────────────────────────────────────────
function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <label className="text-sm font-medium text-foreground/80">{label}</label>
      {children}
    </div>
  );
}

// ── Toast notification ───────────────────────────────────────────────────
function Toast({
  type,
  message,
  onClose,
}: {
  type: "success" | "error";
  message: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl px-4 py-3 shadow-lg border animate-in slide-in-from-bottom-5 duration-300 max-w-sm ${
        type === "success"
          ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-200"
          : "bg-red-50 border-red-200 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-200"
      }`}
    >
      {type === "success" ? (
        <CheckCircle className="h-5 w-5 shrink-0 text-green-500" />
      ) : (
        <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
      )}
      <p className="text-sm font-medium">{message}</p>
      <button
        onClick={onClose}
        className="ml-auto text-current/60 hover:text-current transition-colors"
      >
        ×
      </button>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────
export default function AdminMemberEditPage() {
  const { handle } = useParams<{ handle: string }>();
  const router = useRouter();
  const { isAdmin, loading: authLoading } = useAuth();

  const [person, setPerson] = useState<PersonFull | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const fetchPerson = useCallback(async () => {
    if (!handle) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("people")
      .select("*")
      .eq("handle", handle)
      .single();

    if (error || !data) {
      setToast({ type: "error", message: "Không tìm thấy thành viên." });
      setLoading(false);
      return;
    }
    const p = data as PersonFull;
    setPerson(p);
    setForm(personToForm(p));
    setLoading(false);
  }, [handle]);

  useEffect(() => {
    if (!authLoading && isAdmin) fetchPerson();
  }, [authLoading, isAdmin, fetchPerson]);

  const handleSave = async () => {
    if (!form || !person) return;
    if (!form.display_name.trim()) {
      setToast({ type: "error", message: "Họ và tên không được để trống." });
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        display_name: form.display_name.trim(),
        nick_name: form.nick_name.trim() || null,
        gender: form.gender,
        is_living: form.is_living,
        is_privacy_filtered: form.is_privacy_filtered,
        birth_year: form.birth_year ? parseInt(form.birth_year) : null,
        birth_date: form.birth_date.trim() || null,
        birth_place: form.birth_place.trim() || null,
        death_year: form.death_year ? parseInt(form.death_year) : null,
        death_date: form.death_date.trim() || null,
        death_place: form.death_place.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        zalo: form.zalo.trim() || null,
        facebook: form.facebook.trim() || null,
        current_address: form.current_address.trim() || null,
        hometown: form.hometown.trim() || null,
        occupation: form.occupation.trim() || null,
        company: form.company.trim() || null,
        education: form.education.trim() || null,
        notes: form.notes.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("people")
        .update(payload)
        .eq("handle", person.handle);

      if (error) throw error;
      setToast({ type: "success", message: "Đã lưu thông tin thành công!" });
      // Refresh person data
      await fetchPerson();
    } catch (err: unknown) {
      setToast({
        type: "error",
        message: `Lỗi: ${err instanceof Error ? err.message : "Không xác định"}`,
      });
    } finally {
      setSaving(false);
    }
  };

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  };

  // ── Auth guard ──────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Lock className="h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground font-medium">
          Bạn không có quyền truy cập trang này.
        </p>
        <Button variant="outline" onClick={() => router.push("/")}>
          Về trang chủ
        </Button>
      </div>
    );
  }

  if (loading || !form || !person) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const genderLabel = person.gender === 1 ? "Nam" : "Nữ";

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/admin/people")}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">{person.display_name}</h1>
              <Badge variant="outline">{genderLabel}</Badge>
              <Badge variant={person.is_living ? "default" : "secondary"}>
                {person.is_living ? "Còn sống" : "Đã mất"}
              </Badge>
              {person.is_privacy_filtered && (
                <Badge variant="destructive" className="gap-1">
                  <EyeOff className="h-3 w-3" />
                  Ẩn thông tin
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Đời {person.generation} ·{" "}
              {person.is_patrilineal ? "Chính tộc" : "Ngoại tộc"} ·{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                {person.handle}
              </code>
            </p>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="shrink-0">
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Lưu thay đổi
        </Button>
      </div>

      {/* ── Section 1: Basic Info ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            <SectionHeading icon={User} title="Thông tin cơ bản" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Họ và tên *" className="sm:col-span-2">
              <Input
                value={form.display_name}
                onChange={(e) => setField("display_name", e.target.value)}
                placeholder="Vd: Nguyễn Văn A"
              />
            </Field>

            <Field label="Bí danh / Tên thường gọi">
              <Input
                value={form.nick_name}
                onChange={(e) => setField("nick_name", e.target.value)}
                placeholder="Vd: Anh Hai, Chú Ba..."
              />
            </Field>

            <Field label="Giới tính">
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={form.gender}
                onChange={(e) => setField("gender", parseInt(e.target.value))}
              >
                <option value={1}>Nam</option>
                <option value={2}>Nữ</option>
              </select>
            </Field>

            <Field label="Tình trạng">
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={form.is_living ? "1" : "0"}
                onChange={(e) => setField("is_living", e.target.value === "1")}
              >
                <option value="1">● Còn sống</option>
                <option value="0">✝ Đã mất</option>
              </select>
            </Field>

            <Field label="Quyền riêng tư">
              <div className="flex items-center gap-3 h-10">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.is_privacy_filtered}
                    onChange={(e) =>
                      setField("is_privacy_filtered", e.target.checked)
                    }
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-sm flex items-center gap-1">
                    {form.is_privacy_filtered ? (
                      <>
                        <EyeOff className="h-4 w-4 text-destructive" />
                        Ẩn thông tin cá nhân
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 text-green-600" />
                        Hiển thị thông tin
                      </>
                    )}
                  </span>
                </label>
              </div>
            </Field>
          </div>

          {/* Birth info */}
          <div className="rounded-lg bg-muted/40 px-4 py-3 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Thông tin sinh
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="Năm sinh">
                <Input
                  type="number"
                  placeholder="Vd: 1985"
                  value={form.birth_year}
                  onChange={(e) => setField("birth_year", e.target.value)}
                />
              </Field>
              <Field label="Ngày sinh (đầy đủ)">
                <Input
                  placeholder="Vd: 15/08/1985"
                  value={form.birth_date}
                  onChange={(e) => setField("birth_date", e.target.value)}
                />
              </Field>
              <Field label="Nơi sinh">
                <Input
                  placeholder="Vd: Hà Nội"
                  value={form.birth_place}
                  onChange={(e) => setField("birth_place", e.target.value)}
                />
              </Field>
            </div>
          </div>

          {/* Death info */}
          {!form.is_living && (
            <div className="rounded-lg bg-muted/40 px-4 py-3 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Thông tin mất
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="Năm mất">
                  <Input
                    type="number"
                    placeholder="Vd: 2020"
                    value={form.death_year}
                    onChange={(e) => setField("death_year", e.target.value)}
                  />
                </Field>
                <Field label="Ngày mất (đầy đủ)">
                  <Input
                    placeholder="Vd: 10/03/2020"
                    value={form.death_date}
                    onChange={(e) => setField("death_date", e.target.value)}
                  />
                </Field>
                <Field label="Nơi mất">
                  <Input
                    placeholder="Vd: TP. Hồ Chí Minh"
                    value={form.death_place}
                    onChange={(e) => setField("death_place", e.target.value)}
                  />
                </Field>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Section 2: Contact ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            <SectionHeading icon={Phone} title="Thông tin liên hệ" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Số điện thoại">
              <Input
                type="tel"
                placeholder="Vd: 0901234567"
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                placeholder="Vd: ten@email.com"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
              />
            </Field>
            <Field label="Zalo">
              <Input
                placeholder="Số Zalo hoặc link"
                value={form.zalo}
                onChange={(e) => setField("zalo", e.target.value)}
              />
            </Field>
            <Field label="Facebook">
              <Input
                placeholder="Link hoặc tên Facebook"
                value={form.facebook}
                onChange={(e) => setField("facebook", e.target.value)}
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* ── Section 3: Address ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            <SectionHeading icon={MapPin} title="Địa chỉ" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Địa chỉ hiện tại" className="sm:col-span-2">
              <Input
                placeholder="Vd: 123 Đường ABC, Quận 1, TP.HCM"
                value={form.current_address}
                onChange={(e) => setField("current_address", e.target.value)}
              />
            </Field>
            <Field label="Quê quán" className="sm:col-span-2">
              <Input
                placeholder="Vd: Huyện Châu Thành, tỉnh Tiền Giang"
                value={form.hometown}
                onChange={(e) => setField("hometown", e.target.value)}
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* ── Section 4: Occupation ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            <SectionHeading icon={Briefcase} title="Nghề nghiệp & Học vấn" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nghề nghiệp">
              <Input
                placeholder="Vd: Kỹ sư phần mềm"
                value={form.occupation}
                onChange={(e) => setField("occupation", e.target.value)}
              />
            </Field>
            <Field label="Nơi làm việc / Công ty">
              <Input
                placeholder="Vd: Công ty ABC"
                value={form.company}
                onChange={(e) => setField("company", e.target.value)}
              />
            </Field>
            <Field label="Học vấn" className="sm:col-span-2">
              <Input
                placeholder="Vd: Đại học Bách Khoa TP.HCM, Kỹ thuật máy tính"
                value={form.education}
                onChange={(e) => setField("education", e.target.value)}
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* ── Section 5: Biography ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            <SectionHeading icon={BookOpen} title="Tiểu sử & Ghi chú" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Tiểu sử & Ghi chú">
            <textarea
              className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 min-h-30"
              placeholder="Mô tả tiểu sử, cuộc đời, những cột mốc quan trọng, ghi chú nội bộ..."
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              rows={6}
            />
          </Field>
        </CardContent>
      </Card>

      {/* ── Footer actions ── */}
      <div className="flex justify-between items-center pt-2">
        <Button variant="outline" onClick={() => router.push("/admin/people")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Quay lại danh sách
        </Button>
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Lưu thay đổi
        </Button>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* ── Metadata footer ── */}
      {(person.created_at || person.updated_at) && (
        <p className="text-center text-xs text-muted-foreground pb-4">
          {person.created_at && (
            <>
              Tạo lúc:{" "}
              {new Date(person.created_at).toLocaleDateString("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </>
          )}
          {person.created_at && person.updated_at && " · "}
          {person.updated_at && (
            <>
              Cập nhật:{" "}
              {new Date(person.updated_at).toLocaleDateString("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </>
          )}
        </p>
      )}
    </div>
  );
}
