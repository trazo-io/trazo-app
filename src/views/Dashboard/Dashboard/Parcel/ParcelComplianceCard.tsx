/**
 * Parcel organic-compliance card (7 CFR 205.202) — SUMMARY + one unique editor.
 *
 * History: this card used to be a SECOND full editor for the § 205.202 facts
 * (APN / S-T-R / date-began-managing / treated lumber / a per-direction buffer
 * editor). The Parcel Application wizard is the canonical editor for all of
 * those, and running two editors over one JSON blob is how the 2026-08-09
 * buffer data-loss incident happened — worse, this card's save filtered out
 * any buffer row without an adjoining-land use, silently deleting rows the
 * wizard had legitimately saved (e.g. direction + prohibited-use date only).
 *
 * Now: § 205.202 facts render as a read summary with a single "Open Parcel
 * Application" CTA, and the save PATCHes ONLY the pumping-plant fields — the
 * one block the wizard deliberately doesn't own (a pump test is an energy
 * input, not a certifier application fact).
 */
import React, { useEffect, useState } from 'react';
import { Box, Divider, Icon, Input, SimpleGrid, Text, useToast, VStack } from '@chakra-ui/react';
import { FaExternalLinkAlt, FaShieldAlt } from 'react-icons/fa';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';

import {
  StandardButton,
  StandardCard,
  StandardField,
  StandardInput,
  StandardSelect
} from 'components/Design/StandardComponents';
import { useFarmState } from 'hooks/useMeasurementSystem';
import { useUpdateParcelComplianceMutation } from 'store/api/productApi';
import { apiErrorMessage } from 'utils/apiErrorMessage';

interface BufferRow {
  direction: string;
  adjoining_land_use?: string;
  buffer_width_ft?: number;
  prohibited_use_last_date?: string;
}

interface ParcelLike {
  name?: string;
  description?: string;
  area?: number | string;
  buffer_zones?: BufferRow[];
  apn?: string;
  section_township_range?: string;
  ca_site_id?: string;
  ca_near_schoolsite?: boolean | null;
  date_began_managing?: string;
  treated_lumber_present?: boolean;
  treated_lumber_description?: string;
  treated_lumber_install_date?: string;
  pump_efficiency_pct?: number | string;
  system_pressure_psi?: number | string;
  pump_test_date?: string;
  pump_test_provider?: string;
}

interface Props {
  companyId: string;
  farmId: string;
  parcelId: number | string;
  parcel?: ParcelLike;
  canWrite: boolean;
  /**
   * Which half to draw (2026-11-07). The irrigation pump test is an ENERGY input, read by the
   * irrigation emission estimate; it sat at the bottom of "Organic Compliance Records", where a
   * farmer reads it as something the certifier asks for. The profile now draws it in its own
   * section. Default `compliance`.
   */
  part?: 'compliance' | 'pump';
}

