/**
 * Parcel organic-compliance card (7 CFR 205.202) — the reachable home for the buffer-zone
 * editor + parcel-identity fields. The full parcel form these once lived in
 * (StandardParcelForm.tsx) is not mounted by any route; the actual parcel add/edit uses the
 * consumer-story wizard (StandardParcelForm_Transparency), which has no compliance fields.
 * This self-contained card lives in the parcel profile (mirrors LandownerAffidavitSection +
 * StateOrganicRegistrationCard) and PATCHes the parcel via useUpdateParcelMutation, so a
 * farmer can actually record buffers / APN / treated-lumber for their certifier dossier.
 */
import React, { useEffect, useState } from 'react';
import {
  Box,
  Checkbox,
  Divider,
  Icon,
  Input,
  Select,
  SimpleGrid,
  Text,
  useToast,
  VStack
} from '@chakra-ui/react';
import { FaShieldAlt } from 'react-icons/fa';
import { useIntl } from 'react-intl';

import { StandardButton, StandardCard, StandardField } from 'components/Design/StandardComponents';
import { useUpdateParcelComplianceMutation } from 'store/api/productApi';

interface BufferRow {
  direction: string;
  adjoining_land_use?: string;
  buffer_width_m?: number;
  drift_risk?: string;
  prevention?: string;
  adjacent_organic?: boolean;
  buffer_type?: string;
  crop_in_buffer?: string;
  neighbor_notified?: boolean;
  neighbor_notification_date?: string;
}

interface ParcelLike {
  name?: string;
  description?: string;
  area?: number | string;
  buffer_zones?: BufferRow[];
  apn?: string;
  section_township_range?: string;
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
}

const DIRECTIONS = ['North', 'South', 'East', 'West'];

