'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Employee } from '@/types';

const AVAILABLE_TIMES = ['15分', '30分', '1時間', '1.5時間', '2時間', '3時間', '半日', '1日'];
const LOCATIONS = ['事務所', '倉庫', '資材置き場', '社内（その他）'];
const STATUSES = ['待機中', '移動中', '作業後', '研修中', '休憩中'];

function SelectButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`py-3 px-2 rounded-lg text-sm font-semibold border-2 transition-all active:scale-95 ${
        selected
          ? 'bg-blue-600 text-white border-blue-600 shadow-md'
          : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
      }`}
    >
      {label}
    </button>
  );
}

interface SalesContext {
  targetAmount: string;
  actualAmount: string;
  capacityNextMonth: string;
  capacityMonthAfter: string;
  backlogCount: string;
  backlogAmount: string;
  memo: string;
}

const emptySalesContext: SalesContext = {
  targetAmount: '',
  actualAmount: '',
  capacityNextMonth: '',
  capacityMonthAfter: '',
  backlogCount: '',
  backlogAmount: '',
  memo: '',
};

function buildSalesContextString(sc: SalesContext): string {
  const lines: string[] = [];
  if (sc.targetAmount || sc.actualAmount) {
    lines.push(`【今月の受注状況】目標：${sc.targetAmount || '不明'}万円　実績：${sc.actualAmount || '不明'}万円`);
  }
  if (sc.capacityNextMonth || sc.capacityMonthAfter) {
    lines.push(`【施工部隊の稼働率】来月：${sc.capacityNextMonth || '不明'}%　再来月：${sc.capacityMonthAfter || '不明'}%`);
  }
  if (sc.backlogCount || sc.backlogAmount) {
    lines.push(`【現在の受注残】${sc.backlogCount || '不明'}件　計${sc.backlogAmount || '不明'}万円`);
  }
  if (sc.memo) {
    lines.push(`【補足・懸念事項】${sc.memo}`);
  }
  return lines.join('\n');
}

