# Accessibility Quick Reference Card

## 🚀 Quick Wins (Do These First)

1. ✅ **Add alt text to images**: `<img alt="Description" />`
2. ✅ **Label all form inputs**: `<label htmlFor="id">Label</label>`
3. ✅ **Use semantic HTML**: `<main>`, `<nav>`, `<header>`, `<button>`
4. ✅ **Add skip links**: Already implemented in App.tsx
5. ✅ **Check color contrast**: Use browser DevTools
6. ✅ **Test with keyboard**: Tab through your entire app
7. ✅ **Add ARIA labels to icon buttons**: `aria-label="Close"`
8. ✅ **Use focus indicators**: Already in accessibility.css
9. ✅ **Respect reduced motion**: Already in accessibility.css
10. ✅ **Run Lighthouse audit**: `npx lighthouse http://localhost:4173`

---

## 🎯 Component Replacements At-a-Glance

| Pattern | Replace With | Import |
|---------|--------------|--------|
| Decorative SVG | `<AccessibleProgressRing />` | `./components/AccessibleProgressRing` |
| `<select>` | `<AccessibleSelect />` | `./components/AccessibleSelect` |
| `alert()` | `<AccessibleAlert />` | `./components/AccessibleAlert` |
| Modal | `<AccessibleModal />` | `./components/AccessibleModal` |
| Bypass navigation | `<SkipLink />` | `./components/SkipLink` |

---

## ⌨️ Keyboard Navigation Patterns

| Key | Action |
|-----|--------|
| `Tab` | Navigate forward |
| `Shift + Tab` | Navigate backward |
| `Enter` | Activate buttons/links |
| `Space` | Activate buttons/checkboxes |
| `Esc` | Close modals/menus |
| `↑` `↓` | Navigate in dropdowns |
| `Home` | First item |
| `End` | Last item |

---

## 📋 ARIA Quick Reference

### Common ARIA Attributes

```tsx
// Labels
aria-label="Close dialog"           // When no visible label
aria-labelledby="heading-id"        // References visible label
aria-describedby="description-id"   // Additional description

// States
aria-expanded={isOpen}              // Expandable elements
aria-selected={isSelected}          // Selected items
aria-checked={isChecked}            // Checkboxes
aria-disabled={isDisabled}          // Disabled elements
aria-current="page"                 // Current page in nav
aria-hidden="true"                  // Hide from screen readers

// Roles
role="dialog"                       // Modal dialogs
role="alert"                        // Error messages (assertive)
role="status"                       // Status updates (polite)
role="navigation"                   // Navigation landmark
role="main"                         // Main content area

// Live Regions
aria-live="polite"                  // Announce when convenient
aria-live="assertive"               // Announce immediately
aria-atomic="true"                  // Announce entire region
```

---

## 🎨 Color Contrast Requirements

| Content | Ratio | Example |
|---------|-------|---------|
| Normal text (< 18pt) | 4.5:1 | #6b7280 on white ✅ |
| Large text (≥ 18pt) | 3:1 | #9ca3af on white ✅ |
| UI components | 3:1 | #d1d5db border on white ✅ |
| Hover/focus states | 3:1 | Visual indicator required |

### Test Contrast
```bash
# Use WebAIM Contrast Checker
https://webaim.org/resources/contrastchecker/

# Or browser DevTools
Chrome DevTools > Inspect > Contrast ratio
```

---

## 📱 Touch Target Sizes

| Element | Minimum Size |
|---------|--------------|
| Buttons | 44x44 px |
| Links | 44x44 px |
| Form inputs | 44px height |
| Checkboxes/radios | 44x44 px |

```css
/* Already implemented in accessibility.css */
button, a {
  min-height: 44px;
  min-width: 44px;
}
```

---

## 🧪 Testing Commands

```bash
# Build the app
npm run build

# Run Lighthouse
npx lighthouse http://localhost:4173 --view

# Run axe-core (install first)
npm install --save-dev @axe-core/cli
axe http://localhost:5173

# Test with screen reader
# macOS: Cmd + F5 (VoiceOver)
# Windows: NVDA (free) or JAWS
# Mobile: iOS VoiceOver / Android TalkBack
```

