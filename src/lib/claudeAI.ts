import { Employee, TaskHistory } from '../types';

interface TaskContext {
  employee: Employee;
  history: TaskHistory[];
  availableTime: string;
  location: string;
  currentStatus: string;
}

// ── Gemini REST API ───────────────────────────────────────────────────────────
async function callGemini(prompt: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY not set');

  // 最も利用可能なモデルを順番に試す
  const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'];
  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 4096 },
          }),
        }
      );
      const data = await res.json();
      if (data.error) continue; // 次のモデルを試す
      return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } catch {
      continue;
    }
  }
  throw new Error('Gemini API: 利用可能なモデルがありません');
}

// ── Claude API ────────────────────────────────────────────────────────────────
async function callClaude(prompt: string): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY not set');

  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: key });

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system:
      'あなたは電気工事会社「マルケン電工」の空き時間タスク管理AIです。' +
      '社員の空き時間に適切な業務改善・教育・安全管理タスクを指示します。' +
      '営業活動は絶対に指示しません。指定された出力形式を必ず守ってください。',
    messages: [{ role: 'user', content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude API');
  return content.text;
}

// ── ローカルルールエンジン ────────────────────────────────────────────────────
async function callLocalEngine(ctx: TaskContext): Promise<string> {
  const { generateTaskLocally } = await import('./taskGenerator');
  return generateTaskLocally(
    ctx.employee, ctx.history, ctx.availableTime, ctx.location, ctx.currentStatus
  );
}

// ── 公開API ───────────────────────────────────────────────────────────────────
export async function generateTask(prompt: string, ctx?: TaskContext): Promise<string> {
  // モックモードは即座にローカルエンジンを使う
  if (process.env.MOCK_MODE === 'true' && ctx) {
    return callLocalEngine(ctx);
  }

  // Claude API → Gemini API → ローカルエンジンの順で試みる
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      return await callClaude(prompt);
    } catch (e) {
      console.warn('[AI] Claude API failed, trying Gemini...', (e as Error).message);
    }
  }

  if (process.env.GEMINI_API_KEY) {
    try {
      return await callGemini(prompt);
    } catch (e) {
      console.warn('[AI] Gemini API failed, using local engine...', (e as Error).message);
    }
  }

  // すべてのAPIが使えない場合はローカルエンジン
  if (ctx) return callLocalEngine(ctx);
  throw new Error('AI API が利用できません。MOCK_MODE=true を設定するか、APIキーを確認してください。');
}
