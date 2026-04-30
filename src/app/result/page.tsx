'use client';

import { useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CurrentTaskSession } from '@/types';

interface Section {
  title: string;
  content: string;
}

function parseAIOutput(text: string): Section[] {
  if (!text) return [];
  const sections: Section[] = [];
  const parts = text.split(/(?=【[^】]+】)/);
  for (const part of parts) {
    const m = part.match(/^【([^】]+)】/);
    if (m) {
      sections.push({
        title: m[1],
        content: part.replace(/^【[^】]+】\n?/, '').trim(),
      });
    }
  }
  return sections;
}

function getSection(sections: Section[], title: string): string {
  return sections.find(s => s.title === title)?.content || '';
}

function parseSteps(content: string): string[] {
  const lines = content.split('\n');
  const steps: string[] = [];
  for (const line of lines) {
    const m = line.match(/^\s*[・•]?\s*(\d+)[.)．。]\s*(.+)/);
    if (m) steps.push(m[2].trim());
  }
  if (steps.length > 0) return steps;
  // 箇条書き（・）形式
  return lines
    .filter(l => l.trim().startsWith('・') || l.trim().startsWith('•'))
    .map(l => l.replace(/^[\s・•]+/, '').trim())
    .filter(Boolean);
}

function extractField(content: string, label: string): string {
  const m = content.match(new RegExp(`・${label}[：:]\s*(.+?)(?=\n・|\n\n|$)`, 's'));
  return m ? m[1].trim() : '';
}

