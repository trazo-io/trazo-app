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
  Input,
  InputGroup,
  Select,
  InputRightElement,
  Text,
  Tooltip,
  useToast,
  VStack
} from '@chakra-ui/react';
import { FaCopy, FaEye, FaLink, FaTimes } from 'react-icons/fa';
import { useIntl } from 'react-intl';

import { StandardButton, StandardCard } from 'components/Design/StandardComponents';
import {
  useCreateCertifierLinkMutation,
  useGetCertifierLinksQuery,
  useGetOperationReadinessQuery,
  useRevokeCertifierLinkMutation,
  type CertifierAccessLink
} from 'store/api/certifierLinkApi';
import OperationReadinessPanel from './OperationReadinessPanel';

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

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString(undefined, { dateStyle: 'medium' }) : null;

const CertifierLinkCard: React.FC<Props> = ({ companyId, farmId, canWrite }) => {
  const intl = useIntl();
  const toast = useToast();
  const [label, setLabel] = useState('');
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
    >
      <VStack align="stretch" spacing={3}>
        <Text fontSize="sm" color="gray.600">
          {intl.formatMessage({
            id: 'certifierLink.description',
            defaultMessage:
              'Send your certifier a link to this operation’s audit dossier. They do not need a Trazo account, the records are always current, and you can revoke access at any time.'
          })}
        </Text>

        {canWrite && (
          <OperationReadinessPanel companyId={companyId} farmId={farmId} variant="preshare" />
        )}

        {canWrite && (
          <HStack flexDirection={{ base: 'column', smd: 'row' }} spacing={2} align="stretch">
            <Input
              size="sm"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={intl.formatMessage({
                id: 'certifierLink.labelPlaceholder',
                defaultMessage: 'Label, e.g. CCOF 2026 renewal'
              })}
            />
            <Select
              size="sm"
              value={period}
              onChange={(e) => setPeriod(e.target.value as PeriodChoice)}
              w={{ base: 'full', smd: '13rem' }}
              flexShrink={0}
            >
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
            </Select>
            <StandardButton
              size="sm"
              leftIcon={<Icon as={FaLink} />}
              onClick={handleCreate}
              isLoading={creating}
              isDisabled={isBlocked}
              w={{ base: 'full', smd: 'auto' }}
              flexShrink={0}
            >
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

        {!isLoading && activeLinks.length === 0 && (
          <Text fontSize="sm" color="gray.500">
            {intl.formatMessage({
              id: 'certifierLink.empty',
              defaultMessage: 'No active links. Create one when your certifier asks for records.'
            })}
          </Text>
        )}

        {activeLinks.map((link) => (
          <Box key={link.id} borderWidth="1px" borderColor="gray.200" borderRadius="md" p={3}>
            <VStack align="stretch" spacing={2}>
              <HStack justify="space-between" flexWrap="wrap">
                <Text fontSize="sm" fontWeight="semibold" color="gray.800">
                  {link.label ||
                    intl.formatMessage({
                      id: 'certifierLink.unlabelled',
                      defaultMessage: 'Certifier link'
                    })}
                </Text>
                <HStack spacing={2}>
                  {/* Whether the certifier actually opened it — the thing an
                      emailed PDF can never tell the farmer. */}
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
                    }
                  >
                    <Badge colorScheme={link.access_count > 0 ? 'green' : 'gray'}>
                      <HStack spacing={1}>
                        <Icon as={FaEye} boxSize={3} />
                        <Text as="span">{link.access_count}</Text>
                      </HStack>
                    </Badge>
                  </Tooltip>
                  <Badge colorScheme="purple">
                    {link.period_start && link.period_end
                      ? `${formatDate(link.period_start)} – ${formatDate(link.period_end)}`
                      : intl.formatMessage({
                          id: 'certifierLink.period.allShort',
                          defaultMessage: 'All records'
                        })}
                  </Badge>
                  <Badge colorScheme="blue">
                    {intl.formatMessage(
                      {
                        id: 'certifierLink.expires',
                        defaultMessage: 'Expires {date}'
                      },
                      { date: formatDate(link.expires_at) }
                    )}
                  </Badge>
                </HStack>
              </HStack>

              <InputGroup size="sm">
                <Input value={reviewUrl(link.token)} isReadOnly fontSize="xs" pr="2.5rem" />
                <InputRightElement>
                  <StandardButton
                    size="xs"
                    variant="ghost"
                    onClick={() => handleCopy(link)}
                    aria-label={intl.formatMessage({
                      id: 'certifierLink.copy',
                      defaultMessage: 'Copy link'
                    })}
                  >
                    <Icon as={FaCopy} />
                  </StandardButton>
                </InputRightElement>
              </InputGroup>

              {canWrite && (
                <StandardButton
                  size="xs"
                  variant="outline"
                  colorScheme="red"
                  alignSelf="flex-start"
                  leftIcon={<Icon as={FaTimes} />}
                  onClick={() => handleRevoke(link)}
                >
                  {intl.formatMessage({
                    id: 'certifierLink.revoke',
                    defaultMessage: 'Revoke'
                  })}
                </StandardButton>
              )}
            </VStack>
          </Box>
        ))}
      </VStack>
    </StandardCard>
  );
};

export default CertifierLinkCard;
