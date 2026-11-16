/**
 * Run 8b (8b-06, 2026-10-13): an input basis on the buyer page names its source and keeps its
 * limit.
 *
 * Three different things can stand behind an input chip, and none of them is permission:
 *   - the farm's own `organic_approved` answer ("Recorded by the farm as ...");
 *   - a catalog entry Trazo matched (`claim_authority.may_claim_input_listing`: OMRI, WSDA,
 *     National List);
 *   - nothing at all.
 * A listing covers a material, not this application. So wherever a basis renders, the reader is
 * told who said it and that it does not show the application was approved or met the listing's
 * restrictions. The OMRI tooltip used to read "a listed product is allowed in certified organic
 * production", which turned a catalog match into permission.
 *
 * Also covers the Trazo-voiced catalogue keys that described inputs as "approved" (export
 * description, lookup reminder, buyer-page story lines, journey chip). Attributed operator
 * options such as "Reviewed and approved by my certifier" are the farm's own statement and are
 * not in this list on purpose.
 */
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';

import { ConsumerEventCard } from '../ConsumerEventCard';
import {
  formatConsumerOrganicStatus,
  SHOPPER_BASIS_CERTIFIER,
  SHOPPER_BASIS_RECORDED
} from '../../../config/events/formatters';
import { FIELD_VALUE_ES } from '../../../utils/fieldValues.es';
import enUS from '../../../i18n/lang/en-US.json';
import es419 from '../../../i18n/lang/es-419.json';

const EN = enUS as Record<string, string>;
const ES = es419 as Record<string, string>;

const LIMIT = {
  'en-US': /does not show that this application was approved or met/,
  'es-419': /no muestra que esta aplicación haya sido aprobada/
} as const;
// The limit sentence itself contains "approved"; strip it before looking for an approval claim.
const LIMIT_SENTENCE = {
  'en-US': /[^.:]*does not show that (this|an) application was approved or met[^.]*\./g,
  'es-419': /[^.:]*no muestra?n? que (esta|una) aplicación haya sido aprobada[^.]*\./g
} as const;

const renderCard = (event: Record<string, unknown>, locale: 'en-US' | 'es-419' = 'en-US') =>
  render(
    <ChakraProvider>
      <IntlProvider locale={locale} messages={locale === 'en-US' ? EN : ES}>
        <ConsumerEventCard event={event as never} isLast />
      </IntlProvider>
    </ChakraProvider>
  );

const spray = (extra: Record<string, unknown>) => ({
  event_type: 2,
  type: 'PE',
  chemical_type: 'PE',
  date: '2026-05-11T07:00:00Z',
  description: 'Spray',
  commercial_name: 'Entrust SC Naturalyte',
  ...extra
});

const chipLabel = (chipText: RegExp): string => {
  const chip = screen.getByText(chipText).closest('[aria-label]');
  expect(chip, `no chip carrying ${chipText}`).not.toBeNull();
  return chip!.getAttribute('aria-label') || '';
};

describe('a catalog match is attributed to Trazo and carries its limit', () => {
  const MATCHES: Array<[string, RegExp, RegExp]> = [
    ['omri_listed', /^OMRI Listed$/, /^Listado por OMRI$/],
    ['wsda_listed', /^WSDA Listed$/, /^Registrado en WSDA$/],
    [
      'national_list_allowed',
      /^Allowed input · National List § 205\.601$/,
      /^Insumo permitido · Lista Nacional § 205\.601$/
    ],
    // A § 205.601 entry allowed only under a condition (OV-MT-C01): its own words, same limit.
    [
      'national_list_allowed_condition',
      /^Allowed with a condition · National List § 205\.601$/,
      /^Permitido con una condición · Lista Nacional § 205\.601$/
    ]
  ];

  it.each(MATCHES)('%s, English and Spanish', (status, enChip, esChip) => {
    const { unmount } = renderCard(spray({ input_status: { status, label: 'x' } }));
    const en = chipLabel(enChip);
    expect(en).toMatch(/Trazo/);
    expect(en).toMatch(LIMIT['en-US']);
    unmount();

    renderCard(spray({ input_status: { status, label: 'x' } }), 'es-419');
    const es = chipLabel(esChip);
    expect(es).toMatch(/Trazo/);
    expect(es).toMatch(LIMIT['es-419']);
  });

  it('an exact OMRI match alone never renders an approval', () => {
    for (const locale of ['en-US', 'es-419'] as const) {
      const { container, unmount } = renderCard(
        spray({ input_status: { status: 'omri_listed', label: 'OMRI Listed' } }),
        locale
      );
      const labels = [...container.querySelectorAll('[aria-label]')].map(
        (n) => n.getAttribute('aria-label') || ''
      );
      const everything = [container.textContent || '', ...labels].join(' \n ');
      // Anti-vacuity: the chip and its limit are actually on the page.
      expect(everything).toMatch(LIMIT[locale]);
      const rest = everything.replace(LIMIT_SENTENCE[locale], '');
      expect(rest, locale).not.toMatch(
        /approv|aprob|allowed in certified|permitido en la producción orgánica certificada/i
      );
      unmount();
    }
  });
});

