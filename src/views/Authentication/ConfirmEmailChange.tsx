/**
 * The page the email-change link opens (overall review 2026-11, OV-SEC-C03).
 *
 * The change applies only when the person presses Confirm here: a mail scanner that fetches the
 * link must not change anyone's login. Confirming ends every session on the account, this
 * browser's included, so the page clears the local sign-in and sends the person to sign in with
 * the new address.
 *
 * Mounted outside the signed-out-only routes: the link is often opened in a browser that is
 * still signed in, and those routes would redirect it to the dashboard before it could confirm.
 */
import React, { useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Heading, Text, VStack } from '@chakra-ui/react';

import { StandardButton, StandardCard } from 'components/Design/StandardComponents';
import { useConfirmEmailChangeMutation } from 'store/api/userApi';
import { clearLocalSession } from 'store/clearLocalSession';

type State =
  | { kind: 'ready'; retry?: boolean }
  | { kind: 'done'; email: string }
  | { kind: 'invalid'; reason: 'link' | 'taken' };

// The API's answers that END this link. Anything else (a network error, a 500, a rate limit) leaves
// the button up to try again: telling someone a valid link is dead sends them to replace it.
const TERMINAL: Record<string, 'link' | 'taken'> = { invalid_link: 'link', email_taken: 'taken' };

const ConfirmEmailChange: React.FC = () => {
  const intl = useIntl();
  const t = (id: string, values?: Record<string, string>) => intl.formatMessage({ id }, values);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [confirmEmailChange, { isLoading }] = useConfirmEmailChangeMutation();
  const [state, setState] = useState<State>(
    token ? { kind: 'ready' } : { kind: 'invalid', reason: 'link' }
  );

  const confirm = async () => {
    try {
      const result = await confirmEmailChange({ token }).unwrap();
      // Every session on the account just ended: drop everything this tab holds, as Sign out does.
      clearLocalSession(dispatch);
      setState({ kind: 'done', email: result.email });
    } catch (err: any) {
      const reason = TERMINAL[err?.data?.code];
      setState(reason ? { kind: 'invalid', reason } : { kind: 'ready', retry: true });
    }
  };

  return (
    <Box w="full" maxW="md" mx="auto" px={4} py={{ base: 8, md: 16 }}>
      <StandardCard mb={0}>
        <VStack align="stretch" spacing={4}>
          <Heading as="h1" size="md" color="gray.800">
            {t(
              state.kind === 'done'
                ? 'account.email.confirm.doneTitle'
                : state.kind === 'invalid'
                ? 'account.email.confirm.invalidTitle'
                : 'account.email.confirm.title'
            )}
          </Heading>
          {state.kind === 'ready' && (
            <>
              <Text fontSize="sm" color="gray.600">
                {t('account.email.confirm.body')}
              </Text>
              {state.retry && (
                <Text fontSize="sm" color="red.700" data-testid="email-change-retry">
                  {t('account.email.confirm.retry')}
                </Text>
              )}
              <StandardButton
                variant="primary"
                onClick={confirm}
                isLoading={isLoading}
                alignSelf="flex-start">
                {t('account.email.confirm.submit')}
              </StandardButton>
            </>
          )}
          {state.kind === 'done' && (
            <>
              <Text fontSize="sm" color="gray.700" data-testid="email-change-done">
                {t('account.email.confirm.done', { email: state.email })}
              </Text>
              <StandardButton
                variant="primary"
                onClick={() => navigate('/auth/signin')}
                alignSelf="flex-start">
                {t('account.email.confirm.signIn')}
              </StandardButton>
            </>
          )}
          {state.kind === 'invalid' && (
            <Text fontSize="sm" color="gray.700" data-testid="email-change-invalid">
              {t(
                state.reason === 'taken'
                  ? 'account.email.confirm.taken'
                  : 'account.email.confirm.invalid'
              )}
            </Text>
          )}
        </VStack>
      </StandardCard>
    </Box>
  );
};

export default ConfirmEmailChange;