const ParcelComplianceCard: React.FC<Props> = ({ companyId, farmId, parcelId, parcel, canWrite }) => {
  const intl = useIntl();
  const toast = useToast();
  const [updateParcelCompliance, { isLoading }] = useUpdateParcelComplianceMutation();

  const [buffers, setBuffers] = useState<BufferRow[]>([]);
  const [identity, setIdentity] = useState({
    apn: '',
    section_township_range: '',
    date_began_managing: '',
    treated_lumber_present: false,
    treated_lumber_description: '',
    treated_lumber_install_date: '',
    pump_efficiency_pct: '',
    system_pressure_psi: '',
    pump_test_date: '',
    pump_test_provider: ''
  });

  useEffect(() => {
    if (!parcel) return;
    setBuffers(Array.isArray(parcel.buffer_zones) ? parcel.buffer_zones : []);
    setIdentity({
      apn: parcel.apn || '',
      section_township_range: parcel.section_township_range || '',
      date_began_managing: parcel.date_began_managing || '',
      treated_lumber_present: Boolean(parcel.treated_lumber_present),
      treated_lumber_description: parcel.treated_lumber_description || '',
      treated_lumber_install_date: parcel.treated_lumber_install_date || '',
      pump_efficiency_pct:
        parcel.pump_efficiency_pct != null ? String(parcel.pump_efficiency_pct) : '',
      system_pressure_psi:
        parcel.system_pressure_psi != null ? String(parcel.system_pressure_psi) : '',
      pump_test_date: parcel.pump_test_date || '',
      pump_test_provider: parcel.pump_test_provider || ''
    });
  }, [parcel]);

  const getRow = (direction: string): BufferRow =>
    buffers.find((b) => b.direction === direction) || { direction };

  const setBufferField = (direction: string, key: keyof BufferRow, value: unknown) => {
    setBuffers((prev) => {
      const next = [...prev];
      const idx = next.findIndex((b) => b.direction === direction);
      if (idx === -1) next.push({ direction, [key]: value } as BufferRow);
      else next[idx] = { ...next[idx], [key]: value };
      return next;
    });
  };

  const setIdentityField = (key: string, value: unknown) =>
    setIdentity((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    // Only send boundaries the farmer actually filled (a direction with adjoining land use),
    // matching the backend validate_buffer_zones requirement (direction + adjoining_land_use).
    const cleanedBuffers = buffers.filter(
      (b) => b.direction && (b.adjoining_land_use || '').trim()
    );
    try {
      // Sends ONLY these compliance fields (partial PATCH) — never touches the parcel's
      // name/area/polygon/contacts.
      await updateParcelCompliance({
        companyId,
        farmId,
        parcelId,
        compliance: {
          buffer_zones: cleanedBuffers,
          apn: identity.apn,
          section_township_range: identity.section_township_range,
          date_began_managing: identity.date_began_managing,
          treated_lumber_present: identity.treated_lumber_present,
          treated_lumber_description: identity.treated_lumber_description,
          treated_lumber_install_date: identity.treated_lumber_install_date,
          // Empty string would fail DecimalField/DateField validation, and it must also be
          // possible to CLEAR a stale pump test — so send null rather than "".
          pump_efficiency_pct: identity.pump_efficiency_pct || null,
          system_pressure_psi: identity.system_pressure_psi || null,
          pump_test_date: identity.pump_test_date || null,
          pump_test_provider: identity.pump_test_provider
        }
      }).unwrap();
      toast({
        status: 'success',
        title: intl.formatMessage({
          id: 'parcel.compliance.toast.saved',
          defaultMessage: 'Parcel compliance records saved'
        })
      });
    } catch (err: unknown) {
      toast({
        status: 'error',
        title: intl.formatMessage({
          id: 'parcel.compliance.toast.error',
          defaultMessage: 'Could not save parcel compliance records'
        }),
        description: String((err as { data?: unknown })?.data || err)
      });
    }
  };

  return (
    <StandardCard mb={4}>
      <VStack align="stretch" spacing={4}>
        <Box>
          <Text fontWeight="bold" fontSize="lg">
            <Icon as={FaShieldAlt} mr={2} color="green.500" />
            {intl.formatMessage({
              id: 'parcel.compliance.title',
              defaultMessage: 'Organic Compliance Records (7 CFR 205.202)'
            })}
          </Text>
          <Text fontSize="sm" color="gray.500">
            {intl.formatMessage({
              id: 'parcel.compliance.subtitle',
              defaultMessage:
                'Buffer zones, adjoining-land use, and parcel identity your certifier verifies at inspection.'
            })}
          </Text>
        </Box>

        {/* Parcel identity */}
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}>
          <StandardField
            label={intl.formatMessage({ id: 'parcel.fields.apn', defaultMessage: 'APN' })}
          >
            <Input
              value={identity.apn}
              isDisabled={!canWrite}
              onChange={(e) => setIdentityField('apn', e.target.value)}
              placeholder={intl.formatMessage({
                id: 'parcel.fields.apnPlaceholder',
                defaultMessage: "e.g., 045-120-018"
              })}
            />
          </StandardField>
          <StandardField
            label={intl.formatMessage({
              id: 'parcel.fields.str',
              defaultMessage: 'Section-Township-Range'
            })}
          >
            <Input
              value={identity.section_township_range}
              isDisabled={!canWrite}
              onChange={(e) => setIdentityField('section_township_range', e.target.value)}
              placeholder={intl.formatMessage({
                id: 'parcel.fields.strPlaceholder',
                defaultMessage: 'e.g., S12 T21S R25E'
              })}
            />
          </StandardField>
          <StandardField
            label={intl.formatMessage({
              id: 'parcel.fields.dateBeganManaging',
              defaultMessage: 'Date Began Managing'
            })}
          >
            <Input
              type="date"
              value={identity.date_began_managing}
              isDisabled={!canWrite}
              onChange={(e) => setIdentityField('date_began_managing', e.target.value)}
            />
          </StandardField>
        </SimpleGrid>

        <Checkbox
          isChecked={identity.treated_lumber_present}
          isDisabled={!canWrite}
          colorScheme="green"
          onChange={(e) => setIdentityField('treated_lumber_present', e.target.checked)}
        >
          {intl.formatMessage({
            id: 'parcel.fields.treatedLumberPresent',
            defaultMessage: 'Treated lumber present on parcel (7 CFR 205.206)'
          })}
        </Checkbox>
        {identity.treated_lumber_present && (
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
            <StandardField
              label={intl.formatMessage({
                id: 'parcel.fields.treatedLumberDesc',
                defaultMessage: 'Treated-Lumber Description'
              })}
            >
              <Input
                value={identity.treated_lumber_description}
                isDisabled={!canWrite}
                onChange={(e) => setIdentityField('treated_lumber_description', e.target.value)}
                placeholder={intl.formatMessage({
                  id: 'parcel.fields.treatedLumberDescPlaceholder',
                  defaultMessage: 'e.g., Perimeter posts, pre-2010'
                })}
              />
            </StandardField>
            <StandardField
              label={intl.formatMessage({
                id: 'parcel.fields.treatedLumberInstallDate',
                defaultMessage: 'Install Date'
              })}
            >
              <Input
                type="date"
                value={identity.treated_lumber_install_date}
                isDisabled={!canWrite}
                onChange={(e) => setIdentityField('treated_lumber_install_date', e.target.value)}
              />
            </StandardField>
          </SimpleGrid>
        )}

        <Divider />

        {/* Irrigation pumping plant (§E-6). Parcel-level because a pump test measures one
            plant once a year, and every irrigation event that season is costed against it.
            This is the input that turns the generic irrigation carbon estimate into this
            farm's own number. */}
        <Box>
          <Text fontSize="md" fontWeight="semibold" color="gray.700" mb={1}>
            {intl.formatMessage({
              id: 'parcel.pump.title',
              defaultMessage: 'Irrigation Pumping Plant'
            })}
          </Text>
          <Text fontSize="sm" color="gray.600" mb={3}>
            {intl.formatMessage({
              id: 'parcel.pump.help',
              defaultMessage:
                'From your most recent pump test. Used to calculate irrigation energy for this parcel — leave empty to use a 70% efficiency and a pressure derived from your irrigation method.'
            })}
          </Text>
          <SimpleGrid columns={{ base: 1, smd: 2 }} spacing={4}>
            <StandardField
              label={intl.formatMessage({
                id: 'parcel.pump.efficiency',
                defaultMessage: 'Plant Efficiency (%)'
              })}
            >
              <Input
                type="number"
                step="0.1"
                min={0}
                max={100}
                value={identity.pump_efficiency_pct}
                isDisabled={!canWrite}
                onChange={(e) => setIdentityField('pump_efficiency_pct', e.target.value)}
                placeholder="70"
              />
            </StandardField>
            <StandardField
              label={intl.formatMessage({
                id: 'parcel.pump.pressure',
                defaultMessage: 'System Pressure (psi)'
              })}
            >
              <Input
                type="number"
                step="0.1"
                min={0}
                value={identity.system_pressure_psi}
                isDisabled={!canWrite}
                onChange={(e) => setIdentityField('system_pressure_psi', e.target.value)}
                placeholder="15"
              />
            </StandardField>
            <StandardField
              label={intl.formatMessage({
                id: 'parcel.pump.testDate',
                defaultMessage: 'Pump Test Date'
              })}
            >
              <Input
                type="date"
                value={identity.pump_test_date}
                isDisabled={!canWrite}
                onChange={(e) => setIdentityField('pump_test_date', e.target.value)}
              />
            </StandardField>
            <StandardField
              label={intl.formatMessage({
                id: 'parcel.pump.provider',
                defaultMessage: 'Tested By'
              })}
            >
              <Input
                value={identity.pump_test_provider}
                isDisabled={!canWrite}
                onChange={(e) => setIdentityField('pump_test_provider', e.target.value)}
                placeholder={intl.formatMessage({
                  id: 'parcel.pump.providerPlaceholder',
                  defaultMessage: 'e.g., utility programme or pump company'
                })}
              />
            </StandardField>
          </SimpleGrid>
        </Box>

        <Divider />

        {/* Buffer zones */}
        <Box>
          <Text fontSize="md" fontWeight="semibold" color="gray.700" mb={1}>
            {intl.formatMessage({
              id: 'parcel.buffer.title',
              defaultMessage: 'Buffer Zones & Adjoining Land (7 CFR 205.202(c))'
            })}
          </Text>
          <Text fontSize="sm" color="gray.500" mb={3}>
            {intl.formatMessage({
              id: 'parcel.buffer.description',
              defaultMessage:
                'Record what borders each side of the parcel and the drift-prevention measure. Leave a side blank if it does not apply.'
            })}
          </Text>
          <VStack spacing={3} align="stretch">
            {DIRECTIONS.map((dir) => {
              const row = getRow(dir);
              return (
                <Box key={dir} p={3} borderWidth="1px" borderColor="gray.200" borderRadius="md">
                  <Text fontSize="sm" fontWeight="semibold" mb={2}>
                    {intl.formatMessage({
                      id: `parcel.buffer.direction.${dir.toLowerCase()}`,
                      defaultMessage: dir
                    })}
                  </Text>
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                    <StandardField
                      label={intl.formatMessage({
                        id: 'parcel.buffer.adjoiningLandUse',
                        defaultMessage: 'Adjoining Land Use'
                      })}
                      helpText={intl.formatMessage({
                        id: 'parcel.buffer.adjoiningLandUseHelp',
                        defaultMessage: 'What borders this side (e.g., conventional orchard, road)'
                      })}
                    >
                      <Input
                        value={row.adjoining_land_use || ''}
                        isDisabled={!canWrite}
                        onChange={(e) => setBufferField(dir, 'adjoining_land_use', e.target.value)}
                        placeholder={intl.formatMessage({
                          id: 'parcel.buffer.adjoiningLandUsePlaceholder',
                          defaultMessage: 'e.g., Conventional walnut orchard'
                        })}
                      />
                    </StandardField>
                    <StandardField
                      label={intl.formatMessage({
                        id: 'parcel.buffer.width',
                        defaultMessage: 'Buffer Width (m)'
                      })}
                    >
                      <Input
                        type="number"
                        min={0}
                        value={row.buffer_width_m ?? ''}
                        isDisabled={!canWrite}
                        onChange={(e) =>
                          setBufferField(
                            dir,
                            'buffer_width_m',
                            e.target.value === '' ? undefined : Number(e.target.value)
                          )
                        }
                        placeholder={intl.formatMessage({
                          id: 'parcel.buffer.widthPlaceholder',
                          defaultMessage: 'e.g., 8'
                        })}
                      />
                    </StandardField>
                    <StandardField
                      label={intl.formatMessage({
                        id: 'parcel.buffer.driftRisk',
                        defaultMessage: 'Drift Risk'
                      })}
                    >
                      <Select
                        value={row.drift_risk || ''}
                        isDisabled={!canWrite}
                        onChange={(e) => setBufferField(dir, 'drift_risk', e.target.value)}
                        placeholder={intl.formatMessage({
                          id: 'parcel.buffer.driftRiskPlaceholder',
                          defaultMessage: 'Select risk'
                        })}
                      >
                        <option value="low">
                          {intl.formatMessage({ id: 'parcel.buffer.driftRisk.low', defaultMessage: 'Low' })}
                        </option>
                        <option value="medium">
                          {intl.formatMessage({ id: 'parcel.buffer.driftRisk.medium', defaultMessage: 'Medium' })}
                        </option>
                        <option value="high">
                          {intl.formatMessage({ id: 'parcel.buffer.driftRisk.high', defaultMessage: 'High' })}
                        </option>
                      </Select>
                    </StandardField>
                    <StandardField
                      label={intl.formatMessage({
                        id: 'parcel.buffer.prevention',
                        defaultMessage: 'Prevention Measure'
                      })}
                    >
                      <Input
                        value={row.prevention || ''}
                        isDisabled={!canWrite}
                        onChange={(e) => setBufferField(dir, 'prevention', e.target.value)}
                        placeholder={intl.formatMessage({
                          id: 'parcel.buffer.preventionPlaceholder',
                          defaultMessage: 'e.g., 8 m hedgerow + neighbor letter'
                        })}
                      />
                    </StandardField>
                    <StandardField
                      label={intl.formatMessage({
                        id: 'parcel.buffer.bufferType',
                        defaultMessage: 'Buffer Type'
                      })}
                      helpText={intl.formatMessage({
                        id: 'parcel.buffer.bufferTypeHelp',
                        defaultMessage: 'Physical barrier on this side (CCOF OSP Section E)'
                      })}
                    >
                      <Input
                        value={row.buffer_type || ''}
                        isDisabled={!canWrite}
                        onChange={(e) => setBufferField(dir, 'buffer_type', e.target.value)}
                        placeholder={intl.formatMessage({
                          id: 'parcel.buffer.bufferTypePlaceholder',
                          defaultMessage: 'e.g., Hedgerow, road, fallow strip'
                        })}
                      />
                    </StandardField>
                    <StandardField
                      label={intl.formatMessage({
                        id: 'parcel.buffer.cropInBuffer',
                        defaultMessage: 'Crop in Buffer'
                      })}
                      helpText={intl.formatMessage({
                        id: 'parcel.buffer.cropInBufferHelp',
                        defaultMessage:
                          'Anything grown in the strip — never sold as organic (CCOF OSP Section E)'
                      })}
                    >
                      <Input
                        value={row.crop_in_buffer || ''}
                        isDisabled={!canWrite}
                        onChange={(e) => setBufferField(dir, 'crop_in_buffer', e.target.value)}
                        placeholder={intl.formatMessage({
                          id: 'parcel.buffer.cropInBufferPlaceholder',
                          defaultMessage: 'e.g., None / unharvested cover'
                        })}
                      />
                    </StandardField>
                  </SimpleGrid>
                  <VStack align="stretch" spacing={2} mt={2}>
                    <Checkbox
                      isChecked={Boolean(row.adjacent_organic)}
                      isDisabled={!canWrite}
                      colorScheme="green"
                      onChange={(e) => setBufferField(dir, 'adjacent_organic', e.target.checked)}
                    >
                      {intl.formatMessage({
                        id: 'parcel.buffer.adjacentOrganic',
                        defaultMessage: 'Adjoining land is also certified organic (no buffer required)'
                      })}
                    </Checkbox>
                    <Checkbox
                      isChecked={Boolean(row.neighbor_notified)}
                      isDisabled={!canWrite}
                      colorScheme="green"
                      onChange={(e) => setBufferField(dir, 'neighbor_notified', e.target.checked)}
                    >
                      {intl.formatMessage({
                        id: 'parcel.buffer.neighborNotified',
                        defaultMessage:
                          'Annual drift-notification letter sent to this neighbor (§ 205.400(f)(1))'
                      })}
                    </Checkbox>
                    {Boolean(row.neighbor_notified) && (
                      <StandardField
                        label={intl.formatMessage({
                          id: 'parcel.buffer.neighborNotificationDate',
                          defaultMessage: 'Notification Date'
                        })}
                      >
                        <Input
                          type="date"
                          value={row.neighbor_notification_date || ''}
                          isDisabled={!canWrite}
                          onChange={(e) =>
                            setBufferField(dir, 'neighbor_notification_date', e.target.value)
                          }
                        />
                      </StandardField>
                    )}
                  </VStack>
                </Box>
              );
            })}
          </VStack>
        </Box>

        {canWrite && (
          <StandardButton alignSelf="flex-end" size="sm" onClick={handleSave} isLoading={isLoading}>
            {intl.formatMessage({
              id: 'parcel.compliance.save',
              defaultMessage: 'Save Compliance Records'
            })}
          </StandardButton>
        )}
      </VStack>
    </StandardCard>
  );
};

export default ParcelComplianceCard;
