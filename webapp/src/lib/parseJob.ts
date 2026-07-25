/**
 * LLM 岗位信息抽取
 * 输入：一段自由文本（复制自小红书/公众号/BOSS/邮件/群消息...）
 * 输出：结构化的岗位字段
 *
 * 后端走 Vercel Serverless Function，避免 API key 暴露
 * endpoint: /api/parse-job
 */

export type ParsedJob = {
  title?: string;
  company?: string;
  city?: string;
  is_remote?: boolean;
  category?: string;
  description?: string;
  requirements?: string;
  salary?: string;
  duration?: string;
  source_url?: string;
};

export async function parseJobText(text: string): Promise<{
  ok: boolean;
  data?: ParsedJob;
  error?: string;
}> {
  try {
    const res = await fetch('/api/parse-job', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      const errText = await res.text();
      return { ok: false, error: `HTTP ${res.status}: ${errText}` };
    }
    const data = await res.json();
    if (data.error) return { ok: false, error: data.error };
    return { ok: true, data: data.result };
  } catch (err: any) {
    return { ok: false, error: err.message || String(err) };
  }
}
