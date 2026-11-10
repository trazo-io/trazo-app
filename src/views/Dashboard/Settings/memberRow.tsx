/**
 * One member of the company on Settings > Team: a row, not a table line (2026-11-09).
 *
 * The table it replaces put the role and an actions menu in its third and fourth columns, so
 * on a phone both sat off screen behind a sideways scroll. And the menu's "Edit" and "Delete"
 * did nothing (`onClick={() => {}}`).
 *
 * Since 2026-11-10 the API changes a member's role and removes them
 * (`PATCH|DELETE /companies/<id>/members/<membership_id>/`). The row shows the role select and
 * Remove only when the server says the caller may use them (`can_manage`, computed by the same
 * rules the endpoint enforces: trazo-back `users/team.py`). Everyone else sees the role as text,
 * so there is still no control the page cannot honour.
 *
 * Farms are plain text under the name, not green chips: which farms someone works on is a
 * fact, and green on this page is not a status.
 */
import { Box, Flex, HStack, Text } from '@chakra-ui/react';
import { useIntl } from 'react-intl';

import { StandardButton, StandardSelect } from 'components/Design/StandardComponents';

export interface RoleChoice {
  id: string;
  name: string;
}

interface MemberRowProps {
  name: string;
  establishments: string[];
  role: string;
  /** CA / FM / VW. Needed only when the row can be managed. */
  roleCode?: string;
  isYou?: boolean;
  isSetupOperator?: boolean;
  canManage?: boolean;
  roleChoices?: RoleChoice[];
  isBusy?: boolean;
  onRoleChange?: (roleCode: string) => void;
  onRemove?: () => void;
}

// Stored role names (users.Role) to their catalogue keys.
export const ROLE_LABEL_KEYS: Record<string, string> = {
  'Company Admin': 'app.administrator',
  'Farm Manager': 'app.farmManager',
  Viewer: 'app.viewerRole'
};

const MemberRow = ({
  name,
  establishments,
  role,
  roleCode,
  isYou = false,
  isSetupOperator = false,
  canManage = false,
  roleChoices = [],
  isBusy = false,
  onRoleChange,
  onRemove
}: MemberRowProps) => {
  const intl = useIntl();
  const roleKey = ROLE_LABEL_KEYS[role];
  const displayRole = roleKey ? intl.formatMessage({ id: roleKey }) : role;
  const farms =
    establishments?.length > 0
      ? establishments.join(', ')
      : intl.formatMessage({ id: 'app.noEstablishmentsAssigned' });
  // Remove needs no roles catalogue, so a roles query still loading (or failing) never takes it
  // away; the select needs the catalogue to have anything to offer (review of #352).
  const showRemove = canManage && Boolean(onRemove);
  const showRoleSelect = canManage && Boolean(roleCode && onRoleChange) && roleChoices.length > 0;
  const showControls = showRemove || showRoleSelect;

  return (
    <Flex
      py={3}
      gap={{ base: 2, md: 4 }}
      justify="space-between"
      align={{ base: 'flex-start', md: 'center' }}
      direction={{ base: showControls ? 'column' : 'row', md: 'row' }}
      data-testid="member-row">
      <Box minW={0}>
        <Text fontSize="sm" fontWeight="semibold" color="gray.800">
          {name}
          {isYou && (
            <Text as="span" fontWeight="normal" color="gray.600">
              {' · '}
              {intl.formatMessage({ id: 'settings.team.you' })}
            </Text>
          )}
        </Text>
        <Text fontSize="sm" color="gray.600" mt={0.5}>
          {farms}
        </Text>
        {/* Says why this row has no controls: Trazo removes this account, not the screen. */}
        {isSetupOperator && (
          <Text fontSize="xs" color="gray.600" mt={0.5}>
            {intl.formatMessage({ id: 'settings.team.setupOperator' })}
          </Text>
        )}
      </Box>
      {showControls ? (
        <HStack spacing={2} flexShrink={0}>
          {!showRoleSelect && (
            <Text fontSize="sm" color="gray.600">
              {displayRole}
            </Text>
          )}
          {showRoleSelect && (
            <StandardSelect
              size="sm"
              w="auto"
              value={roleCode}
              isDisabled={isBusy}
              aria-label={intl.formatMessage({ id: 'settings.team.roleFor' }, { name })}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                onRoleChange?.(e.target.value)
              }>
              {roleChoices.map((choice) => (
                <option key={choice.id} value={choice.id}>
                  {choice.name}
                </option>
              ))}
            </StandardSelect>
          )}
          {showRemove && (
            <StandardButton
              size="sm"
              variant="ghost"
              isDisabled={isBusy}
              aria-label={intl.formatMessage({ id: 'settings.team.removeLabel' }, { name })}
              onClick={onRemove}>
              {intl.formatMessage({ id: 'settings.team.remove' })}
            </StandardButton>
          )}
        </HStack>
      ) : (
        <Text fontSize="sm" color="gray.600" flexShrink={0}>
          {displayRole}
        </Text>
      )}
    </Flex>
  );
};

export default MemberRow;
