/**
 * Vercel Serverless Function: /api/submit-job
 *
 * 用后端 SECRET key 绕过 RLS 插入岗位数据
 * 输入：POST { payload: <internship row>, contributor_name?: string, password: string }
 * 输出：{ ok: true, id: number } | { error: string }
 */

declare const process: { env: Record<string, string | undefined> };

export const config = { runtime: 'edge' };

const SHARED_PASSWORD = 'pkuintern2026';

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const SUPA_URL = process.env.SUPABASE_URL;
  const SECRET = process.env.SUPABASE_SECRET_KEY;
  if (!SUPA_URL || !SECRET) {
    return json({ error: '服务端未配置 Supabase 凭据' }, 500);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: '请求体不是合法 JSON' }, 400);
  }

  const { payload, contributor_name, password } = body || {};

  if (password !== SHARED_PASSWORD) {
    return json({ error: '口令不正确' }, 403);
  }

  if (!payload || !payload.title || !payload.company) {
    return json({ error: '缺少必填字段 title / company' }, 400);
  }

  const supaHeaders = {
    apikey: SECRET,
    Authorization: `Bearer ${SECRET}`,
    'Content-Type': 'application/json',
  };

  try {
    // 1) 处理 contributor
    let contributor_id: number | null = null;
    if (contributor_name && typeof contributor_name === 'string') {
      const name = contributor_name.trim().slice(0, 40);
      if (name) {
        const q = await fetch(
          `${SUPA_URL}/rest/v1/contributors?name=eq.${encodeURIComponent(name)}&select=id`,
          { headers: supaHeaders }
        );
        const list = await q.json();
        if (Array.isArray(list) && list.length > 0) {
          contributor_id = list[0].id;
        } else {
          const ins = await fetch(`${SUPA_URL}/rest/v1/contributors`, {
            method: 'POST',
            headers: { ...supaHeaders, Prefer: 'return=representation' },
            body: JSON.stringify({ name }),
          });
          const insData = await ins.json();
          if (Array.isArray(insData) && insData.length > 0) {
            contributor_id = insData[0].id;
          }
        }
      }
    }

    // 2) 插入岗位
    const insertPayload = {
      title: String(payload.title).slice(0, 200),
      company: String(payload.company).slice(0, 100),
      city: payload.city || null,
      is_remote: !!payload.is_remote,
      category: payload.category || null,
      description: payload.description || null,
      requirements: payload.requirements || null,
      salary: payload.salary || null,
      duration: payload.duration || null,
      source: 'manual',
      source_url: payload.source_url || null,
      external_id: `manual_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      posted_at: new Date().toISOString(),
      contributor_id,
      is_active: true,
    };

    const insRes = await fetch(`${SUPA_URL}/rest/v1/internships`, {
      method: 'POST',
      headers: { ...supaHeaders, Prefer: 'return=representation' },
      body: JSON.stringify(insertPayload),
    });

    if (!insRes.ok) {
      const errText = await insRes.text();
      return json({ error: `Supabase 插入失败 ${insRes.status}: ${errText.slice(0, 300)}` }, 502);
    }

    const created = await insRes.json();
    const id = Array.isArray(created) ? created[0]?.id : null;
    return json({ ok: true, id }, 200);
  } catch (err: any) {
    return json({ error: '服务器错误: ' + (err.message || String(err)) }, 500);
  }
}

function json(data: any, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
