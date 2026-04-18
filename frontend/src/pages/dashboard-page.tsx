import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import * as api from '../lib/api';
import { SectionCard } from '../components/section-card';
import { DashboardHomeCalendarDay, DashboardHomeCta, DashboardHomeEncouragement } from '../types';

/** Summary: This helper formats one ISO date into a localized long-form label. */
function formatLongDateLabel(date: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short'
  }).format(new Date(date));
}

/** Summary: This helper formats one ISO date into a compact month-day label. */
function formatShortDateLabel(date: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric'
  }).format(new Date(date));
}

/** Summary: This helper returns the dashboard copy for today's completion state. */
function getTodayStateCopy(state: 'pending' | 'completed') {
  return state === 'completed'
    ? {
        badge: '今日已完成',
        title: '今天已经学完一轮，节奏保持得很好。',
        description: '如果还有余力，可以继续下一轮同日学习。'
      }
    : {
        badge: '今日待开始',
        title: '今天的学习目标已经准备好了。',
        description: '从当前词库继续，按计划完成今天这一轮。'
      };
}

/** Summary: This helper returns tone-specific styles for the encouragement block. */
function getEncouragementStyles(tone: DashboardHomeEncouragement['tone']) {
  if (tone === 'celebrate') {
    return 'border-amber-300 bg-amber-50 text-amber-950';
  }

  if (tone === 'praise') {
    return 'border-emerald-300 bg-emerald-50 text-emerald-950';
  }

  return 'border-sky-300 bg-sky-50 text-sky-950';
}

/** Summary: This helper returns one color treatment for a calendar cell. */
function getCalendarCellStyles(day: DashboardHomeCalendarDay) {
  if (!day.completed) {
    return 'border-black/10 bg-white text-black/55';
  }

  if (day.intensity === 'high') {
    return 'border-emerald-600 bg-emerald-600 text-white';
  }

  if (day.intensity === 'medium') {
    return 'border-emerald-500 bg-emerald-500/85 text-white';
  }

  if (day.intensity === 'low') {
    return 'border-emerald-300 bg-emerald-100 text-emerald-950';
  }

  return 'border-black/10 bg-white text-black/55';
}

/** Summary: This helper returns button copy and styling for the learning CTA. */
function getCtaButtonStyles(mode: DashboardHomeCta['mode']) {
  return mode === 'continue'
    ? 'bg-ink text-sand hover:bg-ink/90'
    : 'bg-coral text-white hover:bg-coral/90';
}

