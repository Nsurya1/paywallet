import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { CountUp } from '../components/ui/CountUp';
import { Dialog } from '../components/ui/Dialog';

describe('Shared UI Components', () => {
  describe('Button', () => {
    it('renders with default variant and responds to clicks', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click Me</Button>);

      const btn = screen.getByRole('button', { name: /Click Me/i });
      expect(btn).toBeInTheDocument();
      fireEvent.click(btn);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('renders loading state and is disabled', () => {
      render(<Button isLoading>Submit</Button>);
      const btn = screen.getByRole('button');
      expect(btn).toBeDisabled();
    });
  });

  describe('Badge', () => {
    it('renders success and danger variants', () => {
      render(
        <div>
          <Badge variant="success">Credit</Badge>
          <Badge variant="danger">Debit</Badge>
        </div>
      );
      expect(screen.getByText('Credit')).toBeInTheDocument();
      expect(screen.getByText('Debit')).toBeInTheDocument();
    });
  });

  describe('CountUp', () => {
    it('formats initial paise amount into Indian rupees', () => {
      render(<CountUp valuePaise={12500050} />);
      expect(screen.getByText(/₹\s?1,25,000\.50/)).toBeInTheDocument();
    });
  });

  describe('Dialog', () => {
    it('renders title and children when isOpen is true', () => {
      render(
        <Dialog isOpen={true} onClose={() => {}} title="Test Modal">
          <p>Dialog body content</p>
        </Dialog>
      );
      expect(screen.getByText('Test Modal')).toBeInTheDocument();
      expect(screen.getByText('Dialog body content')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(
        <Dialog isOpen={false} onClose={() => {}} title="Test Modal">
          <p>Dialog body content</p>
        </Dialog>
      );
      expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
    });
  });
});
