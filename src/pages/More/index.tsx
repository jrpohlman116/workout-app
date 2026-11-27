import { ChevronRight, Calculator, User } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import ProfilePage from '../Profile';
import CalculatorPage from '../Calculator';

interface MorePageProps {
  page?: string;
  onOpen: (page: string) => void;
}

// Tools and settings (proposal #13). Until the full More screen lands, it
// links to the existing Calculator and Profile pages, which now live here.
const ENTRIES = [
  { id: 'calculator', label: 'Calculators', hint: 'Plate math, 1RM estimate, Wilks and DOTS', icon: Calculator, group: 'Tools' },
  { id: 'profile', label: 'Profile and settings', hint: 'Program, maxes, training, account', icon: User, group: 'Settings' },
] as const;

export default function MorePage({ page, onOpen }: MorePageProps) {
  if (page === 'calculator') return <CalculatorPage />;
  if (page === 'profile') return <ProfilePage />;

  return (
    <div className="min-h-screen pb-24">
      <PageHeader eyebrow="Ironform" title="More" />
      <div className="max-w-md mx-auto px-4 space-y-6">
        {(['Tools', 'Settings'] as const).map(group => (
          <section key={group} aria-labelledby={`more-${group}`}>
            <h2 id={`more-${group}`} className="text-body-sm-semibold text-white/80 mb-2 px-1">{group}</h2>
            <Card className="divide-y divide-gray-100 dark:divide-gray-700">
              {ENTRIES.filter(e => e.group === group).map(entry => {
                const Icon = entry.icon;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => onOpen(entry.id)}
                    className="w-full min-h-[56px] flex items-center gap-3 px-4 py-3 text-left rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <Icon className="w-5 h-5 text-gray-500 dark:text-gray-400 shrink-0" aria-hidden="true" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-body-sm-semibold text-gray-900 dark:text-gray-100">{entry.label}</span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400">{entry.hint}</span>
                    </span>
                    <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" aria-hidden="true" />
                  </button>
                );
              })}
            </Card>
          </section>
        ))}
      </div>
    </div>
  );
}
