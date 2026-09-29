import type { ReactNode } from "react";

export function PageShell({ title, accent, lede, children }: { title: string; accent?: string; lede: string; children: ReactNode }) {
  return (
    <main className="pc-subpage pc-after">
      <div className="pc-wrap">
        <header className="pc-subpage__hero">
          <h1 className="pc-display">
            {title} {accent ? <span className="pc-red-text">{accent}</span> : null}
          </h1>
          <p className="pc-lede">{lede}</p>
        </header>
        {children}
      </div>
    </main>
  );
}