export default function HomePage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    employee_id: '',
    availableTime: '',
    location: '',
    currentStatus: '',
  });

  const [salesContext, setSalesContext] = useState<SalesContext>({ ...emptySalesContext });

  useEffect(() => {
    fetch('/api/employees')
      .then(r => r.json())
      .then(data => {
        if (data.success) setEmployees(data.employees);
        else setError('社員情報の取得に失敗しました: ' + data.error);
      })
      .catch(() => setError('社員情報の取得中にエラーが発生しました'))
      .finally(() => setLoadingEmployees(false));
  }, []);

  const selectedEmp = employees.find(e => e.employee_id === form.employee_id);
  const isSales = selectedEmp?.職種 === '営業';

  const isReady =
    form.employee_id && form.availableTime && form.location && form.currentStatus &&
    (!isSales || salesContext.capacityNextMonth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isReady) {
      setError(isSales
        ? 'すべての項目を入力してください（営業は来月稼働率が必須です）'
        : 'すべての項目を選択してください');
      return;
    }
    setGenerating(true);
    setError('');

    const salesContextStr = isSales ? buildSalesContextString(salesContext) : '';
    const finalStatus = isSales && salesContextStr
      ? `${form.currentStatus}\n\n${salesContextStr}`
      : form.currentStatus;

    try {
      const res = await fetch('/api/generate-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, currentStatus: finalStatus }),
      });
      const data = await res.json();
      if (data.success) {
        sessionStorage.setItem(
          'currentTask',
          JSON.stringify({
            ...form,
            currentStatus: finalStatus,
            aiOutput: data.aiOutput,
            employee: data.employee,
            timestamp: new Date().toISOString(),
          })
        );
        router.push('/result');
      } else {
        setError('AI指示の生成に失敗しました: ' + data.error);
      }
    } catch {
      setError('通信エラーが発生しました。再度お試しください。');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-blue-700 text-white px-4 py-4 shadow-md">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-wide">⚡ 空き時間タスク指示AI</h1>
            <p className="text-blue-200 text-xs mt-1">マルケン電工 — 空き時間を成長・改善に変える</p>
          </div>
          <a
            href="/employees"
            className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-lg border border-blue-400"
          >
            👥 社員管理
          </a>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-4 pb-10">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ① 社員選択 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <label className="block text-sm font-bold text-gray-700 mb-3">① 社員名を選ぶ</label>
            {loadingEmployees ? (
              <div className="text-gray-400 text-sm py-2 text-center">読み込み中...</div>
            ) : (
              <select
                value={form.employee_id}
                onChange={e => {
                  setForm(f => ({ ...f, employee_id: e.target.value }));
                  setSalesContext({ ...emptySalesContext });
                }}
                className="w-full border-2 border-gray-200 rounded-lg px-3 py-3 text-gray-800 text-base focus:border-blue-500 focus:outline-none"
              >
                <option value="">-- 選択してください --</option>
                {employees.map(emp => (
                  <option key={emp.employee_id} value={emp.employee_id}>
                    {emp.社員名}（{emp.職種 || '現場'} Lv{emp.レベル}）
                  </option>
                ))}
              </select>
            )}
            {selectedEmp && (
              <p className="mt-2 text-xs text-blue-600 bg-blue-50 rounded px-2 py-1">
                {selectedEmp.職種 || '現場'} ｜ レベル {selectedEmp.レベル} ｜ 得意：{selectedEmp.得意分野 || 'なし'}
              </p>
            )}
          </div>

          {/* ② 空き時間 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <label className="block text-sm font-bold text-gray-700 mb-3">② 空き時間</label>
            <div className="grid grid-cols-4 gap-2">
              {AVAILABLE_TIMES.map(t => (
                <SelectButton
                  key={t}
                  label={t}
                  selected={form.availableTime === t}
                  onClick={() => setForm(f => ({ ...f, availableTime: t }))}
                />
              ))}
            </div>
          </div>

          {/* ③ 現在地 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <label className="block text-sm font-bold text-gray-700 mb-3">③ 現在地</label>
            <div className="grid grid-cols-2 gap-2">
              {LOCATIONS.map(l => (
                <SelectButton
                  key={l}
                  label={l}
                  selected={form.location === l}
                  onClick={() => setForm(f => ({ ...f, location: l }))}
                />
              ))}
            </div>
          </div>

          {/* ④ 現在の状態 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <label className="block text-sm font-bold text-gray-700 mb-3">④ 現在の状態</label>
            <div className="grid grid-cols-3 gap-2">
              {STATUSES.map(s => (
                <SelectButton
                  key={s}
                  label={s}
                  selected={form.currentStatus === s}
                  onClick={() => setForm(f => ({ ...f, currentStatus: s }))}
                />
              ))}
            </div>
          </div>

          {/* ⑤ 営業専用：受注・稼働状況 */}
          {isSales && (
            <div className="bg-orange-50 rounded-xl shadow-sm border-2 border-orange-300 p-4 space-y-4">
              <div>
                <p className="text-sm font-bold text-orange-800">⑤ 営業状況を入力（AIが利益計画に使います）</p>
                <p className="text-xs text-orange-600 mt-0.5">施工部隊の稼働状況と受注バランスを考慮した最適指示を出します</p>
              </div>

              {/* 今月受注 */}
              <div>
                <p className="text-xs font-bold text-gray-700 mb-2">今月の受注状況</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">目標（万円）</label>
                    <input
                      type="number"
                      placeholder="例：500"
                      value={salesContext.targetAmount}
                      onChange={e => setSalesContext(s => ({ ...s, targetAmount: e.target.value }))}
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">実績（万円）</label>
                    <input
                      type="number"
                      placeholder="例：320"
                      value={salesContext.actualAmount}
                      onChange={e => setSalesContext(s => ({ ...s, actualAmount: e.target.value }))}
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 施工稼働率 */}
              <div>
                <p className="text-xs font-bold text-gray-700 mb-2">施工部隊の稼働率 <span className="text-orange-600">★必須</span></p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">来月（%）</label>
                    <input
                      type="number"
                      placeholder="例：85"
                      value={salesContext.capacityNextMonth}
                      onChange={e => setSalesContext(s => ({ ...s, capacityNextMonth: e.target.value }))}
                      className="w-full border-2 border-orange-300 rounded-lg px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">再来月（%）</label>
                    <input
                      type="number"
                      placeholder="例：60"
                      value={salesContext.capacityMonthAfter}
                      onChange={e => setSalesContext(s => ({ ...s, capacityMonthAfter: e.target.value }))}
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-1">目安：75〜85%が適正。90%超で品質リスク。60%以下で固定費割れ</p>
              </div>

              {/* 受注残 */}
              <div>
                <p className="text-xs font-bold text-gray-700 mb-2">現在の受注残</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">件数</label>
                    <input
                      type="number"
                      placeholder="例：4"
                      value={salesContext.backlogCount}
                      onChange={e => setSalesContext(s => ({ ...s, backlogCount: e.target.value }))}
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">金額（万円）</label>
                    <input
                      type="number"
                      placeholder="例：1200"
                      value={salesContext.backlogAmount}
                      onChange={e => setSalesContext(s => ({ ...s, backlogAmount: e.target.value }))}
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 補足 */}
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1 block">補足・懸念事項（任意）</label>
                <textarea
                  rows={2}
                  placeholder="例：来月末に大型案件が竣工予定。夏場の閑散期対策が必要。低粗利の下請け案件が多い。"
                  value={salesContext.memo}
                  onChange={e => setSalesContext(s => ({ ...s, memo: e.target.value }))}
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-orange-400 focus:outline-none resize-none"
                />
              </div>
            </div>
          )}

          {/* 送信ボタン */}
          <button
            type="submit"
            disabled={!isReady || generating}
            className={`w-full py-5 rounded-xl text-base font-bold transition-all shadow-md active:scale-98 ${
              isReady && !generating
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {generating ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                AIがタスクを考えています...
              </span>
            ) : (
              '⚡ AIにタスクを考えさせる'
            )}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 pt-2">
          このシステムはAIが自動でタスクを提案します。営業活動は一切指示しません。
        </p>
      </main>
    </div>
  );
}
