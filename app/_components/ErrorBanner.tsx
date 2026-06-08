"use client";

interface ErrorBannerProps {
  message: string;
  onDismiss: () => void;
}

export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  return (
    <div
      data-testid="error-banner-container"
      className="error-banner"
      role="alert"
      aria-live="assertive">
      <span data-testid="error-banner-message" className="error-banner-message">
        {message}
      </span>
      <button
        data-testid="error-banner-dismiss-button"
        type="button"
        className="error-banner-dismiss"
        onClick={onDismiss}
        aria-label="Dismiss error">
        ✕
      </button>
    </div>
  );
}
