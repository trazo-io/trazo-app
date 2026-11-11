/**
 * Change the login email from the profile (overall review 2026-11, OV-SEC-C03).
 *
 * Needs the current password; the new address gets a link, the old one a notice, and nothing
 * changes until the link is opened (views/Authentication/ConfirmEmailChange). The email used to
 * be an ordinary profile field: a borrowed session could move the account to another mailbox
 * with one save.
 */
import React, { useState } from 'react';
import { useIntl } from 'react-intl';
import {
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  VStack
} from '@chakra-ui/react';

import { StandardButton, StandardField, StandardInput } from 'components/Design/StandardComponents';
import { useRequestEmailChangeMutation } from 'store/api/userApi';

// The API's refusal codes, each with its own words in the catalogue.
const ERROR_KEYS: Record<string, { field: 'email' | 'password'; id: string }> = {
  wrong_password: { field: 'password', id: 'account.email.error.wrongPassword' },
  invalid_email: { field: 'email', id: 'account.email.error.invalid' },
  same_email: { field: 'email', id: 'account.email.error.same' },
  email_taken: { field: 'email', id: 'account.email.error.taken' },
  rate_limited: { field: 'email', id: 'account.email.error.rateLimited' }
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentEmail: string;
}

const ChangeEmailModal: React.FC<Props> = ({ isOpen, onClose, currentEmail }) => {
  const intl = useIntl();
  const t = (id: string, values?: Record<string, string>) => intl.formatMessage({ id }, values);
  const [requestEmailChange, { isLoading }] = useRequestEmailChangeMutation();
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<{ field: 'email' | 'password'; message: string } | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const close = () => {
    setNewEmail('');
    setPassword('');
    setError(null);
    setSentTo(null);
    onClose();
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      const result = await requestEmailChange({ newEmail: newEmail.trim(), password }).unwrap();
      setSentTo(result.pending_email);
      setPassword('');
    } catch (err: any) {
      const known = ERROR_KEYS[err?.data?.code];
      setError(
        known
          ? { field: known.field, message: t(known.id) }
          : { field: 'email', message: t('account.email.error.generic') }
      );
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={close} size="md">
      <ModalOverlay />
      <ModalContent mx={4}>
        <ModalHeader fontSize="lg">{t('account.email.title')}</ModalHeader>
        <ModalCloseButton />
        {sentTo ? (
          <>
            <ModalBody>
              <Text fontSize="sm" color="gray.700" data-testid="email-change-sent">
                {t('account.email.sent', { email: sentTo })}
              </Text>
            </ModalBody>
            <ModalFooter>
              <StandardButton variant="primary" onClick={close}>
                {t('account.email.done')}
              </StandardButton>
            </ModalFooter>
          </>
        ) : (
          <form onSubmit={submit}>
            <ModalBody>
              <VStack align="stretch" spacing={4}>
                <Text fontSize="sm" color="gray.600">
                  {t('account.email.intro', { email: currentEmail })}
                </Text>
                <StandardField
                  label={t('account.email.new')}
                  required
                  error={error?.field === 'email' ? error.message : undefined}>
                  <StandardInput
                    type="email"
                    autoComplete="email"
                    value={newEmail}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewEmail(e.target.value)
                    }
                  />
                </StandardField>
                <StandardField
                  label={t('account.password.current')}
                  required
                  error={error?.field === 'password' ? error.message : undefined}>
                  <StandardInput
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setPassword(e.target.value)
                    }
                  />
                </StandardField>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <StandardButton
                type="submit"
                variant="primary"
                isLoading={isLoading}
                isDisabled={!newEmail.trim() || !password}>
                {t('account.email.submit')}
              </StandardButton>
            </ModalFooter>
          </form>
        )}
      </ModalContent>
    </Modal>
  );
};

export default ChangeEmailModal;
