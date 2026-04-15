import { PropsWithChildren } from 'react';
import clsx from 'clsx';

interface SectionCardProps extends PropsWithChildren { title: string; className?: string; }

/** Summary: This component renders a styled content panel for one dashboard or flow section. */
export function SectionCard({ title, className, children }: SectionCardProps) {
  return (
    <section className={clsx('rounded-3xl border border-black/10 bg-white/80 p-6 shadow-sm', className)}>
      <h2 className="mb-4 text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}