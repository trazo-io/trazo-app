/**
 * Onboarding polish (recordkeeping review S10: F-19, F-20, F-21, F-29, F-30, F-31, 2026-10-07).
 *
 * The first screens a new farm reads: the Getting Started panel must not cover the record it
 * points at; a password with an open warning is never also "Strong"; a season created with
 * nothing ticked says so; the input form carries no retired "consumer trust" block and no
 * unsourced statistic; the company-setup heading and the dossier button say what they are.
 * Red on the old sources and catalogues.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

import en from '../lang/en-US.json';
import es from '../lang/es-419.json';
import { isRecordOrFormRoute } from '../../components/Tour/OnboardingChecklist';
import { passwordValidator } from '../../utils/passwordValidation';

const EN = en as Record<string, string>;
const ES = es as Record<string, string>;
const src = (p: string) => readFileSync(resolve(__dirname, '../../', p), 'utf8');

describe('onboarding says what it holds', () => {
  it('the Getting Started panel stays off the parcel and production pages', () => {
    expect(isRecordOrFormRoute('/admin/dashboard/farm/2/parcel/12')).toBe(true);
    // The production segment is the season's public_id (a UUID), as HistoryCard navigates.
    expect(
      isRecordOrFormRoute(
        '/admin/dashboard/farm/2/parcel/12/production/027804d7-17ba-468a-a210-e1279e92e165'
      )
    ).toBe(true);
    expect(isRecordOrFormRoute('/admin/dashboard/farm/2/parcel/12/event/add')).toBe(true);
    expect(isRecordOrFormRoute('/admin/dashboard/farm/2')).toBe(false);
  });

  it('the Getting Started panel stays off the OSP pages and the edit forms', () => {
    // Pilot rehearsal 2026-10-17: it covered "Save Annual Update" on /osp/narratives.
    for (const osp of ['/osp', '/osp/', '/osp/narratives', '/osp/module/g2']) {
      expect(isRecordOrFormRoute(`/admin/dashboard/farm/20${osp}`)).toBe(true);
    }
    // Every edit route ends in /change (App.tsx), none in /edit.
    for (const edit of [
      '/admin/dashboard/farm/20/change',
      '/admin/dashboard/farm/20/parcel/12/change',
      '/admin/dashboard/farm/20/parcel/12/event/5/change',
      '/admin/dashboard/farm/20/parcel/12/production/027804d7-17ba-468a-a210-e1279e92e165/change'
    ]) {
      expect(isRecordOrFormRoute(edit)).toBe(true);
    }
    expect(isRecordOrFormRoute('/admin/dashboard/settings/change-password')).toBe(false);
    expect(isRecordOrFormRoute('/admin/dashboard/farm/20/ospx')).toBe(false);
    // Not covered by this rule: the farm profile, where the certifier link card sits.
    expect(isRecordOrFormRoute('/admin/dashboard/farm/20/profile')).toBe(false);
  });

  it('a password with an open warning is never called Strong', () => {
    expect(passwordValidator.getStrengthLabel(95, [])).toBe('Strong');
    expect(passwordValidator.getStrengthLabel(95, ['Password contains common words'])).toBe('Good');
    // The bar's colour follows the verdict.
    expect(passwordValidator.getStrengthColor(95, [])).toBe('green.500');
    expect(passwordValidator.getStrengthColor(95, ['Password contains common words'])).toBe(
      'blue.500'
    );
  });

  it('the terms links sit outside the checkbox label', () => {
    const signup = src('views/Authentication/SignUp/AppSignUp.tsx');
    const checkbox = signup.slice(
      signup.indexOf("registerField('acceptTerms'"),
      signup.indexOf('</Checkbox>')
    );
    expect(checkbox).not.toContain('<a');
    expect(checkbox).toContain("'auth.signup.terms.agreeShort'");
    for (const key of ['auth.signup.terms.agreeShort', 'auth.signup.terms.readLinks']) {
      expect(EN[key]).toBeTruthy();
      expect(ES[key]).toBeTruthy();
    }
  });

  it('a season created with nothing ticked says so', () => {
    const quick = src('views/Dashboard/Dashboard/Production/QuickStartProduction.tsx');
    expect(quick).toContain("'production.planEmpty'");
    expect(quick).toContain('quickstart-plan-nothing-ticked');
    for (const key of ['production.planEmpty', 'quickStart.plan.nothingTicked']) {
      expect(EN[key]).toBeTruthy();
      expect(ES[key]).toBeTruthy();
    }
    expect(src('views/Dashboard/Parcel/components/HistoryCard.jsx')).not.toMatch(
      /<Avatar\s+size="sm"\s+name=\{intl\.formatMessage\(\{ id: 'parcel\.noTeam' \}\)\}/
    );
  });

  it('the input form carries no consumer-trust block and no unsourced statistic', () => {
    const chemical = src('views/Dashboard/Dashboard/components/forms/ChemicalTab-ENHANCED.jsx');
    expect(chemical).not.toContain('consumerTrust');
    expect(chemical).not.toMatch(/#1 non-conformance/);
    for (const catalogue of [EN, ES]) {
      expect(catalogue['events.chemical.consumerTrust.heading']).toBeUndefined();
      expect(catalogue['events.section.desc.chemicalSupplier']).not.toMatch(
        /nationally|a nivel nacional/
      );
    }
  });

  it('the company heading and the dossier button say what they are', () => {
    expect(EN['company.form.page.description']).not.toMatch(/consumer trust|transparency/i);
    expect(ES['company.form.page.description']).not.toMatch(
      /confianza del consumidor|transparencia/i
    );
    expect(EN['app.exportDownload']).toBe('Download dossier');
    expect(ES['app.exportDownload']).toBe('Descargar dossier');
  });

  it('the annual-update deadline row is gated on a certificate on file', () => {
    expect(src('views/Dashboard/Dashboard/components/farm/CertifierDeadlinesStrip.tsx')).toMatch(
      /updatesLoaded && !updateThisYear && holdsCertificate/
    );
  });
});
