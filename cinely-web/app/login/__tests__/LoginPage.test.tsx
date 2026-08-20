import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '../page';
import { ApiError } from '../../../lib/api-client';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({ get: vi.fn().mockReturnValue(null) }),
}));

const mockLogin = vi.fn();
vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    login: mockLogin,
    user: null,
    isAuthenticated: false,
    isLoading: false,
  }),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form with email, password, and submit button', () => {
    render(<LoginPage />);

    expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
    expect(screen.getByText('Create an account')).toBeInTheDocument();
  });

  it('submits valid credentials and navigates to home', async () => {
    mockLogin.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();

    render(<LoginPage />);

    await user.type(screen.getByLabelText('Email Address'), 'neo@matrix.io');
    await user.type(screen.getByLabelText('Password'), 'Password123');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'neo@matrix.io',
        password: 'Password123',
      });
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('displays RFC 7807 problem details error when login fails', async () => {
    const error = new ApiError(401, 'Unauthorized', {
      type: 'https://api.cinely.io/errors/INVALID_CREDENTIALS',
      title: 'Invalid Credentials',
      status: 401,
      detail: 'Email or password is incorrect.',
      code: 'INVALID_CREDENTIALS',
      timestamp: '2026-01-01',
    });
    mockLogin.mockRejectedValueOnce(error);

    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText('Email Address'), 'neo@matrix.io');
    await user.type(screen.getByLabelText('Password'), 'WrongPassword');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Email or password is incorrect.');
    });
  });
});
