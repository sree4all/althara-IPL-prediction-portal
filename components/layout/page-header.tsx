import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description?: string;
  className?: string;
  descriptionClassName?: string;
};

export function PageHeader({
  title,
  description,
  className,
  descriptionClassName,
}: Props) {
  return (
    <header className={cn("mb-6", className)}>
      <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
        {title}
      </h1>
      {description ? (
        <p
          className={cn(
            "mt-2 max-w-prose text-sm font-bold leading-relaxed text-white/70",
            descriptionClassName,
          )}
        >
          {description}
        </p>
      ) : null}
    </header>
  );
}
