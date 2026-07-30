"use client";

import type { ReactNode } from "react";

export function SectionCard({
  title,
  accent,
  action,
  children,
  className = "",
}: {
  title: string;
  accent?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`section-card ${className}`}
      style={accent ? { ["--accent" as string]: accent } : undefined}
    >
      <div className="section-card__head">
        <h3>{title}</h3>
        {action}
      </div>
      <div className="section-card__body">{children}</div>
    </section>
  );
}

export function EmptyHint({ children }: { children: ReactNode }) {
  return <p className="empty-hint">{children}</p>;
}

export function IconButton({
  children,
  onClick,
  label,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  label: string;
  className?: string;
}) {
  return (
    <button type="button" className={`icon-btn ${className}`} onClick={onClick} aria-label={label}>
      {children}
    </button>
  );
}
