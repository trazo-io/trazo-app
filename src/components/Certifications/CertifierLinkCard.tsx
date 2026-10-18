/**
 * "Share with your certifier" — mint, inspect and revoke certifier review links.
 *
 * The competitor gap this closes: COG Pro advertises that "your certification
 * provider can even inspect your records online, with your permission." Trazo's
 * answer is better for the certifier — they need no account, just the link.
 *
 * Three things a mailed PDF can never do, and the reason this card exists:
 * the dossier is regenerated on every open (never stale), the link can be
 * revoked, and the farmer can see whether their certifier actually opened it.
 */
import { StandardQueryError } from 'components/Design';
import React, { useState } from 'react';
import {
  Badge,
  Box,
  Checkbox,
  HStack,
  Icon,
  InputGroup,
  InputRightElement,
  Link,
  Text,
  Tooltip,
  useToast,
  VStack
} from '@chakra-ui/react';
import { FaCopy, FaEye, FaLink } from 'react-icons/fa';
import { useIntl } from 'react-intl';

import {
  StandardButton,
  StandardCard,
  StandardInput,
  StandardSelect
} from 'components/Design/StandardComponents';
import {
  useCreateCertifierLinkMutation,
  useGetCertifierLinksQuery,
  useGetOperationReadinessQuery,
  useRevokeCertifierLinkMutation,
  type CertifierAccessLink,
  type ReadinessItem
} from 'store/api/certifierLinkApi';
import OperationReadinessPanel from './OperationReadinessPanel';
import { resolveReadinessItem } from './readinessMessages';
import { formatDateOnly, formatDateFromTimestamp } from 'utils/dateOnly';
import {
  ComplianceExportsUpsell,
  useComplianceExports
} from 'components/Guards/ComplianceExportsGuard';

interface Props {
  companyId: string;
  farmId: string;
  canWrite: boolean;
}

/** The certifier opens this, not the authenticated API path. */
const reviewUrl = (token: string) => `${window.location.origin}/certifier-review/${token}`;

/**
 * Certification is issued to the OPERATION, and the annual inspection covers the
 * operation for one certification period — not for all time. Without a window the
 * dossier spans every production the farm has ever recorded, which grows without
 * bound and buries the year the inspector actually came to review.
 *
 * "Current year" is the default because that is what an annual inspection and an
 * OSP update are scoped to.
 */
export type PeriodChoice = 'current_year' | 'last_12_months' | 'all';

