/**
 * A StatusRow can fold the rule behind a finding under a text link (2026-11-17): the facts stay
 * on screen, the explanation opens when asked for. And a StatusList whose rows all render null
 * takes no space in the stack around it.
 */
import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { MdWarning } from 'react-icons/md';

import { StatusList, StatusRow } from '../StandardComponents';

const Nothing = () => null;

describe('StatusRow details', () => {
  it('keeps the explanation folded until the link is used', () => {
    render(
      <ChakraProvider>
        <StatusRow
          tone="warn"
          icon={MdWarning}
          title="Picked inside the raw-manure interval"
          details={<p>7 CFR 205.203(c)(1) asks for 120 days.</p>}
          showDetailsLabel="Why"
          hideDetailsLabel="Hide">
          <p>Applied 1 Oct, picked 13 Nov, 43 days after (120-day interval)</p>
        </StatusRow>
      </ChakraProvider>
    );
    expect(screen.getByText(/43 days after/)).toBeInTheDocument();
    expect(screen.queryByText(/asks for 120 days/)).toBeNull();

    const toggle = screen.getByRole('button', { name: 'Why' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);

    expect(screen.getByText(/asks for 120 days/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hide' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('draws no link when there is nothing to fold', () => {
    render(
      <ChakraProvider>
        <StatusRow tone="neutral" icon={MdWarning} title="One tank, 3 products" />
      </ChakraProvider>
    );
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('StatusList', () => {
  it('is display:none when every row renders null', () => {
    render(
      <ChakraProvider>
        <StatusList testId="empty-list">
          <Nothing />
          <Nothing />
        </StatusList>
        <StatusList testId="full-list">
          <StatusRow tone="neutral" icon={MdWarning} title="Certifier only" />
        </StatusList>
      </ChakraProvider>
    );
    expect(getComputedStyle(screen.getByTestId('empty-list')).display).toBe('none');
    expect(getComputedStyle(screen.getByTestId('full-list')).display).not.toBe('none');
  });
});
