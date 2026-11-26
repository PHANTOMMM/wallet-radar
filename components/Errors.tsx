import Link from "next/link";
export function ErrorBox({ title, message, hint }: { title: string; message: string; hint?: string }) {
  return (
    <div className="mx-auto mt-10 max-w-lg rounded-lg border border-line bg-surface p-6 text-center">
      <h1 className="text-lg font-medium">{title}</h1>
      <p className="mt-2 text-sm text-mute">{message}</p>
      {hint && <p className="mt-2 text-xs text-faint">{hint}</p>}
      <Link href="/scan" className="mt-5 inline-block rounded-md border border-line px-3 py-1.5 text-sm text-mute hover:text-ink">Scan another</Link>
    </div>
  );
}
