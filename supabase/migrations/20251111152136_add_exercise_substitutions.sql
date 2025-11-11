/*
  # Add Exercise Substitutions Table

  1. New Tables
    - `exercise_substitutions`
      - `id` (uuid, primary key)
      - `original_exercise` (text) - Name of the original accessory exercise
      - `substitute_exercise` (text) - Name of the substitute exercise
      - `description` (text) - Description of the substitute exercise
      - `equipment_needed` (text) - Equipment required for the substitute
      - `difficulty` (text) - Difficulty level: 'easier', 'similar', 'harder'
      - `muscle_groups` (text[]) - Array of muscle groups targeted
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `exercise_substitutions` table
    - Add policy for authenticated users to read all substitution options
    - This is a reference table that all users can read but cannot modify

  3. Data Population
    - Seed comprehensive substitution options for all accessory exercises
    - Organized by lift type: squat, bench, deadlift, ohp
    - Include variety of equipment options and difficulty levels

  4. Notes
    - This table serves as a reference/lookup table for exercise options
    - Users don't own this data - it's shared across all users
    - Substitutions maintain similar muscle groups and movement patterns
*/

CREATE TABLE IF NOT EXISTS exercise_substitutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_exercise text NOT NULL,
  substitute_exercise text NOT NULL,
  description text NOT NULL DEFAULT '',
  equipment_needed text NOT NULL DEFAULT '',
  difficulty text NOT NULL DEFAULT 'similar',
  muscle_groups text[] NOT NULL DEFAULT ARRAY[]::text[],
  created_at timestamptz DEFAULT now()
);

ALTER TABLE exercise_substitutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read exercise substitutions"
  ON exercise_substitutions FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_exercise_substitutions_original ON exercise_substitutions(original_exercise);

