import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { useFormState } from '../../../hooks/useFormState';
import AccessibleNativeSelect from '../../../components/accessible/AccessibleNativeSelect';
import Card from '../../../components/ui/Card';
import SaveFeedback from '../../../components/ui/SaveFeedback';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

export default function BodyStatsTab() {
  const { profile, user, refreshProfile } = useAuth();
  const [bodyweight, setBodyweight] = useState(profile?.bodyweight?.toString() || '');
  const [gender, setGender] = useState(profile?.gender || 'male');
  const [unitPreference, setUnitPreference] = useState(profile?.unit_preference || 'lb');
  const { loading, error, saved, run } = useFormState();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    await run(async () => {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          bodyweight: parseFloat(bodyweight) || 0,
          gender,
          unit_preference: unitPreference,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      if (error) throw error;
      await refreshProfile();
    }, 'Failed to save body stats. Please try again.');
  };

  return (
    <Card className="p-6 animate-enter">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Body Stats</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Bodyweight
          </label>
          <div className="flex gap-3 items-end">
            <input
              type="number"
              value={bodyweight}
              onChange={e => setBodyweight(e.target.value)}
              placeholder="e.g. 180"
              min="0"
              step="0.1"
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <select
              value={unitPreference}
              onChange={e => setUnitPreference(e.target.value as 'lb' | 'kg')}
              className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="lb">lb</option>
              <option value="kg">kg</option>
            </select>
          </div>
        </div>
        <AccessibleNativeSelect
          id="gender-select-profile"
          label="Gender"
          value={gender}
          options={[
            { value: 'male', label: 'Male' },
            { value: 'female', label: 'Female' },
          ]}
          onChange={setGender}
          description="Used to calculate accurate Wilks scores"
        />
        <Button type="submit" fullWidth disabled={loading}>
          {loading ? 'Saving...' : 'Save Body Stats'}
        </Button>
        <SaveFeedback error={error} saved={saved} savedMessage="Body stats saved." />
      </form>
    </Card>
  );
}
