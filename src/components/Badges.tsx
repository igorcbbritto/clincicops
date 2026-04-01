import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ABERTA: 'bg-blue-100 text-blue-700 border-blue-200',
    EM_ANALISE: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    EM_ANDAMENTO: 'bg-amber-100 text-amber-700 border-amber-200',
    AGUARDANDO_PECA: 'bg-orange-100 text-orange-700 border-orange-200',
    AGUARDANDO_TERCEIRO: 'bg-purple-100 text-purple-700 border-purple-200',
    CONCLUIDA: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    CANCELADA: 'bg-rose-100 text-rose-700 border-rose-200',
  };

  return (
    <span className={cn(
      "px-2 py-0.5 rounded-full text-[11px] font-semibold border uppercase tracking-wider",
      styles[status] || 'bg-gray-100 text-gray-700 border-gray-200'
    )}>
      {status.replace('_', ' ')}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    BAIXA: 'text-gray-500',
    MEDIA: 'text-blue-500',
    ALTA: 'text-orange-600 font-bold',
    CRITICA: 'text-rose-600 font-black animate-pulse',
  };

  return (
    <span className={cn("text-xs flex items-center gap-1", styles[priority])}>
      <span className="w-2 h-2 rounded-full bg-current" />
      {priority}
    </span>
  );
}
