import React from 'react';
import { Box, HStack, SimpleGrid, Switch, Text } from '@chakra-ui/react';
import { Controller } from 'react-hook-form';
import { useIntl } from 'react-intl';

import { StandardField, StandardInput } from 'components/Design/StandardComponents';

/**
 * FSMA PSR § 112.161(b) supervisor review / sign-off.
 *
 * WHY THIS IS SHARED
 * ------------------
 * § 112.161(b): *"All records must be reviewed, dated, and signed, within a reasonable time
 * after the records are made, by a supervisor or responsible party."* It is a RECORDS rule, so
 * it applies per record — not per kind of record. The fields (`reviewed`, `reviewer_name`,
 * `review_date`) live on the shared `CommonEvent` base model for exactly that reason.
 *
 * They were nonetheless enterable on ONE tab. The serializers accept them on six event types,
 * so the API took a value no UI could send — the same accepts-but-cannot-write asymmetry this
 * codebase keeps finding. One component, dropped into each part-112 tab, is the fix that does
 * not become four diverging copies.
 *
 * WHERE IT BELONGS, AND WHERE IT DOES NOT
 * ---------------------------------------
 * Part 112 covers produce safety, and the records it requires are the ones this block attaches
 * to:
 *   * Chemical  — inputs, and biological soil amendments of animal origin (§ 112.60)
 *   * Soil      — amendment application and treatment (§ 112.60)
 *   * Production— harvest and packing activities (§ 112.140)
 *   * Pest      — animal intrusion and monitoring (§ 112.83)
 *
 * Weather and Business events are NOT part-112 records. A hailstorm log and a certification
 * renewal are not things a produce-safety supervisor signs, and putting the control there
 * would be compliance theatre — a field that looks required, is not, and costs form length on
 * every event a grower files.
 *
 * ⚠️ This is FSMA, not NOP. A certifier reviewing an organic system plan does not ask for it.
 * It is here because operations above the § 112.4 coverage threshold need it, and because a
 * field the API accepts should have somewhere to be typed.
 */
export function SupervisorSignOff({ control }: { control: unknown }) {
  const intl = useIntl();

  return (
    <Box mt={4} p={3} bg="gray.50" borderRadius="md" border="1px solid" borderColor="gray.200">
      <HStack justify="space-between" mb={3}>
        <Text fontSize="sm" fontWeight="semibold" color="gray.700">
          {intl.formatMessage({ id: 'events.common.signOff.title' })}
        </Text>
        <Controller
          name="reviewed"
          control={control as never}
          render={({ field }) => (
            <Switch
              isChecked={field.value === 'true' || field.value === true}
              onChange={(e) => field.onChange(e.target.checked ? 'true' : 'false')}
              colorScheme="green"
            />
          )}
        />
      </HStack>
      <Text fontSize="xs" color="gray.500" mb={3}>
        {intl.formatMessage({ id: 'events.common.signOff.help' })}
      </Text>
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <StandardField label={intl.formatMessage({ id: 'events.common.fields.reviewerName' })}>
          <Controller
            name="reviewer_name"
            control={control as never}
            render={({ field }) => (
              <StandardInput
                {...field}
                value={field.value || ''}
                placeholder={intl.formatMessage({ id: 'events.common.signOff.namePlaceholder' })}
              />
            )}
          />
        </StandardField>
        <StandardField label={intl.formatMessage({ id: 'events.common.fields.reviewDate' })}>
          <Controller
            name="review_date"
            control={control as never}
            render={({ field }) => (
              <StandardInput {...field} value={field.value || ''} type="date" />
            )}
          />
        </StandardField>
      </SimpleGrid>
    </Box>
  );
}

export default SupervisorSignOff;
