import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { convertWeightUnit } from '../../../lib/calculations';
import { useFormState } from '../../../hooks/useFormState';
import Select from '../../../components/ui/Select';
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

  const handleUnitChange = (newUnit: 'lb' | 'kg') => {
    setBodyweight(prev => {
      const num = parseFloat(prev);
      if (!num) return prev;
      return String(Math.round(convertWeightUnit(num, unitPreference, newUnit) * 10) / 10);
    });
    setUnitPreference(newUnit);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    await run(async () => {
      const unitChanged = unitPreference !== (profile.unit_preference || 'lb');

      // Training/tested maxes, workout history, and accessory set weights all
      // convert atomically server-side — workout_sessions/accessory_exercises
      // have no client-writable update policy, and a half-converted result
      // would leave weights in mixed units, so this must succeed as a whole
      // before we touch anything else.
      if (unitChanged) {
        const { error: convertError } = await supabase.rpc('convert_user_units', { p_new_unit: unitPreference });
        if (convertError) throw convertError;
      }

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
        <div className="flex gap-3 items-end">
          <Input
            label="Bodyweight"
            type="number"
            value={bodyweight}
            onChange={e => setBodyweight(e.target.value)}
            placeholder="e.g. 180"
            min="0"
            step="0.1"
            className="flex-1"
          />
          <Select
            id="bodyweight-unit"
            label="Unit"
            value={unitPreference}
            options={[
              { value: 'lb', label: 'lb' },
              { value: 'kg', label: 'kg' },
            ]}
            onChange={val => handleUnitChange(val as 'lb' | 'kg')}
          />
        </div>
        {unitPreference !== (profile?.unit_preference || 'lb') && (
          <p className="text-xs text-gray-400 dark:text-gray-400 -mt-2">
            Your training maxes and workout history will be converted to {unitPreference} when you save.
          </p>
        )}
        <Select
          id="gender-select-profile"
          label="Gender"
          value={gender}
          options={[
            { value: 'male', label: 'Male' },
            { value: 'female', label: 'Female' },
          ]}
          onChange={(val) => setGender(val as string)}
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
