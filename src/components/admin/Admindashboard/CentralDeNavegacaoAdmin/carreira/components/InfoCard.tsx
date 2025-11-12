import { ReactNode } from "react";

export default function InfoCard({
  title,
  children,
  right,
}: {
  title: string;
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium">{title}</h3>
        {right}
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-300">{children}</div>
    </div>
  );
}
