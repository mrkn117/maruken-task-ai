'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CurrentTaskSession, TaskHistory } from '@/types';

const STATUS_OPTIONS: { value: TaskHistory['状態']; label: string; color: string; activeColor: string }[] = [
  { value: '完了', label: '✅ 完了', color: 'border-green-300 text-green-700', activeColor: 'bg-green-500 border-green-500 text-white' },
  { value: '不十分', label: '🔶 不十分', color: 'border-yellow-300 text-yellow-700', activeColor: 'bg-yellow-500 border-yellow-500 text-white' },
  { value: '途中', label: '🔄 途中', color: 'border-orange-300 text-orange-700', activeColor: 'bg-orange-400 border-orange-400 text-white' },
  { value: '未実施', label: '⏸ 未実施', color: 'border-gray-300 text-gray-600', activeColor: 'bg-gray-400 border-gray-400 text-white' },
];

const RATINGS = ['1', '2', '3', '4', '5'];

export default function InputPage() {
  const router = useRouter();
  const [taskData, setTaskData] = useState<CurrentTaskSession | null>(null);
  const [form, setForm] = useState({
    status: '' as TaskHistory['状態'] | '',
    artifact: '',
    managerComment: '',
    rating: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const stored = sessionStorage.getItem('currentTask');
    if (!stored) {
      router.push('/');
      return;
    }
    setTaskData(JSON.parse(stored));
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.status) {
      setError('実施状態を選択してください');
      return;
    }
    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/save-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...taskData, ...form }),
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
        sessionStorage.removeItem('currentTask');
      } else {
        setError('保存に失敗しました: ' + data.error);
      }
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setSaving(false);
    }
  };

  // 保存完了画面
  if (saved) {
    const msgs: Record<string, string> = {
      '完了': 'お疲れ様でした！次の成長ステップへ進みましょう。',
      '不十分': '記録しました。次回はより具体的な成果物を目指しましょう。',
      '途中': '記録しました。次の空き時間に続きに取り組みましょう。',
      '未実施': '記録しました。次の機会に取り組みましょう。',
    };
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-sm w-full">
          <div className="text-6xl mb-4">
            {form.status === '完了' ? '✅' : form.status === '不十分' ? '🔶' : '🔄'}
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">記録を保存しました</h2>
          <p className="text-gray-500 text-sm mb-6">
            {msgs[form.status] || 'お疲れ様でした。'}
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl text-base"
          >
            トップに戻る
          </button>
        </div>
      </div>
    );
  }

  // タスク情報を表示するためのタスク名抽出
  const taskName = taskData?.aiOutput?.match(/・タスク名[：:]\s*(.+)/)?.[1]?.trim() || 'AIタスク';

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ヘッダー */}
      <header className="bg-blue-700 text-white px-4 py-3 shadow-md">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => router.push('/result')} className="text-blue-200 hover:text-white text-sm">
            ← 戻る
          </button>
          <div>
            <h1 className="text-base font-bold">実施結果を入力</h1>
            <p className="text-blue-200 text-xs">{taskData?.employee?.社員名}</p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 pb-10">
        {/* タスク名表示 */}
        <div className="bg-white rounded-xl border border-gray-200 p-3 mb-4 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">実施タスク</p>
          <p className="text-sm font-semibold text-gray-800">{taskName}</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-red-700 text-sm">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 実施状態 */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <label className="block text-sm font-bold text-gray-700 mb-3">
              実施状態 <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, status: opt.value }))}
                  className={`py-3 px-2 rounded-xl text-sm font-bold border-2 transition-all active:scale-95 ${
                    form.status === opt.value ? opt.activeColor : `bg-white ${opt.color}`
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 成果物・実施メモ */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              成果物・実施メモ
            </label>
            <textarea
              value={form.artifact}
              onChange={e => setForm(f => ({ ...f, artifact: e.target.value }))}
              rows={3}
              placeholder="例：工具チェックリストに記入。写真3枚撮影。在庫数を数えた。"
              className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-gray-800 text-sm focus:border-blue-500 focus:outline-none resize-none"
            />
          </div>

          {/* 上司コメント */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              上司コメント（任意）
            </label>
            <textarea
              value={form.managerComment}
              onChange={e => setForm(f => ({ ...f, managerComment: e.target.value }))}
              rows={2}
              placeholder="上司からのフィードバックや指摘事項"
              className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-gray-800 text-sm focus:border-blue-500 focus:outline-none resize-none"
            />
          </div>

          {/* 評価（5段階） */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <label className="block text-sm font-bold text-gray-700 mb-3">
              評価（5段階）
            </label>
            <div className="flex gap-2">
              {RATINGS.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, rating: r }))}
                  className={`flex-1 py-3 rounded-xl text-center border-2 transition-all active:scale-95 ${
                    form.rating === r
                      ? 'bg-yellow-400 border-yellow-400 text-white'
                      : 'bg-white border-gray-200 text-gray-500'
                  }`}
                >
                  <div className="text-lg">{'⭐'.repeat(parseInt(r))}</div>
                  <div className="text-xs font-bold mt-0.5">{r}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 保存ボタン */}
          <button
            type="submit"
            disabled={saving || !form.status}
            className={`w-full py-5 rounded-xl text-base font-bold transition-all shadow-md ${
              !saving && form.status
                ? 'bg-blue-600 hover:bg-blue-700 text-white active:scale-98'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {saving ? '保存中...' : '💾 結果を保存する'}
          </button>
        </form>
      </main>
    </div>
  );
}
