import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Navbar } from '../Navbar';

const mockLogout = vi.fn();
let mockAuthState = {
  user: null as any,
  isAuthenticated: false,
  isLoading: false,
  logout: mockLogout,
};

vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => mockAuthState,
}));

vi.mock('../../../hooks/useScrollAware', () => ({
  useScrollAware: () => false,
}));

describe('Navbar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders branding and Sign In button when unauthenticated', () => {
    mockAuthState = {
      user: null,
      isAuthenticated: false,
      isLoading: false,
      logout: mockLogout,
    };

    render(<Navbar />);

    expect(screen.getByLabelText('Cinely Home')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign In' })).toBeInTheDocument();
  });

  it('renders user initials badge when authenticated', () => {
    mockAuthState = {
      user: {
        id: 'cinely:user:123',
        email: 'neo@matrix.io',
        displayName: 'Thomas Anderson',
        role: 'user',
        createdAt: '2026-01-01',
      },
      isAuthenticated: true,
      isLoading: false,
      logout: mockLogout,
    };

    render(<Navbar />);

    expect(screen.getByLabelText('User Profile Menu')).toBeInTheDocument();
    expect(screen.getByText('TA')).toBeInTheDocument();
  });

  it('opens dropdown menu on click and triggers logout', async () => {
    mockAuthState = {
      user: {
        id: 'cinely:user:123',
        email: 'neo@matrix.io',
        displayName: 'Thomas Anderson',
        role: 'user',
        createdAt: '2026-01-01',
      },
      isAuthenticated: true,
      isLoading: false,
      logout: mockLogout,
    };

    const user = userEvent.setup();
    render(<Navbar />);

    const profileButton = screen.getByLabelText('User Profile Menu');
    await user.click(profileButton);

    expect(screen.getByText('Thomas Anderson')).toBeInTheDocument();
    expect(screen.getByText('neo@matrix.io')).toBeInTheDocument();

    const logoutBtn = screen.getByRole('menuitem', { name: 'Sign Out' });
    await user.click(logoutBtn);

    expect(mockLogout).toHaveBeenCalled();
  });
});
