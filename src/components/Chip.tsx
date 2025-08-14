// FILE: src/components/Chip.tsx
import React from "react";

export default function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs bg-neutral-800 text-neutral-100 shadow">
      {children}
    </span>
  );
}
