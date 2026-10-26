import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { PasswordStrengthMeter } from '../components/auth/PasswordStrengthMeter';
import { ThemeProvider } from '../components/providers/ThemeProvider';
import { AuthProvider } from '../components/providers/AuthProvider';

describe('Auth Pages & Password Strength Meter', () => {
  describe('PasswordStrengthMeter Component', () => {
    it('renders null when password is empty', () => {
      const { container } = render(<PasswordStrengthMeter password="" />);
      expect(container.firstChild).toBeNull();
    });

    it('evaluates weak passwords with 1 criteria', () => {
      render(<PasswordStrengthMeter password="abc" />);
      expect(screen.getByText('Too Weak')).toBeInTheDocument();
    });

    it('evaluates strong password with all 4 criteria', () => {
      render(<PasswordStrengthMeter password="Password@123" />);
      expect(screen.getByText('Strong')).toBeInTheDocument();
    });
  });

  describe('LoginPage Component', () => {
    const renderLogin = () => {
      return render(
        <BrowserRouter>
          <ThemeProvider>
            <AuthProvider>
              <LoginPage />
            </AuthProvider>
          </ThemeProvider>
        </BrowserRouter>
      );
    };

    it('renders login fields, headline, and testimonial', () => {
      renderLogin();
      expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
      expect(screen.getByLabelText(/^Username$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
      expect(screen.getByText(/Rahul Sharma/i)).toBeInTheDocument();
    });

    it('toggles password visibility when clicking eye button', () => {
      renderLogin();
      const passwordInput = screen.getByPlaceholderText('••••••••') as HTMLInputElement;
      expect(passwordInput.type).toBe('password');

      const toggleBtn = screen.getByRole('button', { name: /show password/i });
      fireEvent.click(toggleBtn);
      expect(passwordInput.type).toBe('text');

      const hideBtn = screen.getByRole('button', { name: /hide password/i });
      fireEvent.click(hideBtn);
      expect(passwordInput.type).toBe('password');
    });

    it('auto-fills demo credentials when clicking chip', async () => {
      renderLogin();
      const demoChip = screen.getByRole('button', { name: /auto-fill demo account/i });
      fireEvent.click(demoChip);

      const usernameInput = screen.getByLabelText(/^Username$/i) as HTMLInputElement;
      await waitFor(() => {
        expect(usernameInput.value).toBe('rahul');
      });
    });
  });

  describe('RegisterPage Component', () => {
    const renderRegister = () => {
      return render(
        <BrowserRouter>
          <ThemeProvider>
            <AuthProvider>
              <RegisterPage />
            </AuthProvider>
          </ThemeProvider>
        </BrowserRouter>
      );
    };

    it('renders all registration fields and submit button', () => {
      renderRegister();
      expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument();
      expect(screen.getByLabelText(/^Username$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^Confirm Password$/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    });

    it('shows password strength meter dynamically as user types', async () => {
      renderRegister();
      const passwordInput = screen.getByPlaceholderText(/min 8 chars/i);

      fireEvent.change(passwordInput, { target: { value: 'Secret@123' } });

      await waitFor(() => {
        expect(screen.getByText('Password strength')).toBeInTheDocument();
        expect(screen.getByText('Strong')).toBeInTheDocument();
      });
    });
  });
});
