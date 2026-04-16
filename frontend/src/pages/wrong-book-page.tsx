import { useMutation, useQuery } from '@tanstack/react-query';
import * as api from '../lib/api';
import { SectionCard } from '../components/section-card';
import { WrongBookEntry } from '../types';

/** Summary: This component renders the wrong-book list and text export preview. */
export function WrongBookPage() {
  const wrongBookQuery = useQuery({ queryKey: ['wrong-book'], queryFn: api.getWrongBook });
  const exportMutation = useMutation({ mutationFn: api.exportWrongBook });

  /** Summary: This function triggers plain-text export for the current wrong-book list. */
  function handleExportWrongBook() {
    exportMutation.mutate();
  }

  /** Summary: This function renders one wrong-book entry card in the list. */
  function renderWrongBookEntry(entry: WrongBookEntry) {
    return (
      <article key={entry.id} className="rounded-2xl bg-sand p-4">
        <h3 className="text-lg font-semibold">{entry.word}</h3>
        <p className="text-sm text-black/70">{entry.phonetic}</p>
        <p className="mt-2">{entry.definitions.join(' / ')}</p>
      </article>
    );
  }

  return (
    <div className="space-y-6">
      <SectionCard title="生词本">
        <div className="space-y-3">{wrongBookQuery.data?.map(renderWrongBookEntry)}</div>
        <button onClick={handleExportWrongBook} className="mt-5 rounded-full bg-ink px-5 py-3 text-sand">导出 TXT</button>
        {exportMutation.data ? <pre className="mt-4 overflow-x-auto rounded-2xl bg-black p-4 text-sm text-green-300">{exportMutation.data.content}</pre> : null}
      </SectionCard>
    </div>
  );
}
