'use client';

import { useEffect, useState, useRef } from 'react';
import { Printer, ArrowLeft, BookOpen, Eye, Palette, Check, Info, FileText, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchTreeData } from '@/lib/supabase-data';
import { generateBookData, type BookData, type BookPerson, type BookChapter } from '@/lib/book-generator';
import type { TreeNode, TreeFamily } from '@/lib/tree-layout';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// ═══ Color Themes ═══
interface Theme {
    name: string; swatch: string;
    primary: string; primaryLight: string; primaryBg: string;
    secondary: string; accent: string;
    border: string; borderLight: string;
    text: string; textMuted: string;
}

const THEMES: Record<string, Theme> = {
    amber: {
        name: 'Cổ điển', swatch: '#92400e',
        primary: '#92400e', primaryLight: '#fef3c7', primaryBg: '#fffbeb',
        secondary: '#b45309', accent: '#d97706',
        border: '#f59e0b', borderLight: '#fde68a',
        text: '#451a03', textMuted: '#92400e99',
    },
    emerald: {
        name: 'Thanh nhã', swatch: '#065f46',
        primary: '#065f46', primaryLight: '#d1fae5', primaryBg: '#ecfdf5',
        secondary: '#047857', accent: '#059669',
        border: '#34d399', borderLight: '#a7f3d0',
        text: '#022c22', textMuted: '#06534099',
    },
    slate: {
        name: 'Hiện đại', swatch: '#1e293b',
        primary: '#1e293b', primaryLight: '#e2e8f0', primaryBg: '#f8fafc',
        secondary: '#334155', accent: '#475569',
        border: '#94a3b8', borderLight: '#cbd5e1',
        text: '#0f172a', textMuted: '#47556999',
    },
};

type ThemeKey = keyof typeof THEMES;

