"use client";

interface ErrorBannerProps {
  message: string;
  onDismiss: () => void;
}

export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  return (
    <div className="error-banner" role="alert" aria-live="assertive">
      <span className="error-banner-message">{message}</span>
      <button
        type="button"
        className="error-banner-dismiss"
        onClick={onDismiss}
        aria-label="Dismiss error">
        ✕
      </button>
    </div>
  );
}
