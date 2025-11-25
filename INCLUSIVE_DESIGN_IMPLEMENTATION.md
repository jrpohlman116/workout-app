# Inclusive Design Implementation Guide

## Overview

This guide provides practical examples of how to replace problematic patterns with the newly created accessible components. Each section includes before/after code examples and explains the benefits for diverse users.

---

## Component 1: AccessibleProgressIndicator

### Problem
The current progress bar in `WorkoutDetailPage.tsx` has a moving percentage label that creates tracking difficulties.

### Solution
Use `AccessibleProgressIndicator` with static label position and proper ARIA announcements.

### Before
```tsx
<div className="relative">
  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
    <div
      className="h-full bg-blue-600 transition-all duration-300 rounded-full"
      style={{ width: `${progressPercent}%` }}
    />
  </div>
  <div
    className="absolute -top-8 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded transition-all duration-300"
    style={{ left: `calc(${progressPercent}% - 20px)` }}
  >
    {progressPercent}%
  </div>
</div>
```

### After
```tsx
import AccessibleProgressIndicator from '../components/AccessibleProgressIndicator';

<AccessibleProgressIndicator
  current={currentStepIndex + 1}
  total={totalSteps}
  label="Workout progress"
  variant="bar"
/>
```

### Benefits
- ✅ Static label position (easier to track visually)
- ✅ Screen reader announcements on progress changes
- ✅ Proper ARIA progressbar role
- ✅ Clear "X of Y" text alternative
- ✅ Optional "steps" variant for visual clarity

---

## Component 2: AccessibleStepperNav

### Problem
Multi-step workout flow lacks keyboard navigation and clear progress indicators for screen readers.

### Solution
Replace manual step navigation with `AccessibleStepperNav` component.

### Implementation Example

```tsx
import AccessibleStepperNav from '../components/AccessibleStepperNav';

const steps = [
  { id: 'summary', label: 'Workout Summary', isComplete: false },
  { id: 'main', label: `Main ${liftNames[liftType]}`, isComplete: false },
  ...currentExercises.map((ex, i) => ({
    id: `accessory-${i}`,
    label: ex.name,
    isComplete: false
  }))
];

<AccessibleStepperNav
  steps={steps}
  currentStepId={currentStep}
  onNavigate={(stepId) => setCurrentStep(stepId)}
  onNext={handleNext}
  onPrevious={handlePrevious}
  onSkip={(stepId) => {
    // Allow skipping to specific steps
    setCurrentStep(stepId);
  }}
  allowSkip={true}
  nextLabel="Next Exercise"
  previousLabel="Previous"
/>
```

### Benefits
- ✅ Keyboard shortcuts (Ctrl+Arrow keys)
- ✅ Skip to specific steps via dropdown
- ✅ Screen reader announces current step
- ✅ Clear visual progress indication
- ✅ Skip to end functionality

---

## Component 3: AccessibleChartTable

### Problem
`ProgressChart.tsx` provides visual-only data representation without keyboard-accessible alternatives.

### Solution
Add `AccessibleChartTable` as a complementary view.

### Implementation Example

```tsx
import AccessibleChartTable from '../components/AccessibleChartTable';

// In ProgressPage.tsx
<div className="space-y-4">
  <div className="bg-white rounded-2xl shadow-sm p-6">
    <h2 className="text-lg font-semibold text-gray-700 mb-4">
      Visual Chart
    </h2>
    <ProgressChart chartData={chartData} unitPreference={profile.unit_preference || 'lb'} />
  </div>

  <AccessibleChartTable
    chartData={chartData}
    unitPreference={profile.unit_preference || 'lb'}
  />
</div>
```

### Benefits
- ✅ Sortable table data (by date or value)
- ✅ Summary statistics (min, max, avg, change)
- ✅ Keyboard navigable
- ✅ Screen reader accessible
- ✅ No color dependence
- ✅ Progressive disclosure (expandable by lift)

---

## Component 4: AccessibleFormGroup

### Problem
Form inputs in `WorkoutDetailPage.tsx` lack proper grouping and labels.

