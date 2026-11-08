/**
 * A help-center guide reads as a document (2026-11-08).
 *
 * Every guide sat inside a card with the topic icon in its own column, so on a 390px phone
 * the text ran about four words a line. It opened on a green success alert (check icon,
 * tinted box) that restated the page title, its tips and "where to find it" notes were more
 * green and blue alerts, all of them raw Chakra rather than the design system, and the header
 * button said "Back" without saying where to (Oscar's screenshot, 2026-11-08).
 */
import React from 'react';
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import theme from '../../../../theme/theme';
import esUY from '../../../../i18n/lang/es-419.json';
import { sectionCrumbId } from '../../../../components/Navbars/sectionCrumb';
import EducationTopicDetail from '../EducationTopicDetail';

const es = esUY as Record<string, string>;
const read = (f: string) =>
  readFileSync(join(process.cwd(), 'src/views/Dashboard/Education', f), 'utf8');
const DETAIL = read('EducationTopicDetail.tsx');

describe('guide source', () => {
  it('uses no raw Chakra alert, and no success status anywhere', () => {
    expect(DETAIL).not.toMatch(/<Alert\b|<AlertTitle|<AlertDescription/);
    expect(DETAIL).not.toMatch(/status="success"/);
  });

  it('a callout is a real caution; openings and notes are plain text', () => {
    expect(DETAIL.match(/<ArticleLead\b/g)?.length).toBeGreaterThanOrEqual(13);
    expect(
      DETAIL.match(/<StandardAlert\s+status="(\w+)"/g)?.every((m) => m.includes('warning'))
    ).toBe(true);
  });

  it('puts no card or icon column around the guide', () => {
    const page = DETAIL.slice(DETAIL.lastIndexOf('return ('));
    expect(page).not.toMatch(/<Card\b|topic\.icon/);
    expect(page).toMatch(/maxW="68ch"/);
  });

  it.each(['EducationTopicDetail.tsx', 'EducationFAQ.tsx'])(
    '%s: the back button names the help center',
    (file) => {
      expect(read(file)).toMatch(
        /backLabel=\{intl\.formatMessage\(\s*\{ id: 'common\.backTo' \},\s*\{ place: intl\.formatMessage\(\{ id: 'education\.pageTitle' \}\) \}/
      );
    }
  );

  it('the breadcrumb names the help center on the hub, a guide and the FAQ', () => {
    for (const path of [
      '/admin/dashboard/education',
      '/admin/dashboard/education/topic/first-production',
      '/admin/dashboard/education/faq'
    ]) {
      expect(sectionCrumbId(path)).toBe('education.pageTitle');
    }
  });
});

describe('a guide on screen, in Spanish', () => {
  it('opens on its lead, with no alert role and a named back button', () => {
    render(
      <IntlProvider locale="es-419" messages={es}>
        <ChakraProvider theme={theme}>
          <MemoryRouter initialEntries={['/admin/dashboard/education/topic/first-production']}>
            <Routes>
              <Route
                path="/admin/dashboard/education/topic/:topicId"
                element={<EducationTopicDetail />}
              />
            </Routes>
          </MemoryRouter>
        </ChakraProvider>
      </IntlProvider>
    );
    expect(screen.getByText(es['education.detail.firstProduction.readyTitle'])).toBeInTheDocument();
    expect(screen.queryAllByRole('alert')).toHaveLength(0);
    expect(
      screen.getByText(es['common.backTo'].replace('{place}', es['education.pageTitle']))
    ).toBeInTheDocument();
  });
});
