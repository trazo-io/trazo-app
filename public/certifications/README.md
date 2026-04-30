# Certification Assets

This directory holds third-party certification seals/marks displayed on the
consumer QR scan page. **Read this before adding or modifying any file here.**

## Compliance Constraints

Most certification logos are trademarked. We display them only under
**nominative fair use** (USPTO/INTA 3-prong test) AND only when the underlying
data the cert claims is independently verifiable.

### Allowed in production

| Asset | Rendered when | Source | Modification rule |
|---|---|---|---|
| `usda-organic-seal.svg` | `organic_claim.status === 'certified_organic'` AND at least one cert has `verification_status === 'verified_via_database'` (USDA Organic Integrity Database fuzzy-match ≥ 90%) AND cert is current | USDA AMS — official mark of the U.S. Department of Agriculture, federal public-domain work | None permitted. Form, color, and proportions per 7 CFR 205.311. Do not co-brand with Trazo elements. Use unmodified. |

### NOT allowed without explicit licensing

The following marks must NOT be added to this directory unless their
respective licensing programs have been satisfied:

- **CCOF logo** — Members-only Logo Library (https://www.ccof.org/resources/labeling-logos/). All labels require CCOF approval.
- **Non-GMO Project Verified butterfly** — Trademark Use Guide v2.2: "restricted to authorized licensees who have signed an agreement." Approval required from `verification@nongmoproject.org` for any other use.
- **Real Organic Project, Regenerative Organic Certified, Fair Trade, Rainforest Alliance, GlobalGAP, SQF, Kosher symbols** — All have strict licensing programs.

For non-USDA certifications, render text only: `Certified by {certifier_name}`.

## File Inventory

### `usda-organic-seal.svg`

- **Source URL (canonical)**: https://www.ams.usda.gov/rules-regulations/organic/organic-seal
- **Mirror used for download**: https://upload.wikimedia.org/wikipedia/commons/e/ea/USDA_organic_seal.svg (Wikimedia Commons hosts the same federal public-domain asset)
- **Format**: SVG, 500×500, ~5.6 KB
- **License**: Federal public-domain work (17 U.S.C. § 105). Trademark/regulation-of-display: 7 CFR 205.311.
- **Last verified against canonical source**: 2026-04-28
- **Display rules in code**: see `trazo-app/src/components/QR/TrustSummaryHeader.tsx` — gating logic in `buildPracticesPillar()` requires both `organic_claim.status === 'certified_organic'` AND a cert with `verification_status === 'verified_via_database'` before the seal renders.
- **Disclaimer rendered with seal**: "USDA Organic seal is a registered mark of the U.S. Department of Agriculture. Displayed because this farm is certified by {certifier_name}." (See `UsdaSealDisclaimer` component.)

### Re-fetching the canonical asset

If the upstream seal design changes (rare — last design update added the registration mark ®), refresh from the canonical AMS URL:

```bash
# Verify checksum of new asset before committing.
curl -sL "https://upload.wikimedia.org/wikipedia/commons/e/ea/USDA_organic_seal.svg" \
  -o trazo-app/public/certifications/usda-organic-seal.svg
```

After refresh, update the "Last verified against canonical source" date above
and confirm the seal still matches the form/design at https://www.ams.usda.gov/rules-regulations/organic/organic-seal.

## Audit checklist (run before each release)

1. No file in this directory has been modified to add Trazo branding, color shifts, or aspect ratio changes.
2. Every new file has a corresponding entry in this README with: source URL, license, last-verified date, and gating logic.
3. Every cert mark is gated in code by a database-backed verification — no marks render based on farmer-attested claims alone.
