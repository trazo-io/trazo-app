import { Flex, Link, List, ListItem, Text } from '@chakra-ui/react';
import { useIntl } from 'react-intl';

export default function ConsumerFooter() {
  const intl = useIntl();
  return (
    <Flex
      flexDirection={{
        base: 'column',
        xl: 'row'
      }}
      alignItems={{
        base: 'center',
        xl: 'start'
      }}
      justifyContent="space-between"
      px="30px"
      pb="20px"
    >
      <Text
        color="gray.400"
        textAlign={{
          base: 'center',
          xl: 'start'
        }}
        mb={{ base: '20px', xl: '0px' }}
      >
        &copy; {new Date().getFullYear()} Trazo.
      </Text>
      <List display="flex">
        <ListItem
          me={{
            base: '20px',
            md: '44px'
          }}
        >
          <Link color="gray.400" href="">
            {intl.formatMessage({ id: 'app.about' })}
          </Link>
        </ListItem>
        <ListItem
          me={{
            base: '20px',
            md: '44px'
          }}
        >
          <Link color="gray.400" href="">
            {intl.formatMessage({ id: 'app.whyUs' })}
          </Link>
        </ListItem>
        <ListItem
          me={{
            base: '20px',
            md: '44px'
          }}
        >
          <Link color="gray.400" href="">
            {intl.formatMessage({ id: 'app.blog' })}
          </Link>
        </ListItem>
        <ListItem>
          <Link color="gray.400" href="">
            {intl.formatMessage({ id: 'app.contactUs' })}
          </Link>
        </ListItem>
      </List>
    </Flex>
  );
}
