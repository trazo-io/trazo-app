/*!

=========================================================
* Trazo - Agricultural Carbon Transparency Platform
=========================================================

* Comprehensive Color Palette System v2.0
* Designed for premium agricultural carbon management
* Optimized for global accessibility and modern aesthetics

=========================================================

*/

// Removed mode import to fix staging deployment issues

/* 
=== TRAZO COLOR PALETTE SYSTEM ===

Primary Colors (Forest Green Family):
- primary-forest: #2E7D32     - Premium forest green for trust and stability
- primary-emerald: #059669    - Growth and sustainability
- primary-deep: #1B5E20       - Professional enterprise-grade
- primary-light: #81C784      - Light accent for subtle highlights

Neutral Colors (Professional Gray Scale):
- neutral-white: #FFFFFF      - Pure white for clean backgrounds
- neutral-light: #F8F9FA      - Light gray for page backgrounds
- neutral-border: #E0E0E0     - Medium gray for borders and dividers
- neutral-text: #424242       - Dark gray for body text
- neutral-heading: #1A1A1A    - Charcoal for headings and emphasis

Accent Colors:
- accent-amber: #FF9800       - Warm amber for CTAs and highlights
- accent-red: #F44336         - Error states and urgent actions
- accent-blue: #2196F3        - Information and links

Supporting Colors:
- success: #4CAF50            - Success states and confirmations
- warning: #FF9800            - Warning states
- error: #F44336              - Error states
- info: #2196F3               - Information states

Usage Guidelines:
- Use primary-forest for main CTAs and brand elements
- Use neutral-light for page backgrounds
- Use neutral-border for all borders and dividers
- Use accent-amber sparingly for important highlights
- Maintain 4.5:1 contrast ratio for accessibility
*/

export const globalStyles = {
  colors: {
    // Trazo Primary Color System
    trazo: {
      forest: '#2E7D32',      // Primary brand color - premium forest green
      emerald: '#059669',     // Growth and sustainability
      deep: '#1B5E20',        // Professional enterprise
      light: '#81C784'        // Light accent
    },
    // Updated Green Scale to Match Brand
    green: {
      50: '#E8F5E8',
      100: '#C8E6C8', 
      200: '#A5D6A5',
      300: '#81C784',         // Light accent
      400: '#66BB6A',
      500: '#2E7D32',         // Primary forest green
      600: '#059669',         // Emerald green  
      700: '#388E3C',
      800: '#2E7D32',
      900: '#1B5E20'          // Deep forest
    },
    // Professional Neutral Scale
    gray: {
      50: '#FAFAFA',
      100: '#F8F9FA',         // Light backgrounds
      200: '#E0E0E0',         // Borders
      300: '#BDBDBD',
      400: '#9E9E9E',
      500: '#757575',
      600: '#616161',
      700: '#424242',         // Body text
      800: '#303030',
      900: '#1A1A1A'          // Headings
    },
    // Accent Colors
    amber: {
      50: '#FFF8E1',
      100: '#FFECB3',
      200: '#FFE082',
      300: '#FFD54F',
      400: '#FFCA28',
      500: '#FF9800',         // Primary accent
      600: '#FB8C00',
      700: '#F57C00',
      800: '#EF6C00',
      900: '#E65100'
    },
    // Semantic Colors
    red: {
      50: '#FFEBEE',
      100: '#FFCDD2',
      200: '#EF9A9A',
      300: '#E57373',
      400: '#EF5350',
      500: '#F44336',         // Error color
      600: '#E53935',
      700: '#D32F2F',
      800: '#C62828',
      900: '#B71C1C'
    },
    blue: {
      50: '#E3F2FD',
      100: '#BBDEFB',
      200: '#90CAF9',
      300: '#64B5F6',
      400: '#42A5F5',
      500: '#2196F3',         // Info color
      600: '#1E88E5',
      700: '#1976D2',
      800: '#1565C0',
      900: '#0D47A1'
    }
  },
  styles: {
    global: {
      body: {
        bg: {
          base: 'gray.100',
          _dark: 'gray.800'
        },
        fontFamily:
          "'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
        color: {
          base: 'gray.700',
          _dark: 'white'
        },
        lineHeight: 'base'
      },
      html: {
        fontFamily:
          "'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
      },
      // Updated global styles with Trazo green focus
      '*': {
        boxSizing: 'border-box'
      },
      a: {
        color: {
          base: 'green.500',
          _dark: 'green.300'
        },
        textDecoration: 'none',
        _hover: {
          textDecoration: 'none',
          color: {
            base: 'green.600',
            _dark: 'green.200'
          }
        }
      }
    }
  }
};
