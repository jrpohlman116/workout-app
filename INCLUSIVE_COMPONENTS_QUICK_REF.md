# Inclusive Components - Quick Reference

## Available Components

### 1. AccessibleProgressIndicator
**Purpose:** Display workout progress without moving targets

```tsx
<AccessibleProgressIndicator
  current={3}
  total={8}
  label="Workout progress"
  variant="bar" // or "steps"
/>
```

**Features:**
- ✅ Static label position
- ✅ ARIA progressbar role
- ✅ Screen reader announcements
- ✅ Two display variants

---

### 2. AccessibleStepperNav
**Purpose:** Multi-step navigation with keyboard support

```tsx
<AccessibleStepperNav
  steps={[
    { id: 'step1', label: 'Summary', isComplete: false },
    { id: 'step2', label: 'Main Lift', isComplete: false }
  ]}
  currentStepId="step1"
  onNavigate={(id) => setStep(id)}
  onNext={handleNext}
  onPrevious={handlePrev}
  allowSkip={true}
/>
```

**Features:**
- ✅ Keyboard shortcuts (Ctrl+Arrow)
- ✅ Skip to any step
- ✅ Screen reader announcements
- ✅ Progress indication

---

### 3. AccessibleChartTable
**Purpose:** Data table alternative to visual charts

```tsx
<AccessibleChartTable
  chartData={chartData}
  unitPreference="lb"
/>
```

**Features:**
- ✅ Sortable columns
- ✅ Summary statistics
- ✅ Expandable by lift type
- ✅ Keyboard navigable

---

### 4. AccessibleFormGroup
**Purpose:** Properly grouped form inputs for workout sets

```tsx
<AccessibleFormGroup
  legend="Barbell Squat"
  description="Record your main working sets"
  sets={[{ reps: '5', weight: '315' }]}
  onUpdateSet={(i, field, val) => updateSet(i, field, val)}
  onAddSet={addSet}
  onRemoveSet={removeSet}
  weightUnit="lb"
  minSets={3}
  maxSets={5}
  lastSetData="315lb for 5 reps"
/>
```

**Features:**
- ✅ Semantic fieldset/legend
- ✅ Individual set labels
- ✅ Add/remove functionality
- ✅ Previous session context

---

### 5. ReducedMotionWrapper
**Purpose:** Respect motion preferences

```tsx
<ReducedMotionWrapper
  fallback={<StaticContent />}
>
  <AnimatedContent />
</ReducedMotionWrapper>

// Or use the hook
const prefersReduced = useReducedMotion();
```

**Features:**
- ✅ Detects prefers-reduced-motion
- ✅ Provides fallback content
- ✅ Hook for custom logic
- ✅ User control component

---

### 6. AccessibleNativeSelect
**Purpose:** Enhanced native select with progressive enhancement

```tsx
<AccessibleNativeSelect
  id="week"
  label="Current Week"
  value={week}
  options={[
    { value: 1, label: 'Week 1', description: '5 reps' },
    { value: 2, label: 'Week 2', description: '3 reps' }
  ]}
  onChange={setWeek}
  description="Select your training week"
/>

// Radio group alternative
<AccessibleRadioGroup
  legend="Current Week"
  name="week"
  value={week}
  options={options}
  onChange={setWeek}
  orientation="vertical"
/>
```

**Features:**
- ✅ Native accessibility
- ✅ Mobile-friendly
- ✅ Radio group alternative
- ✅ Error handling

---

### 7. AccessiblePagination
**Purpose:** Alternative to infinite scroll

```tsx
<AccessiblePagination
  currentPage={page}
  totalPages={10}
  onPageChange={setPage}
  pageSize={20}
  totalItems={200}
  itemName="workouts"
/>

// Or use Load More button
<LoadMoreButton
  onLoadMore={loadMore}
  loading={loading}
  hasMore={hasMore}
  loadedCount={20}
  totalCount={200}
  itemName="workouts"
/>
```

**Features:**
- ✅ Full pagination control
- ✅ Keyboard navigable
- ✅ Screen reader friendly
- ✅ Load more alternative

---

## Component Selection Guide

### When to use what?

| Scenario | Component | Why |
|----------|-----------|-----|
| Show progress through steps | `AccessibleProgressIndicator` | Static, clear updates |
| Navigate multi-step form | `AccessibleStepperNav` | Keyboard support, skip option |
| Alternative to chart | `AccessibleChartTable` | Sortable data, accessible |
| Group exercise sets | `AccessibleFormGroup` | Proper semantics, context |
| Add animations | `ReducedMotionWrapper` | Respects preferences |
| Week/Cycle selection | `AccessibleNativeSelect` | Native, mobile-friendly |
| Radio group (2-5 options) | `AccessibleRadioGroup` | Better visibility |
| List pagination | `AccessiblePagination` | Better than infinite scroll |
| Progressive load | `LoadMoreButton` | User control |

---

## Common Patterns

### Pattern 1: Workout Step Navigation
```tsx
import AccessibleProgressIndicator from '../components/AccessibleProgressIndicator';
import AccessibleStepperNav from '../components/AccessibleStepperNav';

// Show progress at top
<AccessibleProgressIndicator
  current={currentStep}
  total={totalSteps}
  label="Workout progress"
  variant="steps"
/>

// Navigation at bottom
<AccessibleStepperNav
  steps={steps}
  currentStepId={currentStepId}
  onNavigate={setStep}
  onNext={nextStep}
  onPrevious={prevStep}
  allowSkip={true}
/>
```

