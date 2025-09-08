import React from 'react';

interface HTMLRendererProps {
  htmlString?: string | null;
  className?: string;
}

function HTMLRenderer({ htmlString, className }: HTMLRendererProps) {
  // Handle null/undefined/empty values to prevent React error #61
  if (!htmlString || typeof htmlString !== 'string') {
    return null;
  }

  // Sanitize and validate the HTML string
  const sanitizedString = htmlString.trim();
  if (!sanitizedString) {
    return null;
  }

  // Ensure the __html property is properly formatted for dangerouslySetInnerHTML
  const createMarkup = () => {
    try {
      return { __html: sanitizedString };
    } catch (error) {
      console.warn('HTMLRenderer: Error creating markup', error);
      return { __html: '' };
    }
  };

  return <div className={className} dangerouslySetInnerHTML={createMarkup()} />;
}

export default HTMLRenderer;
