import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { LandingPage } from '../pages/LandingPage';
import { ThemeProvider } from '../components/providers/ThemeProvider';
import { AuthProvider } from '../components/providers/AuthProvider';

describe('LandingPage Component', () => {
  const renderLanding = () => {
    return render(
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <LandingPage />
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    );
  };

  it('renders headline and hero copy', () => {
    renderLanding();
    expect(screen.getByText(/Send money at the/i)).toBeInTheDocument();
    expect(screen.getByText(/speed of trust\./i)).toBeInTheDocument();
  });

  it('renders 3D floating card with live balance and holder', () => {
    renderLanding();
    expect(screen.getByText('RAHUL SHARMA')).toBeInTheDocument();
    expect(screen.getByText('Available Balance')).toBeInTheDocument();
    expect(screen.getByText(/₹\s?1,25,000\.50/)).toBeInTheDocument();
    expect(screen.getByText('LEDGER ACTIVE')).toBeInTheDocument();
  });

  it('renders all three core architectural feature cards', () => {
    renderLanding();
    expect(screen.getByRole('heading', { name: 'Instant Transfers' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Bank-Grade Security' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Zero Duplicate Payments' })).toBeInTheDocument();
  });

  it('renders action CTAs to register and login', () => {
    renderLanding();
    expect(screen.getAllByRole('button', { name: /Open Free Account|Get Started/i })[0]).toBeInTheDocument();
  });
});
