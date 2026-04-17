import type { ReactNode } from "react";

type PageTransitionProps = {
  children: ReactNode;
  pathname: string;
};

type StaggerProps = {
  children: ReactNode;
  className?: string;
};

export function StaggerPage({ children, className }: StaggerProps) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}

export function StaggerItem({ children, className }: StaggerProps) {
  return <div className={className}>{children}</div>;
}

export default function PageTransition({ children, pathname }: PageTransitionProps) {
  // Fallback estable sin animaciones: evita pantallas en blanco
  return (
    <div key={pathname} className="w-full">
      {children}
    </div>
  );
}