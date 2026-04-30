'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Employee } from '@/types';

const LEVELS = ['1', '2', '3', '4', '5', '6', '7'];
const LEVEL_LABELS: Record<string, string> = {
  '1': 'Lv1 新人・未経験',
  '2': 'Lv2 初級作業員',
  '3': 'Lv3 一般作業員',
  '4': 'Lv4 中堅作業員',
  '5': 'Lv5 職長候補',
  '6': 'Lv6 職長・リーダー',
  '7': 'Lv7 管理者・幹部候補',
};

const emptyForm = {
  employee_id: '',
  社員名: '',
  レベル: '1',
  得意分野: '',
  苦手分野: '',
  性格傾向: '',
  現在の状態: '待機中',
  最終更新日: '',
};

export default function EmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Employee>({ ...emptyForm });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);

  const load = () => {
    setLoading(true);
    fetch('/api/employees')
      .then(r => r.json())
      .then(data => { if (data.success) setEmployees(data.employees); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const openEdit = (emp: Employee) => {
    setForm({ ...emp });
    setEditingId(emp.employee_id);
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const handleSave = async () => {
    if (!form.社員名.trim()) { setError('社員名を入力してください'); return; }
    setSaving(true);
    setError('');
    try {
      const isNew = !editingId;
      const res = await fetch('/api/employees', {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(isNew ? '社員を追加しました' : '社員情報を更新しました');
        setShowForm(false);
        load();
      } else {
        setError(data.error || '保存に失敗しました');
      }
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (emp: Employee) => {
    try {
      const res = await fetch(`/api/employees?employee_id=${emp.employee_id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setSuccess(`${emp.社員名} を削除しました`);
        setDeleteTarget(null);
        load();
      } else {
        setError(data.error || '削除に失敗しました');
      }
    } catch {
      setError('通信エラーが発生しました');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-blue-700 text-white px-4 py-3 shadow-md sticky top-0 z-20">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => router.push('/')} className="text-blue-200 hover:text-white text-sm font-medium">
            ← 戻る
          </button>
          <h1 className="text-base font-bold flex-1">👥 社員管理</h1>
          <button
            onClick={openAdd}
            className="text-xs bg-white text-blue-700 font-bold px-3 py-1.5 rounded-lg hover:bg-blue-50"
          >
            ＋ 追加
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4 pb-10">

        {success && (
          <div className="bg-green-50 border border-green-300 text-green-700 rounded-xl px-4 py-3 text-sm font-medium">
            ✅ {success}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-300 text-red-700 rounded-xl px-4 py-3 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* 社員一覧 */}
        {loading ? (
          <div className="text-center text-gray-400 py-8">読み込み中...</div>
        ) : employees.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <p>社員が登録されていません</p>
            <button onClick={openAdd} className="mt-3 text-blue-600 font-bold">
              ＋ 最初の社員を追加する
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {employees.map(emp => (
              <div key={emp.employee_id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 text-base">{emp.社員名}</span>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                        {LEVEL_LABELS[emp.レベル] || `Lv${emp.レベル}`}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">ID: {emp.employee_id}</p>
                    {emp.得意分野 && (
                      <p className="text-xs text-green-700 mt-1">得意：{emp.得意分野}</p>
                    )}
                    {emp.苦手分野 && (
                      <p className="text-xs text-orange-600 mt-0.5">苦手：{emp.苦手分野}</p>
                    )}
                    {emp.性格傾向 && (
                      <p className="text-xs text-gray-500 mt-0.5">傾向：{emp.性格傾向}</p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-2 flex-shrink-0">
                    <button
                      onClick={() => openEdit(emp)}
                      className="text-xs bg-blue-100 text-blue-700 font-bold px-3 py-1.5 rounded-lg hover:bg-blue-200"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => setDeleteTarget(emp)}
                      className="text-xs bg-red-100 text-red-700 font-bold px-3 py-1.5 rounded-lg hover:bg-red-200"
                    >
                      削除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 追加・編集フォーム */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white px-4 py-3 border-b flex items-center justify-between">
                <h2 className="font-bold text-gray-900">
                  {editingId ? '社員情報を編集' : '新しい社員を追加'}
                </h2>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
              </div>

              <div className="px-4 py-4 space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
                    ⚠️ {error}
                  </div>
                )}

                <Field label="社員名 *">
                  <input
                    type="text"
                    value={form.社員名}
                    onChange={e => setForm(f => ({ ...f, 社員名: e.target.value }))}
                    placeholder="例：山田 太郎"
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </Field>

                <Field label="レベル *">
                  <div className="grid grid-cols-2 gap-2">
                    {LEVELS.map(lv => (
                      <button
                        key={lv}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, レベル: lv }))}
                        className={`py-2 px-2 rounded-lg text-xs font-semibold border-2 transition-all text-left ${
                          form.レベル === lv
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        {LEVEL_LABELS[lv]}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label="得意分野">
                  <input
                    type="text"
                    value={form.得意分野}
                    onChange={e => setForm(f => ({ ...f, 得意分野: e.target.value }))}
                    placeholder="例：工具管理・材料管理"
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </Field>

                <Field label="苦手分野">
                  <input
                    type="text"
                    value={form.苦手分野}
                    onChange={e => setForm(f => ({ ...f, 苦手分野: e.target.value }))}
                    placeholder="例：書類作成・手順書"
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </Field>

                <Field label="性格傾向">
                  <input
                    type="text"
                    value={form.性格傾向}
                    onChange={e => setForm(f => ({ ...f, 性格傾向: e.target.value }))}
                    placeholder="例：真面目・コツコツ型"
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </Field>

                <div className="pt-2 flex gap-2">
                  <button
                    onClick={() => setShowForm(false)}
                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-sm"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className={`flex-1 py-3 font-bold rounded-xl text-sm text-white ${
                      saving ? 'bg-gray-300' : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {saving ? '保存中...' : editingId ? '更新する' : '追加する'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 削除確認ダイアログ */}
        {deleteTarget && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
              <h2 className="font-bold text-gray-900 text-lg">社員を削除しますか？</h2>
              <p className="text-gray-600 text-sm">
                <strong>{deleteTarget.社員名}</strong>（{deleteTarget.employee_id}）を削除します。この操作は元に戻せません。
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-sm"
                >
                  キャンセル
                </button>
                <button
                  onClick={() => handleDelete(deleteTarget)}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm"
                >
                  削除する
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-bold text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
