export interface ProfileTagGroup {
  id: string;
  label: string;
  single: boolean;
  options: Array<{ id: string; label: string }>;
}

export const PROFILE_TAG_GROUPS: ProfileTagGroup[] = [
  {
    id: 'style',
    label: '仕事スタイル（1つ選択）',
    single: true,
    options: [
      { id: 'style_kotsu',     label: 'コツコツ積み上げ型' },
      { id: 'style_intensive', label: '一気に集中型' },
      { id: 'style_solo',      label: '一人で黙々と作業' },
      { id: 'style_team',      label: 'チームで協力型' },
      { id: 'style_follow',    label: '指示どおり確実型' },
      { id: 'style_selfdriven',label: '自分で考えて動く型' },
    ],
  },
  {
    id: 'learning',
    label: '学習タイプ（1つ選択）',
    single: true,
    options: [
      { id: 'learn_doing',    label: '実際にやって覚える' },
      { id: 'learn_reading',  label: '資料・本を読んで覚える' },
      { id: 'learn_repeat',   label: '繰り返し練習で覚える' },
      { id: 'learn_teaching', label: '人に教わって覚える' },
    ],
  },
  {
    id: 'strengths',
    label: '強み（複数選択可）',
    single: false,
    options: [
      { id: 'str_careful',  label: '丁寧・ミスが少ない' },
      { id: 'str_fast',     label: '作業スピードが早い' },
      { id: 'str_coaching', label: '後輩指導・説明が得意' },
      { id: 'str_docs',     label: '書類・記録作業が得意' },
      { id: 'str_tools',    label: '工具・材料管理が得意' },
      { id: 'str_planning', label: '段取り・計画が得意' },
      { id: 'str_safety',   label: '安全意識が高い' },
      { id: 'str_report',   label: '報告・相談が丁寧' },
    ],
  },
  {
    id: 'issues',
    label: '課題・弱み（複数選択可）',
    single: false,
    options: [
      { id: 'iss_docs',       label: '書類・記録が後回しになる' },
      { id: 'iss_repeat',     label: '同じミスを繰り返しやすい' },
      { id: 'iss_report',     label: '報告・相談が少ない' },
      { id: 'iss_time',       label: '時間管理が苦手' },
      { id: 'iss_numbers',    label: '数字・計算が苦手' },
      { id: 'iss_passive',    label: '指示待ちになりやすい' },
      { id: 'iss_confidence', label: '自信が持てていない' },
    ],
  },
  {
    id: 'motivation',
    label: '現在のモチベーション（複数選択可）',
    single: false,
    options: [
      { id: 'mot_promotion', label: '昇格・キャリアアップに意欲的' },
      { id: 'mot_skill',     label: '特定のスキルを伸ばしたい' },
      { id: 'mot_stable',    label: '今のポジションで安定したい' },
      { id: 'mot_high',      label: 'やる気・モチベーションが高い' },
      { id: 'mot_low',       label: '少しやる気が落ちている時期' },
    ],
  },
];

export const TAG_LABEL_MAP: Record<string, string> = Object.fromEntries(
  PROFILE_TAG_GROUPS.flatMap(g => g.options.map(o => [o.id, o.label]))
);

