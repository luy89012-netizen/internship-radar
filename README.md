# internship-radar 🌱

面向北京大学生的商业化/运营/数据方向实习聚合应用。

## 技术栈
- **前端**：Vite + React 19 + TypeScript + AntD 6
- **后端**：Supabase (PostgreSQL + PostgREST + RLS)
- **部署**：Vercel

## 数据来源
1. **官网校招爬虫**（GitHub Actions 每日跑）
2. **用户手动提交**（网页表单，共享口令登录）
3. **小红书公开笔记**（定时抓取相关话题）

## 目录
- `webapp/` — 前端源码
- `schema.sql` — Supabase 建表 SQL
- `crawler/` — 官网爬虫（待补）

## 本地开发
```bash
cd webapp
npm install
npm run dev
```

需要在 `webapp/.env` 里配：
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_xxx
```
