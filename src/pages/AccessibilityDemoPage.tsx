import { useState } from 'react';
import AccessibleProgressRing from '../components/accessible/AccessibleProgressRing';
import AccessibleSelect from '../components/accessible/AccessibleSelect';
import AccessibleAlert from '../components/accessible/AccessibleAlert';
import AccessibleModal from '../components/accessible/AccessibleModal';

export default function AccessibilityDemoPage() {
  const [selectedOption, setSelectedOption] = useState('option1');
  const [showSuccessAlert, setShowSuccessAlert] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const options = [
    { value: 'option1', label: 'Beginner', description: 'Just starting your fitness journey' },
    { value: 'option2', label: 'Intermediate', description: '6-12 months of consistent training' },
    { value: 'option3', label: 'Advanced', description: '1+ years of structured programming' },
    { value: 'option4', label: 'Elite', description: 'Competitive level strength' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white">
        <div className="max-w-md mx-auto px-4 pt-8 pb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-1">Accessibility Demo</h1>
          <p className="text-gray-600">Examples of accessible components</p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        <section aria-labelledby="progress-heading">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 id="progress-heading" className="text-xl font-bold text-gray-900 mb-4">
              Accessible Progress Ring
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              This progress indicator is fully accessible to screen readers and respects motion preferences.
            </p>
            <div className="flex justify-center">
              <AccessibleProgressRing
                value={350}
                max={600}
                label="Wilks Score"
                description="Intermediate level"
                size={192}
              />
            </div>
          </div>
        </section>

        <section aria-labelledby="select-heading">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 id="select-heading" className="text-xl font-bold text-gray-900 mb-4">
              Accessible Select Dropdown
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Fully keyboard navigable with arrow keys, type-ahead search, and progressive enhancement.
            </p>
            <AccessibleSelect
              id="experience-level"
              label="Experience Level"
              value={selectedOption}
              options={options}
              onChange={setSelectedOption}
              description="Select your current training experience level"
              required
            />
            <p className="text-sm text-gray-500 dark:text-gray-300 mt-4">
              Selected: <strong>{options.find(o => o.value === selectedOption)?.label}</strong>
            </p>
          </div>
        </section>

        <section aria-labelledby="alerts-heading">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 id="alerts-heading" className="text-xl font-bold text-gray-900 mb-4">
              Accessible Alerts
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Alerts that announce to screen readers and provide multiple visual indicators beyond color.
            </p>

            <div className="space-y-4">
              {showSuccessAlert && (
                <AccessibleAlert
                  type="success"
                  title="Success"
                  dismissible
                  onDismiss={() => setShowSuccessAlert(false)}
                >
                  Your workout has been saved successfully!
                </AccessibleAlert>
              )}

              <AccessibleAlert type="info">
                <strong>Tip:</strong> Complete all four workouts this week to progress to the next cycle.
              </AccessibleAlert>

              <AccessibleAlert type="warning" title="Important">
                Make sure to warm up properly before attempting your working sets.
              </AccessibleAlert>

              <AccessibleAlert type="error" title="Error">
                Unable to save your workout. Please check your internet connection and try again.
              </AccessibleAlert>

              {!showSuccessAlert && (
                <button
                  onClick={() => setShowSuccessAlert(true)}
                  className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Show Success Alert Again
                </button>
              )}
            </div>
          </div>
        </section>

        <section aria-labelledby="modal-heading">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 id="modal-heading" className="text-xl font-bold text-gray-900 mb-4">
              Accessible Modal
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Modal with focus trap, keyboard navigation, and proper ARIA attributes.
            </p>

            <button
              onClick={() => setShowModal(true)}
              className="w-full py-3 px-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
            >
              Open Modal
            </button>

            <AccessibleModal
              isOpen={showModal}
              onClose={() => setShowModal(false)}
              title="Confirm Action"
              description="This is a demonstration modal"
              size="md"
            >
              <p className="text-gray-700 mb-4">
                This modal demonstrates proper accessibility features:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
                <li>Focus is trapped within the modal</li>
                <li>ESC key closes the modal</li>
                <li>Focus returns to trigger button on close</li>
                <li>Proper ARIA attributes for screen readers</li>
                <li>Body scroll is prevented when open</li>
              </ul>

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    alert('Action confirmed!');
                    setShowModal(false);
                  }}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </AccessibleModal>
          </div>
        </section>

        <section aria-labelledby="keyboard-heading">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 id="keyboard-heading" className="text-xl font-bold text-gray-900 mb-4">
              Keyboard Navigation Tips
            </h2>
            <div className="space-y-3 text-sm text-gray-700">
              <div className="flex gap-3">
                <kbd className="px-2 py-1 bg-gray-200 rounded font-mono text-xs">Tab</kbd>
                <span>Navigate forward through interactive elements</span>
              </div>
              <div className="flex gap-3">
                <kbd className="px-2 py-1 bg-gray-200 rounded font-mono text-xs">Shift + Tab</kbd>
                <span>Navigate backward through interactive elements</span>
              </div>
              <div className="flex gap-3">
                <kbd className="px-2 py-1 bg-gray-200 rounded font-mono text-xs">Enter</kbd>
                <span>Activate buttons and links</span>
              </div>
              <div className="flex gap-3">
                <kbd className="px-2 py-1 bg-gray-200 rounded font-mono text-xs">Space</kbd>
                <span>Activate buttons and checkboxes</span>
              </div>
              <div className="flex gap-3">
                <kbd className="px-2 py-1 bg-gray-200 rounded font-mono text-xs">Esc</kbd>
                <span>Close modals and dropdowns</span>
              </div>
              <div className="flex gap-3">
                <kbd className="px-2 py-1 bg-gray-200 rounded font-mono text-xs">↑ ↓</kbd>
                <span>Navigate within dropdowns and menus</span>
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="testing-heading">
          <div className="bg-blue-50 border-l-4 border-blue-600 rounded-xl p-4">
            <h2 id="testing-heading" className="font-semibold text-gray-900 mb-2">
              Testing Recommendations
            </h2>
            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
              <li>Try navigating this page using only your keyboard</li>
              <li>Test with a screen reader (NVDA, JAWS, or VoiceOver)</li>
              <li>Check color contrast with browser DevTools</li>
              <li>Zoom to 200% and verify layout doesn't break</li>
              <li>Enable high contrast mode in your OS settings</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
