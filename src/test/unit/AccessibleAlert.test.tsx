import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AccessibleAlert from '../../components/accessible/AccessibleAlert';

describe('AccessibleAlert', () => {
  it('should render with title and children', () => {
    render(
      <AccessibleAlert type="info" title="Information">
        This is an informational message.
      </AccessibleAlert>
    );

    expect(screen.getByText('Information')).toBeInTheDocument();
    expect(screen.getByText('This is an informational message.')).toBeInTheDocument();
  });

  it('should have correct role for alert type', () => {
    render(
      <AccessibleAlert type="error" title="Error">
        Error message
      </AccessibleAlert>
    );

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
  });

  it('should have correct role for success type', () => {
    render(
      <AccessibleAlert type="success" title="Success">
        Success message
      </AccessibleAlert>
    );

    const status = screen.getByRole('status');
    expect(status).toBeInTheDocument();
  });

  it('should render dismiss button when dismissible', () => {
    render(
      <AccessibleAlert type="info" title="Info" dismissible>
        Info message
      </AccessibleAlert>
    );

    expect(screen.getByLabelText('Dismiss alert')).toBeInTheDocument();
  });

  it('should not render dismiss button when not dismissible', () => {
    render(
      <AccessibleAlert type="info" title="Info" dismissible={false}>
        Info message
      </AccessibleAlert>
    );

    expect(screen.queryByLabelText('Dismiss alert')).not.toBeInTheDocument();
  });

  it('should call onDismiss when dismiss button is clicked', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();

    render(
      <AccessibleAlert type="info" title="Info" dismissible onDismiss={onDismiss}>
        Info message
      </AccessibleAlert>
    );

    const dismissButton = screen.getByLabelText('Dismiss alert');
    await user.click(dismissButton);

    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('should render with different types', () => {
    const { rerender } = render(
      <AccessibleAlert type="success" title="Success">
        Success message
      </AccessibleAlert>
    );

    expect(screen.getByText('Success')).toBeInTheDocument();

    rerender(
      <AccessibleAlert type="error" title="Error">
        Error message
      </AccessibleAlert>
    );

    expect(screen.getByText('Error')).toBeInTheDocument();

    rerender(
      <AccessibleAlert type="warning" title="Warning">
        Warning message
      </AccessibleAlert>
    );

    expect(screen.getByText('Warning')).toBeInTheDocument();

    rerender(
      <AccessibleAlert type="info" title="Info">
        Info message
      </AccessibleAlert>
    );

    expect(screen.getByText('Info')).toBeInTheDocument();
  });

  it('should render icon when provided', () => {
    const TestIcon = () => <span data-testid="test-icon">Icon</span>;

    render(
      <AccessibleAlert type="info" title="Info" icon={<TestIcon />}>
        Info message
      </AccessibleAlert>
    );

    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });
});