### Solution
Use `AccessibleFormGroup` with proper fieldset/legend structure.

### Before
```tsx
<div className="grid grid-cols-2 gap-4 mb-4">
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-2">Reps</label>
  </div>
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-2">Weight</label>
  </div>
</div>
{mainSets.map((set, index) => (
  <div key={index} className="grid grid-cols-2 gap-4 mb-4">
    <input type="number" ... />
    <input type="number" ... />
  </div>
))}
```

### After
```tsx
import AccessibleFormGroup from '../components/AccessibleFormGroup';

<AccessibleFormGroup
  legend={`Barbell ${liftNames[liftType]}`}
  description="Record your main working sets"
  sets={mainSets}
  onUpdateSet={(index, field, value) => {
    const newSets = [...mainSets];
    newSets[index][field] = value;
    setMainSets(newSets);
  }}
  onAddSet={() => setMainSets([...mainSets, { reps: '', weight: '' }])}
  onRemoveSet={(index) => {
    setMainSets(mainSets.filter((_, i) => i !== index));
  }}
  weightUnit={profile.unit_preference || 'lb'}
  minSets={3}
  maxSets={5}
  lastSetData={getLastSetData('main')}
/>
```

### Benefits
- ✅ Proper semantic grouping (fieldset/legend)
- ✅ Individual set labels for screen readers
- ✅ Clear add/remove buttons with ARIA labels
- ✅ Context about previous session
- ✅ Min/max set validation

---

## Component 5: ReducedMotionWrapper & AnimationControls

### Problem
Animations throughout the app don't respect motion preferences.

### Solution
Wrap animations and provide user control.

### Implementation Examples

#### Wrapping Confetti Animation
```tsx
import ReducedMotionWrapper from '../components/ReducedMotionWrapper';

// In WorkoutSuccessModal.tsx
<ReducedMotionWrapper
  fallback={
    <div className="text-center py-4">
      <p className="text-2xl">🎉</p>
      <p className="text-sm text-gray-600">Workout completed!</p>
    </div>
  }
>
  {/* Confetti animation */}
</ReducedMotionWrapper>
```

#### Using the Hook
```tsx
import { useReducedMotion } from '../components/ReducedMotionWrapper';

function MyComponent() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div
      className={`transition-all ${
        prefersReducedMotion ? 'duration-0' : 'duration-300'
      }`}
    >
      {/* Content */}
    </div>
  );
}
```

#### Adding Animation Controls to Profile Page
```tsx
import { AnimationControls } from '../components/ReducedMotionWrapper';

// In ProfilePage.tsx
<div className="space-y-4">
  {/* Other settings */}

  <AnimationControls
    onToggle={(enabled) => {
      // Optional: Save preference to database
      localStorage.setItem('animations-enabled', String(enabled));
    }}
  />
</div>
```

### Benefits
- ✅ Respects prefers-reduced-motion
- ✅ User can override system preference
- ✅ Graceful fallbacks for animations
- ✅ Prevents vestibular issues
- ✅ Improves focus for ADHD users

---

## Component 6: AccessibleNativeSelect

### Problem
Custom dropdowns in `HomePage.tsx` require complex click-outside detection.

### Solution
Use enhanced native selects with progressive enhancement.

### Before
```tsx
const [showWeekSelector, setShowWeekSelector] = useState(false);

<div className="relative week-selector">
  <button onClick={() => setShowWeekSelector(!showWeekSelector)}>
    {/* Button content */}
  </button>
  {showWeekSelector && (
    <div className="absolute...">
      {[1, 2, 3, 4].map((week) => (
        <button onClick={() => handleWeekChange(week)}>
          Week {week}
        </button>
      ))}
    </div>
  )}
</div>
```

