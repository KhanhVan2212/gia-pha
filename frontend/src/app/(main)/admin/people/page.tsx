"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
  FileEdit,
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
  updated_at?: string;
}

interface Family {
  handle: string;
  father_handle: string | null;
  mother_handle: string | null;
  children: string[];
}

interface PersonFormData {
  display_name: string;
  gender: number;
  generation: number;
  birth_year: string;
  death_year: string;
  is_living: boolean;
  is_patrilineal: boolean;
  parent_handle: string; // Used as father_handle
  mother_handle: string; // New: handle of mother
  spouse_handle: string;
  child_handles: string[];
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
  mother_handle: "",
  spouse_handle: "",
  child_handles: [],
};

export default function AdminPeoplePage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [people, setPeople] = useState<Person[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
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
      const [peopleRes, familiesRes] = await Promise.all([
        supabase
          .from("people")
          .select("*")
          .order("generation", { ascending: true })
          .order("display_name", { ascending: true }),
        supabase.from("families").select("*"),
      ]);

      if (!peopleRes.error && peopleRes.data)
        setPeople(peopleRes.data as Person[]);
      if (!familiesRes.error && familiesRes.data) setFamilies(familiesRes.data);
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
  const handleDelete = (handle: string, name: string) => {
    toast("Xác nhận xóa", {
      description: `Bạn có chắc chắn muốn xóa "${name}" khỏi gia phả?\n\n⚠️ Hành động này không thể hoàn tác và sẽ xóa thành viên khỏi cơ sở dữ liệu.`,
      duration: 10000,
      action: {
        label: "Xóa",
        onClick: async () => {
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
            toast.success("Đã xóa thành viên");
          } catch (err: unknown) {
            toast.error(
              `Lỗi khi xóa: ${err instanceof Error ? err.message : "Lỗi không xác định"}`,
            );
          } finally {
            setProcessingId(null);
            // Automatically clean up any families that might have become empty
            await cleanupFamilies();
          }
        },
      },
      cancel: {
        label: "Hủy",
        onClick: () => {},
      },
    });
  };

  // ─── Cleanup Empty Families ────────────────────────────────
  const cleanupFamilies = async () => {
    try {
      // 1. Fetch current data
      const { data: fams } = await supabase.from("families").select("*");
      const { data: peps } = await supabase.from("people").select("handle");

      if (!fams || !peps) return;

      const personHandles = new Set(peps.map((p) => p.handle));
      const toDelete: string[] = [];

      for (const fam of fams as Family[]) {
        // A family is "zombie" if:
        // 1. No parents (or parents don't exist in people table)
        // 2. AND No children (or children don't exist in people table)

        const fatherExists =
          fam.father_handle && personHandles.has(fam.father_handle);
        const motherExists =
          fam.mother_handle && personHandles.has(fam.mother_handle);
        const validChildren = (fam.children || []).filter((c) =>
          personHandles.has(c),
        );

        if (!fatherExists && !motherExists && validChildren.length === 0) {
          toDelete.push(fam.handle);
        }
      }

      if (toDelete.length > 0) {
        console.log(
          `Cleaning up ${toDelete.length} zombie families:`,
          toDelete,
        );
        await supabase.from("families").delete().in("handle", toDelete);
        // Refresh families state
        const { data: newFams } = await supabase.from("families").select("*");
        if (newFams) setFamilies(newFams);
      }
      return toDelete.length;
    } catch (err) {
      console.error("Cleanup error:", err);
      return 0;
    }
  };

  const handleManualCleanup = async () => {
    setLoading(true);
    const count = await cleanupFamilies();
    toast.success(`Đã dọn dẹp ${count} bản ghi gia đình trống.`);
    setLoading(false);
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
    setEditPerson(person);
    setFormError("");
    // Find parent_handle and spouse_handle from existing families
    let fatherHandle = "";
    let motherHandle = "";
    let spouseHandle = "";

    // If person is child in some family -> get parents
    const parentFam = families.find((f) => f.children.includes(person.handle));
    if (parentFam) {
      fatherHandle = parentFam.father_handle || "";
      motherHandle = parentFam.mother_handle || "";
    }

    // If person is parent in some family -> get spouse
    const spouseFam = families.find(
      (f) =>
        f.father_handle === person.handle || f.mother_handle === person.handle,
    );
    if (spouseFam) {
      spouseHandle =
        spouseFam.father_handle === person.handle
          ? spouseFam.mother_handle || ""
          : spouseFam.father_handle || "";
    }

    setForm({
      display_name: person.display_name,
      gender: person.gender,
      generation: person.generation,
      birth_year: person.birth_year?.toString() || "",
      death_year: person.death_year?.toString() || "",
      is_living: person.is_living,
      is_patrilineal: person.is_patrilineal,
      parent_handle: fatherHandle,
      mother_handle: motherHandle,
      spouse_handle: spouseHandle,
      child_handles: [], // Not used for now in edit
    });
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
      const personMap = new Map(people.map((p) => [p.handle, p]));
      const familyMap = new Map(families.map((f) => [f.handle, f]));
      const pendingGenUpdates = new Map<string, number>();

      const syncGens = (h: string, targetGen: number, visited: Set<string>) => {
        if (visited.has(h)) return;
        visited.add(h);

        const p = personMap.get(h);
        if (!p) return;

        pendingGenUpdates.set(h, targetGen);

        // Sync spouses (at same generation) and children (at Gen + 1)
        for (const famHandle of p.families || []) {
          const fam = familyMap.get(famHandle);
          if (!fam) continue;

          const spouseHandle =
            fam.father_handle === h ? fam.mother_handle : fam.father_handle;
          if (spouseHandle) {
            syncGens(spouseHandle, targetGen, visited);
          }

          for (const childHandle of fam.children || []) {
            syncGens(childHandle, targetGen + 1, visited);
          }
        }
      };

      if (editPerson) {
        // ── EDIT mode ──
        const updates: Partial<Person> = {
          display_name: form.display_name.trim(),
          gender: form.gender,
          generation: form.generation,
          birth_year: form.birth_year ? parseInt(form.birth_year) : undefined,
          death_year: form.death_year ? parseInt(form.death_year) : undefined,
          is_living: form.is_living,
          is_patrilineal: form.is_patrilineal,
          families: editPerson.families || [],
          parent_families: editPerson.parent_families || [],
          updated_at: new Date().toISOString(),
        };

        // Circular Dependency Guard (Check both father and mother)
        const checkCircular = (startHandle: string) => {
          const ancestors = new Set<string>();
          let curr: string | undefined = startHandle;
          while (curr) {
            if (curr === editPerson.handle) return true;
            ancestors.add(curr);
            const parentP = personMap.get(curr);
            const pfHandle = parentP?.parent_families?.[0];
            const pf = pfHandle ? familyMap.get(pfHandle) : null;
            // Simplified: just follow father line or mother line for guard
            curr = pf?.father_handle || pf?.mother_handle || undefined;
            if (ancestors.has(curr || "")) break;
          }
          return false;
        };

        if (form.parent_handle && checkCircular(form.parent_handle)) {
          setFormError(
            "Không thể gán người này làm con của chính con cháu họ.",
          );
          setSaving(false);
          return;
        }
        if (form.mother_handle && checkCircular(form.mother_handle)) {
          setFormError(
            "Không thể gán người này làm con của chính con cháu họ (mẹ).",
          );
          setSaving(false);
          return;
        }

        // Initialize sync for this person and descendants
        const visitedTotal = new Set<string>();
        syncGens(editPerson.handle, form.generation, visitedTotal);

        // 1. Parent relationship changes
        let oldFatherHandle = "";
        let oldMotherHandle = "";
        if (editPerson.parent_families?.length > 0) {
          const pf = families.find(
            (f) => f.handle === editPerson.parent_families[0],
          );
          if (pf) {
            oldFatherHandle = pf.father_handle || "";
            oldMotherHandle = pf.mother_handle || "";
          }
        }

        const targetFatherHandle = form.parent_handle;
        const targetMotherHandle = form.mother_handle;
        if (
          targetFatherHandle !== oldFatherHandle ||
          targetMotherHandle !== oldMotherHandle
        ) {
          // Remove from old
          if (editPerson.parent_families?.length > 0) {
            const ofHandle = editPerson.parent_families[0];
            const of = families.find((f) => f.handle === ofHandle);
            if (of) {
              const nc = (of.children || []).filter(
                (c) => c !== editPerson.handle,
              );
              await supabase
                .from("families")
                .update({ children: nc })
                .eq("handle", ofHandle);
            }
          }
          // Add to new
          if (targetFatherHandle || targetMotherHandle) {
            // Find existing family for this couple
            let query = supabase.from("families").select("*");
            if (targetFatherHandle)
              query = query.eq("father_handle", targetFatherHandle);
            else query = query.is("father_handle", null);

            if (targetMotherHandle)
              query = query.eq("mother_handle", targetMotherHandle);
            else query = query.is("mother_handle", null);

            const { data: nfamData } = await query.limit(1);

            if (nfamData && nfamData.length > 0) {
              const nfam = nfamData[0];
              await supabase
                .from("families")
                .update({
                  children: [...(nfam.children || []), editPerson.handle],
                })
                .eq("handle", nfam.handle);
              updates.parent_families = [nfam.handle];
            } else {
              const baseHandle = targetFatherHandle || targetMotherHandle;
              const nfamHandle = `f-${baseHandle}-${Date.now()}`;
              await supabase.from("families").insert({
                handle: nfamHandle,
                father_handle: targetFatherHandle || null,
                mother_handle: targetMotherHandle || null,
                children: [editPerson.handle],
              });
              updates.parent_families = [nfamHandle];

              // Update parents' families list
              if (targetFatherHandle) {
                const pObj = personMap.get(targetFatherHandle);
                if (pObj) {
                  await supabase
                    .from("people")
                    .update({
                      families: [...(pObj.families || []), nfamHandle],
                    })
                    .eq("handle", targetFatherHandle);
                }
              }
              if (targetMotherHandle) {
                const pObj = personMap.get(targetMotherHandle);
                if (pObj) {
                  await supabase
                    .from("people")
                    .update({
                      families: [...(pObj.families || []), nfamHandle],
                    })
                    .eq("handle", targetMotherHandle);
                }
              }
            }
          } else {
            updates.parent_families = [];
          }
        }

        // 2. Spouse relationship changes
        let oldSpouseHandle = "";
        if (editPerson.families?.length > 0) {
          const f = families.find((f) => f.handle === editPerson.families[0]);
          if (f)
            oldSpouseHandle =
              f.father_handle === editPerson.handle
                ? f.mother_handle || ""
                : f.father_handle || "";
        }
        const targetSpouseHandle = !form.is_patrilineal
          ? form.spouse_handle
          : oldSpouseHandle; // Preserve old spouse if patrilineal (where spouse_handle selector is hidden)
        if (targetSpouseHandle !== oldSpouseHandle) {
          // Skip complex cleanup of old spouse families for now, just clear the link
          if (oldSpouseHandle && editPerson.families?.length > 0) {
            const ofHandle = editPerson.families[0];
            const of = families.find((f) => f.handle === ofHandle);
            if (of) {
              const field =
                of.father_handle === editPerson.handle
                  ? "father_handle"
                  : "mother_handle";
              await supabase
                .from("families")
                .update({ [field]: null })
                .eq("handle", ofHandle);
            }
          }
          // Link to new spouse
          if (targetSpouseHandle) {
            const { data: cf } = await supabase
              .from("families")
              .select("*")
              .or(
                `father_handle.eq.${targetSpouseHandle},mother_handle.eq.${targetSpouseHandle}`,
              )
              .limit(1);
            if (cf && cf.length > 0) {
              const fam = cf[0];
              const field =
                form.gender === 1 ? "father_handle" : "mother_handle";
              if (!fam[field]) {
                await supabase
                  .from("families")
                  .update({ [field]: editPerson.handle })
                  .eq("handle", fam.handle);
                updates.families = [fam.handle];
              }
            } else {
              const nfh = `f-${targetSpouseHandle}-${Date.now()}`;
              const sObj = personMap.get(targetSpouseHandle);
              await supabase.from("families").insert({
                handle: nfh,
                father_handle:
                  sObj?.gender === 1 ? targetSpouseHandle : editPerson.handle,
                mother_handle:
                  sObj?.gender === 1 ? editPerson.handle : targetSpouseHandle,
                children: [],
              });
              updates.families = [nfh];
              if (sObj)
                await supabase
                  .from("people")
                  .update({ families: [...(sObj.families || []), nfh] })
                  .eq("handle", targetSpouseHandle);
            }
          } else {
            // Only clear it if we explicitly want to remove the spouse link
            // and NOT if we are just a patrilineal member whose field is hidden
            if (!form.is_patrilineal) {
              updates.families = (updates.families || []).filter(
                (fh) =>
                  !families.find((f) => f.handle === fh)?.children?.length,
              );
            }
          }
        }

        // 3. Child handles (Link Children)
        const isMale = form.gender === 1;
        let pFamHandle = (editPerson.families || [])[0];
        if (form.child_handles.length > 0) {
          if (!pFamHandle) {
            pFamHandle = `f-${editPerson.handle}-${Date.now()}`;
            await supabase.from("families").insert({
              handle: pFamHandle,
              father_handle: isMale ? editPerson.handle : null,
              mother_handle: isMale ? null : editPerson.handle,
              children: form.child_handles,
            });
            if (!updates.families?.includes(pFamHandle)) {
              updates.families = [...(updates.families || []), pFamHandle];
            }
          } else {
            await supabase
              .from("families")
              .update({ children: form.child_handles })
              .eq("handle", pFamHandle);
          }
          // Sync children
          for (const ch of form.child_handles) {
            await supabase
              .from("people")
              .update({ parent_families: [pFamHandle] })
              .eq("handle", ch);
            syncGens(ch, form.generation + 1, visitedTotal);
          }
        }

        // Apply all updates
        for (const [h, g] of Array.from(pendingGenUpdates.entries())) {
          if (h !== editPerson.handle)
            await supabase
              .from("people")
              .update({ generation: g })
              .eq("handle", h);
        }
        const { error } = await supabase
          .from("people")
          .update(updates)
          .eq("handle", editPerson.handle);
        if (error) throw error;
        toast.success("Cập nhật thành viên thành công");
      } else {
        // ── ADD mode ──
        const handle = `p-${Date.now()}`;
        const { error: pErr } = await supabase.from("people").insert({
          handle,
          display_name: form.display_name.trim(),
          gender: form.gender,
          generation: form.generation,
          birth_year: form.birth_year ? parseInt(form.birth_year) : undefined,
          death_year: form.death_year ? parseInt(form.death_year) : undefined,
          is_living: form.is_living,
          is_patrilineal: form.is_patrilineal,
          is_privacy_filtered: false,
          families: [],
          parent_families: [],
        });
        if (pErr) throw pErr;

        // Parent linkage (Father & Mother)
        if (form.parent_handle || form.mother_handle) {
          // Find existing family for this couple
          let query = supabase.from("families").select("*");
          if (form.parent_handle)
            query = query.eq("father_handle", form.parent_handle);
          else query = query.is("father_handle", null);

          if (form.mother_handle)
            query = query.eq("mother_handle", form.mother_handle);
          else query = query.is("mother_handle", null);

          const { data: nfamData } = await query.limit(1);

          if (nfamData && nfamData.length > 0) {
            const nfam = nfamData[0];
            await supabase
              .from("families")
              .update({ children: [...(nfam.children || []), handle] })
              .eq("handle", nfam.handle);
            await supabase
              .from("people")
              .update({ parent_families: [nfam.handle] })
              .eq("handle", handle);
          } else {
            const baseHandle = form.parent_handle || form.mother_handle;
            const nfHandle = `f-${baseHandle}-${Date.now()}`;
            await supabase.from("families").insert({
              handle: nfHandle,
              father_handle: form.parent_handle || null,
              mother_handle: form.mother_handle || null,
              children: [handle],
            });
            await supabase
              .from("people")
              .update({ parent_families: [nfHandle] })
              .eq("handle", handle);

            if (form.parent_handle) {
              const pObj = personMap.get(form.parent_handle);
              if (pObj)
                await supabase
                  .from("people")
                  .update({ families: [...(pObj.families || []), nfHandle] })
                  .eq("handle", form.parent_handle);
            }
            if (form.mother_handle) {
              const pObj = personMap.get(form.mother_handle);
              if (pObj)
                await supabase
                  .from("people")
                  .update({ families: [...(pObj.families || []), nfHandle] })
                  .eq("handle", form.mother_handle);
            }
          }
        }

        // Spouse linkage
        if (!form.is_patrilineal && form.spouse_handle) {
          const { data: cf } = await supabase
            .from("families")
            .select("*")
            .or(
              `father_handle.eq.${form.spouse_handle},mother_handle.eq.${form.spouse_handle}`,
            )
            .limit(1);
          if (cf && cf.length > 0) {
            const fam = cf[0];
            const field = form.gender === 1 ? "father_handle" : "mother_handle";
            if (!fam[field]) {
              await supabase
                .from("families")
                .update({ [field]: handle })
                .eq("handle", fam.handle);
              await supabase
                .from("people")
                .update({ families: [fam.handle] })
                .eq("handle", handle);
            }
          } else {
            const nfh = `f-${form.spouse_handle}-${Date.now()}`;
            const sObj = personMap.get(form.spouse_handle);
            await supabase.from("families").insert({
              handle: nfh,
              father_handle: sObj?.gender === 1 ? form.spouse_handle : handle,
              mother_handle: sObj?.gender === 1 ? handle : form.spouse_handle,
              children: [],
            });
            await supabase
              .from("people")
              .update({ families: [nfh] })
              .eq("handle", handle);
            if (sObj)
              await supabase
                .from("people")
                .update({ families: [...(sObj.families || []), nfh] })
                .eq("handle", form.spouse_handle);
          }
        }

        // Child linkage (Xây ngược)
        if (form.child_handles.length > 0) {
          const nfamHandle = `f-${handle}-${Date.now()}`;
          const isMaleAdd = form.gender === 1;
          await supabase.from("families").insert({
            handle: nfamHandle,
            father_handle: isMaleAdd ? handle : null,
            mother_handle: isMaleAdd ? null : handle,
            children: form.child_handles,
          });
          await supabase
            .from("people")
            .update({ families: [nfamHandle] })
            .eq("handle", handle);
          for (const ch of form.child_handles) {
            await supabase
              .from("people")
              .update({
                parent_families: [nfamHandle],
                generation: form.generation + 1,
              })
              .eq("handle", ch);
            const visited = new Set<string>();
            visited.add(handle);
            syncGens(ch, form.generation + 1, visited);
            // Apply nested updates for child's branch in ADD mode
            for (const [ah, ag] of Array.from(pendingGenUpdates.entries())) {
              if (ah !== handle)
                await supabase
                  .from("people")
                  .update({ generation: ag })
                  .eq("handle", ah);
            }
          }
        }
        toast.success("Thêm thành viên thành công");
      }

      await fetchPeople();
      closeModal();
    } catch (err: unknown) {
      const errorMessage = `Lỗi: ${err instanceof Error ? err.message : "Lỗi không xác định"}`;
      setFormError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSaving(false);
      await cleanupFamilies();
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
          <Button
            variant="outline"
            onClick={handleManualCleanup}
            disabled={loading}
          >
            Dọn dẹp
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
                          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950"
                          title="Sửa thông tin cá nhân"
                          onClick={() =>
                            router.push(`/admin/people/${p.handle}`)
                          }
                        >
                          <FileEdit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Sửa cấu trúc gia phả"
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
                        // Keep is_patrilineal as is, user can change it manually if needed
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

              {/* Gán cha mẹ (hiển thị cho tất cả thành viên, bao gồm cả cháu ngoại) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Chọn cha</label>
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
                    <option value="">— Không chọn (chưa rõ cha) —</option>
                    {people
                      .filter(
                        (p) =>
                          p.gender === 1 &&
                          p.handle !== editPerson?.handle &&
                          (form.generation > 1
                            ? p.generation === form.generation - 1
                            : true),
                      )
                      .sort((a, b) => a.generation - b.generation)
                      .map((p) => {
                        let spouseName = "";
                        const fam = families.find(
                          (f) =>
                            f.father_handle === p.handle && f.mother_handle,
                        );
                        if (fam && fam.mother_handle) {
                          const spouse = people.find(
                            (sp) => sp.handle === fam.mother_handle,
                          );
                          if (spouse) {
                            spouseName = ` (${spouse.display_name})`;
                          }
                        }

                        return (
                          <option key={p.handle} value={p.handle}>
                            Đời {p.generation} · {p.display_name}
                            {spouseName}
                          </option>
                        );
                      })}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Chọn mẹ</label>
                  <select
                    className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                    value={form.mother_handle}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        mother_handle: e.target.value,
                        generation:
                          e.target.value && !f.parent_handle
                            ? (people.find((p) => p.handle === e.target.value)
                                ?.generation || 0) + 1
                            : f.generation,
                      }))
                    }
                  >
                    <option value="">— Không chọn (chưa rõ mẹ) —</option>
                    {people
                      .filter(
                        (p) =>
                          p.gender === 2 &&
                          p.handle !== editPerson?.handle &&
                          (form.generation > 1
                            ? p.generation === form.generation - 1
                            : true),
                      )
                      .sort((a, b) => a.generation - b.generation)
                      .map((p) => {
                        let husbandName = "";
                        const fam = families.find(
                          (f) =>
                            f.mother_handle === p.handle && f.father_handle,
                        );
                        if (fam && fam.father_handle) {
                          const husband = people.find(
                            (hp) => hp.handle === fam.father_handle,
                          );
                          if (husband) {
                            husbandName = ` (${husband.display_name})`;
                          }
                        }

                        return (
                          <option key={p.handle} value={p.handle}>
                            Đời {p.generation} · {p.display_name}
                            {husbandName}
                          </option>
                        );
                      })}
                  </select>
                </div>
              </div>

              {/* Gán vợ/chồng (chỉ khi ngoại tộc) */}
              {!form.is_patrilineal && (
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
                    <option value="">— Không chọn (độc thân) —</option>
                    {people
                      .filter(
                        (p) =>
                          p.is_patrilineal && p.handle !== editPerson?.handle,
                      )
                      .sort((a, b) => a.generation - b.generation)
                      .map((p) => {
                        let parentStr = "";
                        if (p.parent_families && p.parent_families.length > 0) {
                          const pf = families.find(
                            (f) => f.handle === p.parent_families[0],
                          );
                          if (pf && pf.father_handle) {
                            const father = people.find(
                              (hp) => hp.handle === pf.father_handle,
                            );
                            if (father) {
                              parentStr = ` (${father.display_name})`;
                            }
                          }
                        }

                        return (
                          <option key={p.handle} value={p.handle}>
                            Đời {p.generation} · {p.display_name}
                            {parentStr}
                          </option>
                        );
                      })}
                  </select>
                </div>
              )}

              {/* Gán con (Gán ngược) */}
              <div className="space-y-2 rounded-lg border border-indigo-100 bg-indigo-50/30 dark:bg-indigo-950/10 dark:border-indigo-900 px-3 py-3">
                <label className="text-sm font-medium flex items-center gap-1.5 text-indigo-700 dark:text-indigo-400">
                  <RefreshCw className="h-4 w-4" />
                  Chọn các con
                </label>
                <div className="max-h-32 overflow-y-auto border rounded bg-background p-2 space-y-1">
                  {people
                    .filter(
                      (p) =>
                        p.handle !== editPerson?.handle &&
                        p.generation === Number(form.generation) + 1 &&
                        ((p.parent_families?.length ?? 0) === 0 ||
                          form.child_handles.includes(p.handle)),
                    )
                    .sort((a, b) => a.generation - b.generation)
                    .map((p) => (
                      <div
                        key={p.handle}
                        className="flex items-center gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          id={`child-${p.handle}`}
                          className="rounded border-gray-300"
                          checked={form.child_handles.includes(p.handle)}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setForm((f) => ({
                              ...f,
                              child_handles: checked
                                ? [...f.child_handles, p.handle]
                                : f.child_handles.filter((h) => h !== p.handle),
                            }));
                          }}
                        />
                        <label
                          htmlFor={`child-${p.handle}`}
                          className="cursor-pointer"
                        >
                          Đời {p.generation} · {p.display_name}
                        </label>
                      </div>
                    ))}
                  {people.filter(
                    (p) =>
                      p.handle !== editPerson?.handle &&
                      p.generation === Number(form.generation) + 1 &&
                      ((p.parent_families?.length ?? 0) === 0 ||
                        form.child_handles.includes(p.handle)),
                  ).length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      Không có thành viên ở đời thấp hơn
                    </p>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Chọn các thành viên hiện có để gán họ làm con của người này.
                </p>
              </div>

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
