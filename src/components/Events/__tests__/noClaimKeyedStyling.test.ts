/**
 * No consumer-facing STYLE may be keyed to a self-graded trust signal.
 *
 * WHY (2026-08-02): every claim-safety gate we have reads sentences — the copy matrix, the
 * fallback-suppression sync, the boolean-formatter check. None of them can see a colour. And a
 * colour is perfectly capable of making the claim:
 *
 *   borderColor={verificationLevel === 'ultimate' ? 'green.400'
 *              : verificationLevel === 'high'     ? 'blue.400' : accentColor}
 *   as={verificationLevel === 'ultimate' ? MdSecurity : eventTypeConfig.icon}
 *   boxShadow={verificationLevel === 'ultimate' ? '0 0 20px rgba(72,187,120,0.4)' : 'none'}
 *
 * That is a tier Trazo assigns itself, rendered as a green ring, a security shield and a halo,
 * on a page where the same tier had already been removed from the TEXT for exactly this reason
 * (the "Photo Verification: Excellent" badges, the score-tiered transparency badges). It sat
 * there for months because it was styling, and nothing was looking at styling.
 *
 * The rule this encodes: a consumer surface may STATE a fact in words ("Photo Documented",
 * "OMRI Listed" — both checkable), but must not encode a self-assigned grade as colour, glow,
 * ring, shadow or icon identity. Compliance risk aside, an unlabelled visual tier is unreadable
 * — nothing on the page tells a shopper that a green ring outranks a grey one.
 *
 * Scope note: this is a lint over the CONSUMER components only. Producer dashboards may key
 * styling to these fields freely; the transparency score is a producer KPI and the whole point
 * is that it drives their behaviour there.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import ts from 'typescript';

/** Components that render on the public consumer page. */
const CONSUMER_SOURCES = [
  'src/components/Events/ConsumerEventCard.tsx',
  'src/views/Scan/ProductDetail/components/UltraMobileProductionJourney.tsx',
  'src/components/QR/CarbonHeroSection.tsx',
  'src/components/QR/TrustSummaryHeader.tsx',
  'src/components/QR/HeroPreviewCard.tsx'
];

/**
 * JSX props that decide how a thing LOOKS. `as` is included because swapping the icon component
 * is a visual claim as surely as recolouring it — that is how the shield appeared at the top
 * tier. `variant`/`colorScheme` are Chakra's own styling knobs.
 */
const STYLE_PROPS = new Set([
  'bg',
  'bgColor',
  'background',
  'backgroundColor',
  'color',
  'textColor',
  'fill',
  'stroke',
  'borderColor',
  'borderWidth',
  'boxShadow',
  'shadow',
  'colorScheme',
  'variant',
  'opacity',
  'as'
]);

/**
 * Identifiers that carry a self-graded or platform-assigned trust signal. Deliberately narrow:
 * a field is listed because it is a GRADE or a verification flag, not merely because it sounds
 * trust-adjacent. `organic_approved` is absent on purpose — OMRI/National-List status is a
 * checkable third-party fact, so colouring that chip green is legitimate.
 */
const CLAIM_IDENTIFIERS = [
  'verification_level',
  'verificationLevel',
  'verification_confidence',
  'verificationConfidence',
  'transparency_score',
  'transparencyScore',
  'data_integrity_score',
  'dataIntegrityScore',
  'blockchain_verified',
  'blockchainVerified',
  'blockchainData',
  'confidence_score',
  'confidenceScore'
];

interface Violation {
  file: string;
  line: number;
  prop: string;
  identifier: string;
  snippet: string;
}

function claimIdentifiersIn(node: ts.Node, source: ts.SourceFile): string[] {
  const found = new Set<string>();
  const visit = (n: ts.Node) => {
    if (ts.isIdentifier(n) && CLAIM_IDENTIFIERS.includes(n.text)) found.add(n.text);
    // `event.verification_level` / `event['verification_level']`
    if (ts.isPropertyAccessExpression(n) && CLAIM_IDENTIFIERS.includes(n.name.text)) {
      found.add(n.name.text);
    }
    if (
      ts.isElementAccessExpression(n) &&
      n.argumentExpression &&
      ts.isStringLiteral(n.argumentExpression) &&
      CLAIM_IDENTIFIERS.includes(n.argumentExpression.text)
    ) {
      found.add(n.argumentExpression.text);
    }
    n.forEachChild(visit);
  };
  visit(node);
  void source;
  return [...found];
}

function scan(relPath: string): { violations: Violation[]; styleProps: number } {
  const abs = resolve(process.cwd(), relPath);
  if (!existsSync(abs)) return { violations: [], styleProps: 0 };

  const text = readFileSync(abs, 'utf8');
  const source = ts.createSourceFile(
    relPath,
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );

  const violations: Violation[] = [];
  let styleProps = 0;

  const visit = (node: ts.Node) => {
    if (ts.isJsxAttribute(node) && ts.isIdentifier(node.name)) {
      const prop = node.name.text;
      if (STYLE_PROPS.has(prop)) {
        styleProps++;
        const init = node.initializer;
        if (init && ts.isJsxExpression(init) && init.expression) {
          for (const identifier of claimIdentifiersIn(init.expression, source)) {
            const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
            violations.push({
              file: relPath,
              line: line + 1,
              prop,
              identifier,
              snippet: node.getText(source).replace(/\s+/g, ' ').slice(0, 120)
            });
          }
        }
      }
    }
    node.forEachChild(visit);
  };
  visit(source);

  return { violations, styleProps };
}

describe('consumer styling is never keyed to a self-graded trust signal', () => {
  const results = CONSUMER_SOURCES.map((f) => ({ file: f, ...scan(f) }));
  const totalStyleProps = results.reduce((n, r) => n + r.styleProps, 0);
  const violations = results.flatMap((r) => r.violations);

  it('actually parsed the consumer components (guards the harness)', () => {
    // If a file is renamed and silently skipped, every assertion below passes vacuously.
    for (const { file } of CONSUMER_SOURCES.map((f) => ({ file: f }))) {
      expect(
        existsSync(resolve(process.cwd(), file)),
        `${file} is listed as a consumer surface but does not exist — update CONSUMER_SOURCES.`
      ).toBe(true);
    }
    expect(totalStyleProps).toBeGreaterThan(100);
  });

  it('has no style prop driven by verification level, score, or blockchain state', () => {
    const report = violations.map(
      (v) =>
        `  • ${v.file}:${v.line}\n      <${v.prop}> is keyed to \`${v.identifier}\`\n      ${v.snippet}`
    );
    expect(
      report,
      `\nA consumer-facing style is encoding a self-assigned grade:\n\n${report.join('\n')}\n\n` +
        `State the fact in WORDS if it is checkable ("Photo Documented"), or drop it. A colour,\n` +
        `ring, glow or icon swap keyed to a tier is a claim no shopper can read and no gate that\n` +
        `only reads text can catch.\n`
    ).toEqual([]);
  });
});
