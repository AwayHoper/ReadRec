import { PropsWithChildren } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../providers/auth-provider';

/** Summary: This component renders the common app layout used across the ReadRec frontend pages. */
export function LayoutShell({ children }: PropsWithChildren) {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f7efd9,_#f4ebd0_55%,_#ead8b7)] text-ink">
      <header className="border-b border-black/10 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="text-2xl font-bold tracking-wide">ReadRec</Link>
          <nav className="flex items-center gap-4 text-sm">
            <NavLink to="/" className="hover:text-coral">首页</NavLink>
            <NavLink to="/plans" className="hover:text-coral">计划</NavLink>
            <NavLink to="/wrong-book" className="hover:text-coral">生词本</NavLink>
            {user ? <button onClick={logout} className="rounded-full bg-ink px-4 py-2 text-sand">退出</button> : null}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}