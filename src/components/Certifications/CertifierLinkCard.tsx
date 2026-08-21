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
import React, { useState } from 'react';
import {
  Badge,
  Box,
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
  type CertifierAccessLink
} from 'store/api/certifierLinkApi';
import OperationReadinessPanel from './OperationReadinessPanel';
import { formatDateOnly } from 'utils/dateOnly';
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
type PeriodChoice = 'current_year' | 'last_12_months' | 'all';

const iso = (d: Date) => d.toISOString().slice(0, 10);

const periodDates = (choice: PeriodChoice): { period_start?: string; period_end?: string } => {
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

// Byte-identical twin of the CertifierReview helper; same DateField inputs, same one-day shift.
const formatDate = (value?: string | null) => formatDateOnly(value) ?? null;

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
  const [period, setPeriod] = useState<PeriodChoice>('current_year');

  const { data: links = [], isLoading } = useGetCertifierLinksQuery({ companyId, farmId });
  const [createLink, { isLoading: creating }] = useCreateCertifierLinkMutation();
  const [revokeLink] = useRevokeCertifierLinkMutation();
  // The backend refuses to mint over a blocker; this mirrors that verdict so the
  // farmer sees WHY the button is disabled instead of clicking into an error.
  const { data: readiness } = useGetOperationReadinessQuery({ companyId, farmId });
  const isBlocked = readiness ? !readiness.ready : false;

  const activeLinks = links.filter((l) => l.is_active);

  const handleCreate = async () => {
    try {
      await createLink({
        companyId,
        farmId,
        data: { label: label.trim(), ...periodDates(period) }
      }).unwrap();
      setLabel('');
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
      const data = (err as { data?: Record<string, unknown> })?.data;
      const blockers = Array.isArray(data?.blockers)
        ? (data?.blockers as Array<{ title?: string }>).map((b) => b.title).filter(Boolean)
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

  return (
    <StandardCard
      title={intl.formatMessage({
        id: 'certifierLink.title',
        defaultMessage: 'Share with your certifier'
      })}
      variant="elevated"
      padding={{ base: 3, md: 4 }}
      mb={0}>
      <VStack align="stretch" gap={3}>
        <Text fontSize="sm" color="gray.600">
          {intl.formatMessage({
            id: 'certifierLink.description',
            defaultMessage:
              'Send your certifier a link to this operation’s audit dossier. They do not need a Trazo account, the records are always current, and you can revoke access at any time.'
          })}
        </Text>

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
        {!isLoading && canMintLinks && activeLinks.length === 0 && (
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
                              { date: formatDate(link.last_accessed_at) }
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
                    {expiryTone === 'neutral' ? (
                      <Text fontSize="xs" color="gray.400">
                        {intl.formatMessage(
                          { id: 'certifierLink.expires', defaultMessage: 'Expires {date}' },
                          { date: formatDate(link.expires_at) }
                        )}
                      </Text>
                    ) : (
                      <Badge variant={expiryTone}>
                        {intl.formatMessage(
                          { id: 'certifierLink.expires', defaultMessage: 'Expires {date}' },
                          { date: formatDate(link.expires_at) }
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
                  {/* The access log itself, not just a count. `accesses[]` was already on the
                      wire and typed but rendered nowhere, so a farmer could see THAT their
                      certifier opened the link but not WHAT they did — and "downloaded the
                      dossier" is a materially different signal from "opened the page".
                      Deliberately omits ip_address: that is Trazo's audit trail for abuse
                      investigation, not something a farmer needs about a third party. */}
                  {link.accesses.length > 0 && (
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
                              defaultMessage:
                                'Show activity ({n, plural, one {# open} other {# opens}})'
                            },
                            { n: link.accesses.length }
                          )}
                    </Link>
                  )}
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

                {openLog === link.id && link.accesses.length > 0 && (
                  <VStack align="stretch" gap={1} pl={1} pb={1}>
                    {link.accesses.map((entry) => (
                      <HStack key={entry.id} gap={2} fontSize="xs" color="gray.500">
                        <Text>{formatDateTime(entry.accessed_at)}</Text>
                        <Text>·</Text>
                        <Text>{entry.action_display}</Text>
                      </HStack>
                    ))}
                  </VStack>
                )}
              </VStack>
            </Box>
          );
        })}
      </VStack>
    </StandardCard>
  );
};

export default CertifierLinkCard;
