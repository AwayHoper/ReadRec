import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import * as api from '../lib/api';
import { SectionCard } from '../components/section-card';
import {
  DailySessionStatus,
  DashboardHomeCalendarDay,
  DashboardHomeCta,
  DashboardHomeEncouragement,
  DashboardHomeMastery
} from '../types';

/** Summary: This constant defines the heatmap weekday labels for the dashboard calendar. */
const WEEKDAY_LABELS = ['一', '三', '五', '日'];

/** Summary: This helper parses backend date-only strings without UTC day shifting. */
function parseDashboardDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  return new Date(value);
}

/** Summary: This helper formats one ISO date into a localized long-form label. */
function formatLongDateLabel(date: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short'
  }).format(parseDashboardDate(date));
}

/** Summary: This helper formats one ISO date into a compact month-day label. */
function formatShortDateLabel(date: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric'
  }).format(parseDashboardDate(date));
}

/** Summary: This helper resolves the correct learning route from one session status. */
function getLearningRoute(status: DailySessionStatus) {
  if (status === 'ROUND_TWO') {
    return '/learn/review';
  }

  if (status === 'ROUND_THREE') {
    return '/learn/questions';
  }

  return '/learn/read';
}

/** Summary: This helper returns the dashboard copy for today's completion state. */
function getTodayStateCopy(state: 'pending' | 'completed') {
  return state === 'completed'
    ? {
        badge: '今日已完成',
        title: '今天已经进入学习状态，继续往前推进就好。'
      }
    : {
        badge: '今日待开始',
        title: '今天先把这一轮稳稳完成。'
      };
}

/** Summary: This helper returns the main-card copy for missing learning setup. */
function getSetupStateCopy() {
  return {
    label: '去设置学习计划',
    title: '先完成词库和计划设置，再开始今天的学习。'
  };
}

/** Summary: This helper returns button copy and styling for the learning CTA. */
function getCtaButtonStyles(mode: DashboardHomeCta['mode']) {
  return mode === 'continue'
    ? 'bg-ink text-sand shadow-lg shadow-ink/20 hover:bg-ink/90'
    : 'bg-coral text-white shadow-lg shadow-coral/20 hover:bg-coral/90';
}

/** Summary: This helper maps encouragement tone to one short supporting line. */
function getEncouragementLine(encouragement: DashboardHomeEncouragement, batchCount: number) {
  if (encouragement.tone === 'celebrate' || batchCount >= 2) {
    return '今天已经超额完成，顺着状态再学一轮会更轻松。';
  }

  if (encouragement.tone === 'praise') {
    return '今日计划已经拿下，下一轮适合趁热打铁。';
  }

  return encouragement.message;
}

/** Summary: This helper computes SVG donut segments from mastery counts. */
function getMasterySegments(mastery: DashboardHomeMastery) {
  const total = Math.max(mastery.totalWordCount, 1);
  const circumference = 2 * Math.PI * 42;
  const values = [
    { key: 'familiar', label: '熟悉', count: mastery.familiarCount, color: '#0f766e' },
    { key: 'fuzzy', label: '模糊', count: mastery.fuzzyCount, color: '#f59e0b' },
    { key: 'unseen', label: '陌生', count: mastery.unseenCount, color: '#cbd5e1' }
  ];

  let offset = 0;

  return values.map((value) => {
    const ratio = value.count / total;
    const length = Math.max(ratio * circumference, value.count > 0 ? 6 : 0);
    const segment = {
      ...value,
      ratio,
      dashArray: `${length} ${circumference - length}`,
      dashOffset: -offset
    };

    offset += length;
    return segment;
  });
}

/** Summary: This helper picks a background treatment from one day intensity level. */
function getCalendarIntensityStyles(day: DashboardHomeCalendarDay | null) {
  if (!day || !day.completed || day.intensity === 'none') {
    return 'bg-slate-100 text-slate-300';
  }

  if (day.intensity === 'high') {
    return 'bg-emerald-700 text-white';
  }

  if (day.intensity === 'medium') {
    return 'bg-emerald-500 text-white';
  }

  return 'bg-emerald-300 text-emerald-950';
}

