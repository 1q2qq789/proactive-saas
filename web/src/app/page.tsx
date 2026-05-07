// web/src/app/page.tsx
// Landing page

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] px-4">
      <div className="max-w-xl text-center animate-fadeIn">
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-4 py-1.5 text-xs text-[var(--text-secondary)] mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--green)]" />
          v0.1.0 — Open Source
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
          AI that checks your work
          <span className="text-[var(--accent)]"> before you ship it</span>
        </h1>

        <p className="text-lg text-[var(--text-secondary)] mb-8 max-w-lg mx-auto">
          Proactive Scanner automatically scans your content for data quality issues,
          logic gaps, consistency problems, and security risks — then tells you what to fix.
        </p>

        <div className="flex items-center justify-center gap-3">
          <a
            href="/auth/login"
            className="rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)] transition-colors"
          >
            Get Started
          </a>
          <a
            href="https://github.com/1q2qq789/proactive-scanner"
            target="_blank"
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-5 py-2.5 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            GitHub
          </a>
        </div>

        {/* Features Grid */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
          {[
            { title: '13 Built-in Checks', desc: 'Data quality, logic integrity, consistency, environment, and code security checklists.' },
            { title: 'CLI + Web Dashboard', desc: 'Use from terminal with proactive-scan or manage agents from this web app.' },
            { title: 'LLM-Powered', desc: 'Keyword mode is free. LLM mode uses DeepSeek for deep semantic analysis.' },
          ].map((f) => (
            <div key={f.title} className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
              <h3 className="font-medium text-sm mb-1">{f.title}</h3>
              <p className="text-xs text-[var(--text-muted)]">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
