/**
 * Vercel Serverless Function: /api/submit-review
 * 提交评论（无口令，但有 IP hash 防刷 + 简单校验）
 */

declare const process: { env: Record<string, string | undefined> };

export const config = { runtime: 'edge' };

// 简单人机题库
const CAPTCHA_ANSWERS: Record<string, number> = {
  '3+7': 10, '5+8': 13, '9-4': 5, '6+11': 17, '15-6': 9,
  '4+9': 13, '12-5': 7, '8+7': 15, '11-3': 8, '2+14': 16,
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const SUPA_URL = process.env.SUPABASE_URL;
  const SECRET = process.env.SUPABASE_SECRET_KEY;
  if (!SUPA_URL || !SECRET) return json({ error: '服务端未配置' }, 500);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: '请求体解析失败' }, 400);
  }

  const {
    internship_id, company_name, kind, content, rating,
    author_name, is_anonymous, captcha_key, captcha_answer,
  } = body || {};

  // 人机校验
  if (captcha_key in CAPTCHA_ANSWERS) {
    if (Number(captcha_answer) !== CAPTCHA_ANSWERS[captcha_key]) {
      return json({ error: '算错了，请重新答题' }, 400);
    }
  } else {
    return json({ error: '人机验证参数错误' }, 400);
  }

  // 字段校验
  if (!['experience', 'interview', 'warning'].includes(kind)) {
    return json({ error: '评论类型不合法' }, 400);
  }
  if (!content || typeof content !== 'string' || content.trim().length < 10) {
    return json({ error: '内容太短（至少 10 字）' }, 400);
  }
  if (content.length > 2000) {
    return json({ error: '内容太长（最多 2000 字）' }, 400);
  }
  if (!internship_id && !company_name) {
    return json({ error: '缺少评论对象' }, 400);
  }
  if (internship_id && company_name) {
    return json({ error: '不能同时挂在岗位和公司上' }, 400);
  }
  if (rating !== undefined && rating !== null) {
    const r = Number(rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) {
      return json({ error: '评分范围 1-5' }, 400);
    }
  }

  // IP hash 防刷
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
  const ipHash = await hashString(`${ip}_ir_salt_2026`);

  const supaHeaders = {
    apikey: SECRET,
    Authorization: `Bearer ${SECRET}`,
    'Content-Type': 'application/json',
  };

  // 限流：这个 IP 最近 1 小时最多 5 条
  const oneHourAgo = new Date(Date.now() - 3600 * 1000).toISOString();
  try {
    const countRes = await fetch(
      `${SUPA_URL}/rest/v1/reviews?ip_hash=eq.${ipHash}&created_at=gt.${oneHourAgo}&select=id`,
      { headers: { ...supaHeaders, Prefer: 'count=exact' } }
    );
    const list = await countRes.json();
    if (Array.isArray(list) && list.length >= 5) {
      return json({ error: '发得太快啦，休息一下再来（1 小时最多 5 条）' }, 429);
    }
  } catch {
    // 限流查询失败不阻塞主流程
  }

  // 插入
  const payload = {
    internship_id: internship_id || null,
    company_name: company_name || null,
    kind,
    content: content.trim(),
    rating: rating || null,
    author_name: is_anonymous ? null : (author_name || null),
    is_anonymous: !!is_anonymous,
    ip_hash: ipHash,
  };

  try {
    const insRes = await fetch(`${SUPA_URL}/rest/v1/reviews`, {
      method: 'POST',
      headers: { ...supaHeaders, Prefer: 'return=representation' },
      body: JSON.stringify(payload),
    });
    if (!insRes.ok) {
      const errText = await insRes.text();
      return json({ error: `插入失败: ${errText.slice(0, 300)}` }, 502);
    }
    const created = await insRes.json();
    return json({ ok: true, id: Array.isArray(created) ? created[0]?.id : null }, 200);
  } catch (err: any) {
    return json({ error: '服务器错误: ' + (err.message || String(err)) }, 500);
  }
}

async function hashString(s: string): Promise<string> {
  const data = new TextEncoder().encode(s);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

function json(data: any, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