/** Summary: This helper reshapes recent days into week columns for a contribution-style heatmap. */
function buildHeatmapColumns(days: DashboardHomeCalendarDay[]) {
  const sortedDays = [...days].sort((left, right) => left.date.localeCompare(right.date));
  const leadingPadding = sortedDays.length > 0 ? (parseDashboardDate(sortedDays[0].date).getDay() + 6) % 7 : 0;
  const padded: Array<DashboardHomeCalendarDay | null> = [];

  for (let index = 0; index < leadingPadding; index += 1) {
    padded.push(null);
  }

  padded.push(...sortedDays);

  while (padded.length % 7 !== 0) {
    padded.push(null);
  }

  const columns: Array<Array<DashboardHomeCalendarDay | null>> = [];
  for (let index = 0; index < padded.length; index += 7) {
    columns.push(padded.slice(index, index + 7));
  }

  return columns;
}

/** Summary: This component renders a compact donut chart for mastery distribution. */
function MasteryDonut({ mastery }: { mastery: DashboardHomeMastery }) {
  const segments = getMasterySegments(mastery);

  return (
    <div className="rounded-[2rem] border border-white/60 bg-white/80 p-5 text-slate-950 shadow-[0_24px_60px_rgba(27,31,59,0.12)] backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">掌握度</p>
          <p className="mt-1 text-sm text-slate-500">当前词库 {mastery.totalWordCount} 词</p>
        </div>
        <div className="group relative">
          <button
            type="button"
            aria-label="查看掌握度说明"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-sm font-semibold text-slate-500 transition hover:border-coral hover:text-coral"
          >
            i
          </button>
          <div className="pointer-events-none absolute right-0 top-10 z-10 w-64 rounded-2xl bg-slate-950 p-4 text-left text-xs leading-6 text-white opacity-0 shadow-2xl transition group-hover:opacity-100">
            <p>熟悉：已复习的单词。</p>
            <p>模糊：已学但还未复习的词。</p>
            <p>陌生：未进行学习的单词。</p>
          </div>
        </div>
      </div>
      <div className="mt-6 flex items-center gap-6">
        <div className="relative h-36 w-36 shrink-0">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
            <circle cx="60" cy="60" r="42" fill="none" stroke="#e2e8f0" strokeWidth="12" />
            {segments.map((segment) => (
              <circle
                key={segment.key}
                cx="60"
                cy="60"
                r="42"
                fill="none"
                stroke={segment.color}
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={segment.dashArray}
                strokeDashoffset={segment.dashOffset}
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-semibold text-ink">{Math.round((mastery.familiarCount / Math.max(mastery.totalWordCount, 1)) * 100)}%</span>
            <span className="text-xs tracking-[0.2em] text-slate-500">熟悉占比</span>
          </div>
        </div>
        <div className="grid flex-1 gap-3">
          {segments.map((segment) => (
            <div key={segment.key} className="rounded-2xl bg-slate-50/90 px-4 py-3 ring-1 ring-black/5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: segment.color }} />
                  <span className="text-sm font-medium text-slate-700">{segment.label}</span>
                </div>
                <span className="text-sm text-slate-500">{Math.round(segment.ratio * 100)}%</span>
              </div>
              <p className="mt-1 text-lg font-semibold text-ink">{segment.count}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Summary: This component renders a compact GitHub-style activity heatmap. */
function DashboardCalendar({
  days,
  totalDays,
  currentStreakDays,
  historySummary
}: {
  days: DashboardHomeCalendarDay[];
  totalDays: number;
  currentStreakDays: number;
  historySummary: string;
}) {
  const columns = buildHeatmapColumns(days);

  return (
    <SectionCard title="学习日历" className="rounded-[2rem] border-[#e7dfcf] bg-[#fffdfa] shadow-[0_18px_50px_rgba(27,31,59,0.06)]">
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-600">{historySummary}</p>
          </div>
          <div className="flex gap-6 text-sm text-slate-600">
            <div>
              <p className="text-slate-400">累计打卡</p>
              <p className="mt-1 text-lg font-semibold text-ink">{totalDays} 天</p>
            </div>
            <div>
              <p className="text-slate-400">连续打卡</p>
              <p className="mt-1 text-lg font-semibold text-ink">{currentStreakDays} 天</p>
            </div>
          </div>
        </div>
        <div className="flex items-start gap-3 overflow-x-auto">
          <div className="grid gap-2 pt-7 text-[11px] text-slate-400">
            {['一', '', '三', '', '五', '', '日'].map((label, index) => (
              <span key={`${label}-${index}`} className="h-3 leading-3">
                {label}
              </span>
            ))}
          </div>
          <div className="flex gap-2 rounded-2xl bg-[#f8f4ea] px-3 py-3 ring-1 ring-[#ede3d0]">
            {columns.map((column, columnIndex) => (
              <div key={`column-${columnIndex}`} className="grid gap-2">
                {column.map((cell, cellIndex) => (
                  <div
                    key={`${columnIndex}-${cellIndex}-${cell?.date ?? 'empty'}`}
                    title={cell ? `${formatShortDateLabel(cell.date)} · ${cell.learnedUniqueWordCount} 词` : undefined}
                    className={`h-3.5 w-3.5 rounded-[4px] transition ${getCalendarIntensityStyles(cell)}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>学习强度</span>
            <div className="flex items-center gap-1">
              <span className="h-3 w-3 rounded-[4px] bg-slate-100" />
              <span className="h-3 w-3 rounded-[4px] bg-emerald-300" />
              <span className="h-3 w-3 rounded-[4px] bg-emerald-500" />
              <span className="h-3 w-3 rounded-[4px] bg-emerald-700" />
            </div>
          </div>
          <span>{days.length} 天记录</span>
        </div>
      </div>
    </SectionCard>
  );
}

/** Summary: This component renders only the plan forecast beside the heatmap. */
function PlanForecastPanel({
  remainingDays,
  estimatedFinishDate
}: {
  remainingDays: number | null;
  estimatedFinishDate: string | null;
}) {
  return (
    <SectionCard title="计划预测" className="rounded-[2rem] border-[#e5e7eb] bg-white shadow-[0_18px_50px_rgba(27,31,59,0.06)]">
      <div className="space-y-4">
        <div className="rounded-2xl bg-[#f6f8fb] px-4 py-4 ring-1 ring-[#e7ecf3]">
          <p className="text-sm text-slate-500">预计剩余天数</p>
          <p className="mt-3 text-3xl font-semibold text-ink">{remainingDays ?? '-'}</p>
          <p className="mt-2 text-sm text-slate-600">按当前计划强度和剩余新词量估算。</p>
        </div>
        <div className="rounded-2xl bg-[#fff8f2] px-4 py-4 ring-1 ring-[#f4e4d5]">
          <p className="text-sm text-slate-500">预计完成日期</p>
          <p className="mt-3 text-xl font-semibold text-ink">{estimatedFinishDate ? formatLongDateLabel(estimatedFinishDate) : '暂未给出'}</p>
          <p className="mt-2 text-sm text-slate-600">切换计划档位后会实时更新。</p>
        </div>
      </div>
    </SectionCard>
  );
}

/** Summary: This component renders the authenticated dashboard as the refined learning cockpit. */
export function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const dashboardHomeQuery = useQuery({
    queryKey: ['dashboard-home'],
    queryFn: api.getDashboardHome
  });

  const ctaMutation = useMutation({
    mutationFn: async (mode: DashboardHomeCta['mode']) => {
      if (mode === 'start') {
        return api.startTodaySession();
      }

      if (mode === 'continue') {
        return api.createNextSession();
      }

      return null;
    },
    onSuccess: async (nextSession) => {
      if (nextSession) {
        queryClient.setQueryData(['session'], nextSession);
      }

      await queryClient.invalidateQueries({ queryKey: ['dashboard-home'] });
      navigate(nextSession ? getLearningRoute(nextSession.status) : '/learn/read');
    }
  });

  /** Summary: This function runs the CTA flow defined by the aggregate dashboard payload. */
  function handlePrimaryAction() {
    if (!dashboardHomeQuery.data || ctaMutation.isPending) {
      return;
    }

    ctaMutation.mutate(dashboardHomeQuery.data.cta.mode);
  }

  if (dashboardHomeQuery.isLoading) {
    return (
      <div className="space-y-6">
        <SectionCard title="学习中枢">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="h-28 animate-pulse rounded-2xl bg-sand" />
            <div className="h-28 animate-pulse rounded-2xl bg-sand" />
            <div className="h-28 animate-pulse rounded-2xl bg-sand" />
          </div>
        </SectionCard>
      </div>
    );
  }

  if (dashboardHomeQuery.error || !dashboardHomeQuery.data) {
    return (
      <div className="space-y-6">
        <SectionCard title="学习中枢">
          <p className="text-sm text-red-600">仪表盘数据加载失败，请稍后重试。</p>
        </SectionCard>
      </div>
    );
  }

  const { activeBook, cta, encouragement, history, mastery, plan, streaks, today } = dashboardHomeQuery.data;
  const hasLearningSetup = Boolean(activeBook && plan);
  const todayStateCopy = getTodayStateCopy(today.state);
  const setupStateCopy = getSetupStateCopy();
  const buttonLabel = hasLearningSetup ? cta.label : setupStateCopy.label;
  const encouragementLine = getEncouragementLine(encouragement, today.completedBatchCount);
  const historySummary = history.lastCompletedDate
    ? `最近一次完成于 ${formatShortDateLabel(history.lastCompletedDate)} · ${history.activeBookTitle ?? activeBook?.title ?? '当前词库'} · ${history.lastCompletedBatchWordCount} 词`
    : '最近还没有完成记录，今天从第一轮开始就好。';

  return (
    <div className="space-y-6">
      <SectionCard title="学习中枢" className="relative overflow-hidden rounded-[2rem] border-[#e8dcc5] bg-gradient-to-br from-[#fbf6ea] via-[#f7eedf] to-[#fdfaf4] text-ink shadow-[0_26px_80px_rgba(27,31,59,0.10)]">
        <div className="absolute -right-14 -top-16 h-44 w-44 rounded-full bg-sea/10 blur-3xl" />
        <div className="absolute -bottom-12 left-24 h-40 w-40 rounded-full bg-coral/10 blur-3xl" />
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_24rem]">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-[#d8ccb5] bg-white/70 px-3 py-1 text-xs font-semibold tracking-[0.2em] text-[#5c5a52]">
                {hasLearningSetup ? todayStateCopy.badge : '等待设置'}
              </span>
              <span className="text-sm text-slate-500">{formatLongDateLabel(today.date)}</span>
            </div>

            <div className="space-y-3">
              <h1 className="max-w-3xl text-3xl font-semibold leading-tight md:text-4xl">
                {hasLearningSetup ? todayStateCopy.title : setupStateCopy.title}
              </h1>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/70 bg-white/72 px-4 py-4 shadow-sm shadow-black/5 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">新词</p>
                <p className="mt-3 text-3xl font-semibold">{today.target.newCount}</p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/72 px-4 py-4 shadow-sm shadow-black/5 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">复习</p>
                <p className="mt-3 text-3xl font-semibold">{today.target.reviewCount}</p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/72 px-4 py-4 shadow-sm shadow-black/5 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">今日已学</p>
                <p className="mt-3 text-3xl font-semibold">{today.learnedUniqueWordCount}</p>
              </div>
            </div>

            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={hasLearningSetup ? handlePrimaryAction : () => navigate('/plans')}
                disabled={ctaMutation.isPending}
                className={`inline-flex min-w-40 items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition ${
                  hasLearningSetup ? getCtaButtonStyles(cta.mode) : 'bg-ink text-sand hover:bg-ink/90'
                } ${ctaMutation.isPending ? 'cursor-wait opacity-70' : ''}`}
              >
                {ctaMutation.isPending ? '正在进入学习流程...' : buttonLabel}
              </button>
              <p className="text-sm leading-6 text-slate-500">{encouragementLine}</p>
            </div>

            {ctaMutation.error ? <p className="text-sm text-red-600">进入学习流程失败，请稍后重试。</p> : null}

            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
              <span className="rounded-full border border-[#ddd2bd] bg-white/70 px-3 py-1">
                {activeBook?.title ?? '暂未选择词库'}
              </span>
              <span>{plan ? `文章风格 ${plan.articleStyle}` : '请先完成计划设置'}</span>
            </div>
          </div>

          <MasteryDonut mastery={mastery} />
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.85fr)]">
        <DashboardCalendar
          days={streaks.calendar}
          totalDays={streaks.totalDays}
          currentStreakDays={streaks.currentStreakDays}
          historySummary={historySummary}
        />

        <PlanForecastPanel
          remainingDays={streaks.remainingDays}
          estimatedFinishDate={streaks.estimatedFinishDate}
        />
      </div>
    </div>
  );
}
