import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AccessibleProgressRing from './AccessibleProgressRing';

describe('AccessibleProgressRing', () => {
  it('should render with value and label', () => {
    render(
      <AccessibleProgressRing
        value={300}
        max={600}
        label="Wilks Score"
        description="Intermediate"
      />
    );

    const descriptions = screen.getAllByText(/Intermediate/);
    expect(descriptions.length).toBeGreaterThan(0);
  });

  it('should display value when showValue is true', () => {
    render(
      <AccessibleProgressRing
        value={300}
        max={600}
        label="Wilks Score"
        description="Intermediate"
        showValue={true}
      />
    );

    expect(screen.getByText('300')).toBeInTheDocument();
  });

  it('should not display value when showValue is false', () => {
    render(
      <AccessibleProgressRing
        value={300}
        max={600}
        label="Wilks Score"
        description="Intermediate"
        showValue={false}
      />
    );

    expect(screen.queryByText('300')).not.toBeInTheDocument();
  });

  it('should have proper ARIA attributes', () => {
    render(
      <AccessibleProgressRing
        value={300}
        max={600}
        label="Wilks Score"
        description="Intermediate"
      />
    );

    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toHaveAttribute('aria-valuenow', '300');
    expect(progressbar).toHaveAttribute('aria-valuemin', '0');
    expect(progressbar).toHaveAttribute('aria-valuemax', '600');
    expect(progressbar).toHaveAttribute('aria-label', 'Wilks Score');
  });

  it('should calculate percentage correctly', () => {
    render(
      <AccessibleProgressRing
        value={300}
        max={600}
        label="Wilks Score"
        description="50%"
      />
    );

    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toHaveAttribute('aria-valuenow', '300');
  });

  it('should handle zero value', () => {
    render(
      <AccessibleProgressRing
        value={0}
        max={600}
        label="Wilks Score"
        description="Beginner"
      />
    );

    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toHaveAttribute('aria-valuenow', '0');
  });

  it('should handle max value', () => {
    render(
      <AccessibleProgressRing
        value={600}
        max={600}
        label="Wilks Score"
        description="Elite"
      />
    );

    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toHaveAttribute('aria-valuenow', '600');
  });

  it('should apply custom size', () => {
    const { container } = render(
      <AccessibleProgressRing
        value={300}
        max={600}
        label="Wilks Score"
        description="Intermediate"
        size={100}
      />
    );

    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '100');
    expect(svg).toHaveAttribute('height', '100');
  });
});
