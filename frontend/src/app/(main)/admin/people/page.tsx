"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users,
  Search,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  RefreshCw,
  X,
  Save,
  UserPlus,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase";

interface Person {
  handle: string;
  display_name: string;
  gender: number;
  generation: number;
  birth_year?: number;
  death_year?: number;
  is_living: boolean;
  is_privacy_filtered: boolean;
  is_patrilineal: boolean;
  families: string[];
  parent_families: string[];
  created_at: string;
}

interface PersonFormData {
  display_name: string;
  gender: number;
  generation: number;
  birth_year: string;
  death_year: string;
  is_living: boolean;
  is_patrilineal: boolean;
  parent_handle: string; // handle of the parent person to attach to
  spouse_handle: string; // handle of spouse (only for non-patrilineal members)
}

const EMPTY_FORM: PersonFormData = {
  display_name: "",
  gender: 1,
  generation: 1,
  birth_year: "",
  death_year: "",
  is_living: true,
  is_patrilineal: true,
  parent_handle: "",
  spouse_handle: "",
};

export default function AdminPeoplePage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Modal states
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editPerson, setEditPerson] = useState<Person | null>(null);
  const [form, setForm] = useState<PersonFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchPeople = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("people")
        .select("*")
        .order("generation", { ascending: true })
        .order("display_name", { ascending: true });
      if (!error && data) setPeople(data as Person[]);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!authLoading && isAdmin) {
      fetchPeople();
    }
  }, [authLoading, isAdmin, fetchPeople]);

  // ─── Delete ───────────────────────────────────────────────
  const handleDelete = async (handle: string, name: string) => {
    if (
      !confirm(
        `Bạn có chắc chắn muốn xóa "${name}" khỏi gia phả?\n\n⚠️ Hành động này không thể hoàn tác và sẽ xóa thành viên khỏi cơ sở dữ liệu.`,
      )
    )
      return;

    setProcessingId(handle);
    try {
      // Remove from any families.children arrays
      const { data: famData } = await supabase
        .from("families")
        .select("handle, children")
        .contains("children", [handle]);

      if (famData && famData.length > 0) {
        for (const fam of famData) {
          const newChildren = (fam.children as string[]).filter(
            (c: string) => c !== handle,
          );
          await supabase
            .from("families")
            .update({ children: newChildren })
            .eq("handle", fam.handle);
        }
      }

      // Delete the person
      const { error } = await supabase
        .from("people")
        .delete()
        .eq("handle", handle);

      if (error) throw error;
      setPeople((prev) => prev.filter((p) => p.handle !== handle));
    } catch (err: unknown) {
      alert(
        `Lỗi khi xóa: ${err instanceof Error ? err.message : "Lỗi không xác định"}`,
      );
    } finally {
      setProcessingId(null);
    }
  };

  // ─── Open Add Modal ───────────────────────────────────────
  const openAddModal = () => {
    setForm(EMPTY_FORM);
    setFormError("");
    setAddModalOpen(true);
    setEditPerson(null);
  };

  // ─── Open Edit Modal ──────────────────────────────────────
  const openEditModal = (person: Person) => {
    setForm({
      display_name: person.display_name,
      gender: person.gender,
      generation: person.generation,
      birth_year: person.birth_year?.toString() || "",
      death_year: person.death_year?.toString() || "",
      is_living: person.is_living,
      is_patrilineal: person.is_patrilineal,
      parent_handle: "",
      spouse_handle: "",
    });
    setFormError("");
    setEditPerson(person);
    setAddModalOpen(true);
  };

  const closeModal = () => {
    setAddModalOpen(false);
    setEditPerson(null);
    setFormError("");
  };

  // ─── Save (Add or Edit) ───────────────────────────────────
  const handleSave = async () => {
    if (!form.display_name.trim()) {
      setFormError("Họ tên không được để trống.");
      return;
    }
    setSaving(true);
    setFormError("");

    try {
      if (editPerson) {
        // ── EDIT mode ──
        const updates: Record<string, unknown> = {
          display_name: form.display_name.trim(),
          gender: form.gender,
          generation: form.generation,
          birth_year: form.birth_year ? parseInt(form.birth_year) : null,
          death_year: form.death_year ? parseInt(form.death_year) : null,
          is_living: form.is_living,
          is_patrilineal: form.is_patrilineal,
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from("people")
          .update(updates)
          .eq("handle", editPerson.handle);

        if (error) throw error;

        setPeople((prev) =>
          prev.map((p) =>
            p.handle === editPerson.handle
              ? {
                  ...p,
                  display_name: form.display_name.trim(),
                  gender: form.gender,
                  generation: form.generation,
                  birth_year: form.birth_year
                    ? parseInt(form.birth_year)
                    : undefined,
                  death_year: form.death_year
                    ? parseInt(form.death_year)
                    : undefined,
                  is_living: form.is_living,
                  is_patrilineal: form.is_patrilineal,
                }
              : p,
          ),
        );
        closeModal();
      } else {
        // ── ADD mode ──
        const handle = `p-${Date.now()}`;

        const { error: pErr } = await supabase.from("people").insert({
          handle,
          display_name: form.display_name.trim(),
          gender: form.gender,
          generation: form.generation,
          birth_year: form.birth_year ? parseInt(form.birth_year) : null,
          death_year: form.death_year ? parseInt(form.death_year) : null,
          is_living: form.is_living,
          is_patrilineal: form.is_patrilineal,
          is_privacy_filtered: false,
          families: [],
          parent_families: [],
        });

        if (pErr) throw pErr;

        // ── Gán vào con của người cha (nếu có) ──
        if (form.parent_handle) {
          const parentPerson = people.find(
            (p) => p.handle === form.parent_handle,
          );
          if (parentPerson) {
            // Find existing family of parent
            const { data: famData } = await supabase
              .from("families")
              .select("handle, children, father_handle, mother_handle")
              .or(
                `father_handle.eq.${form.parent_handle},mother_handle.eq.${form.parent_handle}`,
              )
              .limit(1);

            if (famData && famData.length > 0) {
              // Add to existing family
              const fam = famData[0];
              const newChildren = [...(fam.children as string[]), handle];
              await supabase
                .from("families")
                .update({ children: newChildren })
                .eq("handle", fam.handle);
              // Update child's parent_families
              await supabase
                .from("people")
                .update({ parent_families: [fam.handle] })
                .eq("handle", handle);
            } else {
              // Create new family for parent
              const familyHandle = `f-${form.parent_handle}-${Date.now()}`;
              const isMale = parentPerson.gender === 1;
              await supabase.from("families").insert({
                handle: familyHandle,
                father_handle: isMale ? form.parent_handle : null,
                mother_handle: isMale ? null : form.parent_handle,
                children: [handle],
              });
              // Update child's parent_families
              await supabase
                .from("people")
                .update({ parent_families: [familyHandle] })
                .eq("handle", handle);
            }
          }
        }

        // ── Gán làm vợ/chồng (ngoại tộc) ──
        if (!form.is_patrilineal && form.spouse_handle) {
          const spousePerson = people.find(
            (p) => p.handle === form.spouse_handle,
          );
          if (spousePerson) {
            // Look for an existing couple family (no children needed)
            const { data: coupleFam } = await supabase
              .from("families")
              .select("handle, father_handle, mother_handle, children")
              .or(
                `father_handle.eq.${form.spouse_handle},mother_handle.eq.${form.spouse_handle}`,
              )
              .limit(1);

            if (coupleFam && coupleFam.length > 0) {
              // Update existing family: add this person as missing spouse role
              const fam = coupleFam[0];
              const isNewMale = form.gender === 1;
              const updates: Record<string, string> = {};
              if (!fam.father_handle && isNewMale)
                updates.father_handle = handle;
              else if (!fam.mother_handle && !isNewMale)
                updates.mother_handle = handle;
              else {
                // Both slots taken — create a new couple family
                const newFamHandle = `f-${form.spouse_handle}-${handle}-${Date.now()}`;
                const isSpouseMale = spousePerson.gender === 1;
                await supabase.from("families").insert({
                  handle: newFamHandle,
                  father_handle: isSpouseMale ? form.spouse_handle : handle,
                  mother_handle: isSpouseMale ? handle : form.spouse_handle,
                  children: [],
                });
                // Update both persons' families arrays
                await supabase
                  .from("people")
                  .update({
                    families: [...(spousePerson.families ?? []), newFamHandle],
                  })
                  .eq("handle", form.spouse_handle);
                await supabase
                  .from("people")
                  .update({ families: [newFamHandle] })
                  .eq("handle", handle);
              }
              if (Object.keys(updates).length > 0) {
                await supabase
                  .from("families")
                  .update(updates)
                  .eq("handle", fam.handle);
                // Update new spouse's families array
                await supabase
                  .from("people")
                  .update({ families: [fam.handle] })
                  .eq("handle", handle);
              }
            } else {
              // No family yet: create couple family
              const famHandle = `f-${form.spouse_handle}-${handle}-${Date.now()}`;
              const isSpouseMale = spousePerson.gender === 1;
              await supabase.from("families").insert({
                handle: famHandle,
                father_handle: isSpouseMale ? form.spouse_handle : handle,
                mother_handle: isSpouseMale ? handle : form.spouse_handle,
                children: [],
              });
              // Update both persons' families arrays
              await supabase
                .from("people")
                .update({
                  families: [...(spousePerson.families ?? []), famHandle],
                })
                .eq("handle", form.spouse_handle);
              await supabase
                .from("people")
                .update({ families: [famHandle] })
                .eq("handle", handle);
              // Auto-fill the generation from spouse if not set
              if (!form.birth_year) {
                await supabase
                  .from("people")
                  .update({ generation: spousePerson.generation })
                  .eq("handle", handle);
              }
            }
          }
        }

        // Refresh list
        await fetchPeople();
        closeModal();
      }
    } catch (err: unknown) {
      setFormError(
        `Lỗi: ${err instanceof Error ? err.message : "Lỗi không xác định"}`,
      );
    } finally {
      setSaving(false);
    }
  };

  const filtered = people.filter((p) => {
    if (search && !p.display_name.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  // ─────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-muted-foreground">
          Bạn không có quyền truy cập trang này.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Quản lý Gia phả
          </h1>
          <p className="text-muted-foreground">
            Thêm, sửa, xóa thành viên gia phả trực tiếp
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={fetchPeople}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
          <Button onClick={openAddModal}>
            <Plus className="mr-2 h-4 w-4" />
            Thêm thành viên
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Tìm theo tên..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading && people.length === 0 ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Họ tên</TableHead>
                  <TableHead>Đời</TableHead>
                  <TableHead>Giới tính</TableHead>
                  <TableHead>Năm sinh</TableHead>
                  <TableHead>Năm mất</TableHead>
                  <TableHead>Tình trạng</TableHead>
                  <TableHead>Tộc</TableHead>
                  <TableHead className="w-24 text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.handle}>
                    <TableCell className="font-medium">
                      {p.display_name}
                      {p.is_privacy_filtered && (
                        <span className="ml-1" title="Bị ẩn thông tin">
                          🔒
                        </span>
                      )}
                    </TableCell>
                    <TableCell>Đời {p.generation}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {p.gender === 1 ? "Nam" : "Nữ"}
                      </Badge>
                    </TableCell>
                    <TableCell>{p.birth_year || "—"}</TableCell>
                    <TableCell>{p.death_year || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={p.is_living ? "default" : "secondary"}>
                        {p.is_living ? "Còn sống" : "Đã mất"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={p.is_patrilineal ? "default" : "outline"}
                        className={
                          p.is_patrilineal
                            ? "bg-indigo-100 text-indigo-700 border-indigo-200"
                            : "text-stone-500"
                        }
                      >
                        {p.is_patrilineal ? "Chính tộc" : "Ngoại tộc"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Sửa thông tin"
                          onClick={() => openEditModal(p)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(p.handle, p.display_name)}
                          disabled={processingId === p.handle}
                          title="Xóa vĩnh viễn"
                        >
                          {processingId === p.handle ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center text-muted-foreground py-12"
                    >
                      {search
                        ? "Không tìm thấy kết quả"
                        : "Chưa có dữ liệu thành viên"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Tổng: {filtered.length} / {people.length} thành viên
        {search && " (đang lọc)"}
      </p>

      {/* ─── Modal Thêm / Sửa ─── */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeModal}
          />

          {/* Dialog */}
          <div className="relative bg-background rounded-xl shadow-2xl border w-full max-w-md mx-4 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">
                  {editPerson
                    ? "Sửa thông tin thành viên"
                    : "Thêm thành viên mới"}
                </h2>
              </div>
              <button
                onClick={closeModal}
                className="p-1 rounded hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Họ tên */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Họ và tên <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="Vd: Nguyễn Văn A"
                  value={form.display_name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, display_name: e.target.value }))
                  }
                  autoFocus
                />
              </div>

              {/* Giới tính + Đời */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Giới tính</label>
                  <select
                    className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                    value={form.gender}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        gender: parseInt(e.target.value),
                        is_patrilineal: parseInt(e.target.value) === 1,
                      }))
                    }
                  >
                    <option value={1}>Nam</option>
                    <option value={2}>Nữ</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Đời (thế hệ)</label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={form.generation}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        generation: parseInt(e.target.value) || 1,
                      }))
                    }
                  />
                </div>
              </div>

              {/* Năm sinh + Năm mất */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Năm sinh</label>
                  <Input
                    type="number"
                    placeholder="Vd: 1985"
                    value={form.birth_year}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, birth_year: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Năm mất</label>
                  <Input
                    type="number"
                    placeholder="Để trống nếu còn sống"
                    value={form.death_year}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, death_year: e.target.value }))
                    }
                  />
                </div>
              </div>

              {/* Tình trạng + Tộc */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Tình trạng</label>
                  <select
                    className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                    value={form.is_living ? "1" : "0"}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        is_living: e.target.value === "1",
                        death_year: e.target.value === "1" ? "" : f.death_year,
                      }))
                    }
                  >
                    <option value="1">● Còn sống</option>
                    <option value="0">✝ Đã mất</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Thuộc tộc</label>
                  <select
                    className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                    value={form.is_patrilineal ? "1" : "0"}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        is_patrilineal: e.target.value === "1",
                      }))
                    }
                  >
                    <option value="1">Chính tộc (con trai dòng chính)</option>
                    <option value="0">Ngoại tộc (vợ / dâu / rể)</option>
                  </select>
                </div>
              </div>

              {/* Gán cha (chỉ khi thêm mới và là chính tộc) */}
              {!editPerson && form.is_patrilineal && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">
                    Gán vào con của (tùy chọn)
                  </label>
                  <select
                    className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                    value={form.parent_handle}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        parent_handle: e.target.value,
                        generation: e.target.value
                          ? (people.find((p) => p.handle === e.target.value)
                              ?.generation || 0) + 1
                          : f.generation,
                      }))
                    }
                  >
                    <option value="">— Không chọn (thành viên gốc) —</option>
                    {people
                      .filter((p) => p.gender === 1)
                      .sort((a, b) => a.generation - b.generation)
                      .map((p) => (
                        <option key={p.handle} value={p.handle}>
                          Đời {p.generation} · {p.display_name}
                        </option>
                      ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Chọn người cha để gán thành viên mới vào trong cây gia phả.
                  </p>
                </div>
              )}

              {/* Gán vợ/chồng (chỉ khi ngoại tộc và thêm mới) */}
              {!editPerson && !form.is_patrilineal && (
                <div className="space-y-1.5 rounded-lg border border-pink-200 bg-pink-50/50 dark:bg-pink-950/20 dark:border-pink-800 px-3 py-3">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    <span>❤</span>
                    Là vợ / chồng của
                  </label>
                  <select
                    className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                    value={form.spouse_handle}
                    onChange={(e) => {
                      const spousePerson = people.find(
                        (p) => p.handle === e.target.value,
                      );
                      setForm((f) => ({
                        ...f,
                        spouse_handle: e.target.value,
                        // Auto-sync generation from spouse
                        generation: spousePerson
                          ? spousePerson.generation
                          : f.generation,
                      }));
                    }}
                  >
                    <option value="">— Không chọn —</option>
                    {people
                      .filter((p) => p.is_patrilineal)
                      .sort((a, b) => a.generation - b.generation)
                      .map((p) => (
                        <option key={p.handle} value={p.handle}>
                          Đời {p.generation} · {p.display_name}{" "}
                          {p.gender === 1 ? "(Nam)" : "(Nữ)"}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Error */}
              {formError && (
                <div className="bg-destructive/10 text-destructive text-sm rounded-md px-3 py-2">
                  {formError}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-5 py-4 border-t bg-muted/30 rounded-b-xl">
              <Button variant="outline" onClick={closeModal} disabled={saving}>
                Hủy
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {editPerson ? "Lưu thay đổi" : "Thêm thành viên"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function cn(...inputs: (string | boolean | undefined | null)[]) {
  return inputs.filter(Boolean).join(" ");
}
