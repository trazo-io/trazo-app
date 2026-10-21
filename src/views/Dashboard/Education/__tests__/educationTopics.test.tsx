/**
 * The education topics that came out of the pilot rehearsal, rendered for real, in both locales.
 *
 * These pages are pure copy, which is exactly why they need a render and not a grep. Two failure
 * modes have already shipped in this app and neither is visible in the source:
 *
 *   1. A key referenced through a TEMPLATE LITERAL (`education.detail.${x}.title`) is invisible to
 *      the static used-keys gate, so a missing translation reaches the page as the raw dotted id.
 *   2. A key present in `en-US.json` and absent from `es-419.json` renders the ENGLISH string
 *      inside a Spanish page — react-intl falls back silently. The parity gate catches an absent
 *      key; it cannot catch a Spanish value that was never translated.
 *
 * So: mount each topic, assert nothing that looks like an id survives to the text, and assert the
 * two locales actually differ.
 */
import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import enUS from '../../../../i18n/lang/en-US.json';
import es419 from '../../../../i18n/lang/es-419.json';
import EducationTopicDetail from '../EducationTopicDetail';
import EducationHub from '../EducationHub';

const MESSAGES: Record<string, Record<string, string>> = { 'en-US': enUS, 'es-419': es419 };

const renderTopic = (topicId: string, locale: string) => {
  const { container, unmount } = render(
    <ChakraProvider>
      <IntlProvider locale={locale} messages={MESSAGES[locale]} onError={() => undefined}>
        <MemoryRouter initialEntries={[`/education/topic/${topicId}`]}>
          <Routes>
            <Route path="/education/topic/:topicId" element={<EducationTopicDetail />} />
          </Routes>
        </MemoryRouter>
      </IntlProvider>
    </ChakraProvider>
  );
  const text = container.textContent || '';
  return { text, unmount };
};

/** Topics written against the Calapooia Bend rehearsal. */
const TOPICS = ['record-corrections', 'season-lifecycle', 'osp-data', 'farm-events', 'traceback'];

describe.each(TOPICS)('education topic: %s', (topicId) => {
  it.each(['en-US', 'es-419'])('renders in %s with no untranslated ids', (locale) => {
    const { text, unmount } = renderTopic(topicId, locale);
    // A raw message id reaching the page is the whole failure mode.
    expect(text).not.toMatch(/education\.[A-Za-z]+\./);
    // Not a stub: these topics all run well past a heading.
    expect(text.length).toBeGreaterThan(1500);
    unmount();
  });

  it('says something different in Spanish than in English', () => {
    const en = renderTopic(topicId, 'en-US');
    const enText = en.text;
    en.unmount();
    const es = renderTopic(topicId, 'es-419');
    const esText = es.text;
    es.unmount();
    expect(esText).not.toEqual(enText);
    // An English sentence surviving into the Spanish page is the silent-fallback bug.
    expect(esText).not.toMatch(/\bthe certifier\b|\byour records\b|\bthe season\b/);
  });
});

describe('farm-events teaches the vocabulary the app actually shows', () => {
  /**
   * `config/activityVerbs.ts` calls itself "the ONE farmer-language entry vocabulary (WS-4b)" and
   * every log-something entry point renders it. This topic used to teach the seven BACKEND event
   * models instead — Production, Chemical, Soil, Pest, Weather, Business, General — none of which
   * appear on any tile a farmer clicks. Pin the two lists together so they cannot drift again.
   */
  it.each(['en-US', 'es-419'])('names every activity verb, in %s', (locale) => {
    const { text, unmount } = renderTopic('farm-events', locale);
    const labels = Object.entries(MESSAGES[locale])
      .filter(([k]) => k.startsWith('activities.verb.'))
      .map(([, v]) => v);
    expect(labels.length).toBeGreaterThan(10);
    expect(labels.filter((label) => !text.includes(label))).toEqual([]);
    unmount();
  });

  it('does not resurrect the backend model names', () => {
    const { text, unmount } = renderTopic('farm-events', 'en-US');
    expect(text).not.toMatch(/Chemical Events|Production Events|Business Events|General Farm/i);
    unmount();
  });

  it('does not offer sales as a field activity', () => {
    // The tile was renamed off "Sales & compliance" on 2026-08-19 — the form has no sales field,
    // and a sale belongs to SalesRecord on the production page.
    const { text, unmount } = renderTopic('farm-events', 'en-US');
    expect(text).not.toMatch(/market sales/i);
    expect(text).toMatch(/Sales Records/);
    unmount();
  });
});