export default function BookPage() {
    const [bookData, setBookData] = useState<BookData | null>(null);
    const [loading, setLoading] = useState(true);
    const [previewMode, setPreviewMode] = useState(false);
    const [theme, setTheme] = useState<ThemeKey>('amber');
    const [showThemePicker, setShowThemePicker] = useState(false);
    const pagesRef = useRef<HTMLDivElement>(null);

    const t = THEMES[theme];

    useEffect(() => {
        const fetchAndGenerate = async () => {
            let people: TreeNode[] = [];
            let families: TreeFamily[] = [];
            try {
                const treeData = await fetchTreeData();
                if (treeData.people.length > 0) {
                    people = treeData.people;
                    families = treeData.families;
                }
            } catch { /* fallback */ }
            
            if (people.length === 0) {
                const { getMockTreeData } = await import('@/lib/mock-data');
                const mock = getMockTreeData();
                people = mock.people;
                families = mock.families;
            }
            const familyName = people.length > 0 ? (people[0].displayName?.split(' ').slice(0, 2).join(' ') || 'Dòng Họ') : 'Dòng Họ';
            const data = generateBookData(people, families, familyName);
            setBookData(data);
            setLoading(false);
        };
        fetchAndGenerate();
    }, []);

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <div className="relative h-16 w-16">
                <BookOpen className="h-16 w-16 text-primary/20 animate-pulse" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                </div>
            </div>
            <p className="text-sm font-medium text-muted-foreground">Đang khởi tạo bản thảo sách gia phả...</p>
        </div>
    );

    if (!bookData) return null;

    // --- Pagination Logic (Giữ nguyên logic của bạn) ---
    const PAGE_H = 1027;
    const HEADER_H = 120;
    const CONT_LABEL_H = 36;
    const GRID_GAP = 16;

    function estimatePersonHeight(person: BookPerson): number {
        let h = 56;
        if (person.fatherName) h += 22;
        if (person.motherName) h += 22;
        if (person.spouseName) h += 22;
        if (person.children.length > 0) h += 30 + (person.children.length * 20);
        return h + 12;
    }

    function packChapterPages(members: BookPerson[], gen: number, roman: string) {
        const result: any[] = [];
        let start = 0, pageIdx = 0;
        while (start < members.length) {
            const isFirst = pageIdx === 0;
            const budget = PAGE_H - (isFirst ? HEADER_H : CONT_LABEL_H);
            let usedH = 0, end = start;
            while (end < members.length) {
                const leftH = estimatePersonHeight(members[end]);
                const rightH = end + 1 < members.length ? estimatePersonHeight(members[end + 1]) : 0;
                const rowH = Math.max(leftH, rightH) + GRID_GAP;
                if (usedH + rowH > budget && end > start) break;
                usedH += rowH;
                end += (end + 1 < members.length) ? 2 : 1;
            }
            result.push({ id: `gen-${gen}-${pageIdx}`, label: `Đời ${roman}${isFirst ? '' : ' (tt)'}`, chapterGen: gen, memberStart: start, memberEnd: end, isFirstPage: isFirst });
            start = end; pageIdx++;
        }
        return result;
    }

    const sections: any[] = [{ id: 'cover', label: 'Bìa sách', pageNum: 1 }, { id: 'toc', label: 'Mục lục', pageNum: 2 }];
    let pageCounter = 3;
    bookData.chapters.forEach(ch => {
        packChapterPages(ch.members, ch.generation, ch.romanNumeral).forEach(p => {
            p.pageNum = pageCounter++;
            sections.push(p);
        });
    });
    sections.push({ id: 'appendix', label: 'Phụ lục', pageNum: pageCounter++ });
    sections.push({ id: 'closing', label: 'Lời kết', pageNum: pageCounter++ });

    return (
        <div className="space-y-6 pb-12">
            {/* ─── TOOLBAR (Sticky) ─── */}
            <div className="no-print sticky top-4 z-50 mx-auto max-w-5xl px-4">
                <div className="bg-white/80 backdrop-blur-xl border border-primary/10 shadow-2xl rounded-3xl p-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <Link href="/tree">
                            <Button variant="ghost" size="sm" className="rounded-2xl hover:bg-primary/5 text-primary">
                                <ArrowLeft className="w-4 h-4 mr-2" /> Quay lại
                            </Button>
                        </Link>
                        <div className="h-6 w-px bg-primary/10 hidden md:block" />
                        <div className="hidden lg:flex items-center gap-2">
                             <FileText className="h-4 w-4 text-muted-foreground" />
                             <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                {bookData.totalMembers} thành viên · {sections.length} trang
                             </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Theme Toggle */}
                        <div className="relative">
                            <Button variant="outline" size="sm" className="rounded-2xl gap-2 border-primary/10 shadow-sm" onClick={() => setShowThemePicker(!showThemePicker)}>
                                <Palette className="w-4 h-4 text-primary" />
                                <span className="hidden sm:inline text-xs font-semibold">{t.name}</span>
                                <div className="w-3 h-3 rounded-full border shadow-inner" style={{ background: t.primary }} />
                            </Button>
                            {showThemePicker && (
                                <div className="absolute right-0 top-full mt-2 bg-white rounded-3xl shadow-2xl border p-4 min-w-[220px] animate-in slide-in-from-top-2 duration-200 z-[100]">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 px-2">Chủ đề sách</p>
                                    <div className="space-y-1">
                                        {Object.entries(THEMES).map(([key, th]) => (
                                            <button key={key} onClick={() => { setTheme(key as ThemeKey); setShowThemePicker(false); }}
                                                className={cn("w-full flex items-center justify-between p-3 rounded-2xl transition-all", theme === key ? "bg-primary/5 shadow-inner" : "hover:bg-muted")}>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-4 h-4 rounded-full border" style={{ background: th.primary }} />
                                                    <span className="text-sm font-semibold">{th.name}</span>
                                                </div>
                                                {theme === key && <Check className="w-4 h-4 text-primary" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <Button variant={previewMode ? "default" : "outline"} size="sm" className="rounded-2xl gap-2 shadow-sm border-primary/10" onClick={() => setPreviewMode(!previewMode)}>
                            <LayoutGrid className="w-4 h-4" />
                            <span className="hidden sm:inline text-xs font-semibold">Dàn trang</span>
                        </Button>

                        <Button onClick={() => window.print()} size="sm" className="rounded-2xl gap-2 bg-slate-900 hover:bg-slate-800 shadow-lg px-5">
                            <Printer className="w-4 h-4" />
                            <span className="hidden sm:inline text-xs font-semibold">In sách PDF</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* ─── BOOK CONTENT ─── */}
            <div className={cn(
                "transition-all duration-500 mx-auto",
                previewMode ? "max-w-7xl px-4" : "max-w-[210mm] shadow-2xl rounded-3xl overflow-hidden"
            )}>
                {previewMode ? (
                    /* Dàn trang Gallery */
                    <div ref={pagesRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 no-print">
                        {sections.map(s => (
                            <div key={s.id} className="group relative">
                                <div className="absolute -top-3 left-4 z-10 bg-slate-900 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg">
                                    Trang {s.pageNum}
                                </div>
                                <div className="aspect-[210/297] bg-white rounded-2xl border border-primary/5 shadow-sm overflow-hidden group-hover:shadow-2xl group-hover:-translate-y-1 transition-all duration-300">
                                    <div className="w-[210mm] h-[297mm] origin-top-left" style={{ transform: `scale(${1/3.5})` }}>
                                        <div className="p-12 h-full" style={{ fontFamily: "'Noto Serif', serif", color: t.text }}>
                                            <BookSectionContent sectionId={s.id} bookData={bookData} theme={t} sectionData={s} />
                                        </div>
                                    </div>
                                </div>
                                <p className="mt-3 text-center text-xs font-bold text-muted-foreground uppercase tracking-widest opacity-60">{s.label}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* Chế độ đọc thông thường */
                    <div className="bg-white p-8 sm:p-12 md:p-20" style={{ fontFamily: "'Noto Serif', serif", color: t.text }}>
                        <div className="space-y-24">
                            <CoverPage bookData={bookData} theme={t} />
                            <section id="toc" className="page-break scroll-mt-24"><TocContent bookData={bookData} theme={t} /></section>
                            {bookData.chapters.map(ch => (
                                <section key={ch.generation} id={`gen-${ch.generation}`} className="page-break scroll-mt-24">
                                    <ChapterContent chapter={ch} theme={t} />
                                </section>
                            ))}
                            <section id="appendix" className="page-break scroll-mt-24"><AppendixContent bookData={bookData} theme={t} /></section>
                            <section id="closing" className="page-break scroll-mt-24 py-20"><ClosingContent bookData={bookData} theme={t} /></section>
                        </div>
                    </div>
                )}
            </div>

            {/* Print Styles */}
            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,400;0,700;1,400&display=swap');
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; margin: 0; }
                    .page-break { page-break-before: always; border: none !important; }
                    @page { size: A4; margin: 20mm; }
                }
            `}} />
        </div>
    );
}

// ═══ Helper Sub-Components ═══

function BookSectionContent({ sectionId, bookData, theme: t, sectionData }: any) {
    if (sectionId === 'cover') return <CoverPage bookData={bookData} theme={t} />;
    if (sectionId === 'toc') return <TocContent bookData={bookData} theme={t} />;
    if (sectionId === 'closing') return <ClosingContent bookData={bookData} theme={t} />;
    if (sectionId === 'appendix') return <AppendixContent bookData={bookData} theme={t} />;
    
    const ch = bookData.chapters.find((c: any) => c.generation === sectionData.chapterGen);
    if (!ch) return null;
    const members = ch.members.slice(sectionData.memberStart, sectionData.memberEnd);
    return <ChapterContent chapter={ch} theme={t} members={members} startIndex={sectionData.memberStart} showHeader={sectionData.isFirstPage} />;
}

function CoverPage({ bookData, theme: t }: { bookData: BookData; theme: Theme }) {
    return (
        <div className="flex flex-col items-center justify-center text-center min-h-[70vh]">
            <div className="mb-12 p-6 rounded-full bg-primary/5 border border-primary/10">
                <BookOpen className="h-16 w-16 text-primary" />
            </div>
            <div className="w-24 h-1 bg-primary mb-8 rounded-full" />
            <h1 className="text-4xl md:text-6xl font-bold tracking-[0.2em] mb-4 uppercase">Gia Phả</h1>
            <h2 className="text-3xl md:text-5xl font-extrabold mb-12" style={{ color: t.secondary }}>
                Dòng Họ {bookData.familyName.toUpperCase()}
            </h2>
            <div className="w-32 h-1 bg-primary/20 mb-12 rounded-full" />
            <div className="space-y-3 text-lg opacity-70 italic">
                <p>{bookData.totalGenerations} thế hệ huy hoàng</p>
                <p>{bookData.totalMembers} thành viên kết nối</p>
            </div>
            <div className="mt-auto pt-20 text-sm opacity-50 tracking-widest uppercase">
                Xuất bản: {bookData.exportDate}
            </div>
        </div>
    );
}

function TocContent({ bookData, theme: t }: { bookData: BookData; theme: Theme }) {
    return (
        <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-16 tracking-widest uppercase border-b pb-6">Mục Lục</h2>
            <div className="space-y-6">
                {bookData.chapters.map(ch => (
                    <div key={ch.generation} className="flex items-end gap-3 group">
                        <span className="font-bold text-xl min-w-[120px]">{ch.title}</span>
                        <div className="flex-1 border-b border-dotted border-primary/30 mb-2" />
                        <span className="text-muted-foreground italic">{ch.members.length} thành viên</span>
                    </div>
                ))}
                <div className="flex items-end gap-3 pt-6">
                    <span className="font-bold text-xl uppercase tracking-wider">Phụ lục chỉ mục</span>
                    <div className="flex-1 border-b border-dotted border-primary/30 mb-2" />
                    <span className="text-muted-foreground">{bookData.nameIndex.length} tên</span>
                </div>
            </div>
        </div>
    );
}

function ChapterContent({ chapter, theme: t, members, startIndex, showHeader = true }: any) {
    const displayMembers = members ?? chapter.members;
    return (
        <div>
            {showHeader && (
                <div className="text-center mb-16 space-y-4">
                    <div className="inline-block px-8 py-2 border-y-2 border-primary/20 uppercase tracking-[0.3em] font-bold text-sm text-primary">
                        Chương {chapter.generation}
                    </div>
                    <h2 className="text-4xl font-extrabold">{chapter.title}</h2>
                    <p className="opacity-50 italic">Tổng số {chapter.members.length} thành viên chính tộc</p>
                </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {displayMembers.map((person: any, idx: number) => (
                    <div key={person.handle} className="p-6 rounded-3xl border border-primary/5 bg-primary/[0.02] hover:bg-primary/[0.04] transition-colors relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <FileText className="h-12 w-12" />
                        </div>
                        <div className="flex items-start gap-4">
                            <span className="h-8 w-8 rounded-xl bg-primary text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-lg shadow-primary/20">
                                {(startIndex ?? 0) + idx + 1}
                            </span>
                            <div className="space-y-3">
                                <div>
                                    <h3 className="text-xl font-bold leading-none">{person.name}</h3>
                                    <p className="text-xs mt-2 font-medium opacity-60">
                                        {person.birthYear ? `${person.birthYear} — ${person.deathYear || (person.isLiving ? 'Nay' : '???')}` : 'Không rõ năm sinh'}
                                    </p>
                                </div>
                                <div className="space-y-1.5 text-xs">
                                    {person.fatherName && <p><span className="opacity-50 mr-2">Cha:</span> {person.fatherName}</p>}
                                    {person.spouseName && <p><span className="opacity-50 mr-2">{person.gender === 1 ? 'Vợ:' : 'Chồng:'}</span> {person.spouseName}</p>}
                                    {person.children.length > 0 && (
                                        <div className="pt-2 mt-2 border-t border-primary/10">
                                            <p className="font-bold text-[10px] uppercase tracking-wider mb-1 text-primary">Con cái ({person.children.length})</p>
                                            <p className="italic leading-relaxed">{person.children.map((c:any) => c.name).join(', ')}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function AppendixContent({ bookData, theme: t }: { bookData: BookData; theme: Theme }) {
    return (
        <div>
            <h2 className="text-3xl font-bold text-center mb-12 tracking-widest uppercase">Phụ Lục Chỉ Mục</h2>
            <div className="columns-2 md:columns-3 lg:columns-4 gap-8 text-[11px] space-y-1">
                {bookData.nameIndex.map((entry, i) => (
                    <div key={i} className="flex items-baseline justify-between gap-2 border-b border-dotted border-primary/10 py-1 break-inside-avoid">
                        <span className={cn("font-semibold", entry.isPatrilineal ? "text-primary" : "text-muted-foreground")}>
                            {entry.name}
                        </span>
                        <span className="opacity-40 italic shrink-0">Đời {entry.generation + 1}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function ClosingContent({ bookData, theme: t }: { bookData: BookData; theme: Theme }) {
    return (
        <div className="text-center space-y-8 max-w-xl mx-auto">
            <div className="w-12 h-1 bg-primary/20 mx-auto" />
            <p className="text-2xl italic leading-relaxed" style={{ color: t.secondary }}>
                &ldquo;Cây có gốc mới nở cành xanh lá,<br />
                Nước có nguồn mới bể rộng sông sâu.&rdquo;
            </p>
            <p className="text-sm opacity-60 leading-relaxed">
                Cuốn sử liệu này được đúc kết từ tâm huyết của các bậc con cháu,<br />
                nhằm lưu giữ ngọn lửa truyền thống cho muôn đời sau.
            </p>
            <div className="pt-12 text-xs font-bold uppercase tracking-[0.3em] opacity-30">
                Gia Phả Số {bookData.familyName} · {new Date().getFullYear()}
            </div>
        </div>
    );
}