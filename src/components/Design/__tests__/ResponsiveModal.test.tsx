/**
 * Regression guards for the shared dialog shell.
 *
 * The bug that motivated this: the "Select Production Template" picker was a bare
 * `<Modal size="6xl">` with no mobile branch, no `scrollBehavior="inside"` and no
 * side margin, so on a narrow viewport it rendered edge-to-edge with its header and
 * footer scrolled off screen. Eight other dialogs had each hand-rolled the correct
 * Drawer/Modal branch independently; this component is the ninth-copy prevention.
 *
 * These assert the two properties that actually broke:
 *   1. Below `md` the shell is a Drawer (bottom sheet), not a Modal.
 *   2. At `md` and up it is a Modal whose body scrolls INSIDE a pinned header/footer.
 */
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
// Relative, not the `theme/*` tsconfig alias — vitest.config.ts does not map that one.
import theme from '../../../theme/theme';
import { ResponsiveModal } from '../ResponsiveModal';

// The global jsdom stub answers every media query with `matches: false`, and flipping
// it to a blanket `true` is just as wrong — both leave Chakra's useBreakpointValue
// stuck on `base`, so a test that thinks it is asserting the desktop branch silently
// asserts the mobile one. Parse the width out of the query instead and answer it
// against a real viewport width. Trazo's `md` is 768px (theme/foundations/breakpoints),
// not Chakra's default 48em.
const setViewportWidth = (width: number) => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => {
    const toPx = (value: string, unit: string) =>
      unit === 'em' || unit === 'rem' ? parseFloat(value) * 16 : parseFloat(value);
    const min = /\(min-width:\s*([\d.]+)(px|em|rem)\)/.exec(query);
    const max = /\(max-width:\s*([\d.]+)(px|em|rem)\)/.exec(query);
    let matches = true;
    if (min) matches = matches && width >= toPx(min[1], min[2]);
    if (max) matches = matches && width <= toPx(max[1], max[2]);
    return {
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    };
  }) as unknown as typeof window.matchMedia;
};

const MOBILE_WIDTH = 375; // iPhone SE / project's mobile-first target
const DESKTOP_WIDTH = 1440;

const renderShell = (props: Partial<React.ComponentProps<typeof ResponsiveModal>> = {}) =>
  render(
    <ChakraProvider theme={theme}>
      <ResponsiveModal
        isOpen
        onClose={() => undefined}
        header="Select Production Template"
        footer={<button type="button">Cancel</button>}
        {...props}>
        <div>Pistachios - Organic Production</div>
      </ResponsiveModal>
    </ChakraProvider>
  );

describe('ResponsiveModal', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders header, body and footer content when open', () => {
    setViewportWidth(DESKTOP_WIDTH);
    renderShell();
    expect(screen.getByText('Select Production Template')).toBeInTheDocument();
    expect(screen.getByText('Pistachios - Organic Production')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('renders nothing when closed', () => {
    setViewportWidth(DESKTOP_WIDTH);
    renderShell({ isOpen: false });
    expect(screen.queryByText('Pistachios - Organic Production')).not.toBeInTheDocument();
  });

  it('scrolls the body inside a pinned header on desktop, never the whole dialog', () => {
    setViewportWidth(DESKTOP_WIDTH);
    const { baseElement } = renderShell();

    // `scrollBehavior="inside"` is what keeps the title on screen. Chakra applies it
    // as overflow on the body while the content box stays clipped — the previous code
    // put `overflowY="auto"` on ModalContent instead, which scrolled the header away.
    //
    // NOTE ON WHAT THIS CAN AND CANNOT SEE: jsdom resolves Chakra's THEME-generated CSS
    // (emotion inserts it via CSSOM) but returns "" for style-prop-generated classes —
    // verified by probe: `<Box pl={6} pr={12}>` computes to empty, while a themed
    // ModalHeader computes to its theme padding. So this asserts the scrollBehavior
    // theme wiring, which is the thing that regressed. Do not add computed-style
    // assertions for style props here; they can only ever read the theme default and
    // will look like they pass while proving nothing. Style-prop layout (e.g. the
    // header's pr={12} close-button clearance) needs a real browser.
    const body = baseElement.querySelector('.chakra-modal__body') as HTMLElement;
    expect(body).toBeTruthy();
    expect(getComputedStyle(body).overflowY).toBe('auto');

    const content = baseElement.querySelector('.chakra-modal__content') as HTMLElement;
    expect(getComputedStyle(content).overflowY).not.toBe('auto');
  });

  it('uses a bottom-sheet Drawer below the md breakpoint', () => {
    setViewportWidth(MOBILE_WIDTH);
    renderShell();

    // Chakra renders Drawer through the same modal primitives, so class names cannot
    // tell the two branches apart. The swipe-to-dismiss drag handle only exists on the
    // sheet, which makes it the honest marker.
    expect(screen.getByTestId('responsive-modal-sheet-handle')).toBeInTheDocument();
    expect(screen.getByText('Pistachios - Organic Production')).toBeInTheDocument();
  });

  it('has no drag handle on desktop', () => {
    setViewportWidth(DESKTOP_WIDTH);
    renderShell();
    expect(screen.queryByTestId('responsive-modal-sheet-handle')).not.toBeInTheDocument();
  });

  it('picks its branch on the first render, without remounting the body', () => {
    // Chakra's useMediaQuery defaults to ssr:true, which reports `base` on the first
    // render for everyone — a desktop user would paint the bottom sheet, then swap to
    // the Modal, unmounting and remounting everything inside. Drawer and Modal are
    // different subtrees, so that swap shows up here as a second mount.
    const mounts = { count: 0 };
    const MountCounter = () => {
      React.useEffect(() => {
        mounts.count += 1;
      }, []);
      return <div>body</div>;
    };

    setViewportWidth(DESKTOP_WIDTH);
    render(
      <ChakraProvider theme={theme}>
        <ResponsiveModal isOpen onClose={() => undefined} header="Title">
          <MountCounter />
        </ResponsiveModal>
      </ChakraProvider>
    );

    expect(screen.queryByTestId('responsive-modal-sheet-handle')).not.toBeInTheDocument();
    expect(mounts.count).toBe(1);
  });

  it('blocks close via the button and ESC while isCloseDisabled', () => {
    setViewportWidth(DESKTOP_WIDTH);
    const onClose = vi.fn();
    const { baseElement } = renderShell({ onClose, isCloseDisabled: true });

    const dialog = baseElement.querySelector('.chakra-modal__content') as HTMLElement;
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();

    expect(screen.getByRole('button', { name: /close/i })).toBeDisabled();
  });

  it('closes on ESC when not disabled', () => {
    setViewportWidth(DESKTOP_WIDTH);
    const onClose = vi.fn();
    const { baseElement } = renderShell({ onClose });

    const dialog = baseElement.querySelector('.chakra-modal__content') as HTMLElement;
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('omits the header and footer chrome when no content is supplied', () => {
    setViewportWidth(DESKTOP_WIDTH);
    const { baseElement } = renderShell({ header: undefined, footer: undefined });
    expect(baseElement.querySelector('.chakra-modal__header')).toBeNull();
    expect(baseElement.querySelector('.chakra-modal__footer')).toBeNull();
  });
});
