import { useState } from 'react';

export function useFormState() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const run = async (fn: () => Promise<void>, errorMessage: string) => {
    setLoading(true);
    setError('');
    setSaved(false);
    try {
      await fn();
      setSaved(true);
    } catch {
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const markUnsaved = () => setSaved(false);

  return { loading, error, saved, run, markUnsaved };
}