export default function ResultPage() {
  const router = useRouter();
  const [taskData, setTaskData] = useState<CurrentTaskSession | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedTaskId, setSavedTaskId] = useState('');
  const [error, setError] = useState('');
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('currentTask');
    if (!stored) { router.push('/'); return; }
    const data = JSON.parse(stored) as CurrentTaskSession;
    setTaskData(data);
    if (data.task_id) { setSaved(true); setSavedTaskId(data.task_id); }
  }, [router]);

  const handleSave = async () => {
    if (!taskData) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/save-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      });
      const data = await res.json();
      if (data.success) {
        setSavedTaskId(data.task_id);
        setSaved(true);
        sessionStorage.setItem('currentTask', JSON.stringify({ ...taskData, task_id: data.task_id }));
      } else {
        setError('保存に失敗しました: ' + data.error);
      }
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setSaving(false);
    }
  };

  if (!taskData) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  const sections = parseAIOutput(taskData.aiOutput);
  const mainTaskContent = getSection(sections, '今すぐやるタスク');
  const steps = parseSteps(mainTaskContent);
  const taskName = extractField(mainTaskContent, 'タスク名') || extractField(mainTaskContent, '作業名');
  const taskCategory = extractField(mainTaskContent, 'カテゴリ');
  const taskDetail = extractField(mainTaskContent, '内容') || extractField(mainTaskContent, '内容（2〜3文で背景と目的を説明）');
  const taskArtifact = extractField(mainTaskContent, '成果物') || extractField(mainTaskContent, '成果物（何が完成するか具体的に）');
  const taskCondition = extractField(mainTaskContent, '完了条件') || extractField(mainTaskContent, '完了条件（上司が30秒で合否判定できる基準）');
  const taskDuration = extractField(mainTaskContent, '所要時間');
  const taskGrowth = extractField(mainTaskContent, '本人の成長ポイント') || extractField(mainTaskContent, '本人の成長ポイント（このタスクで何ができるようになるか具体的に）');
  const taskMistakes = extractField(mainTaskContent, 'よくあるミスと対策');
  const taskProfitReason = extractField(mainTaskContent, 'このタスクが会社利益に直結する理由');
  const taskBenefit = extractField(mainTaskContent, '会社へのメリット') || extractField(mainTaskContent, '会社へのメリット（金額・時間・品質の数値推定を含める）');

  const nextTask = getSection(sections, '終わったら次にやるタスク');
  const reinstructSection = getSection(sections, '未完了・不十分だった場合の再指示');
  const nextStepSection = getSection(sections, '完了した場合の次ステップ');
  const prioritySection = getSection(sections, 'AIが判断した優先課題');
  const judgeSection = getSection(sections, '今回の判断');
  const checkSection = getSection(sections, '上司への確認ポイント');
  const empSection = getSection(sections, '社員情報');
  const histSection = getSection(sections, '過去履歴の確認');

  const hasContent = mainTaskContent.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-blue-700 text-white px-4 py-3 shadow-md sticky top-0 z-20">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => router.push('/')} className="text-blue-200 hover:text-white text-sm font-medium">
            ← 戻る
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold">AI指示結果</h1>
            <p className="text-blue-200 text-xs truncate">
              {taskData.employee?.社員名} ｜ {taskData.availableTime} ｜ {taskData.location}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4 pb-10">

        {/* ─── 今すぐやるタスク（最重要） ─── */}
        {hasContent ? (
          <div className="bg-blue-600 text-white rounded-2xl shadow-xl overflow-hidden">
            {/* タスクヘッダー */}
            <div className="bg-blue-700 px-4 py-3">
              <p className="text-blue-200 text-xs font-bold tracking-wider">⚡ 今すぐやるタスク</p>
              {taskCategory && (
                <span className="text-xs bg-blue-500 text-blue-100 px-2 py-0.5 rounded-full mt-1 inline-block">
                  {taskCategory}
                </span>
              )}
            </div>

            <div className="px-4 py-4 space-y-4">
              {/* タスク名 */}
              {taskName && (
                <h2 className="text-xl font-bold leading-snug">{taskName}</h2>
              )}

              {/* 内容説明 */}
              {taskDetail && (
                <p className="text-blue-100 text-sm leading-relaxed">{taskDetail}</p>
              )}

              {/* 具体的手順 */}
              {steps.length > 0 && (
                <div>
                  <p className="text-blue-200 text-xs font-bold mb-2">📋 具体的な手順</p>
                  <ol className="space-y-2">
                    {steps.map((step, i) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span className="text-blue-50 leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* 手順が抽出できなかった場合、全文表示 */}
              {steps.length === 0 && mainTaskContent && (
                <pre className="text-sm text-blue-50 whitespace-pre-wrap font-sans leading-relaxed">
                  {mainTaskContent}
                </pre>
              )}
            </div>

            {/* 成果物・完了条件・メリット */}
            {(taskArtifact || taskCondition || taskDuration || taskGrowth || taskBenefit || taskMistakes || taskProfitReason) && (
              <div className="bg-blue-800 px-4 py-3 space-y-2">
                {taskArtifact && (
                  <p className="text-sm text-blue-100">
                    <span className="text-blue-300 font-bold">📄 成果物：</span>{taskArtifact}
                  </p>
                )}
                {taskCondition && (
                  <p className="text-sm text-blue-100">
                    <span className="text-blue-300 font-bold">✅ 完了条件：</span>{taskCondition}
                  </p>
                )}
                {taskDuration && (
                  <p className="text-sm text-blue-100">
                    <span className="text-blue-300 font-bold">⏱ 目安時間：</span>{taskDuration}
                  </p>
                )}
                {taskBenefit && (
                  <p className="text-sm text-blue-100">
                    <span className="text-blue-300 font-bold">💰 会社メリット：</span>{taskBenefit}
                  </p>
                )}
                {taskGrowth && (
                  <p className="text-sm text-blue-100">
                    <span className="text-blue-300 font-bold">📈 成長ポイント：</span>{taskGrowth}
                  </p>
                )}
                {taskProfitReason && (
                  <p className="text-sm text-blue-100">
                    <span className="text-blue-300 font-bold">🏢 利益直結：</span>{taskProfitReason}
                  </p>
                )}
                {taskMistakes && (
                  <p className="text-sm text-yellow-200">
                    <span className="text-yellow-300 font-bold">⚠️ よくあるミス：</span>{taskMistakes}
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          /* パース失敗時のフォールバック */
          <div className="bg-white rounded-2xl border-2 border-orange-300 p-4">
            <p className="text-orange-600 font-bold text-sm mb-2">⚠️ AI出力（生テキスト）</p>
            <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed overflow-auto max-h-96">
              {taskData.aiOutput}
            </pre>
          </div>
        )}

        {/* ─── 詳細情報（開閉） ─── */}
        <button
          onClick={() => setShowDetail(v => !v)}
          className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2.5 rounded-xl text-sm transition-colors"
        >
          {showDetail ? '▲ 詳細情報を閉じる' : '▼ 詳細情報を見る（優先課題・再指示・次ステップ）'}
        </button>

        {showDetail && (
          <div className="space-y-3">
            {prioritySection && (
              <Card icon="🎯" title="AIが判断した優先課題" color="yellow">
                {prioritySection}
              </Card>
            )}
            {judgeSection && (
              <Card icon="💡" title="今回の判断理由" color="blue-light">
                {judgeSection}
              </Card>
            )}
            {nextTask && (
              <Card icon="➡️" title="終わったら次にやるタスク" color="green">
                {nextTask}
              </Card>
            )}
            {reinstructSection && (
              <Card icon="⚠️" title="未完了・不十分だった場合の再指示" color="red">
                {reinstructSection}
              </Card>
            )}
            {nextStepSection && (
              <Card icon="✅" title="完了した場合の次ステップ" color="green-dark">
                {nextStepSection}
              </Card>
            )}
            {checkSection && (
              <Card icon="📌" title="上司への確認ポイント" color="purple">
                {checkSection}
              </Card>
            )}
            {(empSection || histSection) && (
              <Card icon="👤" title="社員情報・過去履歴" color="gray">
                {empSection && <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans mb-2">{empSection}</pre>}
                {histSection && <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans">{histSection}</pre>}
              </Card>
            )}
          </div>
        )}

        {/* エラー */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* ─── アクション ─── */}
        <div className="space-y-3 pt-1">
          {!saved ? (
            <button
              onClick={handleSave}
              disabled={saving}
              className={`w-full py-4 rounded-xl text-base font-bold transition-all shadow-md ${
                saving ? 'bg-gray-300 text-gray-500' : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {saving ? '保存中...' : '📊 記録として保存する'}
            </button>
          ) : (
            <div className="bg-green-50 border-2 border-green-400 rounded-xl p-4 text-center">
              <p className="text-green-700 font-bold">✅ 保存しました</p>
              {savedTaskId && <p className="text-xs text-green-600 mt-1">タスクID: {savedTaskId}</p>}
            </div>
          )}

          {saved && (
            <Link
              href="/input"
              className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl text-base text-center transition-all shadow-md"
            >
              📝 実施結果を入力する →
            </Link>
          )}

          <Link
            href="/"
            className="block w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 rounded-xl text-base text-center transition-all"
          >
            トップに戻る
          </Link>
        </div>

        <p className="text-center text-xs text-gray-400 pt-1">
          {new Date(taskData.timestamp).toLocaleString('ja-JP')} に生成
        </p>
      </main>
    </div>
  );
}

function Card({
  icon,
  title,
  color,
  children,
}: {
  icon: string;
  title: string;
  color: string;
  children: ReactNode;
}) {
  const colorMap: Record<string, string> = {
    yellow: 'border-yellow-300 bg-yellow-50',
    'blue-light': 'border-blue-200 bg-blue-50',
    green: 'border-green-300 bg-green-50',
    red: 'border-red-300 bg-red-50',
    'green-dark': 'border-green-500 bg-green-50',
    purple: 'border-purple-300 bg-purple-50',
    gray: 'border-gray-300 bg-gray-50',
  };
  return (
    <div className={`rounded-xl border-2 p-4 ${colorMap[color] || 'border-gray-300 bg-white'}`}>
      <h3 className="text-sm font-bold text-gray-800 mb-2">{icon} {title}</h3>
      {typeof children === 'string' ? (
        <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{children}</pre>
      ) : children}
    </div>
  );
}
