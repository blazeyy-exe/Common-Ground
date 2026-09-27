export function StatCard({
  label,
  value,
  helper,
  size = "default",
}: {
  label: string;
  value: string;
  helper?: string;
  size?: "default" | "large";
}) {
  return (
    <div className="h-full rounded-lg border border-border bg-secondary/30 p-4">
      <p
        className={`font-medium uppercase tracking-wide text-muted-foreground ${
          size === "large" ? "text-xs lg:text-sm" : "text-[11px]"
        }`}
      >
        {label}
      </p>
      <p
        className={
          size === "large"
            ? "mt-2 text-3xl font-semibold text-foreground lg:mt-3 lg:text-5xl"
            : "mt-2 text-2xl font-semibold text-foreground"
        }
      >
        {value}
      </p>
      {helper && (
        <p className={`mt-1 text-muted-foreground ${size === "large" ? "text-xs lg:mt-2 lg:text-sm" : "text-xs"}`}>
          {helper}
        </p>
      )}
    </div>
  );
}