const ParcelComplianceCard: React.FC<Props> = ({
  companyId,
  farmId,
  parcelId,
  parcel,
  canWrite,
  part = 'compliance'
}) => {
  const intl = useIntl();
  const toast = useToast();
  const navigate = useNavigate();
  const [updateParcelCompliance, { isLoading }] = useUpdateParcelComplianceMutation();

  const [pump, setPump] = useState({
    pump_efficiency_pct: '',
    system_pressure_psi: '',
    pump_test_date: '',
    pump_test_provider: ''
  });

  // CA DPR Site ID (PUR box 8). Issued per SITE by the County Agricultural Commissioner
  // (3 CCR 6622), so it is a parcel fact: every spray on this parcel inherits it on the
  // monthly Pesticide Use Report unless the record carries its own. Not a § 205.202 fact,
  // so this card — not the Parcel Application wizard — is its one editor. California only.
  const isCalifornia = useFarmState(farmId) === 'CA';
  const [siteId, setSiteId] = useState('');
  // Three states, not two. '' is "never asked", which is NOT the same fact as "no" and must not
  // collapse into it: the PUR export reports an unanswered parcel as a gap in the filing rather
  // than asserting the parcel is clear (3 CCR 6691; see Parcel.ca_near_schoolsite).
  const [nearSchool, setNearSchool] = useState<'' | 'yes' | 'no'>('');
  useEffect(() => {
    setSiteId(parcel?.ca_site_id || '');
    setNearSchool(
      parcel?.ca_near_schoolsite == null ? '' : parcel.ca_near_schoolsite ? 'yes' : 'no'
    );
  }, [parcel]);

  const handleSaveSiteId = async () => {
    try {
      // ONLY the Site ID: the mutation sends the keys it is given, so this cannot clear
      // the pump test saved by the block below.
      await updateParcelCompliance({
        companyId,
        farmId,
        parcelId,
        compliance: {
          ca_site_id: siteId.trim(),
          // null, not false: leaving the question unanswered has to stay writable, or a parcel
          // touched once could never go back to "we don't know yet".
          ca_near_schoolsite: nearSchool === '' ? null : nearSchool === 'yes'
        }
      }).unwrap();
      toast({
        status: 'success',
        title: intl.formatMessage({ id: 'parcel.dpr.toast.saved', defaultMessage: 'Site ID saved' })
      });
    } catch (err: unknown) {
      toast({
        status: 'error',
        title: intl.formatMessage({
          id: 'parcel.compliance.toast.error',
          defaultMessage: 'Could not save parcel compliance records'
        }),
        description: apiErrorMessage(err) ?? intl.formatMessage({ id: 'app.errorTryAgain' })
      });
    }
  };

  useEffect(() => {
    if (!parcel) return;
    setPump({
      pump_efficiency_pct:
        parcel.pump_efficiency_pct != null ? String(parcel.pump_efficiency_pct) : '',
      system_pressure_psi:
        parcel.system_pressure_psi != null ? String(parcel.system_pressure_psi) : '',
      pump_test_date: parcel.pump_test_date || '',
      pump_test_provider: parcel.pump_test_provider || ''
    });
  }, [parcel]);

  const setPumpField = (key: string, value: string) =>
    setPump((prev) => ({ ...prev, [key]: value }));

  const handleSavePump = async () => {
    try {
      // Pump-plant fields ONLY. Everything § 205.202-shaped is owned by the
      // Parcel Application wizard; this card must never write those keys again.
      await updateParcelCompliance({
        companyId,
        farmId,
        parcelId,
        compliance: {
          // Empty string would fail DecimalField/DateField validation, and it
          // must also be possible to CLEAR a stale pump test — null, not "".
          pump_efficiency_pct: pump.pump_efficiency_pct || null,
          system_pressure_psi: pump.system_pressure_psi || null,
          pump_test_date: pump.pump_test_date || null,
          pump_test_provider: pump.pump_test_provider
        }
      }).unwrap();
      toast({
        status: 'success',
        title: intl.formatMessage({
          id: 'parcel.pump.toast.saved',
          defaultMessage: 'Pump test saved'
        })
      });
    } catch (err: unknown) {
      toast({
        status: 'error',
        title: intl.formatMessage({
          id: 'parcel.compliance.toast.error',
          defaultMessage: 'Could not save parcel compliance records'
        }),
        description: apiErrorMessage(err) ?? intl.formatMessage({ id: 'app.errorTryAgain' })
      });
    }
  };

  const bufferRows = Array.isArray(parcel?.buffer_zones) ? parcel!.buffer_zones! : [];
  const documentedSides = bufferRows.filter((b) => b.direction).length;
  const dash = '—';

  const summaryRows: Array<[string, string]> = [
    [intl.formatMessage({ id: 'parcel.fields.apn', defaultMessage: 'APN' }), parcel?.apn || dash],
    [
      intl.formatMessage({ id: 'parcel.fields.str', defaultMessage: 'Section-Township-Range' }),
      parcel?.section_township_range || dash
    ],
    [
      intl.formatMessage({
        id: 'parcel.fields.dateBeganManaging',
        defaultMessage: 'Date Began Managing'
      }),
      parcel?.date_began_managing || dash
    ],
    [
      intl.formatMessage({
        id: 'parcel.fields.treatedLumberPresent',
        defaultMessage: 'Treated lumber present (7 CFR 205.206(f))'
      }),
      // Before the parcel loads there is no answer — a dash, never a default "No".
      parcel == null
        ? dash
        : parcel.treated_lumber_present
        ? intl.formatMessage({ id: 'app.yes', defaultMessage: 'Yes' })
        : intl.formatMessage({ id: 'app.no', defaultMessage: 'No' })
    ],
    [
      intl.formatMessage({
        id: 'parcel.buffer.summaryLabel',
        defaultMessage: 'Buffer / adjoining-land records'
      }),
      documentedSides > 0
        ? intl.formatMessage(
            {
              id: 'parcel.buffer.summaryCount',
              defaultMessage: '{count} border(s) documented'
            },
            { count: documentedSides }
          )
        : dash
    ]
  ];

  if (part === 'pump') {
    return (
      <StandardCard
        mb={0}
        title={intl.formatMessage({
          id: 'parcel.pump.title',
          defaultMessage: 'Irrigation pump test'
        })}
        subtitle={intl.formatMessage({
          id: 'parcel.pump.help',
          defaultMessage:
            'From your most recent pump test. Used to calculate irrigation energy for this parcel — leave empty to use a 70% efficiency and a pressure derived from your irrigation method.'
        })}>
        <VStack align="stretch" spacing={4}>
          {/* Irrigation pumping plant (§E-6) — this card's one remaining editor.
            Parcel-level because a pump test measures one plant once a year, and
            every irrigation event that season is costed against it. */}
          <Box>
            <SimpleGrid columns={{ base: 1, smd: 2 }} spacing={4}>
              <StandardField
                label={intl.formatMessage({
                  id: 'parcel.pump.efficiency',
                  defaultMessage: 'Pump Efficiency (%)'
                })}>
                <StandardInput
                  type="number"
                  min={0}
                  max={100}
                  value={pump.pump_efficiency_pct}
                  isDisabled={!canWrite}
                  onChange={(e) => setPumpField('pump_efficiency_pct', e.target.value)}
                  placeholder="70"
                />
              </StandardField>
              <StandardField
                label={intl.formatMessage({
                  id: 'parcel.pump.pressure',
                  defaultMessage: 'System Pressure (PSI)'
                })}>
                <StandardInput
                  type="number"
                  min={0}
                  value={pump.system_pressure_psi}
                  isDisabled={!canWrite}
                  onChange={(e) => setPumpField('system_pressure_psi', e.target.value)}
                  placeholder="45"
                />
              </StandardField>
              <StandardField
                label={intl.formatMessage({
                  id: 'parcel.pump.testDate',
                  defaultMessage: 'Pump Test Date'
                })}>
                <StandardInput
                  type="date"
                  value={pump.pump_test_date}
                  isDisabled={!canWrite}
                  onChange={(e) => setPumpField('pump_test_date', e.target.value)}
                />
              </StandardField>
              <StandardField
                label={intl.formatMessage({
                  id: 'parcel.pump.provider',
                  defaultMessage: 'Test Provider'
                })}>
                <StandardInput
                  value={pump.pump_test_provider}
                  isDisabled={!canWrite}
                  onChange={(e) => setPumpField('pump_test_provider', e.target.value)}
                  placeholder={intl.formatMessage({
                    id: 'parcel.pump.providerPlaceholder',
                    defaultMessage: 'e.g., PG&E / mobile lab'
                  })}
                />
              </StandardField>
            </SimpleGrid>
          </Box>

          {canWrite && (
            <StandardButton
              alignSelf="flex-end"
              size="sm"
              onClick={handleSavePump}
              isLoading={isLoading}>
              {intl.formatMessage({
                id: 'parcel.pump.save',
                defaultMessage: 'Save Pump Test'
              })}
            </StandardButton>
          )}
        </VStack>
      </StandardCard>
    );
  }

  return (
    // A standard card title (2026-11-07); the CFR citation moves to the subtitle, as on the
    // other cards in this section. Was a bold `lg` line with an inline green.500 shield.
    <StandardCard
      mb={0}
      titleIcon={<Icon as={FaShieldAlt} color="green.700" />}
      title={intl.formatMessage({
        id: 'parcel.compliance.title',
        defaultMessage: 'Identity and land records'
      })}
      subtitle={intl.formatMessage({
        id: 'parcel.compliance.summarySubtitle',
        defaultMessage:
          'Identity, land history, and buffer records live in the Parcel Application — the same answers your certifier reviews.'
      })}>
      <VStack align="stretch" spacing={4}>
        {/* Read summary — the Parcel Application wizard is the single editor. */}
        <VStack align="stretch" spacing={1.5}>
          {summaryRows.map(([label, value]) => (
            <Box
              key={label}
              display="flex"
              justifyContent="space-between"
              gap={4}
              borderBottomWidth="1px"
              borderColor="gray.100"
              pb={1.5}>
              <Text fontSize="sm" color="gray.600">
                {label}
              </Text>
              <Text fontSize="sm" fontWeight="medium" textAlign="right">
                {value}
              </Text>
            </Box>
          ))}
        </VStack>

        <StandardButton
          alignSelf="flex-start"
          size="sm"
          variant="outline"
          rightIcon={<Icon as={FaExternalLinkAlt} boxSize={3} />}
          onClick={() =>
            navigate(`/admin/dashboard/farm/${farmId}/parcel/${parcelId}/application`)
          }>
          {intl.formatMessage({
            id: 'parcel.compliance.openApplication',
            defaultMessage: 'Open Parcel Application'
          })}
        </StandardButton>

        {isCalifornia && (
          <>
            <Divider />
            <Box>
              <Text fontSize="md" fontWeight="semibold" color="gray.700" mb={1}>
                {intl.formatMessage({
                  id: 'parcel.dpr.title',
                  defaultMessage: 'California Pesticide Use Report identifiers'
                })}
              </Text>
              <Text fontSize="sm" color="gray.600" mb={3}>
                {intl.formatMessage({
                  id: 'parcel.dpr.help',
                  defaultMessage:
                    'The Site ID your County Agricultural Commissioner issued for this parcel (box 8 on the Pesticide Use Report, 1–8 characters exactly as issued). Saved once here; every spray on this parcel uses it unless the record carries its own.'
                })}
              </Text>
              <SimpleGrid columns={{ base: 1, smd: 2 }} spacing={4}>
                <StandardField
                  label={intl.formatMessage({
                    id: 'parcel.dpr.siteId',
                    defaultMessage: 'CA DPR Site ID'
                  })}>
                  <StandardInput
                    value={siteId}
                    maxLength={8}
                    isDisabled={!canWrite}
                    onChange={(e) => setSiteId(e.target.value)}
                    placeholder={intl.formatMessage({
                      id: 'parcel.dpr.siteIdPlaceholder',
                      defaultMessage: 'e.g., 0001A'
                    })}
                  />
                </StandardField>
                <StandardField
                  label={intl.formatMessage({
                    id: 'parcel.dpr.nearSchoolsite',
                    defaultMessage: 'Within 1/4 mile of a schoolsite?'
                  })}
                  helpText={intl.formatMessage({
                    id: 'parcel.dpr.nearSchoolsiteHelp',
                    defaultMessage:
                      'Applications on ground within 1/4 mile of a schoolsite need a DPR method code on the Pesticide Use Report (3 CCR 6691, in force since 1 January 2026). Leave blank if you are not sure and we will flag it rather than assume.'
                  })}>
                  <StandardSelect
                    value={nearSchool}
                    isDisabled={!canWrite}
                    onChange={(e) => setNearSchool(e.target.value as '' | 'yes' | 'no')}>
                    <option value="">
                      {intl.formatMessage({
                        id: 'parcel.dpr.nearSchoolsite.unknown',
                        defaultMessage: 'Not answered yet'
                      })}
                    </option>
                    <option value="yes">
                      {intl.formatMessage({
                        id: 'parcel.dpr.nearSchoolsite.yes',
                        defaultMessage: 'Yes'
                      })}
                    </option>
                    <option value="no">
                      {intl.formatMessage({
                        id: 'parcel.dpr.nearSchoolsite.no',
                        defaultMessage: 'No'
                      })}
                    </option>
                  </StandardSelect>
                </StandardField>
              </SimpleGrid>
              {canWrite && (
                <StandardButton size="sm" mt={3} onClick={handleSaveSiteId} isLoading={isLoading}>
                  {intl.formatMessage({
                    id: 'parcel.dpr.save',
                    defaultMessage: 'Save PUR details'
                  })}
                </StandardButton>
              )}
            </Box>
          </>
        )}
      </VStack>
    </StandardCard>
  );
};

export default ParcelComplianceCard;
