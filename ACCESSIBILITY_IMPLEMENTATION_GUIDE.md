# Accessibility Implementation Guide

## Overview
This guide demonstrates how to implement the accessible components in your application to replace problematic patterns.

## Component Replacements

### 1. Replace Standard Progress Ring with AccessibleProgressRing

**Before (Problematic):**
```tsx
<svg className="w-48 h-48 transform -rotate-90">
  <circle cx="96" cy="96" r="80" fill="none" stroke="#f3f4f6" strokeWidth="16" />
  <circle cx="96" cy="96" r="80" fill="none" stroke="url(#gradient)" strokeWidth="16" />
</svg>
```

**After (Accessible):**
```tsx
import AccessibleProgressRing from './components/AccessibleProgressRing';

<AccessibleProgressRing
  value={wilksScore}
  max={600}
  label="Wilks Score"
  description={getWilksLevel(wilksScore)}
  size={192}
/>
```

**Benefits:**
- ✅ Screen reader announces value and percentage
- ✅ Has proper ARIA labels and descriptions
- ✅ Visual content has text alternative
- ✅ Respects prefers-reduced-motion

---

### 2. Replace Standard Select with AccessibleSelect

**Before (Problematic):**
```tsx
<select value={gender} onChange={(e) => setGender(e.target.value)}>
  <option value="male">Male</option>
  <option value="female">Female</option>
</select>
```

**After (Accessible):**
```tsx
import AccessibleSelect from './components/AccessibleSelect';

<AccessibleSelect
  id="gender-select"
  label="Gender"
  value={gender}
  options={[
    { value: 'male', label: 'Male', description: 'Uses male Wilks coefficient' },
    { value: 'female', label: 'Female', description: 'Uses female Wilks coefficient' }
  ]}
  onChange={setGender}
  description="Used to calculate accurate Wilks scores"
  required
/>
```

**Benefits:**
- ✅ Keyboard navigable (Arrow keys, Home, End, Type-ahead)
- ✅ Properly labeled and described
- ✅ Works without JavaScript (progressive enhancement)
- ✅ Clear visual focus indicators
- ✅ Mobile-friendly with large touch targets

---

### 3. Add Skip Links for Keyboard Users

**Implementation:**
```tsx
import SkipLink from './components/SkipLink';

function App() {
  return (
    <>
      <SkipLink targetId="main-content">
        Skip to main content
      </SkipLink>
      <SkipLink targetId="navigation">
        Skip to navigation
      </SkipLink>

      <main id="main-content" tabIndex={-1}>
        {/* Your content */}
      </main>

      <nav id="navigation">
        <Navigation />
      </nav>
    </>
  );
}
```

**Benefits:**
- ✅ Keyboard users can bypass repetitive content
- ✅ Invisible until focused
- ✅ Smooth scrolling to target
- ✅ WCAG 2.4.1 compliance

---

### 4. Replace alert() with AccessibleAlert

**Before (Problematic):**
```tsx
alert('Password updated successfully');
```

**After (Accessible):**
```tsx
import AccessibleAlert from './components/AccessibleAlert';

const [showSuccess, setShowSuccess] = useState(false);

{showSuccess && (
  <AccessibleAlert
    type="success"
    title="Success"
    dismissible
    onDismiss={() => setShowSuccess(false)}
  >
    Your password has been updated successfully!
  </AccessibleAlert>
)}
```

**Benefits:**
- ✅ Screen reader announces via aria-live
- ✅ Doesn't block user interaction
- ✅ Visual AND semantic meaning (not just color)
- ✅ Dismissible with keyboard
- ✅ Proper role (alert vs status)

---

### 5. Implement Accessible Modals

**Before (Problematic):**
```tsx
{isOpen && (
  <div className="fixed inset-0 z-50">
    <div onClick={onClose}>Close</div>
    {/* content */}
  </div>
)}
```

**After (Accessible):**
```tsx
import AccessibleModal from './components/AccessibleModal';

<AccessibleModal
  isOpen={isOpen}
  onClose={onClose}
  title="Confirm Action"
  description="This action cannot be undone"
  size="md"
>
  <p>Are you sure you want to proceed?</p>
  <div className="flex gap-4 mt-4">
    <button onClick={onConfirm}>Confirm</button>
    <button onClick={onClose}>Cancel</button>
  </div>
</AccessibleModal>
```

**Benefits:**
- ✅ Focus trap - tab cycles within modal
- ✅ ESC key closes modal
- ✅ Focuses first element on open
- ✅ Returns focus to trigger on close
- ✅ Proper ARIA attributes (role="dialog", aria-modal)
- ✅ Prevents body scroll when open

---

## Progressive Enhancement Examples

### 1. Form Validation with JavaScript Enhancement

**HTML/CSS First (No JS):**
```tsx
<form onSubmit={handleSubmit}>
  <input
    type="email"
    name="email"
    required
    pattern="[^@\s]+@[^@\s]+\.[^@\s]+"
    aria-describedby="email-hint"
  />
  <span id="email-hint">Enter a valid email address</span>
  <button type="submit">Submit</button>
</form>
```

**Enhanced with JavaScript:**
```tsx
const [email, setEmail] = useState('');
const [error, setError] = useState('');

const validateEmail = (value: string) => {
  if (!value) {
    setError('Email is required');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    setError('Please enter a valid email address');
  } else {
    setError('');
  }
};

<div>
  <label htmlFor="email">Email</label>
  <input
    id="email"
    type="email"
    value={email}
    onChange={(e) => {
      setEmail(e.target.value);
      validateEmail(e.target.value);
    }}
    aria-invalid={!!error}
    aria-describedby={error ? "email-error email-hint" : "email-hint"}
    className={error ? 'error-field' : ''}
  />
  <span id="email-hint" className="text-sm text-gray-500">
    Enter a valid email address
  </span>
  {error && (
    <span id="email-error" role="alert" className="text-sm text-red-600">
      {error}
    </span>
  )}
</div>
```

