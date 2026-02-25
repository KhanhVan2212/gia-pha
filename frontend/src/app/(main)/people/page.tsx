"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Search, Filter, UserCircle, ShieldCheck } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Person {
  handle: string;
  displayName: string;
  gender: number;
  birthYear?: number;
  generation?: number;
  isLiving: boolean;
  isPrivacyFiltered: boolean;
}

export default function PeopleListPage() {
  const router = useRouter();
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState<number | null>(null);
  const [livingFilter, setLivingFilter] = useState<boolean | null>(null);

  useEffect(() => {
    const fetchPeople = async () => {
      try {
        const { supabase } = await import("@/lib/supabase");
        const { data, error } = await supabase
          .from("people")
          .select(
            "handle, display_name, gender, birth_year, generation, is_living, is_privacy_filtered",
          )
          .order("birth_year", { ascending: true, nullsFirst: false });
        if (!error && data) {
          setPeople(
            data.map((row: any) => ({
              handle: row.handle,
              displayName: row.display_name,
              gender: row.gender,
              birthYear: row.birth_year,
              generation: row.generation,
              isLiving: row.is_living,
              isPrivacyFiltered: row.is_privacy_filtered,
            })),
          );
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPeople();
  }, []);

  const filtered = people.filter((p) => {
    if (search && !p.displayName.toLowerCase().includes(search.toLowerCase()))
      return false;
    if (genderFilter !== null && p.gender !== genderFilter) return false;
    if (livingFilter !== null && p.isLiving !== livingFilter) return false;
    return true;
  });

  return (
    <div className="space-y-8 pb-8">
      {/* Header Section - Đồng bộ style với Home */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-primary/10 via-primary/5 to-transparent p-6 md:p-10 border border-primary/10 shadow-sm">
        <div className="relative z-10">
          <div className="inline-flex items-center rounded-full px-3 py-1 text-xs md:text-sm font-medium text-emerald-600 bg-emerald-500/10 mb-4">
            <Users className="h-4 w-4 mr-2" /> Danh mục dòng tộc
          </div>
          <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-foreground mb-2">
            Thành viên <span className="text-primary">Gia phả</span>
          </h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-2xl">
            Tra cứu và tìm kiếm thông tin chi tiết của {people.length} thành
            viên trong dòng họ Nguyễn.
          </p>
        </div>
        <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-primary/10 rounded-full blur-3xl opacity-60 pointer-events-none" />
      </div>

      {/* Filters Area */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm tên thành viên..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-xl border-muted focus-visible:ring-primary/20"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="bg-muted/50 p-1 rounded-full border flex gap-1">
              <Button
                variant={genderFilter === null ? "secondary" : "ghost"}
                size="sm"
                className="rounded-full text-xs"
                onClick={() => setGenderFilter(null)}
              >
                Tất cả
              </Button>
              <Button
                variant={genderFilter === 1 ? "secondary" : "ghost"}
                size="sm"
                className="rounded-full text-xs"
                onClick={() => setGenderFilter(1)}
              >
                Nam
              </Button>
              <Button
                variant={genderFilter === 2 ? "secondary" : "ghost"}
                size="sm"
                className="rounded-full text-xs"
                onClick={() => setGenderFilter(2)}
              >
                Nữ
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Table Card */}
      <Card className="rounded-3xl border-muted overflow-hidden shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="font-bold py-4">Họ và tên</TableHead>
                  <TableHead className="font-bold">Giới tính</TableHead>
                  <TableHead className="font-bold">Năm sinh</TableHead>
                  <TableHead className="font-bold text-right pr-6">
                    Trạng thái
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-5 w-40" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-12" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="h-5 w-20 ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filtered.length > 0 ? (
                  filtered.map((p) => (
                    <TableRow
                      key={p.handle}
                      className="group cursor-pointer hover:bg-primary/5 transition-colors"
                      onClick={() => router.push(`/people/${p.handle}`)}
                    >
                      <TableCell className="py-4">
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "p-2 rounded-lg group-hover:bg-white transition-colors",
                              p.gender === 1 ? "bg-blue-50" : "bg-rose-50",
                            )}
                          >
                            <UserCircle
                              className={cn(
                                "h-4 w-4",
                                p.gender === 1
                                  ? "text-blue-600"
                                  : "text-rose-600",
                              )}
                            />
                          </div>
                          <span className="font-semibold group-hover:text-primary transition-colors">
                            {p.displayName}{" "}
                            <span className="text-muted-foreground font-normal text-sm">
                              (Đời thứ {p.generation || "?"}
                              {!p.isLiving ? " - mất" : ""})
                            </span>
                          </span>
                          {p.isPrivacyFiltered && (
                            <ShieldCheck className="h-3.5 w-3.5 text-amber-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="rounded-md font-normal"
                        >
                          {p.gender === 1
                            ? "Nam"
                            : p.gender === 2
                              ? "Nữ"
                              : "Khác"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {p.birthYear || "—"}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Badge
                          className={cn(
                            "rounded-full px-3",
                            p.isLiving
                              ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-transparent"
                              : "bg-slate-100 text-slate-500 hover:bg-slate-200 border-transparent",
                          )}
                        >
                          {p.isLiving ? "Còn sống" : "Đã mất"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <Search className="h-10 w-10 mb-2 opacity-20" />
                        <p>Không tìm thấy thành viên phù hợp</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