INSERT INTO exercise_substitutions (original_exercise, substitute_exercise, description, equipment_needed, difficulty, muscle_groups) VALUES
  ('Romanian Deadlift', 'Good Mornings', 'Hip hinge movement focusing on hamstrings and lower back', 'Barbell', 'similar', ARRAY['hamstrings', 'glutes', 'lower back']),
  ('Romanian Deadlift', 'Glute Ham Raise', 'Bodyweight hamstring curl variation', 'GHD or partner', 'harder', ARRAY['hamstrings', 'glutes']),
  ('Romanian Deadlift', 'Single-Leg RDL', 'Unilateral hip hinge for balance and hamstring strength', 'Dumbbell', 'similar', ARRAY['hamstrings', 'glutes', 'core']),
  ('Romanian Deadlift', 'Stiff-Leg Deadlift', 'Similar hip hinge with less knee bend', 'Barbell or Dumbbells', 'similar', ARRAY['hamstrings', 'glutes', 'lower back']),
  
  ('Bulgarian Split Squats', 'Lunges', 'Alternating leg exercise with similar quad focus', 'Dumbbells or Barbell', 'easier', ARRAY['quads', 'glutes']),
  ('Bulgarian Split Squats', 'Step-Ups', 'Unilateral leg exercise with hip and knee extension', 'Dumbbells or Barbell', 'easier', ARRAY['quads', 'glutes']),
  ('Bulgarian Split Squats', 'Split Squats', 'Stationary split squat without rear foot elevation', 'Dumbbells or Barbell', 'easier', ARRAY['quads', 'glutes']),
  ('Bulgarian Split Squats', 'Pistol Squats', 'Advanced single-leg squat variation', 'Bodyweight', 'harder', ARRAY['quads', 'glutes', 'core']),
  
  ('Leg Curls', 'Nordic Curls', 'Intense hamstring exercise with eccentric focus', 'Partner or band', 'harder', ARRAY['hamstrings']),
  ('Leg Curls', 'Stability Ball Curls', 'Hamstring curls using stability ball', 'Stability ball', 'easier', ARRAY['hamstrings', 'core']),
  ('Leg Curls', 'Glute Ham Raise', 'Full hamstring and glute exercise', 'GHD', 'harder', ARRAY['hamstrings', 'glutes']),
  ('Leg Curls', 'Slider Curls', 'Hamstring curls using sliders on floor', 'Sliders', 'similar', ARRAY['hamstrings', 'core']),
  
  ('Plank', 'Dead Bug', 'Core exercise focusing on anti-extension', 'Bodyweight', 'similar', ARRAY['core', 'abs']),
  ('Plank', 'Pallof Press', 'Anti-rotation core exercise', 'Cable or band', 'similar', ARRAY['core', 'obliques']),
  ('Plank', 'Ab Wheel Rollouts', 'Advanced anti-extension exercise', 'Ab wheel', 'harder', ARRAY['core', 'abs']),
  ('Plank', 'Bird Dog', 'Core stability with limb movement', 'Bodyweight', 'easier', ARRAY['core', 'lower back']),
  
  ('Incline DB Press', 'Incline Barbell Press', 'Upper chest focus with barbell', 'Barbell', 'similar', ARRAY['chest', 'shoulders', 'triceps']),
  ('Incline DB Press', 'Landmine Press', 'Angled press movement for upper chest', 'Barbell', 'similar', ARRAY['chest', 'shoulders']),
  ('Incline DB Press', 'Low-to-High Cable Flyes', 'Isolation exercise for upper chest', 'Cable machine', 'easier', ARRAY['chest']),
  ('Incline DB Press', 'Push-Ups with feet elevated', 'Bodyweight upper chest exercise', 'Bodyweight', 'easier', ARRAY['chest', 'shoulders', 'triceps']),
  
  ('Barbell Curls', 'Dumbbell Curls', 'Bicep curls with dumbbells for more range', 'Dumbbells', 'similar', ARRAY['biceps']),
  ('Barbell Curls', 'EZ Bar Curls', 'Angled bar reduces wrist strain', 'EZ Bar', 'similar', ARRAY['biceps']),
  ('Barbell Curls', 'Hammer Curls', 'Neutral grip curl for biceps and brachialis', 'Dumbbells', 'similar', ARRAY['biceps', 'forearms']),
  ('Barbell Curls', 'Cable Curls', 'Constant tension throughout movement', 'Cable machine', 'similar', ARRAY['biceps']),
  
  ('Tricep Pressdowns', 'Overhead Tricep Extension', 'Overhead movement for long head emphasis', 'Dumbbell or Cable', 'similar', ARRAY['triceps']),
  ('Tricep Pressdowns', 'Close-Grip Push-Ups', 'Bodyweight tricep exercise', 'Bodyweight', 'easier', ARRAY['triceps', 'chest']),
  ('Tricep Pressdowns', 'Dips', 'Compound tricep and chest exercise', 'Dip bars', 'harder', ARRAY['triceps', 'chest', 'shoulders']),
  ('Tricep Pressdowns', 'Skull Crushers', 'Lying tricep extension', 'Barbell or Dumbbells', 'similar', ARRAY['triceps']),
  
  ('Face Pulls', 'Band Pull-Aparts', 'Rear delt and upper back exercise', 'Resistance band', 'easier', ARRAY['rear delts', 'upper back']),
  ('Face Pulls', 'Reverse Flyes', 'Isolation for rear delts', 'Dumbbells or Cable', 'similar', ARRAY['rear delts']),
  ('Face Pulls', 'High Rows', 'Upper back and rear delt compound movement', 'Cable or Barbell', 'similar', ARRAY['rear delts', 'upper back', 'traps']),
  ('Face Pulls', 'W Raises', 'Scapular retraction with rotation', 'Dumbbells', 'easier', ARRAY['rear delts', 'rotator cuff']),
  
  ('Leg Press', 'Front Squats', 'Quad-dominant compound movement', 'Barbell', 'harder', ARRAY['quads', 'core']),
  ('Leg Press', 'Hack Squats', 'Machine-based quad exercise', 'Hack squat machine', 'similar', ARRAY['quads', 'glutes']),
  ('Leg Press', 'Goblet Squats', 'Squat variation with front load', 'Dumbbell or Kettlebell', 'easier', ARRAY['quads', 'glutes']),
  ('Leg Press', 'Belt Squats', 'Squat without loading the spine', 'Belt squat machine', 'similar', ARRAY['quads', 'glutes']),
  
  ('B Stance RDLs', 'Single-Leg RDL', 'Full single-leg hip hinge', 'Dumbbell', 'harder', ARRAY['hamstrings', 'glutes', 'core']),
  ('B Stance RDLs', 'Romanian Deadlift', 'Bilateral hip hinge', 'Barbell', 'easier', ARRAY['hamstrings', 'glutes', 'lower back']),
  ('B Stance RDLs', 'Kickstand RDL', 'Similar kickstand position variation', 'Dumbbell', 'similar', ARRAY['hamstrings', 'glutes']),
  ('B Stance RDLs', 'Cable Pull-Throughs', 'Hip hinge with constant tension', 'Cable machine', 'easier', ARRAY['hamstrings', 'glutes']),
  
  ('Barbell Rows', 'Dumbbell Rows', 'Single-arm back exercise', 'Dumbbells', 'similar', ARRAY['lats', 'upper back']),
  ('Barbell Rows', 'T-Bar Rows', 'Supported row variation', 'T-Bar or Barbell', 'similar', ARRAY['lats', 'upper back']),
  ('Barbell Rows', 'Chest-Supported Rows', 'Removes lower back from equation', 'Dumbbells or Machine', 'easier', ARRAY['lats', 'upper back']),
  ('Barbell Rows', 'Pendlay Rows', 'Explosive row from floor', 'Barbell', 'harder', ARRAY['lats', 'upper back', 'lower back']),
  
  ('Abs', 'Hanging Leg Raises', 'Advanced ab exercise with hip flexion', 'Pull-up bar', 'harder', ARRAY['abs', 'hip flexors']),
  ('Abs', 'Cable Crunches', 'Weighted ab exercise with constant tension', 'Cable machine', 'similar', ARRAY['abs']),
  ('Abs', 'Decline Sit-Ups', 'Traditional ab exercise with gravity', 'Decline bench', 'similar', ARRAY['abs']),
  ('Abs', 'Plank Variations', 'Isometric core holds', 'Bodyweight', 'similar', ARRAY['core', 'abs']),
  
  ('Close-Grip Bench', 'Board Press', 'Partial range bench for triceps', 'Barbell and boards', 'similar', ARRAY['triceps', 'chest']),
  ('Close-Grip Bench', 'Floor Press', 'Bench press from floor, reduced range', 'Barbell or Dumbbells', 'similar', ARRAY['triceps', 'chest']),
  ('Close-Grip Bench', 'Dips', 'Bodyweight or weighted tricep exercise', 'Dip bars', 'similar', ARRAY['triceps', 'chest', 'shoulders']),
  ('Close-Grip Bench', 'JM Press', 'Hybrid press/extension movement', 'Barbell', 'harder', ARRAY['triceps']),
  
  ('Lat Pull-Overs', 'Straight-Arm Pulldowns', 'Cable variation of pullover', 'Cable machine', 'similar', ARRAY['lats', 'serratus']),
  ('Lat Pull-Overs', 'Dumbbell Pullovers', 'Classic pullover with dumbbell', 'Dumbbell', 'similar', ARRAY['lats', 'chest', 'serratus']),
  ('Lat Pull-Overs', 'Pull-Ups', 'Compound back exercise', 'Pull-up bar', 'harder', ARRAY['lats', 'biceps', 'upper back']),
  ('Lat Pull-Overs', 'Resistance Band Pullovers', 'Band variation for home gym', 'Resistance band', 'easier', ARRAY['lats', 'serratus']),
  
  ('Lateral Raise Complex', 'Standard Lateral Raises', 'Simple lateral delt raises', 'Dumbbells', 'easier', ARRAY['side delts']),
  ('Lateral Raise Complex', 'Cable Lateral Raises', 'Constant tension lateral raises', 'Cable machine', 'similar', ARRAY['side delts']),
  ('Lateral Raise Complex', 'Lu Raises', 'Front to lateral raise combo', 'Dumbbells', 'harder', ARRAY['front delts', 'side delts']),
  ('Lateral Raise Complex', 'Upright Rows', 'Compound shoulder and trap exercise', 'Barbell or Dumbbells', 'similar', ARRAY['side delts', 'traps']),
  
  ('Rear Delt Flyes', 'Reverse Pec Deck', 'Machine isolation for rear delts', 'Pec deck machine', 'easier', ARRAY['rear delts']),
  ('Rear Delt Flyes', 'Face Pulls', 'Cable exercise for rear delts and upper back', 'Cable machine', 'similar', ARRAY['rear delts', 'upper back']),
  ('Rear Delt Flyes', 'Bent-Over Lateral Raises', 'Dumbbell rear delt isolation', 'Dumbbells', 'similar', ARRAY['rear delts']),
  ('Rear Delt Flyes', 'Seated Rear Delt Flyes', 'Seated variation for stability', 'Dumbbells', 'similar', ARRAY['rear delts'])
ON CONFLICT DO NOTHING;