/**
 * A LOCAL calendar date as `YYYY-MM-DD`.
 *
 * 🔴 2026-09-08 — this was `d.toISOString().slice(0, 10)`. `new Date(y, 0, 1)` is local midnight
 * on 1 January; `toISOString()` converts that to UTC, so anywhere EAST of Greenwich it becomes
 * 23:00 on 31 December and the review window was sent to the certifier starting in the WRONG
 * YEAR. `new Date(y, 11, 31)` lost a day the same way. Same class as the two date helpers in
 * `utils/dateOnly.ts`: a calendar date must never be round-tripped through an instant.
 */
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(
    2,
    '0'
  )}`;

export const periodDates = (
  choice: PeriodChoice
): { period_start?: string; period_end?: string } => {
  const now = new Date();
  if (choice === 'current_year') {
    return {
      period_start: iso(new Date(now.getFullYear(), 0, 1)),
      period_end: iso(new Date(now.getFullYear(), 11, 31))
    };
  }
  if (choice === 'last_12_months') {
    const from = new Date(now);
    from.setFullYear(from.getFullYear() - 1);
    return { period_start: iso(from), period_end: iso(now) };
  }
  return {};
};

// `period_start` / `period_end` are backend DateFields — `formatDateOnly` is correct for them.
const formatDate = (value?: string | null) => formatDateOnly(value) ?? null;

// `expires_at` and `last_accessed_at` are DateTimeFields. 🔴 2026-09-08 — they were going through
// `formatDateOnly`, whose `YYYY-MM-DD` pattern does not match an ISO datetime, so they fell
// through to `new Date(...)` and rendered in the VIEWER's zone: an expiry of 2026-12-31T00:00:00Z
// showed as "Dec 30" for every US grower. Exactly the defect `formatDateFromTimestamp` exists for.
const formatTimestampDate = (value?: string | null) => formatDateFromTimestamp(value) ?? null;

// Access-log rows need the time as well as the date: two opens on the same afternoon are a
// certifier working through the records, which a date alone flattens into one indistinguishable
// entry.
const formatDateTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : '';

const EXPIRY_WARNING_DAYS = 30;

/**
 * Badge VARIANT (not colorScheme) for the expiry, by how close it actually is.
 *
 * Must be a variant: the Badge theme's `defaultProps.variant` is `brand` and every one of
 * its variants hardcodes green, so `colorScheme` is silently ignored — a `colorScheme="red"`
 * expiry badge rendered solid green. See theme/components/badge.js.
 *
 * `neutral` is the caller's signal to render plain text instead of a badge at all.
 */
const expiryVariant = (expiresAt?: string | null): 'neutral' | 'warning' | 'danger' => {
  if (!expiresAt) return 'neutral';
  const expiry = new Date(expiresAt).getTime();
  if (Number.isNaN(expiry)) return 'neutral';
  const days = (expiry - Date.now()) / 86_400_000;
  if (days < 0) return 'danger';
  if (days <= EXPIRY_WARNING_DAYS) return 'warning';
  return 'neutral';
};

const CertifierLinkCard: React.FC<Props> = ({ companyId, farmId, canWrite }) => {
  // Minting a link is a Compliance artifact; LISTING and REVOKING are not.
  //
  // The backend gates `perform_create` only (subscriptions/gating.py), deliberately: if a farm
  // lapses to Starter it must still be able to see and withdraw links a certifier already holds,
  // or lapsing strands live tokens the grower can neither view nor revoke. This card therefore
  // stays mounted on Starter and only its CREATE half is replaced — hiding the whole card would
  // honour the paywall and break the revocation path in the same stroke.
  const canMintLinks = useComplianceExports();
  const intl = useIntl();
  const toast = useToast();
  const [label, setLabel] = useState('');
  const [openLog, setOpenLog] = useState<number | null>(null);
  const [showPast, setShowPast] = useState(false);
  const [period, setPeriod] = useState<PeriodChoice>('current_year');
  // Off by default and chosen per link (H-3, 2026-10-18): sharing the files themselves is a
  // decision about THIS certifier, and a downloaded copy outlives revocation.
  const [includeFiles, setIncludeFiles] = useState(false);

  // `= []` is a rendering convenience, not a fact: on a failed request it made the card
  // state "no active links" for a farm that may well have several. Read `isError`.
  const {
    data: links = [],
    isLoading,
    isError,
    isFetching,
    refetch
  } = useGetCertifierLinksQuery({ companyId, farmId });
  const [createLink, { isLoading: creating }] = useCreateCertifierLinkMutation();
  const [revokeLink] = useRevokeCertifierLinkMutation();
  // The backend refuses to mint over a blocker; this mirrors that verdict so the
  // farmer sees WHY the button is disabled instead of clicking into an error.
  const { data: readiness } = useGetOperationReadinessQuery({ companyId, farmId });
  const isBlocked = readiness ? !readiness.ready : false;

  // Buyer-audience links live on the Buyer page's own card; showing them here
  // would imply a certifier can open them (they cannot — cross-audience is 404).
  const activeLinks = links.filter((l) => l.is_active && l.audience !== 'buyer');
  // Revoked and expired links stay listed with their activity (handoff rehearsal 2026-10-18,
  // H-5): the card dropped them, so revoking a link also erased the grower's record of whether
  // the certifier had opened it. The backend always kept those rows. Newest ending first.
  const endedAt = (l: CertifierAccessLink) => l.revoked_at || l.expires_at || '';
  const pastLinks = links
    .filter((l) => !l.is_active && l.audience !== 'buyer')
    .sort((a, b) => endedAt(b).localeCompare(endedAt(a)));

  const handleCreate = async () => {
    try {
      await createLink({
        companyId,
        farmId,
        data: {
          label: label.trim(),
          audience: 'certifier',
          include_source_files: includeFiles,
          ...periodDates(period)
        }
      }).unwrap();
      setLabel('');
      setIncludeFiles(false);
      toast({
        status: 'success',
        title: intl.formatMessage({
          id: 'certifierLink.toast.created',
          defaultMessage: 'Certifier link created'
        })
      });
    } catch (err: unknown) {
      // The readiness guard returns {readiness, blockers:[...]}; String()-ing that
      // object rendered a literal "[object Object]" to the farmer. Name the
      // blockers instead, and fall back to a plain string for anything else.
      //
      // 🌐 2026-09-02: `.title` alone put the server's ENGLISH sentence in the toast of a
      // Spanish-locale farmer — the same defect the dashboard card had. The blockers here are
      // `ReadinessItem`s off the same service, so they carry the same `code`/`params` and
      // resolve through the same mapper; `.title` survives only as its fallback.
      const data = (err as { data?: Record<string, unknown> })?.data;
      const blockers = Array.isArray(data?.blockers)
        ? (data?.blockers as ReadinessItem[])
            .map((b) => resolveReadinessItem(b, intl).title)
            .filter(Boolean)
        : [];
      const description = blockers.length
        ? blockers.join('; ')
        : typeof data?.readiness === 'string'
        ? data.readiness
        : typeof data === 'string'
        ? data
        : intl.formatMessage({
            id: 'certifierLink.toast.createFailedGeneric',
            defaultMessage: 'Please try again.'
          });

      toast({
        status: 'error',
        title: intl.formatMessage({
          id: 'certifierLink.toast.createFailed',
          defaultMessage: 'Could not create the link'
        }),
        description
      });
    }
  };

  const handleCopy = async (link: CertifierAccessLink) => {
    // clipboard.writeText needs a secure context and can reject when the browser
    // withholds permission. Without this the promise rejected unhandled and the
    // farmer got no feedback at all — the link is still selectable in the field
    // beside the button, so say so rather than failing silently.
    try {
      await navigator.clipboard.writeText(reviewUrl(link.token));
      toast({
        status: 'success',
        duration: 2000,
        title: intl.formatMessage({
          id: 'certifierLink.toast.copied',
          defaultMessage: 'Link copied — send it to your certifier'
        })
      });
    } catch {
      toast({
        status: 'warning',
        title: intl.formatMessage({
          id: 'certifierLink.toast.copyFailed',
          defaultMessage: 'Could not copy automatically — select the link and copy it'
        })
      });
    }
  };

  const handleRevoke = async (link: CertifierAccessLink) => {
    try {
      await revokeLink({ companyId, farmId, linkId: link.id }).unwrap();
      toast({
        status: 'info',
        title: intl.formatMessage({
          id: 'certifierLink.toast.revoked',
          defaultMessage: 'Link revoked — it no longer opens'
        })
      });
    } catch (err: unknown) {
      toast({
        status: 'error',
        title: intl.formatMessage({
          id: 'certifierLink.toast.revokeFailed',
          defaultMessage: 'Could not revoke the link'
        })
      });
    }
  };

  /* The access log itself, not just a count. `accesses[]` was already on the wire and typed but
     rendered nowhere, so a farmer could see THAT their certifier opened the link but not WHAT they
     did — and "downloaded the dossier" is a materially different signal from "opened the page".
     Deliberately omits ip_address: that is Trazo's audit trail for abuse investigation, not
     something a farmer needs about a third party. Shared by active and past links. */
  const activityToggle = (link: CertifierAccessLink) =>
    link.accesses.length > 0 && (
      <Link
        as="button"
        type="button"
        fontSize="xs"
        color="green.700"
        fontWeight="medium"
        onClick={() => setOpenLog(openLog === link.id ? null : link.id)}>
        {openLog === link.id
          ? intl.formatMessage({
              id: 'certifierLink.hideActivity',
              defaultMessage: 'Hide activity'
            })
          : intl.formatMessage(
              {
                id: 'certifierLink.showActivity',
                defaultMessage: 'Show activity ({n, plural, one {# open} other {# opens}})'
              },
              { n: link.accesses.length }
            )}
      </Link>
    );

  // `action_display` is the backend's English label; a Spanish-locale grower read "Downloaded
  // dossier" inside a Spanish card (confirmation round, 2026-10-18). The four action codes are
  // the model's ACTION_CHOICES; an unknown code falls back to the server's label.
  const ACTIVITY_LABELS: Record<string, { id: string; defaultMessage: string }> = {
    metadata: { id: 'certifierLink.activity.metadata', defaultMessage: 'Opened link' },
    readiness: {
      id: 'certifierLink.activity.readiness',
      defaultMessage: 'Viewed readiness findings'
    },
    dossier: { id: 'certifierLink.activity.dossier', defaultMessage: 'Downloaded dossier' },
    production: {
      id: 'certifierLink.activity.production',
      defaultMessage: 'Viewed a production page'
    }
  };
  const activityLabel = (entry: CertifierAccessLink['accesses'][number]) => {
    // A source-file open names the file, so the grower sees which invoice was read.
    if (entry.action === 'document') {
      // The file can since have been deleted (SET_NULL): then say a file was opened, not which.
      return entry.document_title
        ? intl.formatMessage(
            {
              id: 'certifierLink.activity.document',
              defaultMessage: 'Opened source file: {title}'
            },
            { title: entry.document_title }
          )
        : intl.formatMessage({
            id: 'certifierLink.activity.documentUntitled',
            defaultMessage: 'Opened a source file'
          });
    }
    const known = ACTIVITY_LABELS[entry.action];
    return known ? intl.formatMessage(known) : entry.action_display;
  };

  const activityLog = (link: CertifierAccessLink) =>
    openLog === link.id &&
    link.accesses.length > 0 && (
      <VStack align="stretch" gap={1} pl={1} pb={1}>
        {link.accesses.map((entry) => (
          <HStack key={entry.id} gap={2} fontSize="xs" color="gray.500">
            <Text>{formatDateTime(entry.accessed_at)}</Text>
            <Text>·</Text>
            <Text>{activityLabel(entry)}</Text>
          </HStack>
        ))}
      </VStack>
    );

  return (
    <StandardCard
      title={intl.formatMessage({
        id: 'certifierLink.title',
        defaultMessage: 'Share with your certifier'
      })}
      variant="elevated"
      padding={{ base: 0, md: 4 }}
      mb={0}>
      <VStack align="stretch" gap={3}>
        <Text fontSize="sm" color="gray.600">
          {intl.formatMessage({
            id: 'certifierLink.description',
            defaultMessage:
              'Send your certifier a link to this operation’s audit dossier. They do not need a Trazo account, the records are always current, and you can revoke access at any time.'
          })}
        </Text>

        {/* What the dossier exposes, said BEFORE the link exists (handoff rehearsal 2026-10-18):
            the description promised "always current" and "revocable" but not what a certifier
            reads. Each line is something the dossier prints (`audit_export_service.py`). */}
        {canWrite && canMintLinks && (
          <Box data-testid="certifier-link-disclosure" fontSize="sm" color="gray.600">
            <Text fontWeight="semibold" color="gray.700">
              {intl.formatMessage({
                id: 'certifierLink.disclosure.title',
                defaultMessage: 'What your certifier will see'
              })}
            </Text>
            <Text>
              {intl.formatMessage({
                id: 'certifierLink.disclosure.intro',
                defaultMessage:
                  'The dossier holds this farm’s records for the period you choose, including:'
              })}
            </Text>
            <Box as="ul" pl={5}>
              {(
                [
                  ['unpublished', 'seasons you have not published on your buyer page'],
                  ['privateNotes', 'your private notes'],
                  ['commercial', 'supplier names, invoice numbers and sale amounts'],
                  ['people', 'the names of the people recorded doing the work'],
                  ['emails', 'the email address of each account that changed a record'],
                  [
                    'corrections',
                    'the change history: who changed which fields, and for each correction the earlier value and the reason'
                  ]
                ] as const
              ).map(([key, defaultMessage]) => (
                <li key={key}>
                  {intl.formatMessage({ id: `certifierLink.disclosure.${key}`, defaultMessage })}
                </li>
              ))}
            </Box>
            <Text>
              {intl.formatMessage({
                id: 'certifierLink.disclosure.documents',
                defaultMessage:
                  'Your documents are listed by title. The files themselves are shared only if you tick “Include source files” below, and a file your certifier downloads stays with them after you revoke the link.'
              })}
            </Text>
          </Box>
        )}

        {canWrite && canMintLinks && (
          <OperationReadinessPanel companyId={companyId} farmId={farmId} variant="preshare" />
        )}

        {canWrite && !canMintLinks && <ComplianceExportsUpsell compact />}

        {canWrite && canMintLinks && (
          <HStack flexDirection={{ base: 'column', smd: 'row' }} gap={2} align="stretch">
            <StandardInput
              size="sm"
              value={label}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLabel(e.target.value)}
              placeholder={intl.formatMessage({
                id: 'certifierLink.labelPlaceholder',
                defaultMessage: 'Label, e.g. CCOF 2026 renewal'
              })}
            />
            <StandardSelect
              size="sm"
              value={period}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setPeriod(e.target.value as PeriodChoice)
              }
              w={{ base: 'full', smd: '13rem' }}
              flexShrink={0}>
              <option value="current_year">
                {intl.formatMessage(
                  {
                    id: 'certifierLink.period.currentYear',
                    defaultMessage: 'Current year ({year})'
                  },
                  { year: new Date().getFullYear() }
                )}
              </option>
              <option value="last_12_months">
                {intl.formatMessage({
                  id: 'certifierLink.period.last12',
                  defaultMessage: 'Last 12 months'
                })}
              </option>
              <option value="all">
                {intl.formatMessage({
                  id: 'certifierLink.period.all',
                  defaultMessage: 'All records'
                })}
              </option>
            </StandardSelect>
            <StandardButton
              size="sm"
              leftIcon={<Icon as={FaLink} />}
              onClick={handleCreate}
              isLoading={creating}
              isDisabled={isBlocked}
              w={{ base: 'full', smd: 'auto' }}
              flexShrink={0}>
              {intl.formatMessage({
                id: 'certifierLink.create',
                defaultMessage: 'Create link'
              })}
            </StandardButton>
          </HStack>
        )}

        {canWrite && canMintLinks && (
          <Checkbox
            colorScheme="green"
            isChecked={includeFiles}
            onChange={(e) => setIncludeFiles(e.target.checked)}
            flexShrink={0}
            minH="32px"
            data-testid="certifier-link-include-files">
            <Text fontSize="sm" color="gray.700">
              {intl.formatMessage({
                id: 'certifierLink.includeFiles',
                defaultMessage: 'Include source files'
              })}
            </Text>
          </Checkbox>
        )}

        {isLoading && (
          <Text fontSize="sm" color="gray.500">
            {intl.formatMessage({ id: 'certifierLink.loading', defaultMessage: 'Loading…' })}
          </Text>
        )}

        {/* `canMintLinks` guards the empty state too. The copy is an INSTRUCTION — "Create one
            when your certifier asks for records" — and on Starter it landed directly beneath the
            note saying creation is part of Compliance, so the card told the farmer to do the one
            thing it had just told them they could not. The upsell above already explains the
            empty case; a second, contradictory sentence adds nothing. */}
        {isError && <StandardQueryError onRetry={refetch} isRetrying={isFetching} />}

        {!isLoading && !isError && canMintLinks && activeLinks.length === 0 && (
          <Text fontSize="sm" color="gray.500">
            {intl.formatMessage({
              id: 'certifierLink.empty',
              defaultMessage: 'No active links. Create one when your certifier asks for records.'
            })}
          </Text>
        )}

        {/* A LIST, not a stack of cards.
            Each link used to be a bordered 180px box holding a full raw URL, three solid
            badges and a heavy outline Revoke button. Six links — normal for a farm that has
            been through a couple of renewals — filled 1,100px and buried every other card on
            the farm profile under a wall of green. Rows now share one hairline-separated list:
            two lines each, meta as quiet text, destructive action de-emphasised until hover. */}
        {activeLinks.map((link, index) => {
          const expiryTone = expiryVariant(link.expires_at);
          return (
            <Box
              key={link.id}
              borderTopWidth={index === 0 ? 0 : '1px'}
              borderColor="gray.100"
              pt={index === 0 ? 0 : 3}>
              <VStack align="stretch" gap={2}>
                <HStack justify="space-between" align="baseline" gap={3} flexWrap="wrap">
                  <Text fontSize="sm" fontWeight="semibold" color="gray.800" minW={0}>
                    {link.label ||
                      intl.formatMessage({
                        id: 'certifierLink.unlabelled',
                        defaultMessage: 'Certifier link'
                      })}
                  </Text>
                  <HStack gap={2} flexWrap="wrap" justify="flex-end">
                    {/* Whether the certifier actually opened it — the thing an emailed PDF can
                        never tell the farmer. Plain text: a count is a fact, and rendering it
                        as a solid green pill made "0 opens" read as reassurance. */}
                    <Tooltip
                      label={
                        link.last_accessed_at
                          ? intl.formatMessage(
                              {
                                id: 'certifierLink.lastOpened',
                                defaultMessage: 'Last opened {date}'
                              },
                              { date: formatTimestampDate(link.last_accessed_at) }
                            )
                          : intl.formatMessage({
                              id: 'certifierLink.neverOpened',
                              defaultMessage: 'Not opened yet'
                            })
                      }>
                      <HStack gap={1} color="gray.500" fontSize="xs">
                        <Icon as={FaEye} boxSize={3} />
                        <Text as="span">{link.access_count}</Text>
                      </HStack>
                    </Tooltip>
                    <Text fontSize="xs" color="gray.400">
                      {link.period_start && link.period_end
                        ? `${formatDate(link.period_start)} – ${formatDate(link.period_end)}`
                        : intl.formatMessage({
                            id: 'certifierLink.period.allShort',
                            defaultMessage: 'All records'
                          })}
                    </Text>
                    {/* The ONE place hue earns its keep: an expired or nearly-expired link is
                        the difference between a certifier reading your records and a certifier
                        hitting a dead page during renewal week. Silent until it matters. */}
                    {link.include_source_files && (
                      <Text fontSize="xs" color="gray.500">
                        {intl.formatMessage({
                          id: 'certifierLink.filesIncluded',
                          defaultMessage: 'Source files included'
                        })}
                      </Text>
                    )}
                    {expiryTone === 'neutral' ? (
                      <Text fontSize="xs" color="gray.400">
                        {intl.formatMessage(
                          { id: 'certifierLink.expires', defaultMessage: 'Expires {date}' },
                          { date: formatTimestampDate(link.expires_at) }
                        )}
                      </Text>
                    ) : (
                      <Badge variant={expiryTone}>
                        {intl.formatMessage(
                          { id: 'certifierLink.expires', defaultMessage: 'Expires {date}' },
                          { date: formatTimestampDate(link.expires_at) }
                        )}
                      </Badge>
                    )}
                  </HStack>
                </HStack>

                <InputGroup size="sm">
                  <StandardInput
                    value={reviewUrl(link.token)}
                    isReadOnly
                    pr="2.5rem"
                    color="gray.600"
                  />
                  <InputRightElement>
                    <StandardButton
                      size="xs"
                      variant="ghost"
                      onClick={() => handleCopy(link)}
                      aria-label={intl.formatMessage({
                        id: 'certifierLink.copy',
                        defaultMessage: 'Copy link'
                      })}>
                      <Icon as={FaCopy} />
                    </StandardButton>
                  </InputRightElement>
                </InputGroup>

                {/* Text actions, not buttons. Two 44px buttons per row × six rows was most of
                    this card's height, and neither is the primary action — creating a link is. */}
                <HStack gap={4}>
                  {activityToggle(link)}
                  {canWrite && (
                    <Link
                      as="button"
                      type="button"
                      fontSize="xs"
                      color="gray.500"
                      fontWeight="medium"
                      _hover={{ color: 'red.600' }}
                      onClick={() => handleRevoke(link)}>
                      {intl.formatMessage({
                        id: 'certifierLink.revoke',
                        defaultMessage: 'Revoke'
                      })}
                    </Link>
                  )}
                </HStack>

                {activityLog(link)}
              </VStack>
            </Box>
          );
        })}

        {!isLoading && !isError && pastLinks.length > 0 && (
          <Box
            borderTopWidth="1px"
            borderColor="gray.100"
            pt={3}
            data-testid="certifier-past-links">
            <Link
              as="button"
              type="button"
              fontSize="xs"
              color="gray.600"
              fontWeight="medium"
              onClick={() => setShowPast(!showPast)}>
              {showPast
                ? intl.formatMessage({
                    id: 'certifierLink.past.hide',
                    defaultMessage: 'Hide past links'
                  })
                : intl.formatMessage(
                    { id: 'certifierLink.past.show', defaultMessage: 'Past links ({n})' },
                    { n: pastLinks.length }
                  )}
            </Link>
            {showPast && (
              <VStack align="stretch" gap={3} mt={2}>
                <Text fontSize="xs" color="gray.500">
                  {intl.formatMessage({
                    id: 'certifierLink.past.help',
                    defaultMessage: 'These links no longer open. Their activity is kept here.'
                  })}
                </Text>
                {pastLinks.map((link) => (
                  <VStack key={link.id} align="stretch" gap={1} data-testid="certifier-past-link">
                    <HStack justify="space-between" align="baseline" gap={3} flexWrap="wrap">
                      <Text fontSize="sm" color="gray.600" minW={0}>
                        {link.label ||
                          intl.formatMessage({
                            id: 'certifierLink.unlabelled',
                            defaultMessage: 'Certifier link'
                          })}
                      </Text>
                      <HStack
                        gap={2}
                        flexWrap="wrap"
                        justify="flex-end"
                        fontSize="xs"
                        color="gray.500">
                        <HStack gap={1}>
                          <Icon as={FaEye} boxSize={3} />
                          <Text as="span">{link.access_count}</Text>
                        </HStack>
                        <Text>
                          {link.is_revoked
                            ? intl.formatMessage(
                                {
                                  id: 'certifierLink.past.revoked',
                                  defaultMessage: 'Revoked {date}'
                                },
                                { date: formatTimestampDate(link.revoked_at) }
                              )
                            : intl.formatMessage(
                                {
                                  id: 'certifierLink.past.expired',
                                  defaultMessage: 'Expired {date}'
                                },
                                { date: formatTimestampDate(link.expires_at) }
                              )}
                        </Text>
                      </HStack>
                    </HStack>
                    <HStack gap={4}>{activityToggle(link)}</HStack>
                    {activityLog(link)}
                  </VStack>
                ))}
              </VStack>
            )}
          </Box>
        )}
      </VStack>
    </StandardCard>
  );
};

export default CertifierLinkCard;
