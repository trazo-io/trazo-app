import React, { useState } from 'react';
import { Box, Divider, Icon, Text, VStack, useToast } from '@chakra-ui/react';
import {
  FaBuilding,
  FaMapMarkerAlt,
  FaPhone,
  FaEnvelope,
  FaGlobe,
  FaFacebook,
  FaInstagram,
  FaUsers,
  FaIndustry,
  FaLeaf,
  FaIdCard,
  FaEdit
} from 'react-icons/fa';
import { useSelector, useDispatch } from 'react-redux';
import { useIntl } from 'react-intl';
import { StandardCard, StandardButton } from 'components/Design/StandardComponents';
import { FieldGroup, FieldList, InfoRow } from 'components/Design/ProfileField';
import { useUpdateCompanyMutation } from 'store/api/companyApi';
import { setCompany } from 'store/features/companySlice';
import EditCompanyModal, {
  INDUSTRIES,
  LEGAL_STRUCTURE_LABEL_KEYS,
  commodityLabel,
  isKnownSustainabilityCommitment
} from './EditCompanyModal';

interface CompanyInfoTabProps {
  company?: any;
}

const CompanyInfoTab: React.FC<CompanyInfoTabProps> = () => {
  const intl = useIntl();
  const toast = useToast();
  const dispatch = useDispatch();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const currentCompany = useSelector((state: any) => state.company.currentCompany);
  const [updateCompany, { isLoading: isUpdating }] = useUpdateCompanyMutation();

  const handleUpdateCompany = async (formData: any) => {
    if (!currentCompany?.id) return;

    try {
      const result = await updateCompany({
        companyId: currentCompany.id,
        companyData: formData
      }).unwrap();

      // Update Redux state
      dispatch(setCompany({ ...currentCompany, ...result }));

      toast({
        title: intl.formatMessage({ id: 'app.companyUpdated' }),
        description: intl.formatMessage({ id: 'app.companyUpdatedSuccess' }),
        status: 'success',
        duration: 4000,
        isClosable: true
      });

      setIsEditModalOpen(false);
    } catch (error: any) {
      console.error('Error updating company:', error);

      // Parse DRF field-level validation errors into readable message
      let description = intl.formatMessage({ id: 'app.errorUpdatingCompany' });
      if (error?.data && typeof error.data === 'object') {
        if (error.data.detail) {
          description = error.data.detail;
        } else if (error.data.message) {
          description = error.data.message;
        } else {
          const fieldErrors = Object.entries(error.data)
            .filter(([, msgs]) => Array.isArray(msgs))
            .map(([field, msgs]) => {
              const label = field.replace(/_/g, ' ');
              return `${label}: ${(msgs as string[]).join(', ')}`;
            });
          if (fieldErrors.length > 0) {
            description = fieldErrors.join(' | ');
          }
        }
      } else if (error?.message) {
        description = error.message;
      }

      toast({
        title: intl.formatMessage({ id: 'app.errorUpdating' }),
        description,
        status: 'error',
        duration: 6000,
        isClosable: true
      });
    }
  };

  if (!currentCompany) {
    return (
      <Box py={8} textAlign="center">
        <Text color="gray.500">{intl.formatMessage({ id: 'app.noCompanyInfo' })}</Text>
      </Box>
    );
  }

  // Street, city and state on one line. Country is dropped: every company here is in the US.
  const address = [currentCompany.address, currentCompany.city, currentCompany.state]
    .filter(Boolean)
    .join(', ');

  const label = (id: string) => intl.formatMessage({ id });
  const legalStructure = currentCompany.legal_structure
    ? LEGAL_STRUCTURE_LABEL_KEYS[currentCompany.legal_structure]
      ? label(LEGAL_STRUCTURE_LABEL_KEYS[currentCompany.legal_structure])
      : currentCompany.legal_structure
    : null;
  // `industry` is a stored value ("crop_production"); it printed as that slug.
  const industry = currentCompany.industry
    ? INDUSTRIES.includes(currentCompany.industry)
      ? label(`company.industry.${currentCompany.industry}`)
      : currentCompany.industry
    : null;
  const commitment = currentCompany.sustainability_commitment
    ? isKnownSustainabilityCommitment(currentCompany.sustainability_commitment)
      ? label(`company.sustainabilityCommitment.${currentCompany.sustainability_commitment}`)
      : currentCompany.sustainability_commitment
    : null;
  const cropFocus = currentCompany.sustainability_metadata?.crop_template?.title ?? null;
  const planName = currentCompany.subscription_plan?.name;

  // NOTE: no "Sustainability goals" row. The sign-up goals ("Full Farming Transparency",
  // "Soil Health Focus", ...) were retired by recordkeeping review F-11 (2026-10-07): the wizard
  // stopped asking and the buyer page stopped printing them, but this tab still showed them as
  // green leaf chips. The stored field stays; nothing reads it here.
  const groups: Array<{ id: string; rows: React.ReactNode[]; has: boolean }> = [
    {
      id: 'app.contactInformation',
      has: Boolean(
        currentCompany.contact_email ||
          currentCompany.email ||
          currentCompany.contact_phone ||
          currentCompany.phone ||
          address ||
          currentCompany.zip_code ||
          currentCompany.website
      ),
      rows: [
        <InfoRow
          key="email"
          layout="inline"
          icon={FaEnvelope}
          label={label('app.email')}
          value={currentCompany.contact_email || currentCompany.email}
          type="email"
        />,
        <InfoRow
          key="phone"
          layout="inline"
          icon={FaPhone}
          label={label('app.phone')}
          value={currentCompany.contact_phone || currentCompany.phone}
          type="phone"
        />,
        <InfoRow
          key="address"
          layout="inline"
          icon={FaMapMarkerAlt}
          label={label('app.address')}
          value={address}
        />,
        <InfoRow
          key="zip"
          layout="inline"
          icon={FaMapMarkerAlt}
          label={label('app.postalCode')}
          value={currentCompany.zip_code}
        />,
        <InfoRow
          key="website"
          layout="inline"
          icon={FaGlobe}
          label={label('app.website')}
          value={currentCompany.website}
          type="link"
        />
      ]
    },
    {
      id: 'app.businessInformation',
      has: Boolean(
        legalStructure ||
          currentCompany.fiscal_id ||
          industry ||
          (currentCompany.employee_count ?? null) !== null
      ),
      rows: [
        <InfoRow
          key="legal"
          layout="inline"
          icon={FaBuilding}
          label={label('app.legalStructure')}
          value={legalStructure}
        />,
        <InfoRow
          key="fiscal"
          layout="inline"
          icon={FaIdCard}
          label={label('app.fiscalId')}
          value={currentCompany.fiscal_id}
        />,
        <InfoRow
          key="industry"
          layout="inline"
          icon={FaIndustry}
          label={label('app.industry')}
          value={industry}
        />,
        <InfoRow
          key="employees"
          layout="inline"
          icon={FaUsers}
          label={label('app.employeeCount')}
          value={currentCompany.employee_count}
        />
      ]
    },
    {
      id: 'app.agriculturalInformation',
      has: Boolean(
        currentCompany.primary_commodities ||
          commitment ||
          cropFocus ||
          currentCompany.certifications
      ),
      rows: [
        <InfoRow
          key="commodities"
          layout="inline"
          icon={FaLeaf}
          label={label('app.primaryCommodities')}
          value={commodityLabel(currentCompany.primary_commodities, label)}
        />,
        <InfoRow
          key="commitment"
          layout="inline"
          icon={FaLeaf}
          label={label('app.sustainabilityCommitment')}
          value={commitment}
        />,
        <InfoRow
          key="crop"
          layout="inline"
          icon={FaLeaf}
          label={label('app.cropFocus')}
          value={cropFocus}
        />,
        // The company's own typed list, as typed: plain text, not green chips (a chip in
        // green reads as a verified certificate; these are not checked against anything).
        <InfoRow
          key="certifications"
          layout="inline"
          icon={FaLeaf}
          label={label('app.certificationsList')}
          value={currentCompany.certifications}
        />
      ]
    },
    {
      id: 'app.socialMedia',
      has: Boolean(currentCompany.facebook || currentCompany.instagram),
      rows: [
        <InfoRow
          key="facebook"
          layout="inline"
          icon={FaFacebook}
          label="Facebook"
          value={currentCompany.facebook}
          type="link"
        />,
        <InfoRow
          key="instagram"
          layout="inline"
          icon={FaInstagram}
          label="Instagram"
          value={currentCompany.instagram}
          type="link"
        />
      ]
    }
  ];

  return (
    <VStack spacing={6} w="100%" align="stretch">
      {/* One card, headed by the company itself, like the farm profile's details card. Was
          four cards, a 2xl green initials circle, green "Active" and purple plan chips, and an
          icon plus an uppercase label on every field. */}
      <StandardCard
        title={currentCompany.name}
        subtitle={
          [
            currentCompany.tradename,
            planName && intl.formatMessage({ id: 'settings.company.plan' }, { plan: planName }),
            currentCompany.is_active === false && label('settings.company.inactive')
          ]
            .filter(Boolean)
            .join(' · ') || undefined
        }
        variant="elevated"
        mb={0}
        headerAction={
          <StandardButton
            variant="outline"
            size="sm"
            leftIcon={<Icon as={FaEdit} />}
            onClick={() => setIsEditModalOpen(true)}>
            {label('app.edit')}
          </StandardButton>
        }>
        <VStack align="stretch" spacing={{ base: 6, md: 7 }} divider={<Divider />}>
          {currentCompany.description && (
            <Text fontSize="sm" color="gray.700" lineHeight="1.6">
              {currentCompany.description}
            </Text>
          )}
          {groups
            .filter((group) => group.has)
            .map((group) => (
              <FieldGroup key={group.id} label={label(group.id)}>
                <FieldList columns={2}>{group.rows}</FieldList>
              </FieldGroup>
            ))}
        </VStack>
      </StandardCard>

      {/* Edit Company Modal */}
      <EditCompanyModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        company={currentCompany}
        onSubmit={handleUpdateCompany}
        isLoading={isUpdating}
      />
    </VStack>
  );
};

export default CompanyInfoTab;