---

### 2. Loading States

**Basic (Works without JS):**
```tsx
<button type="submit" disabled={loading}>
  {loading ? 'Loading...' : 'Submit'}
</button>
```

**Enhanced:**
```tsx
<button
  type="submit"
  disabled={loading}
  aria-busy={loading}
  aria-live="polite"
>
  <span className={loading ? 'sr-only' : ''}>Submit</span>
  {loading && (
    <>
      <span className="loading inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" aria-hidden="true" />
      <span className="ml-2">Loading...</span>
    </>
  )}
</button>
```

---

## Replacing Problematic Patterns

### 1. Infinite Scroll → Load More Button

**Why It's Better:**
- ✅ Users can reach footer content
- ✅ Keyboard users can control loading
- ✅ Screen readers announce new content
- ✅ Better for performance

**Implementation:**
```tsx
const [displayCount, setDisplayCount] = useState(20);
const hasMore = displayCount < totalItems;

return (
  <>
    <div aria-live="polite" aria-atomic="false">
      {items.slice(0, displayCount).map(item => (
        <WorkoutCard key={item.id} {...item} />
      ))}
    </div>

    {hasMore && (
      <button
        onClick={() => setDisplayCount(prev => prev + 20)}
        className="w-full py-4 bg-blue-600 text-white rounded-xl"
      >
        Load More Workouts
        <span className="sr-only">
          , currently showing {displayCount} of {totalItems}
        </span>
      </button>
    )}

    {!hasMore && (
      <p className="text-center text-gray-600 py-4">
        You've reached the end of your workout history
      </p>
    )}
  </>
);
```

---

### 2. Carousel → Tabbed Interface or Simple Gallery

**Why It's Better:**
- ✅ All content accessible at once
- ✅ No auto-play to distract users
- ✅ Keyboard navigable
- ✅ No motion issues

**Implementation:**
```tsx
const [activeTab, setActiveTab] = useState(0);
const tabs = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];

return (
  <div>
    <div role="tablist" aria-label="Workout weeks" className="flex gap-2 mb-4">
      {tabs.map((tab, index) => (
        <button
          key={tab}
          role="tab"
          id={`tab-${index}`}
          aria-selected={activeTab === index}
          aria-controls={`panel-${index}`}
          tabIndex={activeTab === index ? 0 : -1}
          onClick={() => setActiveTab(index)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') {
              setActiveTab((activeTab + 1) % tabs.length);
            } else if (e.key === 'ArrowLeft') {
              setActiveTab((activeTab - 1 + tabs.length) % tabs.length);
            }
          }}
          className={`px-4 py-2 rounded-lg ${
            activeTab === index
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          {tab}
        </button>
      ))}
    </div>

    {tabs.map((tab, index) => (
      <div
        key={tab}
        role="tabpanel"
        id={`panel-${index}`}
        aria-labelledby={`tab-${index}`}
        hidden={activeTab !== index}
        tabIndex={0}
      >
        {/* Content for this week */}
      </div>
    ))}
  </div>
);
```

---

### 3. Complex Mega Dropdown → Simple Expandable Sections

**Why It's Better:**
- ✅ Easier to navigate with keyboard
- ✅ Content always visible (not hidden on hover)
- ✅ Mobile-friendly
- ✅ Better for cognitive load

**Implementation:**
```tsx
const [expandedSection, setExpandedSection] = useState<string | null>(null);

const toggleSection = (sectionId: string) => {
  setExpandedSection(prev => prev === sectionId ? null : sectionId);
};

return (
  <div>
    {sections.map(section => (
      <div key={section.id}>
        <button
          aria-expanded={expandedSection === section.id}
          aria-controls={`content-${section.id}`}
          onClick={() => toggleSection(section.id)}
          className="w-full flex items-center justify-between p-4 text-left"
        >
          <span className="font-semibold">{section.title}</span>
          <span aria-hidden="true">
            {expandedSection === section.id ? '−' : '+'}
          </span>
        </button>

        <div
          id={`content-${section.id}`}
          hidden={expandedSection !== section.id}
          className="p-4"
        >
          {section.content}
        </div>
      </div>
    ))}
  </div>
);
```

---

## Testing Checklist

### Keyboard Testing
- [ ] Can navigate entire app with Tab/Shift+Tab
- [ ] Focus indicators are visible
- [ ] No keyboard traps
- [ ] Logical tab order
- [ ] Can activate all interactive elements with Enter/Space

### Screen Reader Testing
- [ ] All images have alt text
- [ ] Form inputs have labels
- [ ] Errors are announced
- [ ] Dynamic content is announced (aria-live)
- [ ] Headings create proper structure

### Visual Testing
- [ ] Text is readable at 200% zoom
- [ ] Color contrast meets WCAG AA (4.5:1)
- [ ] Content doesn't rely on color alone
- [ ] Touch targets are at least 44x44px

### Motion Testing
- [ ] Respect prefers-reduced-motion
- [ ] No auto-playing content
- [ ] Animations can be paused

---

## Quick Wins for Immediate Improvement

1. **Add `alt` attributes to all images**
2. **Ensure all form inputs have associated labels**
3. **Add skip links**
4. **Ensure 4.5:1 color contrast minimum**
5. **Make all interactive elements keyboard accessible**
6. **Add ARIA labels to icon-only buttons**
7. **Implement focus indicators**
8. **Respect prefers-reduced-motion**
9. **Test with keyboard only**
10. **Run automated accessibility audit (Lighthouse)**

---

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE Browser Extension](https://wave.webaim.org/extension/)
