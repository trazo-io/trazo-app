/**
 * The season page's public-page card says in words whether a scan opens the lot's page.
 *
 * `published`, not `finish_date`, decides that: the finish form's "Publish the buyer page now"
 * box can be unticked, and the Buyer Page can unpublish a finished season later. The first build
 * (#299) showed a green "Live" on every finished season, so an unpublished one read as live
 * directly above a "Preview page" button, while its QR answered 404 to everyone but the owner.
 *
 * The card also stays useful without a QR file: the cover photo and the preview need none.
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';

import messages from '../../../../../i18n/lang/en-US.json';

vi.mock('components/Design/ResponsiveModal', () => ({ ResponsiveModal: () => null }));
vi.mock('components/Upload', () => ({ TrazoImageUpload: () => null }));

import PublicPageCard from '../PublicPageCard';

const renderCard = (props: { isFinished: boolean; isPublished: boolean; qrCode?: string | null }) =>
  render(
    <ChakraProvider>
      <IntlProvider locale="en-US" messages={messages as Record<string, string>}>
        <PublicPageCard
          qrCode={'qrCode' in props ? props.qrCode : 'https://example.test/qr.png'}
          coverImageUrl={null}
          isFinished={props.isFinished}
          isPublished={props.isPublished}
          canWrite
          isSavingCover={false}
          onDownloadQr={vi.fn()}
          onPreview={vi.fn()}
          onCopyBuyerLink={vi.fn()}
          onSetCover={vi.fn()}
          onClearCover={vi.fn()}
        />
      </IntlProvider>
    </ChakraProvider>
  );

const LIVE = /Live: a scan opens this lot/;

describe('public page card: live only when published', () => {
  it('finished and published: live, with Open page', () => {
    renderCard({ isFinished: true, isPublished: true });
    expect(screen.getByText(LIVE)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Open page/ })).toBeTruthy();
  });

  it('finished but NOT published: not live, says why, offers Preview', () => {
    renderCard({ isFinished: true, isPublished: false });
    expect(screen.queryByText(LIVE)).toBeNull();
    expect(screen.getByText(/This season is not published/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Preview page/ })).toBeTruthy();
  });

  it('open season: not live, and the way there is finishing', () => {
    renderCard({ isFinished: false, isPublished: false });
    expect(screen.queryByText(LIVE)).toBeNull();
    expect(screen.getByText(/goes live when you finish the season/)).toBeTruthy();
  });

  it('no QR file: no Download QR, but preview and cover stay', () => {
    renderCard({ isFinished: false, isPublished: false, qrCode: null });
    expect(screen.queryByRole('button', { name: /Download QR/ })).toBeNull();
    expect(screen.getByRole('button', { name: /Preview page/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Change/ })).toBeTruthy();
  });
});
