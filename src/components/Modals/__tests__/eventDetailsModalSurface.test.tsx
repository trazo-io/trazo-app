/**
 * EventDetailsModal renders what the design system says, MEASURED — not asserted from props.
 *
 * WHY THIS EXISTS. Every defect this suite pins was invisible in the source and visible only
 * in a screenshot (2026-08-16), because all of them are props that are silently INERT:
 *
 *   <Button colorScheme="red" variant="outline">Delete</Button>   → rendered GREEN
 *   <Button colorScheme="red">Delete Event</Button>               → rendered GREEN (brand)
 *   <Alert status="info" size="sm">                               → `size` does nothing
 *
 * The theme's `outline` variant hardcoded green and ignored `colorScheme`, exactly the way
 * `Badge colorScheme` was inert until 2026-08-11 — so the DESTRUCTIVE action wore the
 * brand/success colour, next to a blue primary, and the code read as if it were red. That is
 * the whole reason these assertions go through `getComputedStyle` rather than through the
 * rendered markup: reading the props back would have passed the entire time.
 *
 * ⚠️ Do NOT relax these to `toHaveAttribute` or class-name checks. See the header of
 * `theme/components/button.js`: "Verify any change here by reading the emitted CSS or the
 * computed style, never by reading the object below."
 */
import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';

// Relative: `theme` is not one of the aliases vitest.config.ts declares.
import theme from '../../../theme/theme';
import enMessages from '../../../i18n/lang/en-US.json';
import esMessages from '../../../i18n/lang/es-419.json';
import { EventDetailsModal } from '../EventDetailsModal';

vi.mock('store/api/historyApi', () => ({
  useDeleteEventMutation: () => [vi.fn(), { isLoading: false }]
}));

// EventDetailsModal mounts CorrectRecordModal (the locked-record correction path), which
// calls RTK Query hooks unconditionally — `skip` avoids the request, not the hook. Without
// this mock the whole suite fails with "could not find react-redux context value", because
// these tests render the component against the real theme and no store. Mocked at the API
// boundary, exactly as historyApi is above; the correction UI has its own suite in
// correctRecordModal.test.tsx.
vi.mock('store/api/amendmentsApi', () => ({
  useGetEventAmendmentsQuery: () => ({ data: undefined, isLoading: false }),
  useAmendEventMutation: () => [vi.fn(), { isLoading: false }],
  // CorrectRecordModal gained a season-header mode on 2026-08-21 (F7) and calls both hooks
  // unconditionally — a mock missing one throws at render, not at assertion.
  useGetSeasonAmendmentsQuery: () => ({ data: undefined, isLoading: false }),
  useAmendSeasonMutation: () => [vi.fn(), { isLoading: false }]
}));

// canWrite gates the whole action cluster; this suite is about how those actions LOOK.
vi.mock('hooks/useUserRole', () => ({ useUserRole: () => ({ canWrite: true }) }));
// The crew-message provenance block (audit T29) reads its own endpoint; this suite is about the
// modal's surface, so it answers "not from a crew message".
vi.mock('store/api/crewNoteApi', () => ({ useGetCrewNoteQuery: () => ({ data: { crew_note: null } }) }));

// The component reads exactly one slice — `state.company.currentCompany`, for the delete
// call. Feeding the selector directly beats standing up a store (and beats adding
// redux-mock-store, which this project does not depend on) for a suite about pixels.
vi.mock('react-redux', () => ({
  useSelector: (fn: (s: unknown) => unknown) => fn({ company: { currentCompany: { id: 1 } } })
}));

/** A general-activity record with no emissions — the exact case in the 2026-08-16 screenshot. */
const EVENT = {
  id: 42,
  type: 'event.general.other',
  event_type: 3,
  description: 'Season planning documentation for 2026-2027 Hass Avocado cycle.',
  date: '2026-10-25T00:00:00Z',
  created_by: 7
};

/**
 * A pest record as the RETRIEVE endpoint actually ships it: `type` is a bare subtype code
 * ('MO'), not an `event.pest.monitoring` id. That is the shape the title resolver's map
 * misses, and missing it used to mean the whole field note became the H1.
 */
