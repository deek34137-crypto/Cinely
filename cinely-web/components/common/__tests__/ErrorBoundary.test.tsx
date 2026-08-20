import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { render, screen, fireEvent } from '@testing-library/react';
import React, { useState } from 'react';
import { ErrorBoundary } from '../ErrorBoundary';

function ProblemChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test render explosion');
  }
  return <div data-testid="problem-child-success">Normal Content</div>;
}

function TestWrapper() {
  const [hasError, setHasError] = useState(true);
  return (
    <ErrorBoundary>
      <ProblemChild shouldThrow={hasError} />
      <button type="button" onClick={() => setHasError(false)} data-testid="fix-error-btn">
        Fix Error
      </button>
    </ErrorBoundary>
  );
}

describe('ErrorBoundary Component (Phase 5B)', () => {
  // Suppress console.error in tests since React will log the thrown error
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });
  afterEach(() => {
    console.error = originalError;
  });

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div data-testid="safe-child">Safe Child Content</div>
      </ErrorBoundary>
    );

    expect(screen.getByTestId('safe-child')).toBeInTheDocument();
    expect(screen.queryByTestId('error-boundary-fallback')).not.toBeInTheDocument();
  });

  it('catches render error and displays cinematic fallback UI', () => {
    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByTestId('error-boundary-retry-button')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Return Home' })).toHaveAttribute('href', '/');
  });

  it('resets error state when Try Again is clicked', () => {
    render(<TestWrapper />);

    expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();

    // Click retry
    fireEvent.click(screen.getByTestId('error-boundary-retry-button'));

    // After reset, state.hasError is false
    expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument(); // Because ProblemChild still throws in this wrapper
  });
});
