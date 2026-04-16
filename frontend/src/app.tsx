import { Route, Routes } from 'react-router-dom';
import { LayoutShell } from './components/layout-shell';
import { RouteGuard } from './components/route-guard';
import { BookDetailPage } from './pages/book-detail-page';
import { DashboardPage } from './pages/dashboard-page';
import { LoginPage } from './pages/login-page';
import { PlansPage } from './pages/plans-page';
import { QuestionsRoundPage } from './pages/questions-round-page';
import { ReadRoundPage } from './pages/read-round-page';
import { ReviewRoundPage } from './pages/review-round-page';
import { SummaryPage } from './pages/summary-page';
import { WrongBookPage } from './pages/wrong-book-page';

/** Summary: This component defines the full route tree for the ReadRec MVP frontend. */
export function App() {
  return (
    <LayoutShell>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<RouteGuard><DashboardPage /></RouteGuard>} />
        <Route path="/plans" element={<RouteGuard><PlansPage /></RouteGuard>} />
        <Route path="/books/:bookId" element={<RouteGuard><BookDetailPage /></RouteGuard>} />
        <Route path="/learn/read" element={<RouteGuard><ReadRoundPage /></RouteGuard>} />
        <Route path="/learn/review" element={<RouteGuard><ReviewRoundPage /></RouteGuard>} />
        <Route path="/learn/questions" element={<RouteGuard><QuestionsRoundPage /></RouteGuard>} />
        <Route path="/learn/summary" element={<RouteGuard><SummaryPage /></RouteGuard>} />
        <Route path="/wrong-book" element={<RouteGuard><WrongBookPage /></RouteGuard>} />
      </Routes>
    </LayoutShell>
  );
}