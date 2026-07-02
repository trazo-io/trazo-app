/**
 * OSP Annual Continuation / Update (7 CFR 205.406(a)) capture form. The model + viewset +
 * audit-export flag already existed; this is the missing farmer form. Self-contained
 * (mirrors StateOrganicRegistrationCard). Files an annual update against the current OSP
 * version (prior_osp). Mounted in OSPView.
 */
import React, { useEffect, useState } from 'react';
import {
  Badge,
  Box,
  Checkbox,
  FormControl,
  FormLabel,
  HStack,
  Icon,
  Input,
  Text,
  Textarea,
  useToast,
  VStack
} from '@chakra-ui/react';
import { FaCalendarCheck } from 'react-icons/fa';
import { useIntl } from 'react-intl';

import { StandardButton, StandardCard } from 'components/Design/StandardComponents';
import {
  OSPAnnualUpdate,
  useCreateOSPAnnualUpdateMutation,
  useGetOSPAnnualUpdatesQuery,
  useUpdateOSPAnnualUpdateMutation
} from 'store/api/ospAnnualUpdateApi';

interface Props {
  companyId?: string;
  farmId?: string;
  ospId?: number | null;
  currentYear: number;
}

const linesToList = (text: string): string[] =>
  text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

const OSPAnnualUpdateCard: React.FC<Props> = ({ companyId, farmId, ospId, currentYear }) => {
  const intl = useIntl();
  const toast = useToast();
  const { data: updates = [] } = useGetOSPAnnualUpdatesQuery(
    { companyId: companyId || '', farmId: farmId || '' },
    { skip: !companyId || !farmId }
  );
  const [createUpdate, { isLoading: creating }] = useCreateOSPAnnualUpdateMutation();
  const [updateUpdate, { isLoading: updating }] = useUpdateOSPAnnualUpdateMutation();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    reporting_year: String(currentYear),
    changes_summary: '',
    additions: '',
    deletions: '',
    submitted: false
  });

  useEffect(() => {
    setForm((f) => ({ ...f, reporting_year: f.reporting_year || String(currentYear) }));
  }, [currentYear]);

  const set = (key: string, value: unknown) => setForm((prev) => ({ ...prev, [key]: value }));

  const startEdit = (u: OSPAnnualUpdate) => {
    setEditingId(u.id);
    setForm({
      reporting_year: String(u.reporting_year ?? currentYear),
      changes_summary: u.changes_summary || '',
      additions: Array.isArray(u.additions) ? u.additions.map(String).join('\n') : '',
      deletions: Array.isArray(u.deletions) ? u.deletions.map(String).join('\n') : '',
      submitted: Boolean(u.submitted_at)
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({ reporting_year: String(currentYear), changes_summary: '', additions: '', deletions: '', submitted: false });
  };

  const handleSave = async () => {
    if (!companyId || !farmId || ospId == null) return;
    const year = parseInt(form.reporting_year, 10);
    if (!year || year < 2000 || year > 2100) {
      toast({
        status: 'warning',
        title: intl.formatMessage({
          id: 'osp.annual.invalidYear',
          defaultMessage: 'Enter a valid reporting year'
        })
      });
      return;
    }
    const data: Partial<OSPAnnualUpdate> = {
      prior_osp: ospId,
      reporting_year: year,
      changes_summary: form.changes_summary,
      additions: linesToList(form.additions),
      deletions: linesToList(form.deletions),
      // Setting submitted_at is the farmer's attestation that this was filed with the certifier.
      submitted_at: form.submitted ? new Date().toISOString() : null
    };
    try {
      if (editingId != null) {
        await updateUpdate({ companyId, farmId, updateId: editingId, data }).unwrap();
      } else {
        await createUpdate({ companyId, farmId, data }).unwrap();
      }
      toast({
        status: 'success',
        title: intl.formatMessage({
          id: 'osp.annual.toast.saved',
          defaultMessage: 'Annual update saved'
        })
      });
      resetForm();
    } catch (err: unknown) {
      toast({
        status: 'error',
        title: intl.formatMessage({
          id: 'osp.annual.toast.error',
          defaultMessage: 'Could not save the annual update'
        }),
        description: String((err as { data?: unknown })?.data || err)
      });
    }
  };

  return (
    <StandardCard mb={4}>
      <VStack align="stretch" spacing={3}>
        <HStack spacing={2}>
          <Icon as={FaCalendarCheck} color="green.600" />
          <Text fontWeight="bold" fontSize="lg">
            {intl.formatMessage({
              id: 'osp.annual.title',
              defaultMessage: 'OSP Annual Continuation (7 CFR 205.406)'
            })}
          </Text>
          {updates.length > 0 && <Badge colorScheme="green">{updates.length}</Badge>}
        </HStack>
        <Text fontSize="sm" color="gray.500">
          {intl.formatMessage({
            id: 'osp.annual.subtitle',
            defaultMessage:
              'Each year, a certified operation must file an update summarizing any changes to its OSP (or reaffirming no changes).'
          })}
        </Text>

        {ospId == null && (
          <Text fontSize="sm" color="orange.600">
            {intl.formatMessage({
              id: 'osp.annual.noOsp',
              defaultMessage: 'Create your Organic System Plan first, then file the annual update against it.'
            })}
          </Text>
        )}

        {updates.map((u) => (
          <Box key={u.id} p={3} borderWidth="1px" borderColor="gray.200" borderRadius="md">
            <HStack justify="space-between">
              <Box>
                <Text fontWeight="semibold" fontSize="sm">
                  {u.reporting_year}
                </Text>
                <Text fontSize="xs" color="gray.500" noOfLines={2}>
                  {u.changes_summary ||
                    intl.formatMessage({
                      id: 'osp.annual.noChanges',
                      defaultMessage: 'No changes — OSP reaffirmed'
                    })}
                </Text>
              </Box>
              <HStack spacing={2}>
                {u.submitted_at ? (
                  <Badge colorScheme="green">
                    {intl.formatMessage({ id: 'osp.annual.submitted', defaultMessage: 'Submitted' })}
                  </Badge>
                ) : (
                  <Badge colorScheme="orange">
                    {intl.formatMessage({ id: 'osp.annual.draft', defaultMessage: 'Draft' })}
                  </Badge>
                )}
                <StandardButton size="xs" variant="ghost" onClick={() => startEdit(u)}>
                  {intl.formatMessage({ id: 'osp.annual.edit', defaultMessage: 'Edit' })}
                </StandardButton>
              </HStack>
            </HStack>
          </Box>
        ))}

        {ospId != null && (
          <Box p={3} borderWidth="1px" borderColor="green.200" borderRadius="md">
            <VStack align="stretch" spacing={3}>
              <FormControl maxW="200px">
                <FormLabel fontSize="sm">
                  {intl.formatMessage({
                    id: 'osp.annual.reportingYear',
                    defaultMessage: 'Reporting Year'
                  })}
                </FormLabel>
                <Input
                  type="number"
                  min={2000}
                  max={2100}
                  value={form.reporting_year}
                  onChange={(e) => set('reporting_year', e.target.value)}
                />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">
                  {intl.formatMessage({
                    id: 'osp.annual.changesSummary',
                    defaultMessage: 'Summary of Changes (§ 205.406(a)(1))'
                  })}
                </FormLabel>
                <Textarea
                  rows={3}
                  value={form.changes_summary}
                  onChange={(e) => set('changes_summary', e.target.value)}
                  placeholder={intl.formatMessage({
                    id: 'osp.annual.changesSummaryPlaceholder',
                    defaultMessage: 'Describe any changes since last year, or state that there are none.'
                  })}
                />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">
                  {intl.formatMessage({
                    id: 'osp.annual.additions',
                    defaultMessage: 'Additions planned (one per line)'
                  })}
                </FormLabel>
                <Textarea
                  rows={2}
                  value={form.additions}
                  onChange={(e) => set('additions', e.target.value)}
                  placeholder={intl.formatMessage({
                    id: 'osp.annual.additionsPlaceholder',
                    defaultMessage: 'e.g., New 2-acre block; new OMRI compost supplier'
                  })}
                />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">
                  {intl.formatMessage({
                    id: 'osp.annual.deletions',
                    defaultMessage: 'Deletions planned (one per line)'
                  })}
                </FormLabel>
                <Textarea
                  rows={2}
                  value={form.deletions}
                  onChange={(e) => set('deletions', e.target.value)}
                  placeholder={intl.formatMessage({
                    id: 'osp.annual.deletionsPlaceholder',
                    defaultMessage: 'e.g., Discontinued a pest material'
                  })}
                />
              </FormControl>
              <Checkbox
                isChecked={form.submitted}
                colorScheme="green"
                onChange={(e) => set('submitted', e.target.checked)}
              >
                {intl.formatMessage({
                  id: 'osp.annual.markSubmitted',
                  defaultMessage: 'Filed with my certifier'
                })}
              </Checkbox>
              <HStack justify="flex-end" spacing={2}>
                {editingId != null && (
                  <StandardButton size="sm" variant="ghost" onClick={resetForm}>
                    {intl.formatMessage({ id: 'osp.annual.cancel', defaultMessage: 'Cancel' })}
                  </StandardButton>
                )}
                <StandardButton size="sm" onClick={handleSave} isLoading={creating || updating}>
                  {editingId != null
                    ? intl.formatMessage({ id: 'osp.annual.update', defaultMessage: 'Update Filing' })
                    : intl.formatMessage({ id: 'osp.annual.save', defaultMessage: 'Save Annual Update' })}
                </StandardButton>
              </HStack>
            </VStack>
          </Box>
        )}
      </VStack>
    </StandardCard>
  );
};

export default OSPAnnualUpdateCard;
