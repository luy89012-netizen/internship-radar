-- ============================================
-- internship-radar Supabase schema
-- 2026-07-25 v1
-- ============================================

-- 主表：实习岗位
create table if not exists internships (
  id bigserial primary key,

  -- 岗位基本信息
  title text not null,                    -- 岗位名称
  company text not null,                  -- 公司
  city text,                              -- 城市（北京/上海/远程/...）
  is_remote boolean default false,        -- 是否支持远程
  category text,                          -- 方向标签（商业化/运营/数据/产品/...）

  -- 描述与详情
  description text,                       -- 岗位描述
  requirements text,                      -- 岗位要求
  base_departments text,                  -- 所属部门（可空）

  -- 时间与薪资
  posted_at timestamptz,                  -- 发布时间
  deadline timestamptz,                   -- 截止时间（可空）
  salary text,                            -- 薪资（原样文本，可空）
  duration text,                          -- 实习时长要求（可空）

  -- 来源
  source text not null,                   -- 来源类型：official / xhs_note / manual
  source_url text,                        -- 原始链接
  source_company_key text,                -- 官网爬虫 source_key（去重用）
  external_id text,                       -- 外部 ID（去重用）

  -- 元信息
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  -- 状态
  is_active boolean default true,         -- 是否仍在招（后续 sweep 用）

  -- 去重键
  unique (source, external_id)
);

create index if not exists idx_internships_posted on internships(posted_at desc);
create index if not exists idx_internships_city on internships(city);
create index if not exists idx_internships_category on internships(category);
create index if not exists idx_internships_source on internships(source);
create index if not exists idx_internships_active on internships(is_active);

-- ============================================
-- 手动录入用户表（用简单密码 + 记录谁提交了）
-- ============================================
create table if not exists contributors (
  id bigserial primary key,
  name text not null,
  email text unique,
  created_at timestamptz default now()
);

-- 记录哪些岗位是谁贡献的
alter table internships
  add column if not exists contributor_id bigint references contributors(id);

-- ============================================
-- 用户操作：收藏 / 状态标记
-- ============================================
create table if not exists user_actions (
  id bigserial primary key,
  internship_id bigint references internships(id) on delete cascade,
  contributor_id bigint references contributors(id),
  action text not null,                   -- 'favorite' / 'applied' / 'interviewed' / 'rejected' / 'offered'
  note text,
  created_at timestamptz default now(),
  unique (internship_id, contributor_id, action)
);

-- ============================================
-- RLS：开放公开只读，写入需 service_role
-- ============================================
alter table internships enable row level security;
alter table contributors enable row level security;
alter table user_actions enable row level security;

-- 匿名 anon 可读全部实习
drop policy if exists "public read internships" on internships;
create policy "public read internships" on internships
  for select using (true);

-- 匿名 anon 可读贡献者名称（不含 email）—— 前端会展示"XXX 提交"
drop policy if exists "public read contributors" on contributors;
create policy "public read contributors" on contributors
  for select using (true);

-- 匿名 anon 可读用户动作（后续可能做"已被 N 人收藏"）
drop policy if exists "public read user_actions" on user_actions;
create policy "public read user_actions" on user_actions
  for select using (true);

-- 写入靠 service_role（后端有 service_role key，前端不暴露）