describe('the rehearsal topics state their load-bearing facts', () => {
  it('season lifecycle warns that a parcel can hold several open seasons', () => {
    const { text, unmount } = renderTopic('season-lifecycle', 'en-US');
    // Verified in product/views.py: a perennial block routinely carries two open seasons, and
    // closing acts on the season the finish page was opened from.
    expect(text).toMatch(/more than one open season/i);
    expect(text).toMatch(/irreversible/i);
    unmount();
  });

  it('season lifecycle does not promise that a finished season can be reopened', () => {
    const { text, unmount } = renderTopic('season-lifecycle', 'en-US');
    expect(text).not.toMatch(/reopen/i);
    unmount();
  });

  it('season lifecycle does not offer a plan-item affordance that does not exist', () => {
    const { text, unmount } = renderTopic('season-lifecycle', 'en-US');
    // `season_plan_item` accepts PATCH only — set aside / restore. There is no create and no
    // delete, so "add a practice the template did not know about" named a button nobody has.
    expect(text).not.toMatch(/add a practice/i);
    expect(text).toMatch(/set (any )?practice aside/i);
    unmount();
  });

  it('season lifecycle sends the farmer to the parcel page to finish', () => {
    const { text, unmount } = renderTopic('season-lifecycle', 'en-US');
    // The only Finish affordance is on the parcel page (TrackList.jsx) — the production page
    // has none. Copy that says "Finish is on this page" sends people looking for nothing.
    expect(text).toMatch(/parcel page/i);
    unmount();
  });

  it('the OSP data topic describes the module list as it actually renders', () => {
    const { text, unmount } = renderTopic('osp-data', 'en-US');
    // OSPModuleListPage renders a SimpleGrid of cards, not a left rail.
    expect(text).not.toMatch(/on the left/i);
    unmount();
  });

  it('the OSP data topic refuses the "Trazo writes your plan" claim', () => {
    const { text, unmount } = renderTopic('osp-data', 'en-US');
    // § 205.201(a) makes the producer the author. Never write "Trazo drafts/fills your OSP".
    expect(text).toMatch(/does not draft your plan/i);
    expect(text).not.toMatch(/Trazo (drafts|writes|fills) your (plan|OSP)/i);
    unmount();
  });

  it('the OSP data topic keeps § 205.400(f)(1) and § 205.406 apart', () => {
    const { text, unmount } = renderTopic('osp-data', 'en-US');
    expect(text).toMatch(/205\.400\(f\)\(1\)/);
    expect(text).toMatch(/205\.406/);
    unmount();
  });
});

describe('every hub card leads somewhere', () => {
  /**
   * The hub and the detail page keep two independent lists of topic ids. A card whose id has no
   * detail entry is a dead end that renders as "topic not found", and nothing in the type system
   * or the i18n gates connects the two lists.
   */
  it('every card id has a detail topic with the same id', () => {
    const { container, unmount } = render(
      <ChakraProvider>
        <IntlProvider locale="en-US" messages={enUS} onError={() => undefined}>
          <MemoryRouter>
            <EducationHub />
          </MemoryRouter>
        </IntlProvider>
      </ChakraProvider>
    );
    const titles = [...container.querySelectorAll('h2, h3')]
      .map((e) => (e.textContent || '').trim())
      .filter(Boolean);
    unmount();

    const hubIds = (
      readFileSync(resolve(__dirname, '../EducationHub.tsx'), 'utf8').match(
        /id: '([a-z0-9-]+)'/g
      ) || []
    ).map((m) => m.slice(5, -1));
    const detailIds = new Set(
      (
        readFileSync(resolve(__dirname, '../EducationTopicDetail.tsx'), 'utf8').match(
          /id: '([a-z0-9-]+)'/g
        ) || []
      ).map((m) => m.slice(5, -1))
    );
    expect(hubIds.length).toBeGreaterThan(10);
    expect(hubIds.filter((id) => !detailIds.has(id))).toEqual([]);
    // The rehearsal topics are on the hub, not only reachable by typing the URL.
    for (const id of TOPICS) expect(hubIds).toContain(id);
    expect(titles.length).toBeGreaterThan(0);
  });
});

describe('traceback topic', () => {
  it('is on the hub under Compliance and opens from the inspection-prep card', async () => {
    const { container, unmount } = render(
      <ChakraProvider>
        <IntlProvider locale="en-US" messages={enUS} onError={() => undefined}>
          <MemoryRouter initialEntries={['/education']}>
            <Routes>
              <Route path="/education" element={<EducationHub />} />
            </Routes>
          </MemoryRouter>
        </IntlProvider>
      </ChakraProvider>
    );
    expect(container.textContent).toContain(enUS['education.topicTracebackTitle']);
    unmount();

    let landed = '';
    const Landed = () => {
      landed = 'traceback-topic';
      return null;
    };
    render(
      <ChakraProvider>
        <IntlProvider locale="en-US" messages={enUS} onError={() => undefined}>
          <MemoryRouter initialEntries={['/admin/dashboard/education/topic/inspection-prep']}>
            <Routes>
              <Route
                path="/admin/dashboard/education/topic/:topicId"
                element={<EducationTopicDetail />}
              />
              <Route path="/admin/dashboard/education/topic/traceback" element={<Landed />} />
            </Routes>
          </MemoryRouter>
        </IntlProvider>
      </ChakraProvider>
    );
    // A real link (review of #178): an href puts it in the tab order and Enter follows it.
    const link = screen.getByRole('link', {
      name: enUS['education.detail.inspectionPrep.tracebackLink']
    });
    expect(link.getAttribute('href')).toBe('/admin/dashboard/education/topic/traceback');
    fireEvent.click(link);
    await waitFor(() => expect(landed).toBe('traceback-topic'));
  });

  it('never claims what the trace does not do', () => {
    // Read something first: the page rendered past its heading.
    const { text, unmount } = renderTopic('traceback', 'en-US');
    expect(text).toContain(enUS['education.detail.traceback.recallLabel']);
    expect(text).not.toMatch(/recall-ready|FSMA|mock recall|compliant|verified|score|%/i);
    unmount();
  });
});
