import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WorkoutSuccessModal from '../../components/features/WorkoutSuccessModal';

vi.mock('../../lib/shareImage', () => ({
  buildShareImageBlob: vi.fn(() => Promise.resolve(new Blob(['fake'], { type: 'image/png' }))),
}));

import { buildShareImageBlob } from '../../lib/shareImage';

const baseProps = (overrides: Record<string, unknown> = {}) => ({
  liftName: 'Squat',
  isAccessoryOnly: false,
  estimated1RM: 315,
  totalTonnage: 8400,
  completedAccessories: [],
  unitPreference: 'lb',
  onClose: vi.fn(),
  ...overrides,
});

describe('WorkoutSuccessModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the estimated max as the hero stat on a main-lift day', async () => {
    render(<WorkoutSuccessModal {...baseProps()} />);
    expect(screen.getByText('Squat')).toBeInTheDocument();
    expect(screen.getByText('Estimated Max')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('315')).toBeInTheDocument());
    expect(screen.getByText('8,400')).toBeInTheDocument();
  });

  it('shows tonnage as the hero stat and hides the main-lift framing on an accessory-only day', async () => {
    render(
      <WorkoutSuccessModal
        {...baseProps({
          isAccessoryOnly: true,
          estimated1RM: 0,
          totalTonnage: 5200,
          onSetAsMax: vi.fn(),
          newTrainingMax: 200,
        })}
      />
    );
    expect(screen.queryByText('Estimated Max')).not.toBeInTheDocument();
    expect(screen.getByText('Tonnage')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('5,200')).toBeInTheDocument());
    // No duplicate secondary tonnage line, and no "set as max" button on an accessory-only day
    expect(screen.queryByText(/as new training max/)).not.toBeInTheDocument();
  });

  it('lists completed accessories with their set counts', () => {
    render(
      <WorkoutSuccessModal
        {...baseProps({
          completedAccessories: [
            { name: 'Pause Squats', setsCompleted: 3 },
            { name: 'Leg Curls', setsCompleted: 1 },
          ],
        })}
      />
    );
    expect(screen.getByText('Pause Squats')).toBeInTheDocument();
    expect(screen.getByText('3 sets')).toBeInTheDocument();
    expect(screen.getByText('Leg Curls')).toBeInTheDocument();
    expect(screen.getByText('1 set')).toBeInTheDocument();
  });

  it('omits the accessories section entirely when none were completed', () => {
    render(<WorkoutSuccessModal {...baseProps({ completedAccessories: [] })} />);
    expect(screen.queryByText('Accessories')).not.toBeInTheDocument();
  });

  it('shows the "set as new training max" button only when a main-lift day provides one', () => {
    render(
      <WorkoutSuccessModal
        {...baseProps({ onSetAsMax: vi.fn(), newTrainingMax: 320 })}
      />
    );
    expect(screen.getByRole('button', { name: /320 lb as new training max/ })).toBeInTheDocument();
  });

  it('calls onClose from both the close button and the primary CTA', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<WorkoutSuccessModal {...baseProps({ onClose })} />);

    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'View Progress' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('shares a generated image via the native share sheet when available', async () => {
    const user = userEvent.setup();
    const shareMock = vi.fn((_data: ShareData) => Promise.resolve());
    Object.assign(navigator, { share: shareMock, canShare: () => true });

    render(<WorkoutSuccessModal {...baseProps()} />);
    await user.click(screen.getByRole('button', { name: /share/i }));

    await waitFor(() => expect(shareMock).toHaveBeenCalled());
    expect(buildShareImageBlob).toHaveBeenCalledWith(
      expect.objectContaining({ liftName: 'Squat', heroLabel: 'Estimated Max', heroValue: 315 })
    );
    const [shareArg] = shareMock.mock.calls[0];
    expect(shareArg.files).toHaveLength(1);

    // @ts-expect-error test-only cleanup of a property we added to navigator
    delete navigator.share;
    // @ts-expect-error test-only cleanup of a property we added to navigator
    delete navigator.canShare;
  });

  it('falls back to downloading the image when the native share sheet is unavailable', async () => {
    const user = userEvent.setup();
    // jsdom has no navigator.share by default — this exercises that path directly.
    const clickSpy = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag === 'a') el.click = clickSpy;
      return el;
    });
    const createObjectURL = vi.fn(() => 'blob:fake-url');
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });

    render(<WorkoutSuccessModal {...baseProps()} />);
    await user.click(screen.getByRole('button', { name: /share/i }));

    await waitFor(() => expect(clickSpy).toHaveBeenCalled());
    expect(createObjectURL).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalled();

    vi.restoreAllMocks();
  });

  it('shows an error message when image generation fails', async () => {
    const user = userEvent.setup();
    vi.mocked(buildShareImageBlob).mockResolvedValueOnce(null);

    render(<WorkoutSuccessModal {...baseProps()} />);
    await user.click(screen.getByRole('button', { name: /share/i }));

    await waitFor(() => expect(screen.getByText(/Couldn't share/)).toBeInTheDocument());
  });
});
