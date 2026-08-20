import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import RegisterPage from '../page';
import { ApiError } from '../../../lib/api-client';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockRegister = vi.fn();
vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    register: mockRegister,
    user: null,
    isAuthenticated: false,
    isLoading: false,
  }),
}));

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders registration form fields', () => {
    render(<RegisterPage />);

    expect(screen.getByRole('heading', { name: 'Create Account' })).toBeInTheDocument();
    expect(screen.getByLabelText('Display Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument();
  });

  it('shows error if password is less than 8 characters', async () => {
    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText('Display Name'), { target: { value: 'Neo' } });
    fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'neo@matrix.io' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'short' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'short' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Password must be at least 8 characters long.');
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('shows error if passwords do not match', async () => {
    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText('Display Name'), { target: { value: 'Neo' } });
    fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'neo@matrix.io' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Password123' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'DifferentPassword123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Passwords do not match.');
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('submits valid registration and redirects to home', async () => {
    mockRegister.mockResolvedValueOnce(undefined);

    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText('Display Name'), { target: { value: 'Thomas Anderson' } });
    fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'neo@matrix.io' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Password123' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'Password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        displayName: 'Thomas Anderson',
        email: 'neo@matrix.io',
        password: 'Password123',
      });
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('displays API error when email already exists', async () => {
    const error = new ApiError(409, 'Conflict', {
      type: 'https://api.cinely.io/errors/EMAIL_ALREADY_EXISTS',
      title: 'Email Already Exists',
      status: 409,
      detail: 'An account with this email address already exists.',
      code: 'EMAIL_ALREADY_EXISTS',
      timestamp: '2026-01-01',
    });
    mockRegister.mockRejectedValueOnce(error);

    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText('Display Name'), { target: { value: 'Thomas Anderson' } });
    fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'neo@matrix.io' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Password123' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'Password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('An account with this email address already exists.');
    });
  });
});