describe("the farm's own basis is attributed to the farm and carries its limit", () => {
  it('the grower-reported chip', () => {
    renderCard(spray({ input_status: { status: 'organic_approved', label: 'x' } }));
    const label = chipLabel(/^Recorded by the farm as allowed for organic use$/);
    expect(label).toMatch(/The farm recorded/);
    expect(label).toMatch(LIMIT['en-US']);
  });

  it('the grower-reported chip with an unconfirmed National List link', () => {
    renderCard(
      spray({
        input_status: {
          status: 'organic_approved',
          label: 'x',
          // Run 8b R5: this fixture said Spinosad at 205.601. Spinosad is nonsynthetic and has
          // no National List entry; a real legacy link is a listed substance with the citation
          // the server builds.
          national_list_link: {
            substance: 'Lime sulfur',
            citation: '§ 205.601(e)',
            basis: 'not_confirmed'
          }
        }
      }),
      'es-419'
    );
    const label = chipLabel(/^Registrado por la finca como permitido para uso orgánico$/);
    expect(label).toContain('(Lime sulfur, 7 CFR § 205.601(e))');
    expect(label).toMatch(/aún no está confirmada/);
    expect(label).toMatch(/Ninguno de los dos muestra que esta aplicación haya sido aprobada/);
  });

  it('the soil and beneficial rows: attributed, limited, never a third-party name', () => {
    for (const value of [
      'omri_listed',
      'wsda_listed',
      'nop_seal_on_label',
      'usda_nop_approved',
      'yes'
    ]) {
      const text = formatConsumerOrganicStatus(value, {} as never) as string;
      expect(text, value).toBe(SHOPPER_BASIS_RECORDED);
    }
    expect(SHOPPER_BASIS_RECORDED).toMatch(/^Recorded by the farm/);
    expect(SHOPPER_BASIS_RECORDED).toMatch(LIMIT['en-US']);
    expect(SHOPPER_BASIS_RECORDED).not.toMatch(/OMRI|WSDA|NOP/);
    expect(FIELD_VALUE_ES[SHOPPER_BASIS_RECORDED]).toMatch(LIMIT['es-419']);
    // The operator's own option keeps its "approved": it is the farm's attributed statement.
    expect(formatConsumerOrganicStatus('certifier_approved', {} as never)).toBe(
      SHOPPER_BASIS_CERTIFIER
    );
    expect(SHOPPER_BASIS_CERTIFIER).toMatch(
      /^Recorded by the farm as reviewed and approved by its certifier/
    );
    expect(FIELD_VALUE_ES[SHOPPER_BASIS_CERTIFIER]).toMatch(/^Registrado por la finca/);
  });

  it('a conventional neem record gets neither an approval nor an organic description', () => {
    for (const locale of ['en-US', 'es-419'] as const) {
      const { container, unmount } = renderCard(
        spray({
          commercial_name: 'Trilogy Neem Oil',
          // `getEventTrustIndicators` read this field for its old name-guessed chip.
          equipment: 'Trilogy Neem Oil',
          organic_approved: 'not_organic',
          input_status: { status: 'conventional_documented', label: 'x' }
        }),
        locale
      );
      expect(container.textContent, locale).not.toMatch(
        /approved for organic|organic[- ]approved|aprobad\w* para|Natural Methods|Métodos naturales/i
      );
      unmount();
    }
  });
});

describe('Trazo-voiced catalogue keys never call an input approved', () => {
  // Keys where Trazo itself speaks about inputs. An affirmative approval here is a claim Trazo
  // cannot make: the operator writes the plan's materials list (certifications/views.py) and
  // the certifier reviews the plan. The tooltips carry the NEGATED limit ("does not show that
  // this application was approved"), which this pattern does not match.
  const KEYS = [
    'app.exportInfoOrganic',
    'inputVerify.reminder',
    'consumer.journey.allInputsOrganic',
    'consumer.organic.story.allInputsApproved',
    'consumer.organic.story.someInputsApproved',
    'consumer.eventCard.organic.tooltipOmri',
    'consumer.eventCard.organic.tooltipWsda',
    'consumer.eventCard.organic.tooltipNationalList',
    'consumer.eventCard.organic.tooltipGrowerReported',
    'consumer.eventCard.organic.tooltipGrowerReportedNationalListLink',
    'osp.review.finding.inputs_changed',
    'readinessItem.clause.materials_list_empty',
    'drift.reason.approved_with_issues',
    'drift.reason.name_omri_not_in_osp',
    'drift.reason.name_wsda_not_in_osp',
    'drift.reason.name_nl_not_in_osp',
    'drift.reason.nl_not_in_osp',
    'drift.reason.omri_not_in_osp',
    'drift.reason.wsda_not_in_osp'
  ];
  const CLAIM =
    /approved inputs|approved-inputs|approved list|adds approved|is approved|are approved|approved for organic|organic[- ]approved|is allowed in certified|insumos aprobados|lista aprobada|está aprobado|aprobados? para/i;

  it.each(KEYS)('%s', (key) => {
    for (const [name, cat] of [
      ['en-US', EN],
      ['es-419', ES]
    ] as const) {
      expect(cat[key], `${name} is missing ${key}`).toBeTruthy();
      expect(cat[key], `${name} ${key}`).not.toMatch(CLAIM);
    }
  });

  it('the lookup reminder says who adds and who reviews', () => {
    expect(EN['inputVerify.reminder']).toMatch(/You add each input to your plan's materials list/);
    expect(EN['inputVerify.reminder']).toMatch(/your certifier reviews the plan/);
    expect(ES['inputVerify.reminder']).toMatch(/Tú agregas cada insumo/);
  });

  it('the export description says "your plan\'s materials list"', () => {
    expect(EN['app.exportInfoOrganic']).toMatch(/the inputs on your plan's materials list/);
    expect(ES['app.exportInfoOrganic']).toMatch(/los insumos de la lista de materiales de tu plan/);
  });
});
