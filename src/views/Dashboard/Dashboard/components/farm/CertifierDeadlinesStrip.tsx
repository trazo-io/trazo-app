/**
 * Certifier deadlines — the dates Trazo already knew and never said out loud.
 *
 * Every date rendered here was ALREADY stored and already on the wire before this component
 * existed: `Certification.expiry_date`, `StateOrganicRegistration.renewal_date`, and whether an
 * `OSPAnnualUpdate` exists for the current `reporting_year` (7 CFR 205.406(a)). Nothing new is
 * computed server-side and no new endpoint was added — the product simply never surfaced the
 * one thing about a certified operation that has a real external deadline. The only
 * "expires in N days" string anywhere in the codebase was buried inside a generated PDF.
 *
 * Why it leads the farm dashboard: a grower's year is not uniform. Harvest (roughly Aug–Nov for
 * CA orchards) is when they have no bandwidth for software; the postharvest window, ~October
 * through February, is when they plan — and it is exactly when the certifier's annual OSP
 * update cycle lands. A dashboard whose headline is a documentation percentage has nothing to
 * say in that window. A dashboard that opens with "your OSP annual update for 2026 has not been
 * filed" is talking about the thing already on the grower's desk.
 *
 * SCOPE — this DISPLAYS dates. It is deliberately not a reminder system:
 * no notifications, no emails, no scheduled jobs, no task store, no snooze/dismiss state,
 * no calendar. Trazo is not a farm-management app. If this ever grows a `dismissed_at`, that
 * is the boundary being crossed.
 *
 * Rendered only for NOP-scoped operations, reusing the SAME `applicable` flag that gates
 * `OperationReadinessPanel` (`OperationReadinessService._nop_checks_apply`) rather than
 * inventing a second rule for "is this farm organic" — two rules would eventually disagree.
 */
import React from 'react';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';

import { Heading, HStack, Icon, Text, VStack, useColorModeValue } from '@chakra-ui/react';
import { FaCalendarAlt, FaChevronRight } from 'react-icons/fa';

import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';
import { STATUS_URGENCY_TOKENS } from 'components/Design/StandardComponents';
import { useGetOperationReadinessQuery } from 'store/api/certifierLinkApi';
import { hasStateOrganicProgram } from '../../../OSP/StateOrganicRegistrationCard';
import { useGetCertificationsQuery } from 'store/api/certificationApi';
import { useGetOSPAnnualUpdatesQuery } from 'store/api/ospAnnualUpdateApi';
import { useGetStateOrganicRegistrationsQuery } from 'store/api/stateOrganicRegistrationApi';

/**
 * How far ahead a date becomes worth showing. 120 days ≈ 4 months, chosen so that a grower
 * opening the dashboard in October — the first month of the postharvest planning window — can
 * already see a February expiry. A shorter horizon would surface the deadline in the middle of
 * harvest, when it is useless; a longer one would keep a permanent banner on screen, which is
 * how a warning becomes wallpaper.
 */
const HORIZON_DAYS = 120;

/**
 * How far PAST a date is still worth reporting. Without a floor, a certificate that lapsed three
 * years ago renders "1095 days overdue" on the dashboard forever — a permanent red row nobody can
 * clear, which is precisely how the horizon above is supposed to stop a warning becoming
 * wallpaper. A year covers the whole renewal cycle; anything older is a lapsed operation, which is
 * the readiness card's subject, not a date reminder's.
 */
const OVERDUE_LOOKBACK_DAYS = 365;

/** Inside the window we report on: recently overdue, or due within the horizon. */
function isWorthShowing(days: number): boolean {
  return days <= HORIZON_DAYS && days >= -OVERDUE_LOOKBACK_DAYS;
}

type Urgency = 'overdue' | 'soon';

interface Deadline {
  key: string;
  label: string;
  detail: string;
  urgency: Urgency;
  /** Where the farmer actually resolves it. A date with no route is a nag, not a task. */
  href: string;
}

