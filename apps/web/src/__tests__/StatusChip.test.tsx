import React from 'react';
import { render, screen } from '@testing-library/react';
import { StatusChip } from '../components/StatusChip';

describe('StatusChip Component', () => {
  it('renders Draft status with correct label and aria attributes', () => {
    render(<StatusChip status="draft" />);
    const chip = screen.getByText('Draft');
    expect(chip).toBeInTheDocument();
    expect(chip).toHaveAttribute('aria-label', 'Status: Draft');
  });

  it('renders Approved status chip in green theme', () => {
    render(<StatusChip status="approved" />);
    const chip = screen.getByText('Approved');
    expect(chip).toBeInTheDocument();
    expect(chip).toHaveAttribute('aria-label', 'Status: Approved');
  });

  it('renders Flagged / Needs Review chip', () => {
    render(<StatusChip status="flagged" />);
    const chip = screen.getByText('Needs Review');
    expect(chip).toBeInTheDocument();
    expect(chip).toHaveAttribute('aria-label', 'Status: Needs Review');
  });
});