export function buildProfilePromptSection(tags: string[] | undefined, level: number): string {
  if (!tags || tags.length === 0) return '';

  const lbl = (id: string) => TAG_LABEL_MAP[id] || id;
  const nextLevel = Math.min(level + 1, 10);

  const styleLabels    = tags.filter(t => t.startsWith('style_')).map(lbl);
  const learningLabels = tags.filter(t => t.startsWith('learn_')).map(lbl);
  const strengthLabels = tags.filter(t => t.startsWith('str_')).map(lbl);
  const issueLabels    = tags.filter(t => t.startsWith('iss_')).map(lbl);
  const motLabels      = tags.filter(t => t.startsWith('mot_')).map(lbl);

  const insights: string[] = [];

  // --- スタイル ---
  if (tags.includes('style_kotsu'))      insights.push('コツコツ型：段階を踏んで確実に完了できるタスクを選ぶ。一度に多くを求めず積み上げを実感できる設計にする');
  if (tags.includes('style_intensive'))  insights.push('集中型：1つのことに集中できる設計。複数タスクを並列させない');
  if (tags.includes('style_solo'))       insights.push('単独作業型：一人で完結するタスクを選ぶ。グループワーク系は避ける');
  if (tags.includes('style_follow'))     insights.push('指示どおり確実型：手順を明確に記載する。「考えてください」系の曖昧な指示は禁止');
  if (tags.includes('style_selfdriven')) insights.push('自律型：「なぜ重要か」を冒頭に伝える。細かい手順より目標と背景を重視して説明する');

  // --- 学習タイプ ---
  if (tags.includes('learn_doing'))    insights.push('実践型：書くだけでなく実際に手を動かすタスクを優先');
  if (tags.includes('learn_reading'))  insights.push('読書型：資料・手順書を読んでから実践する流れのタスクが合う');
  if (tags.includes('learn_repeat'))   insights.push('反復型：同じスキルを繰り返し練習するタスクが最も効果的');
  if (tags.includes('learn_teaching')) insights.push('対話型：上司・先輩への報告・確認を組み込んだタスクが効果的');

  // --- 課題 ---
  if (tags.includes('iss_docs'))       insights.push(`書類・記録が課題：記録系タスクを指示して苦手を克服させる（ただし${tags.includes('style_kotsu') ? '短時間で完結するものに限る' : '完成物が明確なものに限る'}）`);
  if (tags.includes('iss_repeat'))     insights.push('ミス繰り返し：「なぜミスが起きたか」の原因分析タスクを優先。再発防止の仕組みを作るタスクが効果的');
  if (tags.includes('iss_report'))     insights.push('報告不足：タスクの最終ステップに「上司への報告文案を書く・報告する」を必ず含める');
  if (tags.includes('iss_time'))       insights.push('時間管理苦手：各ステップに厳密な時間を書く。「XX分でやめて次へ」と明記する');
  if (tags.includes('iss_passive'))    insights.push('指示待ち型：「まずここまでやれば完了」という明確なゴールラインを1つだけ示す');
  if (tags.includes('iss_confidence')) insights.push(`自信不足：必ず達成できる難易度に設定。「これができた＝Lv${level}合格レベル」とはっきり伝える`);
  if (tags.includes('iss_numbers'))    insights.push('数字が苦手：計算・集計タスクより、実作業・記録系のタスクを優先する');

  // --- モチベーション ---
  if (tags.includes('mot_promotion')) insights.push(`昇格意欲あり：Lv${nextLevel}昇格に直結するスキルのタスクを最優先。「このタスクがLv${nextLevel}昇格に直結する理由」を必ず明記する`);
  if (tags.includes('mot_low'))       insights.push('モチベーション低下中：達成感を得やすい短時間タスクを選ぶ。難しすぎるものは絶対に出さない。成功体験が最優先');
  if (tags.includes('mot_high'))      insights.push('高モチベーション：やや挑戦的なタスクでも意欲的に取り組める。難易度を少し上げて良い');
  if (tags.includes('mot_skill'))     insights.push('スキル志向：得意分野を深めるか、苦手分野を克服するかを状況で判断して選ぶ');

  const profileLines: string[] = [];
  if (styleLabels.length)    profileLines.push(`・仕事スタイル：${styleLabels.join('、')}`);
  if (learningLabels.length)  profileLines.push(`・学習タイプ：${learningLabels.join('、')}`);
  if (strengthLabels.length)  profileLines.push(`・強み：${strengthLabels.join('、')}`);
  if (issueLabels.length)     profileLines.push(`・課題：${issueLabels.join('、')}`);
  if (motLabels.length)       profileLines.push(`・モチベーション：${motLabels.join('、')}`);

  const insightBlock = insights.length > 0
    ? `\n→ このプロフィールからのタスク選定指針（必ず反映すること）：\n${insights.map(i => '  ・' + i).join('\n')}`
    : '';

  return `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ 社員の詳細プロフィール分析（タスク選定に必ず活かすこと）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${profileLines.join('\n')}${insightBlock}`;
}