### After
```tsx
import AccessibleNativeSelect from '../components/AccessibleNativeSelect';

<AccessibleNativeSelect
  id="week-selector"
  label="Current Week"
  value={profile.current_week}
  options={[
    { value: 1, label: 'Week 1', description: '5 reps' },
    { value: 2, label: 'Week 2', description: '3 reps' },
    { value: 3, label: 'Week 3', description: '5-3-1' },
    { value: 4, label: 'Week 4', description: 'Deload' }
  ]}
  onChange={(week) => handleWeekChange(Number(week))}
  description="Select your current training week"
/>
```

### Alternative: Radio Group for Better UX
```tsx
import { AccessibleRadioGroup } from '../components/AccessibleNativeSelect';

<AccessibleRadioGroup
  legend="Current Week"
  name="week"
  value={profile.current_week}
  options={[
    { value: 1, label: 'Week 1 - 5 reps', description: 'Moderate intensity' },
    { value: 2, label: 'Week 2 - 3 reps', description: 'Heavy weight' },
    { value: 3, label: 'Week 3 - 5-3-1', description: 'PR week' },
    { value: 4, label: 'Week 4 - Deload', description: 'Recovery' }
  ]}
  onChange={(week) => handleWeekChange(Number(week))}
  orientation="vertical"
/>
```

### Benefits
- ✅ Native browser accessibility
- ✅ Keyboard navigation built-in
- ✅ Mobile-friendly native picker
- ✅ No click-outside logic needed
- ✅ Screen reader compatible
- ✅ Radio group alternative for better visibility

---

## Implementation Priority

### Phase 1: Critical Accessibility (Immediate)
1. Replace workout progress bar with `AccessibleProgressIndicator`
2. Add `AccessibleFormGroup` to all form sections
3. Implement `ReducedMotionWrapper` for confetti animations

### Phase 2: Enhanced Navigation (Week 1)
4. Implement `AccessibleStepperNav` in workout flow
5. Replace custom dropdowns with `AccessibleNativeSelect`
6. Add `AnimationControls` to profile page

### Phase 3: Data Accessibility (Week 2)
7. Add `AccessibleChartTable` to progress page
8. Add CSV export functionality for data portability
9. Implement keyboard shortcuts documentation

### Phase 4: Polish & Testing (Week 3)
10. Comprehensive screen reader testing
11. Keyboard navigation audit
12. User testing with diverse abilities

---

## Testing Checklist

### Before Deployment
- [ ] Test with keyboard only (unplug mouse)
- [ ] Test with screen reader (NVDA, JAWS, or VoiceOver)
- [ ] Test with prefers-reduced-motion enabled
- [ ] Test with 200% browser zoom
- [ ] Test with Windows High Contrast mode
- [ ] Test on mobile with TalkBack/VoiceOver
- [ ] Validate HTML with W3C validator
- [ ] Run axe DevTools accessibility scan
- [ ] Test with color blindness simulators

### Performance
- [ ] Animations don't cause jank
- [ ] Large data tables remain responsive
- [ ] Form inputs have proper debouncing
- [ ] Screen reader announcements aren't overwhelming

---

## Resources

### Testing Tools
- **axe DevTools**: Browser extension for accessibility auditing
- **WAVE**: Web accessibility evaluation tool
- **Lighthouse**: Built-in Chrome DevTools audit
- **Screen Readers**: NVDA (Windows), JAWS (Windows), VoiceOver (Mac/iOS)
- **Color Contrast Checker**: WebAIM Contrast Checker

### References
- WCAG 2.1 Guidelines: https://www.w3.org/WAI/WCAG21/quickref/
- ARIA Authoring Practices: https://www.w3.org/WAI/ARIA/apg/
- Inclusive Components: https://inclusive-components.design/
- A11Y Project: https://www.a11yproject.com/

---

## Conclusion

These inclusive design patterns ensure the 5-3-1 workout tracker is usable by:
- Users with motor impairments (keyboard navigation, large touch targets)
- Users with vision impairments (screen readers, high contrast)
- Users with cognitive disabilities (clear language, progressive disclosure)
- Users with vestibular disorders (reduced motion)
- Users on assistive technology (proper ARIA, semantic HTML)
- All users (better UX benefits everyone!)

Remember: **Accessibility is not a feature, it's a baseline requirement.**
