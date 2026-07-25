/**
 * Vercel Serverless Function: /api/parse-job
 *
 * 输入：POST { text: string }
 * 输出：{ result: ParsedJob } | { error: string }
 *
 * 用 DeepSeek 抽取岗位结构化字段
 * DEEPSEEK_API_KEY 从 Vercel 环境变量读取
 */

// 声明 Edge Runtime 全局
declare const process: { env: Record<string, string | undefined> };

export const config = { runtime: 'edge' };

const CATEGORY_MAP = {
  business: '商业化 / 客户运营',
  brand: '品牌 / 营销',
  product: '产品',
  operations: '运营',
  data: '数据分析 / BI',
  other: '其他',
};

const SYSTEM_PROMPT = `你是一个招聘信息解析助手。用户会给你一段自由文本（来自小红书笔记、公众号推文、BOSS直聘、招聘邮件、群聊消息等），你需要从中提取出实习岗位的结构化信息。

请**严格**返回如下 JSON 对象（不要有任何 markdown 代码块包裹，不要有解释文字）：

{
  "title": "岗位名称（如：品牌营销实习生）",
  "company": "公司名（如：小红书 / 字节跳动）",
  "city": "城市（必须从下面列表选一个，或 null）：北京、上海、杭州、深圳、广州、成都、远程、其他",
  "is_remote": true/false（是否支持远程/混合办公）,
  "category": "方向 key（必须从下面选一个，或 null）：business / brand / product / operations / data / other",
  "description": "岗位描述（做什么、团队/业务是什么，2-4 句话）",
  "requirements": "岗位要求（学历、专业、技能、软性要求，2-4 句话）",
  "salary": "薪资（原文提到就填，如 200/天 / 4000-6000月薪 / 面议；没提就 null）",
  "duration": "实习时长要求（如 3个月以上、每周4天；没提就 null）",
  "source_url": "岗位链接（如果文本中有 http 开头的链接，选最相关的一个；没有就 null）"
}

**方向 category 判断规则**：
- business = 商业化、客户运营、销售运营、SKA、KA客户、商务BD
- brand = 品牌、市场营销、Marketing、campaign、PR、内容营销
- product = 产品经理、PM、产品运营（偏产品那部分）
- operations = 运营（内容/用户/活动/社群）、增长
- data = 数据分析、数据科学、BI、数据运营、增长分析
- other = 上面都不匹配（比如设计、HR、法务、财务）

**判断技巧**：
- 如果标题含"数据"或"分析"，很可能是 data
- 如果含"商业化""客户""SKA"，很可能是 business
- 如果含"品牌""营销"，很可能是 brand
- 如果含"运营"但不指定，默认 operations

**注意**：
- 字段不确定的填 null（不要瞎猜）
- description / requirements 要用完整的句子，不要罗列碎片
- 输出必须是**合法 JSON**，字符串内的换行用 \\n
- 只输出 JSON，不要任何前后文本`;

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: '服务端未配置 DEEPSEEK_API_KEY' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let text: string;
  try {
    const body = await req.json();
    text = body.text;
    if (!text || typeof text !== 'string' || text.length < 20) {
      return new Response(
        JSON.stringify({ error: '输入文本太短' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch {
    return new Response(
      JSON.stringify({ error: '请求体解析失败' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const dsRes = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-v4-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: text.slice(0, 4000) },
        ],
        temperature: 0.2,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      }),
    });

    if (!dsRes.ok) {
      const errBody = await dsRes.text();
      return new Response(
        JSON.stringify({ error: `LLM API 返回 ${dsRes.status}: ${errBody.slice(0, 300)}` }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const dsJson = await dsRes.json();
    const content = dsJson.choices?.[0]?.message?.content;
    if (!content) {
      return new Response(
        JSON.stringify({ error: 'LLM 返回空内容' }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      // 试着去掉 markdown 代码块包裹
      const cleaned = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        return new Response(
          JSON.stringify({ error: 'LLM 输出不是合法 JSON', raw: content.slice(0, 500) }),
          { status: 502, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // 后处理：category / city 必须在白名单里
    const validCats = Object.keys(CATEGORY_MAP);
    if (parsed.category && !validCats.includes(parsed.category)) {
      parsed.category = 'other';
    }

    return new Response(JSON.stringify({ result: parsed }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: '调用 LLM 失败: ' + (err.message || String(err)) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
