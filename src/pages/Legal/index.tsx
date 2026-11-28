import { ChevronLeft } from 'lucide-react';
import AppFooter from '../../components/layout/AppFooter';

// Privacy policy and terms of service. Public: they open without signing in,
// because Oura and Strava link to them from their consent screens.

const EFFECTIVE = 'November 27, 2026';

/** Where people can reach whoever runs Ironform. Shown on both pages when set. */
const LEGAL_CONTACT = 'martinuzzijordan@gmail.com';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-h4 text-gray-900 dark:text-gray-100">{title}</h2>
      <div className="space-y-2 text-sm leading-6 text-gray-700 dark:text-gray-300">{children}</div>
    </section>
  );
}

function Contact() {
  return LEGAL_CONTACT ? (
    <Section title="Contact">
      <p>Questions about this page: <a className="text-blue-700 underline dark:text-blue-300" href={`mailto:${LEGAL_CONTACT}`}>{LEGAL_CONTACT}</a>.</p>
    </Section>
  ) : null;
}

function Privacy() {
  return (
    <>
      <Section title="What Ironform collects">
        <p><strong>Your account:</strong> your email address and password (handled by our sign-in provider; we never see your password).</p>
        <p><strong>Your training:</strong> the maxes, settings and workouts you enter, such as sets, reps, weights, your program and meet date, and optional body stats.</p>
        <p><strong>Connected services, only if you connect them:</strong> from Oura, your heart rate variability (HRV) and sleep; from Strava, your runs (time, duration, distance and average heart rate).</p>
      </Section>
      <Section title="How it's used">
        <p>Only to run Ironform for you: to prescribe your workouts, track your progress, and set your daily readiness, which decides how much volume you do on a given day. Data from Oura and Strava is used for nothing else.</p>
        <p>We don't sell your data, use it for advertising, or share it with anyone except the services that host Ironform (below).</p>
      </Section>
      <Section title="Where it's stored">
        <p>Your data is stored with Supabase, which hosts Ironform's database, sign-in and server functions. The website itself is served by Render. The access tokens that let Ironform read your Oura or Strava data are stored so that only Ironform's server functions can read them. They never reach your browser.</p>
        <p>A few preferences, and a workout in progress, are also kept in your browser so a refresh doesn't lose your sets.</p>
      </Section>
      <Section title="Your choices">
        <p><strong>Disconnect a service</strong> any time in More → Integrations. Ironform deletes its access tokens and stops reading from that service. You can also revoke access from your Oura or Strava account settings.</p>
        <p><strong>Delete your account</strong> in More → Account. This permanently deletes your profile, workouts, readiness history and any data from connected services.</p>
      </Section>
      <Section title="Changes">
        <p>If this policy changes, the date at the top changes too. Big changes will be shown in the app.</p>
      </Section>
      <Contact />
    </>
  );
}

function Terms() {
  return (
    <>
      <Section title="Using Ironform">
        <p>Ironform is a strength training app. By creating an account you agree to these terms. You need to be at least 16 to use it.</p>
      </Section>
      <Section title="Training at your own risk">
        <p>Ironform suggests weights, sets and reps from the numbers you give it. It isn't medical advice and doesn't replace a coach or a doctor. Lifting heavy carries a risk of injury. Use a spotter or safety bars, stop when something hurts, and talk to a doctor before starting if you have a health condition.</p>
        <p>You're responsible for deciding what you lift. Readiness and connected-service data are estimates and can be wrong.</p>
      </Section>
      <Section title="Your account and data">
        <p>Keep your sign-in details to yourself. Your training data is yours. See the privacy policy for how it's handled, and delete your account any time in More → Account.</p>
      </Section>
      <Section title="Connected services">
        <p>Connecting Oura or Strava is optional. Those services have their own terms, and Ironform can only read what you allow when you connect.</p>
      </Section>
      <Section title="The service">
        <p>Ironform is provided as is, without warranties. Features may change, and the service may be unavailable at times. To the extent the law allows, Ironform isn't liable for injuries, lost data or other losses from using it.</p>
      </Section>
      <Section title="Changes">
        <p>If these terms change, the date at the top changes too. Continuing to use Ironform after a change means you accept it.</p>
      </Section>
      <Contact />
    </>
  );
}

export default function LegalPage({ page, onBack }: { page: 'privacy' | 'terms'; onBack: () => void }) {
  const title = page === 'privacy' ? 'Privacy policy' : 'Terms of service';
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1 min-h-[44px] text-sm font-semibold text-blue-700 dark:text-blue-300 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Back to Ironform
        </button>
        <main id="main-content" tabIndex={-1} className="focus:outline-none">
          <p className="mt-4 text-xs font-semibold text-gray-500 dark:text-gray-400">Ironform</p>
          <h1 className="text-h1 text-gray-900 dark:text-gray-100">{title}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Effective {EFFECTIVE}</p>
          <div className="mt-6 space-y-6 rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-sm">
            {page === 'privacy' ? <Privacy /> : <Terms />}
          </div>
        </main>
        <AppFooter tone="light" />
      </div>
    </div>
  );
}
