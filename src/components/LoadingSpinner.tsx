// Full-page centred loading spinner.
// Shown while Firebase Auth state is resolving on first load,
// or while an async auth operation (sign-in, sign-up) is in progress.

interface LoadingSpinnerProps {
  /** Optional message shown below the spinner. */
  message?: string;
}

export default function LoadingSpinner({ message }: LoadingSpinnerProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center gap-4">
      {/* Spinner ring */}
      <div
        className="h-12 w-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin"
        role="status"
        aria-label="Loading"
      />
      {message && (
        <p className="text-sm text-gray-500">{message}</p>
      )}
    </div>
  );
}

