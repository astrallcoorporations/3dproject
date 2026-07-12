import type { ReactNode } from "react";

type StudioShellProps = {
  topbar: ReactNode;
  leftRail: ReactNode;
  stage: ReactNode;
  inspector: ReactNode;
  timeline: ReactNode;
  inspectorOpen: boolean;
  railOpen: boolean;
};

export function StudioShell({
  topbar,
  leftRail,
  stage,
  inspector,
  timeline,
  inspectorOpen,
  railOpen,
}: StudioShellProps) {
  return (
    <main className={`studio ${inspectorOpen ? "inspector-open" : ""} ${railOpen ? "rail-open" : ""}`}>
      <header className="topbar">{topbar}</header>
      <aside className="left-rail">{leftRail}</aside>
      <section className="stage">{stage}</section>
      <aside className="inspector">{inspector}</aside>
      <section className="timeline-wrap">{timeline}</section>
    </main>
  );
}