/** Summary: This component renders the authenticated dashboard as the new learning hub. */
export function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const dashboardHomeQuery = useQuery({
    queryKey: ['dashboard-home'],
    queryFn: api.getDashboardHome
  });

  const ctaMutation = useMutation({
    mutationFn: async (mode: DashboardHomeCta['mode']) => {
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
      navigate('/learn/read');
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
  const todayStateCopy = getTodayStateCopy(today.state);

  return (
    <div className="space-y-6">
      <SectionCard title="学习中枢" className="overflow-hidden border-0 bg-gradient-to-br from-ink via-ink to-coral/80 text-sand shadow-lg">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,1fr)]">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold tracking-[0.2em] text-white/80">
                {todayStateCopy.badge}
              </span>
              <span className="text-sm text-white/70">{formatLongDateLabel(today.date)}</span>
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold leading-tight md:text-4xl">{todayStateCopy.title}</h1>
              <p className="max-w-2xl text-base leading-7 text-white/78">{todayStateCopy.description}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/60">当前词库</p>
                <p className="mt-2 text-lg font-semibold">{activeBook?.title ?? '暂未选择词库'}</p>
                <p className="mt-1 text-sm text-white/65">{activeBook?.description ?? '请先完成学习计划配置。'}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/60">今日目标</p>
                <p className="mt-2 text-2xl font-semibold">{today.target.totalCount}</p>
                <p className="mt-1 text-sm text-white/65">新词 {today.target.newCount} · 复习 {today.target.reviewCount}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/60">已学词数</p>
                <p className="mt-2 text-2xl font-semibold">{today.learnedUniqueWordCount}</p>
                <p className="mt-1 text-sm text-white/65">今日累计完成独立单词数</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/60">完成轮次</p>
                <p className="mt-2 text-2xl font-semibold">{today.completedBatchCount}</p>
                <p className="mt-1 text-sm text-white/65">{plan ? `文章风格 ${plan.articleStyle}` : '尚未生成学习轮次'}</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 text-black shadow-xl">
            <p className="text-sm font-medium text-black/55">今日主卡片</p>
            <h2 className="mt-3 text-2xl font-semibold text-ink">{cta.label}</h2>
            <p className="mt-2 text-sm leading-7 text-black/70">
              {cta.mode === 'continue'
                ? '继续前会先为今天准备下一轮学习内容，然后直接进入学习流程。'
                : '直接进入今天的学习流程，不会额外创建新的学习批次。'}
            </p>
            <button
              type="button"
              onClick={handlePrimaryAction}
              disabled={ctaMutation.isPending}
              className={`mt-6 inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition ${getCtaButtonStyles(cta.mode)} ${ctaMutation.isPending ? 'cursor-wait opacity-70' : ''}`}
            >
              {ctaMutation.isPending ? '正在进入学习流程...' : cta.label}
            </button>
            {ctaMutation.error ? <p className="mt-3 text-sm text-red-600">进入学习流程失败，请稍后重试。</p> : null}
            <div className="mt-6 rounded-2xl bg-sand p-4">
              <p className="text-sm font-medium text-ink">最近完成记录</p>
              <p className="mt-2 text-sm text-black/70">
                {history.lastCompletedDate
                  ? `${formatShortDateLabel(history.lastCompletedDate)} · ${history.activeBookTitle ?? activeBook?.title ?? '当前词库'} · ${history.lastCompletedBatchWordCount} 词`
                  : '最近还没有完成记录，今天从第一轮开始就好。'}
              </p>
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <SectionCard title="进度概览">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-sand p-5">
              <p className="text-sm font-medium text-black/55">待完成目标</p>
              <p className="mt-2 text-3xl font-semibold text-ink">{today.target.totalCount}</p>
              <p className="mt-2 text-sm leading-7 text-black/70">
                新词 {today.target.newCount} 个，复习 {today.target.reviewCount} 个，按计划完成这一轮即可达成今日目标。
              </p>
            </div>
            <div className="rounded-2xl bg-white p-5 ring-1 ring-black/10">
              <p className="text-sm font-medium text-black/55">完成状态</p>
              <p className="mt-2 text-3xl font-semibold text-ink">{today.state === 'completed' ? '已完成' : '进行中'}</p>
              <p className="mt-2 text-sm leading-7 text-black/70">
                今日已完成 {today.completedBatchCount} 轮，累计学习 {today.learnedUniqueWordCount} 个词。
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="学习鼓励">
          <div className={`rounded-3xl border p-5 ${getEncouragementStyles(encouragement.tone)}`}>
            <p className="text-sm font-medium uppercase tracking-[0.2em]">Encouragement</p>
            <p className="mt-3 text-2xl font-semibold leading-tight">{encouragement.message}</p>
            <p className="mt-4 text-sm leading-7 opacity-80">
              {history.lastCompletedDate
                ? `上次完成于 ${formatLongDateLabel(history.lastCompletedDate)}，完成了 ${history.lastCompletedBatchWordCount} 个词。`
                : '这是新的起点，先完成今天这一轮，节奏自然会建立起来。'}
            </p>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="掌握度摘要">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-emerald-50 p-5 text-emerald-950">
            <p className="text-sm font-medium uppercase tracking-[0.2em]">熟悉</p>
            <p className="mt-3 text-3xl font-semibold">{mastery.familiarCount}</p>
            <p className="mt-2 text-sm leading-7 opacity-80">已进入稳定掌握区的词汇数量。</p>
          </div>
          <div className="rounded-2xl bg-amber-50 p-5 text-amber-950">
            <p className="text-sm font-medium uppercase tracking-[0.2em]">模糊</p>
            <p className="mt-3 text-3xl font-semibold">{mastery.fuzzyCount}</p>
            <p className="mt-2 text-sm leading-7 opacity-80">仍需要继续巩固和复习的词汇数量。</p>
          </div>
          <div className="rounded-2xl bg-slate-100 p-5 text-slate-950">
            <p className="text-sm font-medium uppercase tracking-[0.2em]">未见</p>
            <p className="mt-3 text-3xl font-semibold">{mastery.unseenCount}</p>
            <p className="mt-2 text-sm leading-7 opacity-80">当前词库总词数 {mastery.totalWordCount}，还有这些词等待接触。</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="连续学习与日历">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,1.2fr)]">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-sand p-5">
              <p className="text-sm font-medium text-black/55">累计完成天数</p>
              <p className="mt-2 text-3xl font-semibold text-ink">{streaks.totalDays}</p>
            </div>
            <div className="rounded-2xl bg-sand p-5">
              <p className="text-sm font-medium text-black/55">当前连续天数</p>
              <p className="mt-2 text-3xl font-semibold text-ink">{streaks.currentStreakDays}</p>
            </div>
            <div className="rounded-2xl bg-white p-5 ring-1 ring-black/10">
              <p className="text-sm font-medium text-black/55">预计剩余天数</p>
              <p className="mt-2 text-3xl font-semibold text-ink">{streaks.remainingDays ?? '-'}</p>
            </div>
            <div className="rounded-2xl bg-white p-5 ring-1 ring-black/10">
              <p className="text-sm font-medium text-black/55">预计完成日期</p>
              <p className="mt-2 text-lg font-semibold text-ink">
                {streaks.estimatedFinishDate ? formatLongDateLabel(streaks.estimatedFinishDate) : '暂未给出'}
              </p>
            </div>
          </div>

          <div className="rounded-3xl bg-[#0f172a] p-5 text-white">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-white/65">学习日历</p>
                <p className="mt-1 text-xl font-semibold">最近学习轨迹</p>
              </div>
              <p className="text-sm text-white/60">{streaks.calendar.length} 天记录</p>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
              {streaks.calendar.map((day) => (
                <div key={day.date} className={`rounded-2xl border p-3 transition ${getCalendarCellStyles(day)}`}>
                  <p className="text-xs font-medium uppercase tracking-[0.2em]">{formatShortDateLabel(day.date)}</p>
                  <p className="mt-3 text-lg font-semibold">{day.completed ? '完成' : '未完成'}</p>
                  <p className="mt-2 text-xs leading-6 opacity-80">
                    {day.completedBatchCount} 轮 · {day.learnedUniqueWordCount} 词
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