/**
 * Whole days from today to `iso`, or null when the date is absent/unparseable.
 *
 * Date-only strings are parsed as LOCAL midnight, not UTC. `new Date('2026-08-02')` is defined by
 * the spec to mean UTC midnight, so reading it back with the local-time getters lands on Aug 1 in
 * every US timezone — a deadline would be reported one day earlier than it is, and a renewal due
 * today would read "1 day overdue". These fields (`expiry_date`, `renewal_date`) are Django
 * DateFields serialized as bare `YYYY-MM-DD` with no timezone to honour, so local is the correct
 * reading. This is the same off-by-one already recorded against the parcel page's start date.
 */
function daysUntil(iso?: string | null): number | null {
  if (!iso) return null;

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  const target = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(iso);
  if (Number.isNaN(target.getTime())) return null;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  // Round, not floor: DST transitions make a "day" 23 or 25 hours long twice a year.
  return Math.round((startOfTarget.getTime() - startOfToday.getTime()) / 86_400_000);
}

/**
 * Turn a day delta into the phrase shown on the right of the row.
 * Zero is its own case — "in 0 days" is not something a person says, and "today" is the single
 * most actionable state this strip has.
 */
function describeDelta(days: number, intl: ReturnType<typeof useIntl>): string {
  if (days === 0) return intl.formatMessage({ id: 'deadlines.today' });
  if (days < 0) {
    return intl.formatMessage({ id: 'deadlines.expiredDaysAgo' }, { days: Math.abs(days) });
  }
  return intl.formatMessage({ id: 'deadlines.inDays' }, { days });
}

