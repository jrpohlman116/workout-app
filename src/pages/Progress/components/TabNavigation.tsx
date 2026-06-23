import type { ProgressTab as Tab } from '../../../lib/types';
import TabBar from '../../../components/ui/TabBar';

interface TabNavigationProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onRipple: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'records', label: 'Records' },
  { id: 'log', label: 'Workout Log' },
  { id: 'meets', label: 'Meets' },
];

export default function TabNavigation({ activeTab, onTabChange, onRipple }: TabNavigationProps) {
  return <TabBar tabs={TABS} activeTab={activeTab} onChange={onTabChange} onRipple={onRipple} />;
}
