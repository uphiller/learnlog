import { useTranslation } from "react-i18next";
import { LoadingSpinner } from "./LoadingSpinner";

type LoadingStateProps = {
  label?: string;
  overlay?: boolean;
  className?: string;
};

export function LoadingState({
  label,
  overlay = false,
  className = "",
}: LoadingStateProps) {
  const { t } = useTranslation();
  const resolvedLabel = label ?? t("common.loading");

  const spinner = <LoadingSpinner label={resolvedLabel} />;

  if (overlay) {
    return (
      <div
        className={["m-loading-overlay", className].filter(Boolean).join(" ")}
        role="status"
        aria-live="polite"
        aria-label={resolvedLabel}
      >
        {spinner}
      </div>
    );
  }

  return (
    <div
      className={["m-loading-state", className].filter(Boolean).join(" ")}
      role="status"
      aria-live="polite"
      aria-label={resolvedLabel}
    >
      {spinner}
    </div>
  );
}
