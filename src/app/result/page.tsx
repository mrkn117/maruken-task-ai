'use client';

import { useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CurrentTaskSession } from '@/types';

interface Section { title: string; content: string; }

function normalizeAIOutput(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/^#{1,3}\s+/gm, '')
    .replace(/^---+$/gm, '')
    .replace(/^[-*]\s+/gm, '・')
    .replace(/^\*\s+/gm, '・');
}

function parseAIOutput(text: string): Section[] {
  if (!text) return [];
  const sections: Section[] = [];
  const parts = text.split(/(?=【[^】]+】)/);
  for (const part of parts) {
    const m = part.match(/^【([^】]+)】/);
    if (m) {
      sections.push({ title: m[1], content: part.replace(/^【[^】]+】\n?/, '').trim() });
    }
  }
  return sections;
}

function getSection(sections: Section[], title: string): string {
  return sections.find(s => s.title === title)?.content || '';
}

function extractField(content: string, label: string): string {
  const m = content.match(new RegExp(`・${label}[：:][ \\t]*([^]*?)(?=\\n・|\\n\\n|$)`));
  return m ? m[1].trim() : '';
}

interface ParsedStep {
  time: string;
  action: string;
  artifact: string;
}

function parseSteps(content: string): ParsedStep[] {
  const lines = content.split('\n');
  const steps: ParsedStep[] = [];
  let currentAction = '';
  let currentTime = '';
  let currentArtifact = '';

  const flush = () => {
    if (currentAction) {
      steps.push({ time: currentTime, action: currentAction.trim(), artifact: currentArtifact.trim() });
      currentAction = ''; currentTime = ''; currentArtifact = '';
    }
  };

  for (const line of lines) {
    const numbered = line.match(/^\s*[・•]?\s*\d+[.)．。]\s*(.*)/);
    if (numbered) {
      flush();
      const full = numbered[1];
      const timeM = full.match(/^【(\d+分?)】\s*(.*)/);
      const artM = (timeM ? timeM[2] : full).match(/^(.*?)→\s*完成物[：:](.*)$/);
      if (timeM) {
        currentTime = timeM[1];
        const rest = timeM[2];
        if (artM) { currentAction = artM[1]; currentArtifact = artM[2]; }
        else { currentAction = rest; }
      } else {
        if (artM) { currentAction = artM[1]; currentArtifact = artM[2]; }
        else { currentAction = full; }
      }
    } else if (currentAction && line.trim()) {
      const artM = line.match(/→\s*完成物[：:](.*)$/);
      if (artM && !currentArtifact) {
        currentArtifact = artM[1];
      } else if (!line.match(/合計[：:]/)) {
        currentAction += '\n' + line.trim();
      }
    }
  }
  flush();

  // fallback: bullet list
  if (steps.length === 0) {
    return lines
      .filter(l => l.trim().startsWith('・') || l.trim().startsWith('•'))
      .map(l => ({ time: '', action: l.replace(/^[\s・•]+/, '').trim(), artifact: '' }))
      .filter(s => s.action);
  }
  return steps;
}

