-- ============================================================
-- 🌳 Gia Phả Điện Tử — Database Setup (Bản Hợp Nhất Hoàn Chỉnh)
-- ============================================================
-- Chạy file này trong: Supabase Dashboard → SQL Editor
-- File này bao gồm toàn bộ cập nhật: Cấu trúc cơ bản, Auth,
-- Nội dung, Tương tác, Media, Profile, Feed, RLS
-- ============================================================


-- ╔══════════════════════════════════════════════════════════╗
-- ║  1. CẤU TRÚC CƠ BẢN: people + families                  ║
-- ╚══════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS people (
    handle TEXT PRIMARY KEY,
    gramps_id TEXT,
    gender INT NOT NULL DEFAULT 1,           -- 1=Nam, 2=Nữ
    display_name TEXT NOT NULL,
    surname TEXT,
    first_name TEXT,
    generation INT DEFAULT 1,
    chi INT,
    birth_year INT,
    birth_date TEXT,
    birth_place TEXT,
    death_year INT,
    death_date TEXT,
    death_place TEXT,
    is_living BOOLEAN DEFAULT true,
    is_privacy_filtered BOOLEAN DEFAULT false,
    is_patrilineal BOOLEAN DEFAULT true,     -- true=chính tộc, false=ngoại tộc
    families TEXT[] DEFAULT '{}',            -- family handles where this person is parent
    parent_families TEXT[] DEFAULT '{}',     -- family handles where this person is child
    phone TEXT,
    email TEXT,
    zalo TEXT,
    facebook TEXT,
    current_address TEXT,
    hometown TEXT,
    occupation TEXT,
    company TEXT,
    education TEXT,
    nick_name TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS families (
    handle TEXT PRIMARY KEY,
    father_handle TEXT,
    mother_handle TEXT,
    children TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Updated_at trigger (Dùng chung cho nhiều bảng)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS people_updated_at ON people;
CREATE TRIGGER people_updated_at BEFORE UPDATE ON people
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS families_updated_at ON families;
CREATE TRIGGER families_updated_at BEFORE UPDATE ON families
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ╔══════════════════════════════════════════════════════════╗
-- ║  2. HỆ THỐNG AUTH: profiles + quyền Admin               ║
-- ╚══════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT,
    role TEXT NOT NULL DEFAULT 'member',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'editor', 'archivist', 'member', 'guest', 'viewer'))
);

-- Bổ sung cột liên hệ và avatar (idempotent)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Hàm kiểm tra Admin tập trung (phiên bản cải tiến)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger tự động tạo profile khi đăng ký
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, role, status, display_name)
    VALUES (
        NEW.id,
        NEW.email,
        'viewer',
        'active',
        COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        display_name = COALESCE(EXCLUDED.display_name, profiles.display_name);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ╔══════════════════════════════════════════════════════════╗
-- ║  3. NỘI DUNG: posts + contributions                     ║
-- ╚══════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    author_name TEXT,                        -- Tên người đăng (lưu cứng để hiện nhanh)
    type TEXT NOT NULL DEFAULT 'general',
    title TEXT,
    body TEXT NOT NULL,
    is_pinned BOOLEAN DEFAULT false,
    status TEXT NOT NULL DEFAULT 'pending', -- Mặc định chờ duyệt
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Thêm cột media (JSONB) vào posts nếu chưa có
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name='posts'
        AND column_name='media'
    ) THEN
        ALTER TABLE public.posts ADD COLUMN media JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);

CREATE TABLE IF NOT EXISTS contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    author_email TEXT,
    person_handle TEXT NOT NULL,
    person_name TEXT,
    field_name TEXT NOT NULL,
    field_label TEXT,
    old_value TEXT,
    new_value TEXT NOT NULL,
    note TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_note TEXT,
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contributions_status ON contributions(status);


-- ╔══════════════════════════════════════════════════════════╗
-- ║  4. TƯƠNG TÁC: events + comments + notifications        ║
-- ╚══════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ,
    location TEXT,
    type TEXT NOT NULL DEFAULT 'MEETING',
    is_recurring BOOLEAN DEFAULT false,
    creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    author_name TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_start ON events(start_at);

-- Cập nhật bảng comments (Idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='comments' AND column_name='post_id') THEN
        ALTER TABLE public.comments ADD COLUMN post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='comments' AND column_name='author_name') THEN
        ALTER TABLE public.comments ADD COLUMN author_name TEXT;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='comments' AND column_name='body') THEN
        ALTER TABLE public.comments RENAME COLUMN body TO content;
    END IF;
    ALTER TABLE public.comments ALTER COLUMN person_handle DROP NOT NULL;
END $$;

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT,
    body TEXT,
    link TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);


