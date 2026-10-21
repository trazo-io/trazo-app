/**
 * "Trace a sale" on the certifier review link: the inspector's own trace-back, done remotely.
 *
 * Same chain as the operation's Traceback page (`TraceChain`), read-only: missing links are stated
 * as facts, with no "how to fix" and no fix buttons. The server scopes everything to this link's
 * farm and window, logs every request on the grower's card, and applies the link's hourly ceiling.
 * A file opens through the token route only when the grower included source files; otherwise it
 * is named as on file but not shared through this link.
 *
 * Anonymous by design, like the rest of this page: no credentials on any request.
 */
import React, { useState } from 'react';
import { Box, Divider, Heading, HStack, Stack, Text, VStack } from '@chakra-ui/react';
import { FaRandom, FaSearch } from 'react-icons/fa';
import { useIntl } from 'react-intl';

import {
  StandardAlert,
  StandardButton,
  StandardSearchInput,
  StandardSpinner
} from 'components/Design/StandardComponents';
import TraceChain, { type TraceDoc } from 'components/Traceback/TraceChain';

type Match = {
  sale_id: number;
  date: string;
  buyer: string;
  invoice: string;
  crop: string;
  parcel: string;
  season: string;
  matched_on: string;
};

type State =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'matches'; matches: Match[]; truncated: boolean; random: boolean }
  | { kind: 'trace'; trace: any }
  | { kind: 'error'; status: number };

interface Props {
  token: string;
  apiRoot: string;
}

export const ReviewTraceback = ({ token, apiRoot }: Props) => {
  const intl = useIntl();
  const t = (id: string, values?: Record<string, string | number>) =>
    intl.formatMessage({ id }, values);
  const [text, setText] = useState('');
  const [state, setState] = useState<State>({ kind: 'idle' });
  const base = `${apiRoot}/certifier-review/${token}/traceback/`;

  const openSale = async (saleId: number) => {
    setState({ kind: 'loading' });
    const res = await fetch(`${base}${saleId}/`).catch(() => null);
    if (!res || !res.ok) return setState({ kind: 'error', status: res?.status ?? 0 });
    setState({ kind: 'trace', trace: await res.json() });
  };

  const search = async (params: URLSearchParams, random: boolean) => {
    setState({ kind: 'loading' });
    const res = await fetch(`${base}?${params}`).catch(() => null);
    if (!res || !res.ok) return setState({ kind: 'error', status: res?.status ?? 0 });
    const body = await res.json();
    // One match is the sale; several are the reviewer's choice, never this page's.
    if (body.results.length === 1) return openSale(body.results[0].sale_id);
    setState({ kind: 'matches', matches: body.results, truncated: body.truncated, random });
  };

  return (
    <Box w="full" data-testid="certifier-traceback">
      <Divider mb={4} />
      <Heading size="sm" color="gray.700" mb={1}>
        {t('certifierReview.traceback.title')}
      </Heading>
      <Text fontSize="sm" color="gray.600" mb={3}>
        {t('certifierReview.traceback.help')}
      </Text>
      <Box
        as="form"
        onSubmit={(e: React.FormEvent) => {
          e.preventDefault();
          if (text.trim()) search(new URLSearchParams({ q: text.trim() }), false);
        }}>
        <Stack direction={{ base: 'column', md: 'row' }} spacing={3}>
          <StandardSearchInput
            flex={1}
            value={text}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setText(e.target.value)}
            placeholder={t('traceback.search.placeholder')}
          />
          <StandardButton type="submit" leftIcon={<FaSearch />} isDisabled={!text.trim()}>
            {t('traceback.search.submit')}
          </StandardButton>
          <StandardButton
            variant="outline"
            leftIcon={<FaRandom />}
            onClick={() => search(new URLSearchParams({ random: '1' }), true)}>
            {t('traceback.search.random')}
          </StandardButton>
        </Stack>
      </Box>

      <Box mt={4}>
        {state.kind === 'loading' && <StandardSpinner />}
        {state.kind === 'error' && (
          // 404 = not on this link (another farm, outside its window, voided). 429 or a network
          // failure is temporary, never read as a withdrawn link (reviewLinkFailure.ts).
          <StandardAlert
            status={state.status === 404 ? 'info' : 'warning'}
            mb={0}
            description={t(
              state.status === 404
                ? 'certifierReview.traceback.notFound'
                : 'certifierReview.traceback.unavailable'
            )}
          />
        )}
        {state.kind === 'matches' && state.matches.length === 0 && (
          <StandardAlert
            status="info"
            mb={0}
            description={t(
              state.random
                ? 'certifierReview.traceback.noRecentSale'
                : 'certifierReview.traceback.noMatch'
            )}
          />
        )}
        {state.kind === 'matches' && state.matches.length > 1 && (
          <VStack align="stretch" spacing={2}>
            <Text fontWeight="semibold">
              {t('traceback.matches.title', { count: state.matches.length })}
            </Text>
            <Text fontSize="sm" color="gray.600">
              {t('traceback.matches.subtitle')}
            </Text>
            {state.truncated && (
              <StandardAlert status="info" mb={0} description={t('traceback.matches.truncated')} />
            )}
            {state.matches.map((m) => (
              <HStack
                key={m.sale_id}
                justify="space-between"
                borderWidth="1px"
                borderRadius="md"
                p={3}
                spacing={3}>
                <Box flex={1} minW={0}>
                  <Text fontWeight="semibold">
                    {[m.date, m.buyer, m.invoice].filter(Boolean).join(' · ')}
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    {[m.crop, m.parcel, m.season].filter(Boolean).join(' · ')} ·{' '}
                    {t(`traceback.matchedOn.${m.matched_on}`)}
                  </Text>
                </Box>
                <StandardButton size="sm" flexShrink={0} onClick={() => openSale(m.sale_id)}>
                  {t('traceback.matches.trace')}
                </StandardButton>
              </HStack>
            ))}
          </VStack>
        )}
        {state.kind === 'trace' && (
          <TraceChain
            trace={state.trace}
            fileHref={(d: TraceDoc) =>
              d.file_id ? `${apiRoot}/certifier-review/${token}/documents/${d.file_id}/` : null
            }
          />
        )}
      </Box>
    </Box>
  );
};

export default ReviewTraceback;
