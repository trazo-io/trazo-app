/**
 * One member of the company on Settings > Team: a row, not a table line (2026-11-09).
 *
 * The table it replaces put the role and an actions menu in its third and fourth columns, so
 * on a phone both sat off screen behind a sideways scroll. And the menu's "Edit" and "Delete"
 * did nothing (`onClick={() => {}}`): the API has no endpoint to change a member's role or
 * remove one, so the row shows no control it cannot honour.
 *
 * Farms are plain text under the name, not green chips: which farms someone works on is a
 * fact, and green on this page is not a status.
 */
import { Box, Flex, Text } from '@chakra-ui/react';
import { useIntl } from 'react-intl';

interface MemberRowProps {
  name: string;
  establishments: string[];
  role: string;
}

// Stored role names (users.Role) to their catalogue keys.
export const ROLE_LABEL_KEYS: Record<string, string> = {
  'Company Admin': 'app.administrator',
  'Farm Manager': 'app.farmManager',
  Viewer: 'app.viewerRole'
};

const MemberRow = ({ name, establishments, role }: MemberRowProps) => {
  const intl = useIntl();
  const roleKey = ROLE_LABEL_KEYS[role];
  const displayRole = roleKey ? intl.formatMessage({ id: roleKey }) : role;
  const farms =
    establishments?.length > 0
      ? establishments.join(', ')
      : intl.formatMessage({ id: 'app.noEstablishmentsAssigned' });

  return (
    <Flex py={3} gap={4} justify="space-between" align="baseline" data-testid="member-row">
      <Box minW={0}>
        <Text fontSize="sm" fontWeight="semibold" color="gray.800">
          {name}
        </Text>
        <Text fontSize="sm" color="gray.600" mt={0.5}>
          {farms}
        </Text>
      </Box>
      <Text fontSize="sm" color="gray.600" flexShrink={0}>
        {displayRole}
      </Text>
    </Flex>
  );
};

export default MemberRow;
