export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12" role="status">
      <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary-light border-t-primary" />
      <span className="text-sm text-gray-500">{label}</span>
    </div>
  );
}
