import { ChevronLeft, ChevronRight } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import CalculatorPage from '../Calculator';
import { AttemptPicker, PercentageChart, WarmupCalculator } from './Tools';
import {
  AccountSettings, AppSettings, EquipmentSettings, IntegrationsSettings, ProgramSettings, TrainingPreferences,
} from './Settings';

interface MorePageProps {
  page?: string;
  onOpen: (page: string) => void;
  onBack: () => void;
}

// Tools and settings (proposal #13).
const TOOLS = [
  { id: 'plates', label: 'Plate calculator', hint: 'Which plates to load for any weight' },
  { id: '1rm', label: '1RM estimator', hint: 'Estimate a max from a recent set' },
  { id: 'warmups', label: 'Warm-up calculator', hint: 'Warm-up sets up to your working weight' },
  { id: 'percentages', label: 'Percentage chart', hint: 'Your training max at every percentage' },
  { id: 'attempts', label: 'Meet attempt picker', hint: 'Openers, seconds and thirds from your maxes' },
];
const SETTINGS = [
  { id: 'program', label: 'Program', hint: 'Training maxes, program, days per week, meet date' },
  { id: 'training', label: 'Training preferences', hint: 'Rest timers, warm-ups, sticking points, accessories' },
  { id: 'equipment', label: 'Equipment', hint: 'Plates, bar weight, rounding' },
  { id: 'integrations', label: 'Integrations', hint: 'Oura, Strava' },
  { id: 'app', label: 'App', hint: 'Theme and animations' },
  { id: 'account', label: 'Account', hint: 'Profile, password, data and deletion' },
];
const ALL = [...TOOLS.map(t => ({ ...t, group: 'Tools' })), ...SETTINGS.map(s => ({ ...s, group: 'Settings' }))];

// Old pages and their new homes.
const ALIASES: Record<string, string> = { calculator: '1rm', profile: 'account' };

export default function MorePage({ page: requested, onOpen, onBack }: MorePageProps) {
  const page = requested ? ALIASES[requested] ?? requested : undefined;
  const entry = ALL.find(e => e.id === page);

  if (page && entry) {
    // The calculator keeps its own header and tabs.
    if (page === 'plates' || page === '1rm') return <CalculatorPage key={page} initialTab={page === 'plates' ? 'plates' : '1rm'} />;
    return (
      <div className="min-h-screen pb-24">
        <div className="bg-white dark:bg-gray-800">
          <div className="max-w-md mx-auto px-4 pt-4">
            <button type="button" onClick={onBack} className="inline-flex items-center gap-1 min-h-[44px] text-sm font-semibold text-blue-600 dark:text-blue-400 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
              <ChevronLeft className="h-4 w-4" aria-hidden="true" /> More
            </button>
          </div>
          <PageHeader eyebrow={entry.group} title={entry.label} />
        </div>
        <div className="max-w-md mx-auto px-4 py-6">
          {page === 'warmups' && <WarmupCalculator />}
          {page === 'percentages' && <PercentageChart />}
          {page === 'attempts' && <AttemptPicker />}
          {page === 'program' && <ProgramSettings />}
          {page === 'training' && <TrainingPreferences onEditStickingPoints={() => onOpen('program')} />}
          {page === 'equipment' && <EquipmentSettings />}
          {page === 'integrations' && <IntegrationsSettings />}
          {page === 'app' && <AppSettings />}
          {page === 'account' && <AccountSettings />}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <div className="bg-white dark:bg-gray-800">
        <PageHeader eyebrow="Ironform" title="More" />
      </div>
      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {[{ title: 'Tools', items: TOOLS }, { title: 'Settings', items: SETTINGS }].map(group => (
          <section key={group.title} aria-labelledby={`more-${group.title}`}>
            <h2 id={`more-${group.title}`} className="text-h4 text-white mb-2 px-1">{group.title}</h2>
            <Card className="divide-y divide-gray-100 dark:divide-gray-700">
              {group.items.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onOpen(item.id)}
                  className="w-full min-h-[64px] flex items-center gap-3 px-4 py-3 text-left first:rounded-t-2xl last:rounded-b-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
                >
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">{item.label}</span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400">{item.hint}</span>
                  </span>
                  <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" aria-hidden="true" />
                </button>
              ))}
            </Card>
          </section>
        ))}
      </div>
    </div>
  );
}
