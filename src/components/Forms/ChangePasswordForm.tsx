/**
 * Change your own password: current, new, confirm. Used by the producer page
 * (views/Settings/ChangePassword) and the consumer one.
 *
 * 2026-11-10: every label, placeholder, rule and message was an English literal, so the form
 * stayed English in Spanish. It now reads the catalogue, and the strength meter and rule list
 * are the sign-up form's own `PasswordStrengthIndicator` (already translated) instead of a
 * second hand-written copy of the same five rules.
 *
 * The page carries the title, so the card has none (it said "Change Password" twice).
 */
import React, { useState } from 'react';
import { useIntl } from 'react-intl';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import {
  Flex,
  VStack,
  useToast,
  InputGroup,
  InputRightElement,
  IconButton
} from '@chakra-ui/react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { useChangePasswordMutation } from '../../store/api/authApi';
import {
  DEFAULT_REQUIREMENTS,
  passwordValidator,
  PasswordValidationResult
} from '../../utils/passwordValidation';
import {
  StandardCard,
  StandardField,
  StandardInput,
  StandardButton
} from '../Design/StandardComponents';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';

interface ChangePasswordFormData {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface ChangePasswordFormProps {
  userType: 'producer' | 'consumer';
}

// The API answers a wrong current password with this English sentence (users/views.py
// `change_password`). It belongs on the field, in the reader's language.
const WRONG_CURRENT = 'Current password is incorrect';

/**
 * The server's password validators (AUTH_PASSWORD_VALIDATORS: Django's three built-ins plus
 * trazo-back/backend/security/password_validators.py) answer in English sentences, with no
 * code in the response. Each known sentence maps to a catalogue key, so the reason reaches the
 * reader in their language; anything unknown gets the generic translated failure, never the raw
 * English (review of #354). Parity with the backend file: changePasswordServerMessages.test.ts.
 */
export const SERVER_PASSWORD_MESSAGES: Array<[RegExp, string]> = [
  [/too similar to the/i, 'account.password.server.similar'],
  [/too common|common words or predictable patterns/i, 'account.password.server.common'],
  [/entirely numeric/i, 'account.password.server.numeric'],
  [/at least \d+ characters/i, 'account.password.server.tooShort'],
  [/^Password must contain /i, 'account.password.server.complexity'],
  [/too simple/i, 'account.password.server.simple'],
  [/found in data breaches/i, 'account.password.server.breached'],
  [/cannot contain your (email|first name|last name)/i, 'account.password.server.personal'],
  [/sequential|keyboard patterns/i, 'account.password.server.sequential']
];

export const serverPasswordMessageKey = (message: string): string | null =>
  SERVER_PASSWORD_MESSAGES.find(([pattern]) => pattern.test(message))?.[1] ?? null;

export const ChangePasswordForm: React.FC<ChangePasswordFormProps> = ({ userType }) => {
  const navigate = useNavigate();
  const intl = useIntl();
  const t = (id: string, values?: Record<string, string | number>) =>
    intl.formatMessage({ id }, values);
  const toast = useToast();
  const [changePassword, { isLoading }] = useChangePasswordMutation();

  const [show, setShow] = useState({ old: false, new: false, confirm: false });
  const [validation, setValidation] = useState<PasswordValidationResult | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setError
  } = useForm<ChangePasswordFormData>();

  const newPassword = watch('newPassword');

  React.useEffect(() => {
    setValidation(newPassword ? passwordValidator.validate(newPassword) : null);
  }, [newPassword]);

  const onSubmit = async (data: ChangePasswordFormData) => {
    // The rule list under the field shows which rule is unmet; the toast only says so. The
    // validator's own sentences are English, so they are not repeated here.
    if (!passwordValidator.validate(data.newPassword).isValid) {
      toast({
        title: t('auth.password.toast.requirementsNotMet'),
        status: 'error',
        duration: 5000,
        isClosable: true
      });
      return;
    }

    try {
      await changePassword({
        old_password: data.oldPassword,
        new_password: data.newPassword
      }).unwrap();

      toast({
        title: t('auth.changePassword.toast.success.title'),
        description: t('auth.changePassword.toast.success.body'),
        status: 'success',
        duration: 5000,
        isClosable: true
      });

      navigate(userType === 'producer' ? '/auth' : '/consumidor/auth');
    } catch (error: any) {
      const serverMessage = error?.data?.detail || error?.data?.error;
      if (serverMessage === WRONG_CURRENT) {
        setError('oldPassword', { type: 'server', message: t('account.password.wrongCurrent') });
        return;
      }
      // A rule the server applied to the NEW password belongs on that field, translated.
      const messages: string[] = Array.isArray(serverMessage)
        ? serverMessage
        : serverMessage
        ? [serverMessage]
        : [];
      const ruleKey = messages.map(serverPasswordMessageKey).find(Boolean);
      if (ruleKey) {
        setError('newPassword', {
          type: 'server',
          message: t(ruleKey, { min: DEFAULT_REQUIREMENTS.minLength })
        });
        return;
      }
      toast({
        title: t('app.error'),
        description: t('auth.changePassword.toast.failed.body'),
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  };

  const toggle = (field: keyof typeof show) => (
    <InputRightElement>
      <IconButton
        aria-label={show[field] ? t('auth.password.hide') : t('auth.password.show')}
        icon={show[field] ? <FaEyeSlash /> : <FaEye />}
        onClick={() => setShow((s) => ({ ...s, [field]: !s[field] }))}
        variant="ghost"
        size="sm"
      />
    </InputRightElement>
  );

  return (
    <StandardCard mb={0}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <VStack spacing={6} align="stretch">
          <StandardField
            label={t('account.password.current')}
            required
            error={errors.oldPassword?.message}>
            <InputGroup>
              <StandardInput
                type={show.old ? 'text' : 'password'}
                autoComplete="current-password"
                {...register('oldPassword', {
                  required: t('account.password.currentRequired')
                })}
              />
              {toggle('old')}
            </InputGroup>
          </StandardField>

          <StandardField
            label={t('account.password.new')}
            required
            error={errors.newPassword?.message}>
            <InputGroup>
              <StandardInput
                type={show.new ? 'text' : 'password'}
                autoComplete="new-password"
                {...register('newPassword', {
                  required: t('account.password.newRequired'),
                  minLength: {
                    value: DEFAULT_REQUIREMENTS.minLength,
                    message: t('account.password.minLength', {
                      min: DEFAULT_REQUIREMENTS.minLength
                    })
                  }
                })}
              />
              {toggle('new')}
            </InputGroup>
            <PasswordStrengthIndicator password={newPassword} validation={validation} />
          </StandardField>

          <StandardField
            label={t('account.password.confirm')}
            required
            error={errors.confirmPassword?.message}>
            <InputGroup>
              <StandardInput
                type={show.confirm ? 'text' : 'password'}
                autoComplete="new-password"
                {...register('confirmPassword', {
                  required: t('account.password.confirmRequired'),
                  validate: (value) => value === newPassword || t('account.password.mismatch')
                })}
              />
              {toggle('confirm')}
            </InputGroup>
          </StandardField>

          <Flex justify="flex-end">
            <StandardButton
              type="submit"
              variant="primary"
              isLoading={isLoading}
              loadingText={t('account.password.submitting')}>
              {t('account.password.submit')}
            </StandardButton>
          </Flex>
        </VStack>
      </form>
    </StandardCard>
  );
};
