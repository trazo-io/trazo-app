/**
 * What WSDA's Additional Facilities and Third-Parties form (AGR 2519) asks of a facility another
 * operation runs, that its record does not already hold: the street address and zip code, which of
 * the form's activities happen there, and, for a third party with no certificate number on file, how
 * it is exempt from certification (§ 205.101). The copy sheet fills the form from these, one per
 * facility; nothing here ticks the form's own boxes.
 */
import React, { useEffect, useState } from 'react';
import { HStack, Text, useToast, VStack } from '@chakra-ui/react';
import { useIntl } from 'react-intl';

import {
  StandardButton,
  StandardCheckboxList,
  StandardField,
  StandardInput,
  StandardTextarea
} from 'components/Design/StandardComponents';
import {
  ACTIVITY_GROUPS,
  ACTIVITY_KEYS,
  activityGroupMessageId,
  activityMessageId
} from 'config/facilityActivities';
import {
  useUpdatePostHarvestFacilityMutation,
  type PostHarvestFacility
} from 'store/api/postHarvestFacilityApi';
import { apiErrorMessage } from 'utils/apiErrorMessage';

interface Draft {
  address: string;
  city: string;
  state: string;
  postal_code: string;
  activities: string[];
  exemption_basis: string;
}

const fromFacility = (facility: PostHarvestFacility): Draft => ({
  address: facility.address ?? '',
  city: facility.city ?? '',
  state: facility.state ?? '',
  postal_code: facility.postal_code ?? '',
  activities: facility.activities ?? [],
  exemption_basis: facility.exemption_basis ?? ''
});

const sameDraft = (a: Draft, b: Draft) =>
  a.address === b.address &&
  a.city === b.city &&
  a.state === b.state &&
  a.postal_code === b.postal_code &&
  a.exemption_basis === b.exemption_basis &&
  [...a.activities].sort().join() === [...b.activities].sort().join();

const FacilityAgr2519Editor = ({
  facility,
  companyId,
  farmId
}: {
  facility: PostHarvestFacility;
  companyId: string;
  farmId: string;
}) => {
  const intl = useIntl();
  const toast = useToast();
  const saved = fromFacility(facility);
  const [draft, setDraft] = useState<Draft>(saved);
  // What the server held when this edit began. Untouched, the editor follows the server; edited, it
  // keeps the edit (the products editor's rule).
  const [base, setBase] = useState<Draft>(saved);
  useEffect(() => {
    if (sameDraft(saved, base)) return;
    if (sameDraft(draft, base)) setDraft(saved);
    setBase(saved);
  }, [facility]);
  const [update, { isLoading }] = useUpdatePostHarvestFacilityMutation();
  const uncertified = !(facility.certification_number ?? '').trim();

  const save = async () => {
    try {
      await update({
        companyId,
        farmId,
        facilityId: facility.id,
        data: {
          address: draft.address,
          city: draft.city,
          state: draft.state,
          postal_code: draft.postal_code,
          // The form's order, whatever order they were ticked in. A key this bundle does not know (a
          // newer server) is kept as it was, never dropped by a save of another field (review of #328).
          activities: [
            ...ACTIVITY_KEYS.filter((key) => draft.activities.includes(key)),
            ...draft.activities.filter((key) => !ACTIVITY_KEYS.includes(key))
          ],
          ...(uncertified ? { exemption_basis: draft.exemption_basis } : {})
        }
      }).unwrap();
    } catch (err) {
      toast({
        status: 'error',
        title: intl.formatMessage({ id: 'handler.toast.createError' }),
        description: apiErrorMessage(err) ?? undefined
      });
    }
  };

  return (
    <VStack align="stretch" spacing={2} data-testid={`facility-agr2519-${facility.id}`}>
      <Text fontSize="sm" fontWeight="semibold">
        {facility.name}
      </Text>
      <HStack spacing={3} align="flex-start" flexWrap="wrap">
        <StandardField label={intl.formatMessage({ id: 'handler.agr2519.address' })}>
          <StandardInput
            value={draft.address}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setDraft({ ...draft, address: e.target.value })
            }
          />
        </StandardField>
        <StandardField label={intl.formatMessage({ id: 'handler.field.city' })}>
          <StandardInput
            value={draft.city}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setDraft({ ...draft, city: e.target.value })
            }
          />
        </StandardField>
        <StandardField label={intl.formatMessage({ id: 'handler.field.state' })}>
          <StandardInput
            maxW="120px"
            value={draft.state}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setDraft({ ...draft, state: e.target.value })
            }
          />
        </StandardField>
        <StandardField label={intl.formatMessage({ id: 'handler.agr2519.postalCode' })}>
          <StandardInput
            maxW="140px"
            value={draft.postal_code}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setDraft({ ...draft, postal_code: e.target.value })
            }
          />
        </StandardField>
      </HStack>
      <Text fontSize="sm" fontWeight="medium" color="gray.700">
        {intl.formatMessage({ id: 'handler.agr2519.activities' })}
      </Text>
      {ACTIVITY_GROUPS.map(({ group, keys }) => (
        <StandardCheckboxList
          key={group}
          legend={intl.formatMessage({ id: activityGroupMessageId(group) })}
          options={keys.map((key) => ({
            value: key,
            label: intl.formatMessage({ id: activityMessageId(key) })
          }))}
          value={draft.activities.filter((key) => keys.includes(key))}
          onChange={(picked) =>
            setDraft({
              ...draft,
              activities: [...draft.activities.filter((key) => !keys.includes(key)), ...picked]
            })
          }
        />
      ))}
      {uncertified ? (
        <StandardField
          label={intl.formatMessage({ id: 'handler.agr2519.exemption' })}
          helpText={intl.formatMessage({ id: 'handler.agr2519.exemptionHelp' })}>
          <StandardTextarea
            rows={2}
            value={draft.exemption_basis}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setDraft({ ...draft, exemption_basis: e.target.value })
            }
          />
        </StandardField>
      ) : null}
      <HStack>
        <StandardButton
          size="sm"
          variant="outline"
          isDisabled={sameDraft(draft, saved)}
          isLoading={isLoading}
          onClick={save}>
          {intl.formatMessage({ id: 'handler.agr2519.save' })}
        </StandardButton>
      </HStack>
    </VStack>
  );
};

export default FacilityAgr2519Editor;
