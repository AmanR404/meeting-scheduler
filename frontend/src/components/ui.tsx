import { statusColor } from '@/lib/format';

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-10 text-gray-500">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-brand-600" />
      {label && <span>{label}</span>}
    </div>
  );
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-gray-200 bg-white p-5 shadow-sm ${className}`}>{children}</div>;
}

export function StatCard({ label, value, accent = 'text-gray-900' }: { label: string; value: React.ReactNode; accent?: string }) {
  return (
    <Card className="flex flex-col gap-1">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-2xl font-bold ${accent}`}>{value}</span>
    </Card>
  );
}

export function Badge({ status, children }: { status: string; children?: React.ReactNode }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor(status)}`}>
      {children ?? status.replace(/_/g, ' ')}
    </span>
  );
}

export function PageHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      {action}
    </div>
  );
}
