/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  future: {
    hoverOnlyWhenSupported: true,
  },
  theme: {
    extend: {
      // Named type scale matching the Figma design system 1:1 — one class
      // sets size + line-height + weight together instead of pairing raw
      // text-* and font-* utilities by hand at every call site.
      fontSize: {
        // Headings — real <h1>-<h4> semantics
        h1: ['2.25rem', { lineHeight: '2.5rem', fontWeight: '900' }],
        h2: ['1.5rem', { lineHeight: '1.8125rem', fontWeight: '700' }],
        h3: ['1.25rem', { lineHeight: '1.5625rem', fontWeight: '700' }],
        h4: ['1.125rem', { lineHeight: '1.625rem', fontWeight: '600' }],

        // Body — Large (18px)
        'body-lg': ['1.125rem', { lineHeight: '1.6875rem', fontWeight: '400' }],
        'body-lg-semibold': ['1.125rem', { lineHeight: '1.6875rem', fontWeight: '600' }],
        'body-lg-bold': ['1.125rem', { lineHeight: '1.6875rem', fontWeight: '700' }],

        // Body — Medium (16px)
        'body-md': ['1rem', { lineHeight: '1.5rem', fontWeight: '400' }],
        'body-md-semibold': ['1rem', { lineHeight: '1.5rem', fontWeight: '600' }],
        'body-md-bold': ['1rem', { lineHeight: '1.5rem', fontWeight: '700' }],

        // Body — Small (14px)
        'body-sm': ['0.875rem', { lineHeight: '1.3125rem', fontWeight: '400' }],
        'body-sm-semibold': ['0.875rem', { lineHeight: '1.3125rem', fontWeight: '600' }],
        'body-sm-bold': ['0.875rem', { lineHeight: '1.3125rem', fontWeight: '700' }],

        // Body — Extra Small (12px)
        'body-xs': ['0.75rem', { lineHeight: '1.25rem', fontWeight: '400' }],
        'body-xs-semibold': ['0.75rem', { lineHeight: '1.25rem', fontWeight: '600' }],
        'body-xs-bold': ['0.75rem', { lineHeight: '1.25rem', fontWeight: '700' }],

        // Display — decorative numerals/wordmark, used sparingly
        'display-sm': ['1.125rem', { lineHeight: '1.375rem', fontWeight: '900' }],
        'display-md': ['1.625rem', { lineHeight: '1.875rem', fontWeight: '900' }],
        'display-lg': ['2.25rem', { lineHeight: '2.5rem', fontWeight: '900' }],
        'display-hero': ['3.75rem', { lineHeight: '4rem', fontWeight: '900' }],
        'display-wordmark': ['3.5rem', { lineHeight: '3.625rem', fontWeight: '900' }],

        // UI labels
        'eyebrow': ['0.75rem', { lineHeight: '1.25rem', fontWeight: '600'}],
        'nav-label': ['0.75rem', { lineHeight: '1.25rem', fontWeight: '600' }],
        'button-label': ['1rem', { lineHeight: '1.5rem', fontWeight: '700' }],
        'chart-label': ['0.75rem', { lineHeight: '1.25rem', fontWeight: '400' }],
      },
    },
  },
  plugins: [],
};