---

## 🔍 Quick Audit Checklist

### Before Deployment
- [ ] Tab through entire app - no keyboard traps
- [ ] All images have alt text
- [ ] All form inputs have labels
- [ ] Color contrast meets 4.5:1 (text) / 3:1 (UI)
- [ ] Error messages are clear and helpful
- [ ] Modals trap focus and close with ESC
- [ ] Skip links are present and work
- [ ] Touch targets are minimum 44x44px
- [ ] Focus indicators are visible
- [ ] Run Lighthouse accessibility audit (score 90+)

---

## 🐛 Common Mistakes to Avoid

❌ **DON'T**
```tsx
// Icon button without label
<button onClick={handleClose}>
  <X />
</button>

// Div acting as button
<div onClick={handleClick}>Click me</div>

// Color-only indicators
<span className="text-red-600">Error</span>

// Unlabeled input
<input type="email" placeholder="Email" />

// alert() for notifications
alert('Saved successfully');
```

✅ **DO**
```tsx
// Icon button with label
<button onClick={handleClose} aria-label="Close dialog">
  <X aria-hidden="true" />
</button>

// Proper button element
<button onClick={handleClick}>Click me</button>

// Multiple indicators
<span className="text-red-600">
  <XCircle className="inline" /> Error
</span>

// Labeled input
<label htmlFor="email">Email</label>
<input id="email" type="email" />

// Accessible alert component
<AccessibleAlert type="success">
  Saved successfully
</AccessibleAlert>
```

---

## 📚 Code Snippets

### Screen Reader Only Text
```tsx
<span className="sr-only">For screen readers only</span>
```

### Skip Link
```tsx
<SkipLink targetId="main-content">
  Skip to main content
</SkipLink>
```

### Accessible Loading State
```tsx
<button disabled={loading} aria-busy={loading}>
  {loading ? 'Loading...' : 'Submit'}
</button>
```

### Proper Form Field
```tsx
<div>
  <label htmlFor="email" className="block mb-2">
    Email
    <span aria-label="required" className="text-red-600">*</span>
  </label>
  <input
    id="email"
    type="email"
    required
    aria-describedby="email-hint"
    aria-invalid={!!error}
  />
  <span id="email-hint" className="text-sm text-gray-500">
    We'll never share your email
  </span>
  {error && (
    <span role="alert" className="text-sm text-red-600">
      {error}
    </span>
  )}
</div>
```

### Accessible Modal Trigger
```tsx
const [isOpen, setIsOpen] = useState(false);

<button onClick={() => setIsOpen(true)}>
  Open Settings
</button>

<AccessibleModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Settings"
>
  {/* Modal content */}
</AccessibleModal>
```

---

## 🎓 Learn More

- **WCAG Guidelines**: https://www.w3.org/WAI/WCAG21/quickref/
- **ARIA Patterns**: https://www.w3.org/WAI/ARIA/apg/
- **MDN Accessibility**: https://developer.mozilla.org/en-US/docs/Web/Accessibility
- **WebAIM**: https://webaim.org/
- **A11y Project**: https://www.a11yproject.com/

---

## 💡 Pro Tips

1. **Think keyboard first** - If it works with keyboard, it works for everyone
2. **Use semantic HTML** - It's free accessibility
3. **Test early and often** - Don't wait until the end
4. **Involve real users** - People with disabilities are the experts
5. **Automate what you can** - But manual testing is essential
6. **Document decisions** - Help future developers understand why
7. **Make it a habit** - Accessibility should be default, not an afterthought

---

## 🆘 Need Help?

1. Check `ACCESSIBILITY_IMPLEMENTATION_GUIDE.md` for detailed examples
2. View `AccessibilityDemoPage.tsx` for working examples
3. Read `ACCESSIBILITY_SUMMARY.md` for complete overview
4. Test components in your browser's DevTools
5. Run automated audits with Lighthouse

**Remember:** Accessibility benefits everyone, not just people with disabilities!
