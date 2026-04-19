import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { DashboardPage } from './dashboard-page';
import * as api from '../lib/api';
import { DashboardHomeResponse } from '../types';

vi.mock('../lib/api', () => ({
  getDashboardHome: vi.fn(),
  startTodaySession: vi.fn(),
  createNextSession: vi.fn()
}));

const mockedApi = vi.mocked(api);

function createDashboardFixture(): DashboardHomeResponse {
  return {
    activeBook: {
      id: 'book-1',
      key: 'cet4',
      title: '四级核心词',
      description: '适合日常打底与应试复习。',
      totalWordCount: 4543,
      learnedCount: 632,
      reviewedCount: 288
    },
    plan: {
      id: 'plan-1',
      userId: 'user-1',
      bookId: 'book-1',
      dailyWordCount: 20,
      newWordRatio: 1,
      reviewWordRatio: 1,
      articleStyle: 'EXAM'
    },
    today: {
      date: '2026-04-19',
      state: 'completed',
      target: {
        newCount: 10,
        reviewCount: 10,
        totalCount: 20
      },
      learnedUniqueWordCount: 24,
      completedBatchCount: 2
    },
    cta: {
      mode: 'continue',
      label: '再学一轮'
    },
    mastery: {
      familiarCount: 288,
      fuzzyCount: 344,
      unseenCount: 3911,
      totalWordCount: 4543
    },
    streaks: {
      totalDays: 16,
      currentStreakDays: 5,
      remainingDays: 40,
      estimatedFinishDate: '2026-05-29',
      calendar: Array.from({ length: 14 }, (_, index) => ({
        date: `2026-04-${String(index + 1).padStart(2, '0')}`,
        completed: index % 2 === 0,
        completedBatchCount: index % 3,
        learnedUniqueWordCount: index * 3,
        intensity: index % 4 === 0 ? 'high' : index % 3 === 0 ? 'medium' : index % 2 === 0 ? 'low' : 'none'
      }))
    },
    encouragement: {
      tone: 'celebrate',
      message: '继续保持，下一轮也会越学越顺。'
    },
    history: {
      lastCompletedDate: '2026-04-18',
      lastCompletedBatchWordCount: 18,
      activeBookTitle: '四级核心词'
    }
  };
}

function renderDashboard() {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      }
    }
  });

  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <DashboardPage />
      </QueryClientProvider>
    </MemoryRouter>
  );
}

describe('DashboardPage', () => {
  it('renders the lighter hero, mastery donut, heatmap calendar, and compact forecast panel', async () => {
    mockedApi.getDashboardHome.mockResolvedValue(createDashboardFixture());

    renderDashboard();

    expect(await screen.findByText('学习日历')).toBeInTheDocument();
    expect(screen.getByText('计划预测')).toBeInTheDocument();
    expect(screen.getByText('掌握度')).toBeInTheDocument();
    expect(screen.getByLabelText('查看掌握度说明')).toBeInTheDocument();
    expect(screen.getByText('今日已完成')).toBeInTheDocument();
    expect(screen.queryByText('学习鼓励')).not.toBeInTheDocument();
    expect(screen.queryByText('今日摘要')).not.toBeInTheDocument();
    expect(screen.queryByText('今天的学习目标已经准备好了。')).not.toBeInTheDocument();
  });
});
