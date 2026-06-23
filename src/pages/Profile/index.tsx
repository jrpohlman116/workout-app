import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import BodyStatsTab from './tabs/BodyStatsTab';
import MaxesTab from './tabs/MaxesTab';
import TrainingTab from './tabs/TrainingTab';
import SecurityTab from './tabs/SecurityTab';
import type { ProfileTab as Tab } from '../../lib/types';
import { PROFILE_TAB_LABELS as TAB_LABELS } from '../../lib/constants';
import TabBar from '../../components/ui/TabBar';
import PageHeader from '../../components/ui/PageHeader';

export default function ProfilePage() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('body');

  if (!profile) return null;

  const tabs = (Object.keys(TAB_LABELS) as Tab[]).map(id => ({ id, label: TAB_LABELS[id] }));

  return (
    <div className="min-h-screen pb-24">
      <div className="bg-white dark:bg-gray-800">
        <PageHeader eyebrow="Settings" title="Profile" />
        <TabBar tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        {activeTab === 'body' && <BodyStatsTab />}
        {activeTab === 'maxes' && <MaxesTab />}
        {activeTab === 'training' && <TrainingTab />}
        {activeTab === 'security' && <SecurityTab />}
      </div>
    </div>
  );
}