### Pattern 2: Exercise Set Input
```tsx
import AccessibleFormGroup from '../components/AccessibleFormGroup';

<AccessibleFormGroup
  legend={exerciseName}
  description={`${sets} sets of ${reps} reps`}
  sets={exerciseSets}
  onUpdateSet={handleUpdate}
  onAddSet={handleAdd}
  onRemoveSet={handleRemove}
  weightUnit={profile.unit_preference}
  isBodyweight={exercise.isBodyweight}
  lastSetData={getLastSetData(exerciseName)}
/>
```

### Pattern 3: Animated Success Feedback
```tsx
import ReducedMotionWrapper from '../components/ReducedMotionWrapper';
import { useReducedMotion } from '../components/ReducedMotionWrapper';

function SuccessModal() {
  const prefersReduced = useReducedMotion();

  return (
    <>
      <h2>Workout Complete!</h2>
      <ReducedMotionWrapper
        fallback={<div className="text-4xl">🎉</div>}
      >
        <ConfettiAnimation count={prefersReduced ? 10 : 40} />
      </ReducedMotionWrapper>
    </>
  );
}
```

### Pattern 4: Chart with Table Alternative
```tsx
import ProgressChart from '../components/ProgressChart';
import AccessibleChartTable from '../components/AccessibleChartTable';

<div className="space-y-4">
  {/* Visual chart */}
  <div className="bg-white rounded-2xl shadow-sm p-6">
    <h2>Visual Progress</h2>
    <ProgressChart chartData={data} unitPreference="lb" />
  </div>

  {/* Accessible alternative */}
  <AccessibleChartTable
    chartData={data}
    unitPreference="lb"
  />
</div>
```

### Pattern 5: Workout Log with Pagination
```tsx
import AccessiblePagination from '../components/AccessiblePagination';

function WorkoutLog() {
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const paginatedWorkouts = workouts.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  return (
    <>
      <div className="space-y-4">
        {paginatedWorkouts.map(workout => (
          <WorkoutCard key={workout.id} workout={workout} />
        ))}
      </div>

      <AccessiblePagination
        currentPage={page}
        totalPages={Math.ceil(workouts.length / pageSize)}
        onPageChange={setPage}
        pageSize={pageSize}
        totalItems={workouts.length}
        itemName="workouts"
      />
    </>
  );
}
```

---

## Props Reference

### AccessibleProgressIndicator Props
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| current | number | ✅ | - | Current step number |
| total | number | ✅ | - | Total number of steps |
| label | string | ❌ | "Progress" | Accessible label |
| variant | 'bar' \| 'steps' | ❌ | 'bar' | Display style |

### AccessibleStepperNav Props
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| steps | Step[] | ✅ | - | Array of step objects |
| currentStepId | string | ✅ | - | ID of current step |
| onNavigate | (id: string) => void | ✅ | - | Navigation handler |
| onNext | () => void | ❌ | - | Next button handler |
| onPrevious | () => void | ❌ | - | Previous button handler |
| onSkip | (id: string) => void | ❌ | - | Skip handler |
| allowSkip | boolean | ❌ | false | Show skip dropdown |

### AccessibleFormGroup Props
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| legend | string | ✅ | - | Group label |
| sets | SetInput[] | ✅ | - | Array of set data |
| onUpdateSet | (i, field, val) => void | ✅ | - | Update handler |
| onAddSet | () => void | ✅ | - | Add set handler |
| onRemoveSet | (i) => void | ✅ | - | Remove set handler |
| description | string | ❌ | - | Helper text |
| weightUnit | string | ❌ | 'lb' | Weight unit |
| isBodyweight | boolean | ❌ | false | Bodyweight exercise |
| minSets | number | ❌ | 1 | Minimum sets |
| maxSets | number | ❌ | 10 | Maximum sets |
| lastSetData | string | ❌ | - | Previous session info |

---

## Accessibility Checklist

When using these components:

- [ ] All interactive elements have visible focus
- [ ] Screen reader announcements are not overwhelming
- [ ] Keyboard navigation works smoothly
- [ ] Touch targets are ≥44px
- [ ] Color is not the only indicator
- [ ] Error messages are clear and actionable
- [ ] Motion respects user preferences
- [ ] Forms have proper validation
- [ ] Tables have proper headers
- [ ] Buttons have descriptive labels

---

## Testing Commands

```bash
# Type check
npm run typecheck

# Build for production
npm run build

# Run linter
npm run lint

# Manual testing
# 1. Unplug mouse
# 2. Navigate with Tab key
# 3. Activate with Enter/Space
# 4. Enable screen reader
# 5. Set prefers-reduced-motion
```

---

## Support & Documentation

- **Full Analysis:** See `INCLUSIVE_DESIGN_PATTERNS.md`
- **Implementation Guide:** See `INCLUSIVE_DESIGN_IMPLEMENTATION.md`
- **Executive Summary:** See `INCLUSIVE_DESIGN_SUMMARY.md`
- **WCAG Guidelines:** https://www.w3.org/WAI/WCAG21/quickref/
- **ARIA Patterns:** https://www.w3.org/WAI/ARIA/apg/

---

## Quick Wins

Start with these three high-impact changes:

1. **Replace progress bar** (5 minutes)
   ```tsx
   import AccessibleProgressIndicator from '../components/AccessibleProgressIndicator';
   ```

2. **Wrap confetti** (2 minutes)
   ```tsx
   import ReducedMotionWrapper from '../components/ReducedMotionWrapper';
   ```

3. **Group form inputs** (10 minutes per form)
   ```tsx
   import AccessibleFormGroup from '../components/AccessibleFormGroup';
   ```

**Total time: ~30 minutes for major accessibility boost!**
