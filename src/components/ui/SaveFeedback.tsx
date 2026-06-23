interface SaveFeedbackProps {
  error: string;
  saved: boolean;
  savedMessage?: string;
}

export default function SaveFeedback({ error, saved, savedMessage = 'Saved.' }: SaveFeedbackProps) {
  return (
    <>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 text-center" role="alert">{error}</p>
      )}
      {saved && !error && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-400 px-4 py-3 rounded-xl text-sm text-center">
          {savedMessage}
        </div>
      )}
    </>
  );
}
