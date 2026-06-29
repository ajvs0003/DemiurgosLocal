export default function Home() {
  return (
    <div className="mx-auto flex min-h-svh max-w-2xl flex-col justify-center gap-6 px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">opencode-sdd-harness</h1>
      <p className="text-slate-600 dark:text-slate-300">
        Arnés Spec Driven Development sobre Next.js 15 + React 19 + TypeScript + Tailwind 4.
      </p>
      <p className="text-slate-600 dark:text-slate-300">
        Abre{" "}
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm dark:bg-slate-800">
          AGENTS.md
        </code>{" "}
        para empezar. Arranca{" "}
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm dark:bg-slate-800">
          opencode
        </code>{" "}
        en la raíz y pídele &laquo;implementa la siguiente feature pendiente&raquo;.
      </p>
    </div>
  );
}
