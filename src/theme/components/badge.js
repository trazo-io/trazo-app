// Updated for Chakra UI v2.10.9 - restored mode function with improved CSS-in-JS support
import { mode } from '@chakra-ui/theme-tools';

export const badgeStyles = {
  components: {
    Badge: {
      variants: {
        // Trazo brand-focused variants using forest green palette
        brand: {
          bg: 'green.500',
          color: 'white',
          fontSize: 'xs',
          fontWeight: '600'
        },
        outline: {
          border: '1px solid',
          borderColor: 'green.500',
          color: 'green.500',
          bg: 'transparent',
          fontSize: 'xs',
          fontWeight: '600'
        },
        subtle: {
          bg: {
            base: 'green.50',
            _dark: 'green.900'
          },
          color: {
            base: 'green.700',
            _dark: 'green.200'
          },
          fontSize: 'xs',
          fontWeight: '600'
        }
      },
      baseStyle: {
        textTransform: 'capitalize',
        borderRadius: '6px',
        px: 2,
        py: 1,
        fontSize: 'xs',
        fontWeight: '500'
      },
      defaultProps: {
        variant: 'brand',
        size: 'md'
      }
    }
  }
};
