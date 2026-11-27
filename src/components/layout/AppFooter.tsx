// Links to the privacy policy and terms on every screen. Plain links, so they
// work signed out (sign-in, password reset) as well as inside the app.

interface AppFooterProps {
  /** 'dark' on the blue app background, 'light' on the gray sign-in and onboarding screens. */
  tone?: 'dark' | 'light';
  /** In the signed-in app, navigate without a full page load. */
  onNavigate?: (page: 'privacy' | 'terms') => void;
}

export default function AppFooter({ tone = 'dark', onNavigate }: AppFooterProps) {
  const color = tone === 'dark'
    ? 'text-white/80 hover:text-white focus-visible:ring-white'
    : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white focus-visible:ring-blue-500';
  const link = (page: 'privacy' | 'terms', label: string) => (
    <a
      href={`/${page}`}
      onClick={onNavigate ? e => { e.preventDefault(); onNavigate(page); } : undefined}
      className={`inline-flex items-center min-h-[44px] px-2 text-xs underline-offset-2 hover:underline rounded focus:outline-none focus-visible:ring-2 ${color}`}
    >
      {label}
    </a>
  );
  return (
    <footer className="max-w-md mx-auto px-4 py-4 flex items-center justify-center gap-2" aria-label="Legal">
      {link('privacy', 'Privacy policy')}
      <span aria-hidden="true" className={tone === 'dark' ? 'text-white/50' : 'text-gray-400'}>·</span>
      {link('terms', 'Terms of service')}
    </footer>
  );
}
