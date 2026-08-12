type LoadingSpinnerProps = {
  className?: string;
  label?: string;
};

export function LoadingSpinner({ className = "", label }: LoadingSpinnerProps) {
  return (
    <div
      className={["m-book-loader", className].filter(Boolean).join(" ")}
      role="status"
      aria-label={label}
    >
      <svg
        className="m-book-loader__svg"
        viewBox="0 0 88 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="m-book-cover-shade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22961f" />
            <stop offset="100%" stopColor="#156d12" />
          </linearGradient>
        </defs>

        <ellipse cx="44" cy="58" rx="32" ry="3" className="m-book-loader__shadow" />

        <path
          className="m-book-loader__cover m-book-loader__cover--left"
          d="M44 11.5c-2.2-.6-4.5-.8-6.8-.5L12.5 12.5c-2.8.4-4.5 2.2-4.5 5.2v31.6c0 2.8 1.7 4.6 4.5 5l24.7 2.5c2.3.3 4.6.1 6.8-.5V11.5Z"
        />
        <path
          className="m-book-loader__cover m-book-loader__cover--right"
          d="M44 11.5c2.2-.6 4.5-.8 6.8-.5l24.7 1.5c2.8.4 4.5 2.2 4.5 5.2v31.6c0 2.8-1.7 4.6-4.5 5l-24.7 2.5c-2.3.3-4.6.1-6.8-.5V11.5Z"
        />

        <path
          className="m-book-loader__page m-book-loader__page--left"
          d="M44 15.5 18.2 18.2 18.2 45.3 44 47.8V15.5Z"
        />
        <path
          className="m-book-loader__page m-book-loader__page--right"
          d="M44 15.5 69.8 18.2 69.8 45.3 44 47.8V15.5Z"
        />

        <rect className="m-book-loader__spine" x="41.2" y="11.5" width="5.6" height="40.5" rx="1.2" />

        <g className="m-book-loader__lines m-book-loader__lines--left">
          <path d="M23 23.5h16.5" />
          <path d="M22 28.5h17.5" />
          <path d="M21.5 33.5h16" />
          <path d="M22.5 38.5h15" />
        </g>

        <g className="m-book-loader__lines m-book-loader__lines--right">
          <path d="M48.5 23.5h16.5" />
          <path d="M48 28.5h17.5" />
          <path d="M48.5 33.5h16" />
          <path d="M48 38.5h15" />
        </g>

        <g className="m-book-loader__turn">
          <path
            className="m-book-loader__page m-book-loader__page--flip"
            d="M44 15.5 69.8 18.2 69.8 45.3 44 47.8V15.5Z"
          />
          <g className="m-book-loader__lines m-book-loader__lines--flip">
            <path d="M48.5 23.5h16.5" />
            <path d="M48 28.5h17.5" />
            <path d="M48.5 33.5h16" />
            <path d="M48 38.5h15" />
          </g>
        </g>
      </svg>
    </div>
  );
}