const PEST_EVENT = {
  id: 43,
  type: 'MO',
  pest_management_type: 'MO',
  event_type: 6,
  description:
    'Hull split at 15%. NOW egg-trap catch rose to 22 over the prior week, above the ' +
    'hull-split treatment threshold for the block.',
  date: '2026-08-04T00:00:00Z',
  created_by: 7
};

function renderModal({ locale = 'en-US', messages = enMessages, event = EVENT } = {}) {
  return render(
    <ChakraProvider theme={theme}>
      <IntlProvider locale={locale} messages={messages as Record<string, string>}>
        <MemoryRouter initialEntries={['/admin/dashboard/farm/1/parcel/2']}>
          <EventDetailsModal
            isOpen
            onClose={vi.fn()}
            event={event as never}
            members={[]}
            farmId="1"
            parcelId="2"
          />
        </MemoryRouter>
      </IntlProvider>
    </ChakraProvider>
  );
}

/**
 * Read a declaration off the EMITTED CSS RULE, not off `getComputedStyle`.
 *
 * `getComputedStyle` is useless here: emotion inserts its rules through CSSOM `insertRule`,
 * and jsdom does not cascade those onto elements — every button comes back `color: ButtonText`
 * (the UA default) no matter what the theme says. The rules themselves ARE readable, via
 * `document.styleSheets[].cssRules`, and that is the artifact that matters: it is the CSS the
 * browser would apply.
 *
 * Returns the raw token reference, e.g. `var(--chakra-colors-red-700)`, which `token()` below
 * reduces to `red.700`. Comparing tokens rather than hexes means a palette re-tune does not
 * break this suite — the CLAIM is "Delete is red", not "Delete is #D32F2F".
 */
function cssDecl(el: Element, prop: string): string {
  const cls = Array.from(el.classList).find((c) => c.startsWith('css-'));
  for (const sheet of Array.from(document.styleSheets)) {
    for (const rule of Array.from(sheet.cssRules) as CSSStyleRule[]) {
      // Exact selector only — the `:hover` / `:focus-visible` rules for the same class carry
      // different colours, and matching them would make the assertion depend on rule order.
      if (rule.selectorText === `.${cls}`) return rule.style.getPropertyValue(prop);
    }
  }
  return `(no rule for .${cls})`;
}

/**
 * `var(--chakra-colors-red-700)` → `red.700`; `var(--chakra-colors-white)` → `white`.
 * The step group is optional — the stepless tokens (white, transparent) are real tokens too.
 */
function token(value: string): string {
  const m = value.match(/--chakra-colors-([a-zA-Z]+)(?:-(\d+))?/);
  if (!m) return value;
  return m[2] ? `${m[1]}.${m[2]}` : m[1];
}

/**
 * The FOOTER's Close, not the dialog's ✕ — Chakra labels `ModalCloseButton` "Close" too, so a
 * plain role+name query finds two. Picking by text rather than by index keeps this stable if
 * the ✕ moves in the DOM.
 */
const footerClose = () =>
  screen
    .getAllByRole('button', { name: /^Close$/i })
    .find((b) => b.textContent?.trim() === 'Close') as HTMLElement;

/**
 * jsdom ships no `matchMedia`, which `ResponsiveModal` needs to choose its branch. This is a
 * REAL matcher against a chosen viewport width, and it has to be.
 *
 * ⚠️ The obvious stubs are both wrong, and wrong SILENTLY:
 *   `matches: false` always      → every range misses, Chakra falls back to `base` = mobile.
 *   `matches: true` for min-width → every range hits, and `useBreakpoint` takes the FIRST
 *                                   match (`findIndex`), which is also `base` = mobile.
 * So a suite built on either one renders the phone layout in both cases and reports green on
 * a desktop assertion it never actually made. Chakra emits each breakpoint as an exclusive
 * RANGE — `screen and (min-width: 20em) and (max-width: 29.9375em)` — so the stub must
 * honour max-width too, or exactly one branch is testable.
 *
 * 375px and 1440px are the widths `.claude/rules/frontend.md` names for visual verification.
 */
const EM = 16;

