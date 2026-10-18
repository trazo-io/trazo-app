/**
 * Why OSPView scrolls to a section by ref and not by id (review of app #146).
 *
 * Chakra's `useAccordionItem` takes `id` for its button and panel ids and never puts it on the
 * item's DOM node, so the first version's `document.getElementById('osp-section-…')` was always
 * null and the scroll-to-section never ran. A Chakra upgrade that changes either behaviour should
 * fail here, not silently.
 */
import React from 'react';
import {
  Accordion,
  AccordionButton,
  AccordionItem,
  AccordionPanel,
  ChakraProvider
} from '@chakra-ui/react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('Chakra AccordionItem', () => {
  it('does not put `id` on its DOM node, and forwards `ref` to it', () => {
    let node: HTMLDivElement | null = null;
    render(
      <ChakraProvider>
        <Accordion>
          <AccordionItem
            id="osp-section-inputs_list"
            data-testid="item"
            ref={(n: HTMLDivElement | null) => {
              node = n;
            }}>
            <AccordionButton>Inputs</AccordionButton>
            <AccordionPanel>Narrative</AccordionPanel>
          </AccordionItem>
        </Accordion>
      </ChakraProvider>
    );
    expect(document.getElementById('osp-section-inputs_list')).toBeNull();
    expect(node).not.toBeNull();
    expect(node!.getAttribute('data-testid')).toBe('item');
  });
});
