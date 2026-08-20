import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React, { useState } from 'react';

function CounterComponent() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <p data-testid="count-value">Current count: {count}</p>
      <button onClick={() => setCount((c) => c + 1)}>Increment</button>
    </div>
  );
}

describe('Frontend Foundation Smoke Test', () => {
  it('renders a React component in jsdom and validates testing library integration', () => {
    render(<CounterComponent />);
    
    const countElement = screen.getByTestId('count-value');
    expect(countElement).toBeInTheDocument();
    expect(countElement).toHaveTextContent('Current count: 0');
    
    const button = screen.getByRole('button', { name: /increment/i });
    fireEvent.click(button);
    
    expect(countElement).toHaveTextContent('Current count: 1');
  });
});