function setViewport(kind: 'mobile' | 'desktop') {
  const width = kind === 'mobile' ? 375 : 1440;

  const bound = (query: string, which: 'min' | 'max'): number | null => {
    const m = query.match(new RegExp(`${which}-width:\\s*([\\d.]+)(em|px)`));
    if (!m) return null;
    return m[2] === 'em' ? parseFloat(m[1]) * EM : parseFloat(m[1]);
  };

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => {
      const min = bound(query, 'min');
      const max = bound(query, 'max');
      return {
        matches: (min === null || width >= min) && (max === null || width <= max),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      };
    }
  });
}

describe('EventDetailsModal — the title names the record, it is not the record', () => {
  beforeEach(() => setViewport('desktop'));

  it('titles a pest record with its farmer-language verb, not its description', () => {
    renderModal({ event: PEST_EVENT });

    // `activities.verb.pest` — the SAME string `activityTitle()` gives the feed row this
    // modal opens from.
    expect(screen.getByText(enMessages['activities.verb.pest'])).toBeInTheDocument();
  });

  it('never prints the description twice', () => {
    renderModal({ event: PEST_EVENT });

    // The 2026-08-16 defect: the five-line field note rendered as the H1 AND again in the
    // Field Notes card, filling half a phone screen before any information appeared.
    expect(screen.getAllByText(PEST_EVENT.description)).toHaveLength(1);
  });
});