export default function ResultPage() {
  const router = useRouter();
  const [taskData, setTaskData] = useState<CurrentTaskSession | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedTaskId, setSavedTaskId] = useState('');
  const [error, setError] = useState('');
  const [showDetail, setShowDetail] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

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

  const sections = parseAIOutput(normalizeAIOutput(taskData.aiOutput));
  const mainContent = getSection(sections, '今すぐやるタスク');

  const taskName      = extractField(mainContent, 'タスク名') || extractField(mainContent, '作業名');
  const taskCategory  = extractField(mainContent, 'カテゴリ');
  const taskDuration  = extractField(mainContent, '所要時間') || taskData.availableTime;
  const taskCondition = extractField(mainContent, '完了条件') || extractField(mainContent, '完了条件（上司が30秒で合否判定できる基準）');
  const taskArtifact  = extractField(mainContent, '成果物') || extractField(mainContent, '成果物（何が完成するか具体的に）');
  const taskPurpose   = extractField(mainContent, '目的（会社利益とスキルアップの両方を説明）') || extractField(mainContent, '内容') || extractField(mainContent, '内容（2〜3文で背景と目的を説明）');
  const taskProfit    = extractField(mainContent, '推定利益インパクト（年間）');
  const taskGrowth    = extractField(mainContent, '本人の成長ポイント') || extractField(mainContent, '本人のスキルアップと昇格への道筋') || extractField(mainContent, '本人の成長ポイント（このタスクで何ができるようになるか具体的に）');
  const taskMistakes  = extractField(mainContent, 'よくあるミスと対策');
  const taskSkills    = extractField(mainContent, 'このタスクで習得・強化するスキル（具体的に3つ）');
  const taskLevelLink = extractField(mainContent, `Lv昇格への直接的なつながり`) || mainContent.match(/・Lv\d+昇格への直接的なつながり[：:][\s]*([^]*?)(?=\n・|\n\n|$)/)?.[1]?.trim() || '';

  const whySection      = getSection(sections, 'なぜこの指示を出したか');
  const nextTask        = getSection(sections, '終わったら次にやるタスク');
  const reinstructSection = getSection(sections, '未完了・不十分だった場合の再指示');
  const nextStepSection = getSection(sections, '完了した場合の次ステップ');
  const prioritySection = getSection(sections, 'AIが判断した優先課題');
  const analysisSection = getSection(sections, 'この社員の現状分析と成長評価');
  const visionSection   = getSection(sections, '3ヶ月後のビジョン');
  const checkSection    = getSection(sections, '上司への確認ポイント');

  const steps = parseSteps(mainContent);
  const hasContent = mainContent.length > 0;

  return (
    <div className="min-h-screen bg-slate-100">
      {/* ヘッダー */}
      <header className="bg-blue-700 text-white px-4 py-3 shadow-md sticky top-0 z-20">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => router.push('/')} className="text-blue-200 hover:text-white text-sm">
            ← 戻る
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">{taskData.employee?.社員名}</p>
            <p className="text-blue-200 text-xs">{taskData.location} ｜ {new Date(taskData.timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-3 py-4 space-y-3 pb-10">

        {hasContent ? (
          <>
            {/* ─── 時間＋タスク名バナー ─── */}
            <div className="bg-blue-700 text-white rounded-2xl px-4 py-4 shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-yellow-400 text-gray-900 text-sm font-black px-3 py-1 rounded-full">
                  ⏱ {taskData.availableTime}
                </span>
                {taskCategory && (
                  <span className="text-xs bg-blue-500 text-blue-100 px-2 py-1 rounded-full">
                    {taskCategory}
                  </span>
                )}
              </div>
              <h1 className="text-xl font-black leading-snug mb-2">
                {taskName || 'タスクを確認してください'}
              </h1>
              {taskPurpose && (
                <p className="text-blue-100 text-sm leading-relaxed">{taskPurpose}</p>
              )}
              {/* なぜこの指示か（1行で） */}
              {whySection && (
                <div className="mt-3 bg-blue-600 rounded-xl px-3 py-2 text-xs text-blue-50 leading-relaxed">
                  <span className="text-yellow-300 font-bold">💡 </span>
                  {whySection.split('\n').find(l => l.trim()) || whySection}
                </div>
              )}
            </div>

            {/* ─── 手順カード ─── */}
            {steps.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100">
                  <p className="text-sm font-bold text-gray-800">📋 やること（{steps.length}ステップ）</p>
                </div>
                <div className="divide-y divide-gray-100">
                  {steps.map((step, i) => (
                    <div key={i} className="px-4 py-3 flex gap-3">
                      <div className="flex-shrink-0 flex flex-col items-center gap-1">
                        <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-black">
                          {i + 1}
                        </span>
                        {step.time && (
                          <span className="text-xs text-blue-500 font-bold whitespace-nowrap">{step.time}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 font-medium leading-relaxed whitespace-pre-wrap">{step.action}</p>
                        {step.artifact && (
                          <p className="text-xs text-green-700 mt-1 bg-green-50 rounded-lg px-2 py-1">
                            → 完成物：{step.artifact}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 手順パース失敗時のフォールバック */}
            {steps.length === 0 && mainContent && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
                <p className="text-xs font-bold text-gray-500 mb-2">📋 タスク内容</p>
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{mainContent}</pre>
              </div>
            )}

            {/* ─── 完了条件 ─── */}
            {taskCondition && (
              <div className="bg-green-50 border-2 border-green-400 rounded-2xl px-4 py-3">
                <p className="text-xs font-bold text-green-700 mb-1">✅ 完了条件</p>
                <p className="text-sm text-gray-800 leading-relaxed">{taskCondition}</p>
              </div>
            )}

            {/* ─── 成果物 ─── */}
            {taskArtifact && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 px-4 py-3">
                <p className="text-xs font-bold text-gray-500 mb-1">📄 完成物</p>
                <p className="text-sm text-gray-800 leading-relaxed">{taskArtifact}</p>
              </div>
            )}

            {/* ─── 会社の利益 ─── */}
            {taskProfit && (
              <div className="bg-yellow-50 border border-yellow-300 rounded-2xl px-4 py-3 flex gap-3 items-start">
                <span className="text-xl flex-shrink-0">💴</span>
                <div>
                  <p className="text-xs font-bold text-yellow-700 mb-0.5">会社へのメリット（年間）</p>
                  <p className="text-sm text-gray-800 font-medium">{taskProfit}</p>
                </div>
              </div>
            )}

            {/* ─── スキルアップ ─── */}
            {(taskGrowth || taskLevelLink || taskSkills) && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 px-4 py-3 space-y-1.5">
                <p className="text-xs font-bold text-gray-500">📈 このタスクで得られること</p>
                {taskSkills && <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{taskSkills}</p>}
                {(taskGrowth || taskLevelLink) && !taskSkills && (
                  <p className="text-sm text-gray-800 leading-relaxed">{taskLevelLink || taskGrowth}</p>
                )}
                {taskLevelLink && taskSkills && (
                  <p className="text-xs text-green-700 font-medium">🚀 {taskLevelLink}</p>
                )}
              </div>
            )}

            {/* ─── よくあるミス ─── */}
            {taskMistakes && (
              <div className="bg-orange-50 border border-orange-300 rounded-2xl px-4 py-3">
                <p className="text-xs font-bold text-orange-700 mb-1">⚠️ よくあるミスと対策</p>
                <p className="text-sm text-gray-800 leading-relaxed">{taskMistakes}</p>
              </div>
            )}
          </>
        ) : (
          /* パース失敗フォールバック */
          <div className="bg-white rounded-2xl border-2 border-orange-300 p-4">
            <p className="text-orange-600 font-bold text-sm mb-2">⚠️ AI出力（生テキスト）</p>
            <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{taskData.aiOutput}</pre>
          </div>
        )}

        {/* ─── 詳細情報（折りたたみ） ─── */}
        <button
          onClick={() => setShowDetail(v => !v)}
          className="w-full bg-white hover:bg-gray-50 text-gray-600 font-semibold py-2.5 rounded-xl text-sm transition-colors border border-gray-200 shadow-sm"
        >
          {showDetail ? '▲ 詳細分析を閉じる' : '▼ 詳細分析を見る（優先課題・成長分析・再指示など）'}
        </button>

        {showDetail && (
          <div className="space-y-3">
            {analysisSection && <Card icon="📊" title="この社員の現状分析と成長評価" color="purple">{analysisSection}</Card>}
            {visionSection   && <Card icon="🔭" title="3ヶ月後のビジョン" color="blue-light">{visionSection}</Card>}
            {prioritySection && <Card icon="🎯" title="AIが判断した優先課題" color="yellow">{prioritySection}</Card>}
            {nextTask        && <Card icon="➡️" title="終わったら次にやるタスク" color="green">{nextTask}</Card>}
            {reinstructSection && <Card icon="⚠️" title="未完了・不十分だった場合の再指示" color="red">{reinstructSection}</Card>}
            {nextStepSection && <Card icon="✅" title="完了した場合の次ステップ" color="green-dark">{nextStepSection}</Card>}
            {checkSection    && <Card icon="📌" title="上司への確認ポイント" color="purple">{checkSection}</Card>}
          </div>
        )}

        {/* ─── AI全文表示 ─── */}
        <button
          onClick={() => setShowRaw(v => !v)}
          className="w-full bg-gray-100 hover:bg-gray-200 text-gray-500 font-medium py-2 rounded-xl text-xs border border-gray-200"
        >
          {showRaw ? '▲ AI生成テキストを閉じる' : '▼ AI生成テキストを全文表示する'}
        </button>
        {showRaw && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-bold text-gray-400 mb-2">📄 AI出力（全文）</p>
            <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{taskData.aiOutput}</pre>
          </div>
        )}

        {/* エラー */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">⚠️ {error}</div>
        )}

        {/* ─── アクション ─── */}
        <div className="space-y-3 pt-1">
          {!saved ? (
            <button
              onClick={handleSave}
              disabled={saving}
              className={`w-full py-4 rounded-xl text-base font-bold shadow-md ${
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
            <Link href="/input" className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl text-base text-center shadow-md">
              📝 実施結果を入力する →
            </Link>
          )}
          <Link href="/" className="block w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 rounded-xl text-base text-center">
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
  icon, title, color, children,
}: {
  icon: string; title: string; color: string; children: ReactNode;
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
