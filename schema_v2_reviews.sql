-- ============================================
-- v2 schema：加评论功能
-- 在 Supabase SQL Editor 粘贴运行
-- ============================================

-- 评论表：一条评论可挂在岗位上（internship_id）或公司上（company_name）
create table if not exists reviews (
  id bigserial primary key,

  -- 挂载对象（二选一，用 CHECK 约束）
  internship_id bigint references internships(id) on delete cascade,
  company_name text,

  -- 评论类型：experience=前辈实测 / interview=面经 / warning=避雷
  kind text not null check (kind in ('experience', 'interview', 'warning')),

  -- 内容
  content text not null,
  rating smallint check (rating >= 1 and rating <= 5),  -- 5星评分（可空，避雷类可以不打分）

  -- 作者
  author_name text,          -- 显示名（可空=匿名）
  is_anonymous boolean default false,

  -- 元数据
  ip_hash text,              -- 用 IP+盐 hash 用于防刷，不存原 IP
  created_at timestamptz default now(),
  is_hidden boolean default false  -- 举报后可软删除
);

-- 二选一约束：必须挂在岗位上或者公司上
alter table reviews drop constraint if exists reviews_target_check;
alter table reviews add constraint reviews_target_check
  check (
    (internship_id is not null and company_name is null)
    or
    (internship_id is null and company_name is not null)
  );

create index if not exists idx_reviews_internship on reviews(internship_id) where internship_id is not null;
create index if not exists idx_reviews_company on reviews(company_name) where company_name is not null;
create index if not exists idx_reviews_kind on reviews(kind);
create index if not exists idx_reviews_created on reviews(created_at desc);

-- RLS：公开可读，写入靠 service_role（后端 API）
alter table reviews enable row level security;
drop policy if exists "public read reviews" on reviews;
create policy "public read reviews" on reviews for select using (not is_hidden);