describe('EventDetailsModal — mobile gets the bottom sheet, not a full-screen modal', () => {
  it('puts the primary below the destructive in the thumb arc', () => {
    setViewport('mobile');
    renderModal();

    const del = screen.getByRole('button', { name: /^Delete$/i });
    const edit = screen.getByRole('button', { name: /Edit Event/i });

    // DOCUMENT_POSITION_FOLLOWING === 4. On a bottom sheet the primary owns the bottom edge;
    // the first stack order shipped `column-reverse`, which left DELETE as the bottom-most
    // control — the easiest thumb target on the phone, for the action that destroys a
    // certifier record.
    expect(del.compareDocumentPosition(edit) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('renders the drag handle below md', () => {
    setViewport('mobile');
    renderModal();

    // `ResponsiveModal`'s Drawer branch. This component used to hand-roll a raw Chakra Modal
    // at `size={{ base: 'full' }}`, so a phone got a full-screen dialog with no drag handle
    // and no swipe-to-dismiss — while the LOADING state, which already used ResponsiveModal,
    // was a bottom sheet. Two shells inside one click.
    expect(screen.getByTestId('responsive-modal-sheet-handle')).toBeInTheDocument();
  });

  it('renders no drag handle at md and up', () => {
    setViewport('desktop');
    renderModal();
    expect(screen.queryByTestId('responsive-modal-sheet-handle')).toBeNull();
  });
});

describe('EventDetailsModal — action colours are semantic, not decorative', () => {
  beforeEach(() => setViewport('desktop'));

  it('paints Delete in red, never in the brand green', () => {
    renderModal();
    const color = token(cssDecl(screen.getByRole('button', { name: /^Delete$/i }), 'color'));

    // The regression, stated as the thing it must never be again.
    expect(color).not.toBe('green.700');
    expect(color).not.toBe('green.500');
    expect(color).toBe('red.700');
  });

  it('paints the primary action in brand green, never blue', () => {
    renderModal();
    const edit = screen.getByRole('button', { name: /Edit Event/i });

    expect(token(cssDecl(edit, 'background'))).toBe('green.700');
    // White label on green.700 is 5.13:1. On green.500 it is 2.78:1, and on Chakra's stock
    // blue.500 (what `colorScheme="blue"` used to give) 3.68:1 — both fail AA at label size.
    expect(token(cssDecl(edit, 'color'))).toBe('white');
  });

  it('keeps Close quiet — grey, not a third coloured action', () => {
    renderModal();
    expect(token(cssDecl(footerClose(), 'color'))).toBe('gray.700');
  });

  it('renders no self-authored score on the record', () => {
    renderModal();
    // The "<n> /100 — Efficiency Score" block, removed 2026-08-16. For event_type 3 the
    // number was a frontend constant (`efficiency_score: 100`), i.e. a perfect grade awarded
    // for writing a note. `noScoreOnProducerRecords` guards the source; this guards the DOM.
    expect(screen.queryByText(/Efficiency Score/i)).toBeNull();
    expect(screen.queryByText('/100')).toBeNull();
  });

  it('states the kg CO₂e fact instead', () => {
    renderModal();
    // What replaces the grade: a measured quantity, not a verdict. Scoped to the carbon card
    // — "no direct emissions" also appears inside the record-value alert's prose, and an
    // unscoped query would pass on that sentence alone even if the readout were deleted.
    expect(screen.getByText('kg CO₂e')).toBeInTheDocument();
    const carbonCard = screen.getByText('kg CO₂e').closest('div')?.parentElement?.parentElement;
    expect(within(carbonCard as HTMLElement).getByText('No direct emissions')).toBeInTheDocument();
  });
});

describe('EventDetailsModal — every string goes through intl', () => {
  it('renders no English chrome when the locale is Spanish', () => {
    setViewport('desktop');
    renderModal({ locale: 'es-419', messages: esMessages });

    // The exact mixed-language screen from the 2026-08-16 screenshot: Spanish field labels
    // beside hardcoded English chrome. Each of these was a literal in the JSX.
    for (const english of [
      'Detailed Information',
      'Carbon Impact',
      'Close',
      'Delete',
      'Edit Event'
    ]) {
      expect(
        screen.queryByText(english, { exact: true }),
        `"${english}" is still hardcoded English on a translated screen`
      ).toBeNull();
    }

    expect(screen.getByText('Impacto de Carbono')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editar Evento' })).toBeInTheDocument();
  });

  it('names the event category with the same words the activity feed uses', () => {
    setViewport('desktop');
    renderModal();
    // `activities.type.3`, shared via `config/events/eventTypeAppearance`. It used to be the
    // literal "Other Farm Activity", which no locale could translate and which disagreed with
    // the row the modal was opened from.
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(enMessages['activities.type.3'])).toBeInTheDocument();
  });
});

/**
 * A GENERATED PLACEHOLDER IS NOT THE FARMER'S FIELD NOTES.
 *
 * `CommonEvent.description` is non-blank, so `ensure_event_description` fills it with the event's
 * own name when the notes box is left empty. The modal falls back to `description` for legacy rows
 * whose note genuinely lives there, and that fallback used to print the placeholder under a heading
 * that says Field Notes.
 *
 * It became reachable in normal use the day crew voice notes shipped: an event confirmed from a
 * field note has an intentionally EMPTY observation, because the sender's words must not be
 * republished as the grower's own. So every one of those records showed a machine string as
 * somebody's words, on a record a certifier reads. Screenshot 2026-09-28: "Production activity:
 * Irrigation" under Field Notes.
 */
describe('field notes never show a generated placeholder', () => {
  const withNote = (over: Record<string, unknown>) => ({ ...EVENT, ...over });

  it('shows the farmer own observation when there is one', () => {
    renderModal({
      event: withNote({ name: 'Irrigation', observation: 'Ran drip on rows 1-12, two hours.' })
    });
    expect(screen.getByText(/Ran drip on rows 1-12/)).toBeTruthy();
  });

  it('says nothing was written when the description is just the event name', () => {
    renderModal({
      event: withNote({ name: 'Irrigation', description: 'Irrigation', observation: '' })
    });

    // Scoped to the notes box. A bare `queryByText(/^Irrigation$/)` would fail on the modal TITLE,
    // which is supposed to say Irrigation: the name is right as a heading and wrong as prose
    // somebody wrote.
    const notes = screen.getByText(/No field notes were written/i);
    expect(notes).toBeTruthy();
    expect(notes.textContent?.trim()).not.toBe('Irrigation');
  });

  it('says nothing was written for the older type-prefixed placeholder', () => {
    // Every row created before the generator stopped prefixing the internal type still has this.
    renderModal({
      event: withNote({
        name: 'Irrigation',
        description: 'Production activity: Irrigation',
        observation: ''
      })
    });

    expect(screen.getByText(/No field notes were written/i)).toBeTruthy();
    expect(screen.queryByText(/Production activity/)).toBeNull();
  });

  it('still shows a legacy note that genuinely lives in description', () => {
    // The reason the fallback exists at all, and it must survive the fix.
    renderModal({
      event: withNote({
        name: 'Harvest',
        description: 'Shake and pickup, north rows first. Scale ticket 4471.',
        observation: ''
      })
    });
    expect(screen.getByText(/Scale ticket 4471/)).toBeTruthy();
  });
});