-- ╔══════════════════════════════════════════════════════════╗
-- ║  5. LƯỢT THÍCH BÀI VIẾT: post_likes                     ║
-- ╚══════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS public.post_likes (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT post_likes_post_user_unique UNIQUE (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS post_likes_post_id_idx ON public.post_likes(post_id);
CREATE INDEX IF NOT EXISTS post_likes_user_id_idx ON public.post_likes(user_id);


-- ╔══════════════════════════════════════════════════════════╗
-- ║  6. THƯ VIỆN MEDIA (Cloudinary)                          ║
-- ╚══════════════════════════════════════════════════════════╝

-- Tạo bảng media (sẽ xóa và tạo lại nếu cần đồng nhất)
CREATE TABLE IF NOT EXISTS public.media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name TEXT NOT NULL,
    mime_type TEXT,
    file_size BIGINT,
    url TEXT,
    public_id TEXT,
    width INTEGER,
    height INTEGER,
    title TEXT,
    description TEXT,
    state TEXT NOT NULL DEFAULT 'PENDING' CHECK (state IN ('PENDING', 'PUBLISHED', 'REJECTED')),
    uploader_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Đổi FK uploader_id trỏ đến profiles thay vì auth.users (để Supabase tự join được)
ALTER TABLE public.media DROP CONSTRAINT IF EXISTS media_uploader_id_fkey;
ALTER TABLE public.media ADD CONSTRAINT media_uploader_id_fkey
    FOREIGN KEY (uploader_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


-- ╔══════════════════════════════════════════════════════════╗
-- ║  7. ROW LEVEL SECURITY (RLS)                             ║
-- ╚══════════════════════════════════════════════════════════╝

-- Enable RLS
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;

-- --- Profiles ---
DROP POLICY IF EXISTS "anyone can read profiles" ON profiles;
CREATE POLICY "anyone can read profiles" ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "users or admin can update profile" ON profiles;
CREATE POLICY "users or admin can update profile" ON profiles
    FOR UPDATE USING (auth.uid() = id OR is_admin());

DROP POLICY IF EXISTS "users can update own profile" ON profiles;
CREATE POLICY "users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- --- Posts ---
DROP POLICY IF EXISTS "anyone can read published posts" ON posts;
CREATE POLICY "anyone can read published posts" ON posts
    FOR SELECT USING (status = 'published' OR auth.uid() = author_id OR is_admin());

DROP POLICY IF EXISTS "users can insert posts" ON posts;
CREATE POLICY "users can insert posts" ON posts FOR INSERT WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "admin or owner can manage posts" ON posts;
CREATE POLICY "admin or owner can manage posts" ON posts
    FOR ALL USING (auth.uid() = author_id OR is_admin());

-- --- Events ---
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone can read published events" ON events;
CREATE POLICY "anyone can read published events" ON events
    FOR SELECT USING (status = 'published' OR auth.uid() = creator_id OR is_admin());

DROP POLICY IF EXISTS "users can insert events" ON events;
CREATE POLICY "users can insert events" ON events FOR INSERT WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "admin or owner can manage events" ON events;
CREATE POLICY "admin or owner can manage events" ON events
    FOR ALL USING (auth.uid() = creator_id OR is_admin());

-- --- Comments ---
DROP POLICY IF EXISTS "anyone can read comments" ON comments;
CREATE POLICY "anyone can read comments" ON comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "users can insert comments" ON comments;
CREATE POLICY "users can insert comments" ON comments FOR INSERT WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "owner or admin can delete comments" ON comments;
CREATE POLICY "owner or admin can delete comments" ON comments
    FOR DELETE USING (author_id = auth.uid() OR is_admin());

-- --- Post Likes ---
DROP POLICY IF EXISTS "Cho phép tất cả mọi người xem lượt Thích" ON public.post_likes;
CREATE POLICY "Cho phép tất cả mọi người xem lượt Thích"
ON public.post_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Người dùng chỉ được Thích bằng tài khoản của mình" ON public.post_likes;
CREATE POLICY "Người dùng chỉ được Thích bằng tài khoản của mình"
ON public.post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Người dùng chỉ được xóa lượt Thích của mình" ON public.post_likes;
CREATE POLICY "Người dùng chỉ được xóa lượt Thích của mình"
ON public.post_likes FOR DELETE USING (auth.uid() = user_id);

-- --- Media ---
DROP POLICY IF EXISTS "anyone can read published media" ON public.media;
CREATE POLICY "anyone can read published media" ON public.media
    FOR SELECT USING (
        state = 'PUBLISHED'
        OR auth.uid() = uploader_id
        OR public.is_admin()
    );

DROP POLICY IF EXISTS "authenticated users can insert media" ON public.media;
CREATE POLICY "authenticated users can insert media" ON public.media
    FOR INSERT WITH CHECK (auth.uid() = uploader_id);

DROP POLICY IF EXISTS "admin can update media" ON public.media;
CREATE POLICY "admin can update media" ON public.media
    FOR UPDATE USING (public.is_admin());

-- --- People & Families ---
DROP POLICY IF EXISTS "anyone can read people" ON people;
CREATE POLICY "anyone can read people" ON people FOR SELECT USING (true);

DROP POLICY IF EXISTS "authenticated can update people" ON people;
CREATE POLICY "authenticated can update people" ON people
    FOR UPDATE USING (is_admin() OR (auth.role() = 'authenticated' AND NOT is_privacy_filtered));

DROP POLICY IF EXISTS "admin can manage people" ON people;
CREATE POLICY "admin can manage people" ON people
    FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "anyone can read families" ON families;
CREATE POLICY "anyone can read families" ON families FOR SELECT USING (true);

DROP POLICY IF EXISTS "admin can manage families" ON families;
CREATE POLICY "admin can manage families" ON families
    FOR ALL USING (is_admin());


-- ╔══════════════════════════════════════════════════════════╗
-- ║  8. LÀM MỚI HỆ THỐNG                                    ║
-- ╚══════════════════════════════════════════════════════════╝

-- Refresh Schema Cache
NOTIFY pgrst, 'reload schema';

SELECT '✅ Database setup consolidation complete!' AS status;
