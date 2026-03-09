import DOMPurify from 'dompurify';
import React from 'react';

interface HTMLRendererProps {
  htmlString?: string | null;
  className?: string;
}

// SECURITY: Restrict allowed HTML tags to prevent XSS
const DOMPURIFY_CONFIG = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'a', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  ALLOW_DATA_ATTR: false,
};

function HTMLRenderer({ htmlString, className }: HTMLRendererProps) {
  // Handle null/undefined/empty values to prevent React error #61
  if (!htmlString || typeof htmlString !== 'string') {
    return null;
  }

  const trimmed = htmlString.trim();
  if (!trimmed) {
    return null;
  }

  // SECURITY: Sanitize HTML with DOMPurify to prevent XSS
  const sanitizedHtml = DOMPurify.sanitize(trimmed, DOMPURIFY_CONFIG);
  if (!sanitizedHtml) {
    return null;
  }

  return <div className={className} dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />;
}

export default HTMLRenderer;
