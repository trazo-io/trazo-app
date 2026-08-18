/**
 * ResponsiveModal — the app's one dialog shell.
 *
 * Below `md` it renders a bottom-sheet Drawer (drag handle, swipe-to-dismiss); at `md`
 * and up a centered Modal with `scrollBehavior="inside"` so the header and footer stay
 * pinned while only the body scrolls.
 *
 * This is the pattern ParcelModal / FarmModal / CompanyModal / EditCompanyModal /
 * EducationModal each grew independently. New dialogs should use this instead of
 * hand-rolling a ninth copy.
 */
import React, { ReactNode } from 'react';
import {
  Box,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  useBreakpointValue,
  useColorModeValue
} from '@chakra-ui/react';
import type { ModalProps } from '@chakra-ui/react';
import { useSwipeToDismiss } from 'hooks/useSwipeToDismiss';

export interface ResponsiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Header content. Plain strings are fine; nodes render as-is. */
  header?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Desktop modal width. Mobile always uses a bottom sheet. */
  size?: ModalProps['size'];
  /** Bottom-sheet height cap, as a CSS length (e.g. '85vh', '100vh'). */
  mobileMaxH?: string;
  /** Disables both the close button and overlay/ESC dismissal (e.g. while submitting). */
  isCloseDisabled?: boolean;
  closeOnOverlayClick?: boolean;
  /** Set false for camera/viewfinder bodies that manage their own overflow. */
  scrollBody?: boolean;
  overlayProps?: Record<string, unknown>;
  contentProps?: Record<string, unknown>;
  bodyProps?: Record<string, unknown>;
}

export const ResponsiveModal: React.FC<ResponsiveModalProps> = ({
  isOpen,
  onClose,
  header,
  children,
  footer,
  size = 'xl',
  mobileMaxH = '85vh',
  isCloseDisabled = false,
  closeOnOverlayClick = true,
  scrollBody = true,
  overlayProps,
  contentProps,
  bodyProps
}) => {
  // `ssr: false` matters. Chakra's useMediaQuery defaults to ssr:true, which makes the
  // FIRST render report the `base` breakpoint for everyone — so a desktop user paints the
  // bottom sheet, then an effect corrects it and React swaps Drawer→Modal, remounting the
  // whole body. Trazo is a client-only Vite SPA with no hydration, so reading matchMedia
  // synchronously is both correct and flicker-free.
  //
  // `fallback` must be passed explicitly: Chakra only defaults it to 'base' when the arg is
  // NOT an object (`isObject(arg) ? arg : { fallback: arg ?? 'base' }`). Passing `{ssr:false}`
  // alone leaves fallback undefined, useBreakpoint returns undefined, and useBreakpointValue
  // early-returns undefined — which would render the DESKTOP modal on a phone.
  const isMobile = useBreakpointValue({ base: true, md: false }, { ssr: false, fallback: 'base' });
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const handleColor = useColorModeValue('gray.300', 'gray.600');

  // A disabled close button also has to block the overlay and ESC, otherwise the
  // dialog is still dismissible through the two paths that bypass the button.
  const isDismissible = !isCloseDisabled;
  const handleClose = () => {
    if (isDismissible) onClose();
  };
  const swipeHandlers = useSwipeToDismiss({ onClose: handleClose });

  // Headers below use pl/pr, never px+pr: `px` emits logical padding-inline-*, `pr` emits
  // physical padding-right, and which one wins depends on emotion's serialization order
  // rather than on anything we control. pr={12} is the clearance the absolutely-positioned
  // close button needs so a long title cannot run underneath it.

  if (isMobile) {
    return (
      <Drawer
        isOpen={isOpen}
        onClose={handleClose}
        placement="bottom"
        closeOnOverlayClick={isDismissible && closeOnOverlayClick}
        closeOnEsc={isDismissible}>
        <DrawerOverlay bg="blackAlpha.400" {...overlayProps} />
        <DrawerContent bg={bgColor} borderTopRadius="2xl" maxH={mobileMaxH} {...contentProps}>
          <Box
            data-testid="responsive-modal-sheet-handle"
            pt={3}
            pb={1}
            display="flex"
            justifyContent="center"
            cursor="grab"
            {...swipeHandlers}>
            <Box w="36px" h="4px" borderRadius="full" bg={handleColor} />
          </Box>
          <DrawerCloseButton top={4} isDisabled={isCloseDisabled} />
          {header && (
            <DrawerHeader
              pl={5}
              pr={12}
              pt={2}
              pb={4}
              borderBottomWidth="1px"
              borderColor={borderColor}>
              {header}
            </DrawerHeader>
          )}
          <DrawerBody px={5} py={4} overflowY={scrollBody ? 'auto' : 'hidden'} {...bodyProps}>
            {children}
          </DrawerBody>
          {footer && (
            <DrawerFooter borderTopWidth="1px" borderColor={borderColor}>
              {footer}
            </DrawerFooter>
          )}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size={size}
      scrollBehavior="inside"
      closeOnOverlayClick={isDismissible && closeOnOverlayClick}
      closeOnEsc={isDismissible}>
      <ModalOverlay bg="blackAlpha.400" {...overlayProps} />
      <ModalContent bg={bgColor} borderRadius="xl" maxH="90vh" mx={4} {...contentProps}>
        {header && (
          <ModalHeader
            pl={6}
            pr={12}
            pt={6}
            pb={4}
            borderBottomWidth="1px"
            borderColor={borderColor}>
            {header}
          </ModalHeader>
        )}
        <ModalCloseButton isDisabled={isCloseDisabled} />
        <ModalBody px={6} py={4} overflowY={scrollBody ? 'auto' : 'hidden'} {...bodyProps}>
          {children}
        </ModalBody>
        {footer && (
          <ModalFooter borderTopWidth="1px" borderColor={borderColor}>
            {footer}
          </ModalFooter>
        )}
      </ModalContent>
    </Modal>
  );
};

export default ResponsiveModal;
