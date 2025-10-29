# Micro-Interactions & Animations Guide

## Overview
This guide documents all the delightful micro-interactions and animations added to the 5-3-1 Workout Tracker to create moments of delight and enhance user experience.

---

## ✨ Implemented Animations

### 1. **Counting Number Animation**
**Location:** HomePage - Wilks Score

The Wilks score animates from 0 to the actual value over 1.5 seconds when the page loads, creating a satisfying reveal.

```tsx
import { useCountUp } from '../hooks/useAnimations';

const animatedWilks = useCountUp(wilksScore, 1500, 0);
<div className="animate-count-up">{animatedWilks}</div>
```

**Why it delights:** Numbers that count up feel more impactful and draw attention to achievements.

---

### 2. **Confetti Celebration** 🎉
**Location:** WorkoutDetailPage - On workout completion

When a user completes a workout, colorful confetti falls from the top of the screen celebrating their achievement.

```tsx
import { useConfetti } from '../hooks/useAnimations';

const celebrate = useConfetti();
celebrate(40); // Spawns 40 pieces of confetti
```

**Why it delights:** Celebrates accomplishments and provides positive reinforcement for completing difficult tasks.

---

### 3. **Ripple Effect on Tap** 💧
**Location:** HomePage - Workout cards

When tapping/clicking workout cards, a material design ripple effect emanates from the touch point.

```tsx
import { useRipple } from '../hooks/useAnimations';

const createRipple = useRipple();
<button onClick={(e) => createRipple(e)}>...</button>
```

**Why it delights:** Provides immediate tactile feedback that the interaction was registered.

---

### 4. **Staggered Entrance Animations**
**Location:** HomePage - All cards and elements

Elements fade in and slide up with slight delays, creating a choreographed entrance.

```css
.animate-slide-in-left      /* Slides from left */
.animate-scale-in           /* Scales from 90% to 100% */
.animate-slide-up           /* Slides from bottom */
.stagger-1, .stagger-2, .stagger-3  /* Delays: 0.1s, 0.2s, 0.3s */
```

**Why it delights:** Makes the page feel alive and polished, guiding the eye through content.

---

### 5. **Hover Lift Effect**
**Location:** All cards throughout the app

Cards subtly lift up and cast a larger shadow on hover, providing depth.

```css
.hover-lift {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.hover-lift:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
}
```

**Why it delights:** Creates a sense of depth and makes the UI feel more tangible.

---

### 6. **Active Press Effect**
**Location:** All buttons and interactive elements

Buttons scale down slightly when pressed, mimicking physical button behavior.

```css
.active-press:active {
  transform: scale(0.95);
}
```

**Why it delights:** Provides satisfying physical feedback for interactions.

---

### 7. **Smooth Transitions**
**Location:** All interactive elements

Everything transitions smoothly using easing functions for natural motion.

```css
.transition-smooth {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
```

**Why it delights:** Smooth animations feel more natural and less jarring.

---

## 🎨 Available Animation Classes

### Entry Animations
```css
.animate-fade-in          /* Fade from 0 to 100% opacity */
.animate-slide-up         /* Slide up while fading in */
.animate-slide-in-left    /* Slide from left */
.animate-slide-in-right   /* Slide from right */
.animate-scale-in         /* Scale from 90% */
.animate-bounce-in        /* Bounce in with overshoot */
```

### Attention Seekers
```css
.animate-shake            /* Shake left/right (for errors) */
.animate-wiggle           /* Rotate left/right */
.animate-pulse-glow       /* Pulsing glow effect */
.animate-attention        /* Scale and rotate combo */
```

### Success Indicators
```css
.animate-check-draw       /* Animated checkmark drawing */
.animate-success-pulse    /* Quick pulse scale */
.animate-checkmark-circle /* Circular checkmark animation */
```

### Loading States
```css
.animate-shimmer          /* Shimmer loading effect */
.skeleton                 /* Skeleton screen loader */
.animate-typing-dot       /* Typing indicator dots */
```

### Interaction Effects
```css
.hover-lift               /* Lift on hover */
.hover-scale              /* Scale up on hover */
.hover-glow               /* Glow on hover */
.active-press             /* Compress on click */
.ripple-container         /* Container for ripple effect */
```

### Stagger Delays
```css
.stagger-1                /* 0.1s delay */
.stagger-2                /* 0.2s delay */
.stagger-3                /* 0.3s delay */
.stagger-4                /* 0.4s delay */
```

---

## 🪝 Custom Hooks

### `useCountUp(end, duration, start)`
Animates a number from start to end over duration milliseconds.

```tsx
const count = useCountUp(350, 1500, 0);
// Counts from 0 to 350 over 1.5 seconds
```

**Parameters:**
- `end`: Target number
- `duration`: Animation duration in ms (default: 1000)
- `start`: Starting number (default: 0)

**Use cases:** Stats, scores, progress indicators

---

### `useRipple()`
Creates a Material Design ripple effect on click/tap.

```tsx
const createRipple = useRipple();
<button onClick={(e) => createRipple(e)}>Click me</button>
```

**Returns:** Function that takes a React MouseEvent

**Use cases:** Buttons, cards, any clickable element

---

### `useConfetti()`
Spawns celebratory confetti animation.

```tsx
const celebrate = useConfetti();
celebrate(50); // Spawns 50 pieces
```

**Parameters:**
- `count`: Number of confetti pieces (default: 50)

**Use cases:** Achievements, completions, celebrations

---

### `useSuccessAnimation()`
Manages a temporary success animation state.

