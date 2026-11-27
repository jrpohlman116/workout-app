import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { getLayout } from '../../lib/programs/registry';
import { nextDayToTrain } from '../../lib/programs/week';
import { readActiveSession } from '../../hooks/useActiveSession';
import WorkoutDetailPage from '../WorkoutDetail';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

interface TodayPageProps {
  /** Lift picked from Home or a link; otherwise Today picks it. */
  lift?: string;
  onOpenLift: (lift: string) => void;
  onNavigateHome: () => void;
  onNavigateToProgress: () => void;
}

/**
 * The Today tab. Opens the lift it was given, else the session in progress,
 * else the next day of this week not done yet. The session itself is the
 * existing workout page until the new Today steps replace it.
 */
export default function TodayPage({ lift, onOpenLift, onNavigateHome, onNavigateToProgress }: TodayPageProps) {
  const { user, profile } = useAuth();
  const [picked, setPicked] = useState<string | null | undefined>(lift);

  useEffect(() => {
    if (lift) {
      setPicked(lift);
      return;
    }
    if (!user || !profile) return;

    const active = readActiveSession(user.id, { now: Date.now(), cycle: profile.current_cycle, week: profile.current_week });
    if (active) {
      setPicked(active.lift);
      return;
    }

    let cancelled = false;
    (async () => {
      let query = supabase
        .from('workout_sessions')
        .select('lift_type')
        .eq('user_id', user.id)
        .eq('cycle', profile.current_cycle)
        .eq('week', profile.current_week)
        .eq('is_1rm_test', false);
      if (profile.program_restarted_at) query = query.gte('completed_at', profile.program_restarted_at);
      const { data } = await query;
      if (cancelled) return;
      // An upper session logged this week still counts as the overhead press day.
      const done = new Set((data ?? []).map(r => (r.lift_type === 'upper' ? 'ohp' : r.lift_type)));
      setPicked(nextDayToTrain(getLayout(profile.program_id, profile.days_per_week), done));
    })();
    return () => { cancelled = true; };
  }, [lift, user, profile]);

  if (picked) {
    return (
      <WorkoutDetailPage
        key={picked}
        liftType={picked}
        onBack={onNavigateHome}
        onNavigateToProgress={onNavigateToProgress}
      />
    );
  }

  if (picked === undefined) {
    return (
      <div className="min-h-screen pb-24" role="status" aria-live="polite">
        <PageHeader eyebrow="Today" title="Loading" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <PageHeader eyebrow="Today" title="Week done" />
      <div className="max-w-md mx-auto px-4">
        <Card className="p-5 space-y-4">
          <h2 className="text-body-lg-bold text-gray-900 dark:text-gray-100">You've trained every day this week</h2>
          <p className="text-body-sm text-gray-600 dark:text-gray-300">
            Move to next week from Home, or repeat a day if you want the extra work.
          </p>
          <Button fullWidth onClick={onNavigateHome}>Go to Home</Button>
          {profile && (
            <div className="flex flex-wrap gap-2">
              {getLayout(profile.program_id, profile.days_per_week).days.filter(d => d.primary).map(d => (
                <Button key={d.dayId} variant="ghost" size="md" onClick={() => onOpenLift(d.dayId)}>
                  Repeat {d.label.toLowerCase()}
                </Button>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
