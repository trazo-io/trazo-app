/**
 * The blocks a help-center guide is written in (2026-11-08).
 *
 * Every guide opened on a green success alert (check icon, tinted box, left border) that
 * restated the page title, and placed its "where to find it" and "pro tip" notes in more
 * green and blue alerts. Nothing had succeeded, and a page of coloured boxes reads as a page
 * of warnings. A guide is a document: an opening paragraph, then sections. Callouts are kept
 * for real cautions only (`StandardAlert status="warning"`).
 */
import React, { ReactNode } from 'react';
import { Box, Heading, Text } from '@chakra-ui/react';

/** The opening of a guide: one line that says what it is for, then the paragraph. */
export const ArticleLead = ({ title, children }: { title: string; children: ReactNode }) => (
  <Box>
    <Text fontSize="lg" fontWeight="semibold" color="gray.800" mb={1}>
      {title}
    </Text>
    <Text fontSize="md" color="gray.700" lineHeight="tall">
      {children}
    </Text>
  </Box>
);

/** A short section inside a guide, such as where to find something or a tip. No box. */
export const ArticleNote = ({ title, children }: { title: string; children: ReactNode }) => (
  <Box>
    <Heading as="h3" size="sm" color="gray.800" mb={1}>
      {title}
    </Heading>
    <Text color="gray.700" lineHeight="tall">
      {children}
    </Text>
  </Box>
);