```tsx
const { showSuccess, triggerSuccess } = useSuccessAnimation();

// Trigger it
triggerSuccess();

// Use it
{showSuccess && <SuccessCheckmark />}
```

**Use cases:** Form submissions, save confirmations

---

### `useShake()`
Triggers a shake animation (useful for errors).

```tsx
const { isShaking, shake } = useShake();

// Trigger it
if (error) shake();

// Apply it
<input className={isShaking ? 'animate-shake' : ''} />
```

**Use cases:** Form validation errors, failed actions

---

### `useStaggeredAnimation(itemCount, delay)`
Shows items one by one with a delay between each.

```tsx
const visibleItems = useStaggeredAnimation(items.length, 100);

{items.map((item, index) => (
  index < visibleItems && <Item key={index} />
))}
```

**Use cases:** List animations, progressive disclosure

---

## 🎯 Best Practices

### 1. **Respect User Preferences**
All animations respect `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

Users with motion sensitivity won't see jarring animations.

---

### 2. **Performance Considerations**

✅ **DO:**
- Use `transform` and `opacity` for animations (GPU-accelerated)
- Keep animations under 500ms for UI feedback
- Use `will-change` sparingly for known animations

❌ **DON'T:**
- Animate `width`, `height`, `top`, `left` (triggers layout)
- Create hundreds of animated elements
- Use animations on every single interaction

---

### 3. **Animation Timing**

| Duration | Use Case |
|----------|----------|
| 100-200ms | Hover effects, button presses |
| 200-300ms | Transitions, state changes |
| 300-500ms | Entry/exit animations |
| 500-1000ms | Complex animations, celebrations |
| 1000-2000ms | Count-up animations, progress reveals |

---

### 4. **Easing Functions**

```css
/* Quick in, slow out - Most natural for UI */
cubic-bezier(0.4, 0, 0.2, 1)

/* Bounce - For playful effects */
cubic-bezier(0.68, -0.55, 0.265, 1.55)

/* Linear - For continuous animations */
linear

/* Ease out - For entrances */
ease-out

/* Ease in - For exits */
ease-in
```

---

## 🎬 Animation Recipes

### Recipe 1: Animated Card Grid
```tsx
<div className="grid grid-cols-2 gap-4">
  <div className="animate-scale-in stagger-1">Card 1</div>
  <div className="animate-scale-in stagger-2">Card 2</div>
  <div className="animate-scale-in stagger-3">Card 3</div>
  <div className="animate-scale-in stagger-4">Card 4</div>
</div>
```

---

### Recipe 2: Success Feedback
```tsx
const celebrate = useConfetti();

const handleSave = async () => {
  await saveData();
  celebrate(30);
  // Show success message
};
```

---

### Recipe 3: Error Shake
```tsx
const { isShaking, shake } = useShake();

const handleSubmit = async () => {
  try {
    await submit();
  } catch (error) {
    shake();
    setError(error.message);
  }
};

<input className={isShaking ? 'animate-shake' : ''} />
```

---

### Recipe 4: Interactive Button
```tsx
const createRipple = useRipple();

<button
  onClick={(e) => {
    createRipple(e);
    handleClick();
  }}
  className="ripple-container hover-lift active-press transition-smooth"
>
  Click Me!
</button>
```

---

### Recipe 5: Loading Skeleton
```tsx
{loading ? (
  <div className="space-y-4">
    <div className="skeleton h-8 w-3/4"></div>
    <div className="skeleton h-8 w-1/2"></div>
    <div className="skeleton h-32 w-full"></div>
  </div>
) : (
  <ActualContent />
)}
```

---

## 🐛 Debugging Animations

### Check if animations are working:
```javascript
// In browser console
window.getComputedStyle(element).animation
window.getComputedStyle(element).transition
```

### Common issues:

1. **Animation not visible:**
   - Check if element has `display: none` or `visibility: hidden`
   - Verify animation class is applied
   - Check for conflicting CSS

2. **Animation too fast/slow:**
   - Check `animation-duration` or `transition-duration`
   - Look for `prefers-reduced-motion` override

3. **Confetti not showing:**
   - Ensure `z-index` is high enough (9999)
   - Check if `pointer-events: none` is set
   - Verify confetti elements are appended to body

---

## 🚀 Future Enhancements

Potential additions for even more delight:

1. **Sound Effects** - Subtle audio feedback (with mute option)
2. **Haptic Feedback** - For mobile devices
3. **Particle Systems** - More complex celebrations
4. **Page Transitions** - Smooth navigations between pages
5. **Scroll Animations** - Reveal elements as user scrolls
6. **Drag & Drop** - With smooth physics
7. **Pull to Refresh** - Native-like mobile gesture
8. **Swipe Actions** - For workout cards
9. **Progress Animations** - For multi-step forms
10. **Loading States** - Skeleton screens for all content

---

## 📚 Resources

- [Framer Motion](https://www.framer.com/motion/) - Advanced React animations
- [Animate.css](https://animate.style/) - Ready-to-use CSS animations
- [LottieFiles](https://lottiefiles.com/) - Animated SVG assets
- [Animista](https://animista.net/) - CSS animation generator
- [Material Design Motion](https://material.io/design/motion) - Animation guidelines

---

## ✨ Remember

> "Animation is about creating illusion of life." - Brad Bird

Good animations should:
- **Enhance** the experience, not distract
- **Guide** the user's attention
- **Provide feedback** for interactions
- **Feel natural**, not robotic
- **Be purposeful**, not decorative

Every animation in this app serves a purpose: to delight, inform, or guide. Use them wisely! 🎨
