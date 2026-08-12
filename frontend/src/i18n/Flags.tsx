import type { AppLanguage } from "./index";

type FlagProps = {
  className?: string;
};

export function FlagKo({ className = "" }: FlagProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 16"
      width="24"
      height="16"
      aria-hidden
    >
      <rect width="24" height="16" fill="#fff" />
      <circle cx="12" cy="8" r="4.2" fill="#c60c30" />
      <path
        d="M12 3.8a4.2 4.2 0 0 1 0 8.4 4.2 4.2 0 0 1 0-8.4Z"
        fill="#003478"
      />
      <g stroke="#000" strokeWidth="0.55" fill="none">
        <path d="M3.2 3.2v2.2M4.3 2.1v4.4M2.1 4.3h4.4" />
        <path d="M20.8 3.2v2.2M19.7 2.1v4.4M21.9 4.3h-4.4" />
        <path d="M3.2 12.8v-2.2M4.3 13.9v-4.4M2.1 11.7h4.4" />
        <path d="M20.8 12.8v-2.2M19.7 13.9v-4.4M21.9 11.7h-4.4" />
      </g>
    </svg>
  );
}

export function FlagEn({ className = "" }: FlagProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 16"
      width="24"
      height="16"
      aria-hidden
    >
      <rect width="24" height="16" fill="#b22234" />
      <path
        d="M0 1.23h24M0 3.69h24M0 6.15h24M0 8.62h24M0 11.08h24M0 13.54h24"
        stroke="#fff"
        strokeWidth="1.23"
      />
      <rect width="10" height="7.38" fill="#3c3b6e" />
      <g fill="#fff">
        <circle cx="1.8" cy="1.4" r="0.45" />
        <circle cx="3.6" cy="1.4" r="0.45" />
        <circle cx="5.4" cy="1.4" r="0.45" />
        <circle cx="7.2" cy="1.4" r="0.45" />
        <circle cx="9" cy="1.4" r="0.45" />
        <circle cx="2.7" cy="2.5" r="0.45" />
        <circle cx="4.5" cy="2.5" r="0.45" />
        <circle cx="6.3" cy="2.5" r="0.45" />
        <circle cx="8.1" cy="2.5" r="0.45" />
        <circle cx="1.8" cy="3.6" r="0.45" />
        <circle cx="3.6" cy="3.6" r="0.45" />
        <circle cx="5.4" cy="3.6" r="0.45" />
        <circle cx="7.2" cy="3.6" r="0.45" />
        <circle cx="9" cy="3.6" r="0.45" />
        <circle cx="2.7" cy="4.7" r="0.45" />
        <circle cx="4.5" cy="4.7" r="0.45" />
        <circle cx="6.3" cy="4.7" r="0.45" />
        <circle cx="8.1" cy="4.7" r="0.45" />
        <circle cx="1.8" cy="5.8" r="0.45" />
        <circle cx="3.6" cy="5.8" r="0.45" />
        <circle cx="5.4" cy="5.8" r="0.45" />
        <circle cx="7.2" cy="5.8" r="0.45" />
        <circle cx="9" cy="5.8" r="0.45" />
      </g>
    </svg>
  );
}

export function FlagIcon({ code, className = "" }: { code: AppLanguage; className?: string }) {
  return code === "ko" ? <FlagKo className={className} /> : <FlagEn className={className} />;
}