const CertifierDeadlinesStrip: React.FC<{
  companyId: number | string;
  farmId: number | string;
  /** Farm's state code. Only states with a State Organic Program (see STATE_ORGANIC_PROGRAMS) are
      asked for registrations — an Oregon farm paid that request on every dashboard load. */
  state?: string | null;
}> = ({ companyId, farmId, state }) => {
  const intl = useIntl();
  const navigate = useNavigate();
  const scope = { companyId: String(companyId), farmId: String(farmId) };
  const skip = { skip: !companyId || !farmId };

  // Both destinations already exist. The OSP page holds the § 205.406 annual-continuation form
  // AND the CDFA registration (with its renewal date); certificates live on the farm profile,
  // alongside the certifier-link and dossier actions.
  const ospHref = `/admin/dashboard/farm/${farmId}/osp`;
  // The § 205.406 annual-update card lives on the narrative/lifecycle page, not
  // the module list — send the two annual-update rows straight to it
  // (2026-08-10: the generic /osp link left farmers hunting for the filing).
  const annualUpdateHref = `/admin/dashboard/farm/${farmId}/osp/narratives`;
  const profileHref = `/admin/dashboard/farm/${farmId}/profile`;

  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const mutedColor = useColorModeValue('gray.500', 'gray.400');
  const textColor = useColorModeValue('gray.700', 'gray.200');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');
  /**
   * The card-header icon, one step BELOW its own title — see the note at the `Icon` below.
   * Colour-mode aware on purpose: the literal `gray.700` that used to be here goes
   * near-invisible on the dark theme, the exact bug CarbonSummaryCard's header already fixed.
   * MEASURED: light `gray.600` 6.19:1 under a `gray.700` title at 10.05:1; dark `gray.400`
   * 4.93:1 under a `gray.200` title at 10.0:1 — the same step down in both modes.
   */
  const headerIconColor = useColorModeValue('gray.600', 'gray.400');

  const { data: readiness } = useGetOperationReadinessQuery(scope, skip);
  // Only the annual-update query needs a load flag — the cert and registration rows are driven by
  // dates being PRESENT, so an unloaded query simply contributes no rows and claims nothing.
  const { data: certifications } = useGetCertificationsQuery(scope, skip);
  const { data: registrations } = useGetStateOrganicRegistrationsQuery(scope, {
    skip: skip.skip || !hasStateOrganicProgram(state)
  });
  const { data: annualUpdates, isSuccess: updatesLoaded } = useGetOSPAnnualUpdatesQuery(
    scope,
    skip
  );

  // A conventional operation is not on the NOP calendar and must not be shown organic
  // deadlines it was never subject to.
  if (!readiness?.applicable) return null;

  const currentYear = new Date().getFullYear();
  const deadlines: Deadline[] = [];

  // 7 CFR 205.406(a) — the annual continuation. This is the anchor of the whole strip: unlike a
  // certificate expiry it has no date field to read, only presence or absence for the year, and
  // it is the single most likely reason a grower opens Trazo in October.
  //
  // Gated on `updatesLoaded` because absence of data is not evidence of absence. Every other row
  // is driven by a date that is PRESENT, so an unloaded query contributes nothing and claims
  // nothing; this row is the only one asserting a NEGATIVE. `annualUpdates` is `undefined` while
  // the request is in flight, and `(undefined || []).find(...)` is indistinguishable from a real
  // empty list — so without the flag the strip would accuse a farm of missing its filing during
  // every page load, then quietly retract it. Telling a grower they are out of compliance is not
  // something to do from a loading state.
  const updateThisYear = (annualUpdates || []).find((u) => u.reporting_year === currentYear);
  // `applicable` means organic INTENT (a plan, a certificate, or "organic" in the farming
  // method). The continuation is owed only by an operation that holds a certificate; a farm on
  // its first day was told "OSP annual update (2026) — Not filed" (recordkeeping review F-27).
  const holdsCertificate = (certifications || []).some(
    (c) => c.is_active || ['verified', 'self_reported'].includes(c.verification_status || '')
  );
  if (updatesLoaded && !updateThisYear && holdsCertificate) {
    deadlines.push({
      key: 'osp-annual-update',
      label: intl.formatMessage({ id: 'deadlines.ospAnnualUpdate' }, { year: currentYear }),
      detail: intl.formatMessage({ id: 'deadlines.ospAnnualUpdateNotFiled' }),
      // OUTSTANDING, not overdue (2026-11-07). There is no date on this row: the certifier sets
      // the schedule, as the strip's own disclaimer says. Red means a date we hold has passed;
      // "not filed" with no due date is the warning tone. The row stays first (pushed first,
      // and the sort below is stable).
      urgency: 'soon',
      href: annualUpdateHref
    });
  } else if (updateThisYear && !updateThisYear.submitted_at) {
    deadlines.push({
      key: 'osp-annual-update',
      label: intl.formatMessage({ id: 'deadlines.ospAnnualUpdate' }, { year: currentYear }),
      detail: intl.formatMessage({ id: 'deadlines.ospAnnualUpdateDraft' }),
      urgency: 'soon',
      href: annualUpdateHref
    });
  }

  // Certificate expiry. `is_active` already accounts for revoked/suspended and past-expiry, but
  // an EXPIRED certificate is exactly what a grower most needs to see, so expiry is read
  // directly rather than filtering on `is_active`.
  (certifications || []).forEach((cert) => {
    // A revoked or suspended certificate is already void — counting down to its expiry date would
    // tell the grower it is fine for another 90 days. Its status is the readiness card's subject,
    // not a deadline. (Deliberately NOT filtering on `is_active`, which also excludes EXPIRED
    // certificates — an expired certificate is the single most important row this strip can show.)
    if (cert.verification_status === 'revoked' || cert.verification_status === 'suspended') return;

    const days = daysUntil(cert.expiry_date);
    if (days === null || !isWorthShowing(days)) return;
    deadlines.push({
      key: `cert-${cert.id}`,
      label: intl.formatMessage(
        { id: 'deadlines.certificationExpiry' },
        { type: cert.certification_type_display || cert.certification_type }
      ),
      detail: describeDelta(days, intl),
      urgency: days < 0 ? 'overdue' : 'soon',
      href: profileHref
    });
  });

  // CDFA State Organic Program registration renews annually (CA Food & Ag Code § 46013.1(a): "Each
  // registrant shall annually renew the registration"). An operation under $5,000 is exempt from
  // certification only and still registers, so its renewal shows too. It used to be skipped here.
  (registrations || []).forEach((reg) => {
    const days = daysUntil(reg.renewal_date);
    if (days === null || !isWorthShowing(days)) return;
    deadlines.push({
      key: `state-reg-${reg.id}`,
      // `program_name` is optional and `state` can be blank, which produced a label of just
      // " renewal" with a leading space. Fall back to a generic but complete phrase.
      label:
        reg.program_name || reg.state
          ? intl.formatMessage(
              { id: 'deadlines.stateRegistrationRenewal' },
              { program: reg.program_name || reg.state }
            )
          : intl.formatMessage({ id: 'deadlines.stateRegistrationRenewalGeneric' }),
      detail: describeDelta(days, intl),
      urgency: days < 0 ? 'overdue' : 'soon',
      href: ospHref
    });
  });

  // Nothing due inside the horizon is the common case for most of the year. Render nothing
  // rather than a reassuring "all clear" banner that trains the farmer to skip this row.
  if (deadlines.length === 0) return null;

  // Overdue first; ties keep insertion order, which puts the § 205.406 filing above the rest.
  deadlines.sort((a, b) => Number(b.urgency === 'overdue') - Number(a.urgency === 'overdue'));

  return (
    <Card>
      <CardBody>
        <VStack align="stretch" spacing={3} w="100%">
          {/* A card TITLE, not an eyebrow (2026-08-15).
              This rendered as 12px uppercase bold grey while its sibling card directly below —
              "Before your certifier packet" — rendered a sentence-case `Heading`. Two peer cards
              in one column announcing themselves in two different registers read as two different
              KINDS of thing, and the smaller one reads as a subheading of the page rather than
              the head of its own card.

              Aligned to `StandardCard`'s header pattern — `Heading as="h3"`, `color="gray.700"`,
              icon at `boxSize={5}` — but NOT its responsive size; see the note on the Heading
              below for why 16px is right on this particular page. Hand-rolling a card header
              instead of using StandardCard is a defect this codebase has already fixed once (see
              the ProfileFarm file header); matched here rather than converting the card wholesale
              because the protected dashboard CSS forces its own padding and background onto
              `Card` with `!important`.

              `Heading` also restores the semantics: the old `Text` put nothing in the heading
              outline, so a screen-reader user got a card with no name. */}
          <HStack spacing={3} align="center">
            {/* SOLID weight. Font Awesome ships Regular (outline) and Solid as separate sets, and
                the outline calendar was the ONLY `FaReg*` icon anywhere in the dashboard tree —
                so the one card with a hollow header icon sat directly above a card with a filled
                clipboard. Same family, two weights, reads as two icon sets.

                One step BELOW the title beside it, NOT matched to it (2026-08-27). This briefly
                ran at `gray.700` — the title's own colour — on the theory that a header icon and
                its title should agree. MEASURED on the rendered dashboard, that made these two
                glyphs the darkest on the page at 10.05:1, while the sidebar's nav icons — marks
                that DO carry meaning — sit at `green.700`, 5.13:1. The one icon carrying no
                information was the loudest on the screen. `gray.600` (6.19:1) puts it back in
                the same band as those nav icons.

                Two reasons it steps down. (1) A header icon duplicates the title beside it — this
                codebase already says so by `aria-hidden`-ing StandardCard's `titleIcon` — and
                WCAG 1.4.11 exempts decorative graphics, so the 3.0 floor that forced
                `SECTION_ICON_COLOR` to `green.700` is not the constraint here; that rule is a
                contrast fix and is NOT precedent for "icon = title colour". (2) A solid glyph
                carries far more ink per area than letterforms, so matching the hex makes the icon
                read HEAVIER than its own heading — muting a step is how you get perceptual parity,
                and it is why muted header icons are the norm. At 20px against 16px text this one
                was already the larger mark.

                `gray.600` rather than `gray.500`: the calendar is a HOLLOW glyph sitting above a
                solid clipboard, and the lighter both go the more that ink difference shows —
                `gray.500` washes the thin strokes out while the slab below still holds. Fixing
                the glyph weights is what would buy the lighter grey. */}
            <Icon as={FaCalendarAlt} color={headerIconColor} boxSize={5} />
            {/* `size="sm"` (16px), NOT StandardCard's `{ base: 'sm', md: 'md' }`.
                MEASURED against the page: `md` renders 20px, which made these two card titles the
                largest text on the dashboard — larger than the farm name that is the page's own
                subject, and 6px above the 14px item titles inside the card. StandardCard's scale
                assumes a `StandardPage` hero H1 above it; this dashboard has no such H1, so the
                cards ARE the top level and inherited that weight instead of sitting under it —
                the same inverted hierarchy StandardSection's own comment documents. 16px also
                matches CarbonSummaryCard, the third card in this column.

                `fontWeight="600"` overrides Chakra's `Heading` default of 700. At 700 these titles
                tied with the farm-name chip — the page's own subject — and sat only 2px and one
                weight step above the 14px/600 item titles inside the card, so the header read
                heavier than its own hierarchy warranted. 600 also matches CarbonSummaryCard,
                which already set it explicitly. */}
            <Heading as="h3" size="sm" fontWeight="600" color="gray.700">
              {intl.formatMessage({ id: 'deadlines.title' })}
            </Heading>
          </HStack>

          <VStack align="stretch" spacing={2}>
            {deadlines.map((d) => (
              <HStack
                key={d.key}
                as="button"
                type="button"
                onClick={() => navigate(d.href)}
                justify="space-between"
                spacing={3}
                flexWrap="wrap"
                textAlign="left"
                w="100%"
                minH="44px"
                // No coloured left edge (2026-11-07): rows, not edged boxes. The detail text on
                // the right already carries the urgency in words and in its tone.
                borderBottom="1px solid"
                borderBottomColor={borderColor}
                pb={2}
                _hover={{ bg: hoverBg }}>
                <Text fontSize="sm" color={textColor} fontWeight="medium">
                  {d.label}
                </Text>
                <HStack spacing={2} flexShrink={0}>
                  {/* MEASURED 2026-08-28: this ran `orange.500` (#DD6B20, 3.39:1) and
                      `red.500` (#F44336, 3.68:1) as 12px semibold text — BOTH under the
                      4.5 small text owes. `red.500` is the theme's declared "Error color",
                      which is exactly how it passed review. See STATUS_URGENCY_TOKENS for
                      why the warning step is Chakra orange and must not be "corrected" to
                      the theme's amber. */}
                  <Text
                    fontSize="xs"
                    fontWeight="semibold"
                    color={
                      d.urgency === 'overdue'
                        ? STATUS_URGENCY_TOKENS.crit.text
                        : STATUS_URGENCY_TOKENS.warn.text
                    }
                    whiteSpace="nowrap">
                    {d.detail}
                  </Text>
                  <Icon as={FaChevronRight} color={mutedColor} boxSize={2.5} />
                </HStack>
              </HStack>
            ))}
          </VStack>

          {/* Same posture as CertifierReadinessCard: Trazo reports what its records show.
              Dates come from what the farmer entered; the certifier sets the real schedule. */}
          <Text fontSize="xs" color={mutedColor}>
            {intl.formatMessage({ id: 'deadlines.disclaimer' })}
          </Text>
        </VStack>
      </CardBody>
    </Card>
  );
};

export default CertifierDeadlinesStrip;
