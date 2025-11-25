import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AccessibleModal from './AccessibleModal';

describe('AccessibleModal', () => {
  it('should render when isOpen is true', () => {
    render(
      <AccessibleModal
        isOpen={true}
        onClose={() => {}}
        title="Test Modal"
        description="Test description"
      >
        <p>Modal content</p>
      </AccessibleModal>
    );

    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('should not render when isOpen is false', () => {
    render(
      <AccessibleModal
        isOpen={false}
        onClose={() => {}}
        title="Test Modal"
        description="Test description"
      >
        <p>Modal content</p>
      </AccessibleModal>
    );

    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
  });

  it('should have proper ARIA attributes', () => {
    render(
      <AccessibleModal
        isOpen={true}
        onClose={() => {}}
        title="Test Modal"
        description="Test description"
      >
        <p>Modal content</p>
      </AccessibleModal>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby');
    expect(dialog).toHaveAttribute('aria-describedby');
  });

  it('should call onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <AccessibleModal
        isOpen={true}
        onClose={onClose}
        title="Test Modal"
        description="Test description"
      >
        <p>Modal content</p>
      </AccessibleModal>
    );

    const closeButton = screen.getByLabelText('Close dialog');
    await user.click(closeButton);

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('should call onClose when ESC key is pressed', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <AccessibleModal
        isOpen={true}
        onClose={onClose}
        title="Test Modal"
        description="Test description"
      >
        <p>Modal content</p>
      </AccessibleModal>
    );

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('should render with different sizes', () => {
    const { rerender } = render(
      <AccessibleModal
        isOpen={true}
        onClose={() => {}}
        title="Test Modal"
        description="Test description"
        size="sm"
      >
        <p>Content</p>
      </AccessibleModal>
    );

    expect(screen.getByText('Test Modal')).toBeInTheDocument();

    rerender(
      <AccessibleModal
        isOpen={true}
        onClose={() => {}}
        title="Test Modal"
        description="Test description"
        size="lg"
      >
        <p>Content</p>
      </AccessibleModal>
    );

    expect(screen.getByText('Test Modal')).toBeInTheDocument();
  });

  it('should prevent body scroll when open', () => {
    render(
      <AccessibleModal
        isOpen={true}
        onClose={() => {}}
        title="Test Modal"
        description="Test description"
      >
        <p>Content</p>
      </AccessibleModal>
    );

    expect(document.body.style.overflow).toBe('hidden');
  });
});
