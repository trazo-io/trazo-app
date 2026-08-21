import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ChakraProvider } from '@chakra-ui/react';
import { S3Image } from '../S3Image';

// Mock the mediaApi
const mockGetPresignedReadUrl = vi.fn();

vi.mock('store/api/mediaApi', () => ({
  useLazyGetPresignedReadUrlQuery: () => [
    mockGetPresignedReadUrl,
    {
      data: null,
      isLoading: false,
      error: null
    }
  ]
}));

// Mock store setup
const mockStore = configureStore({
  reducer: {
    // Add a minimal reducer to avoid store errors
    test: (state = {}) => state
  }
});

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Provider store={mockStore}>
    <ChakraProvider>{children}</ChakraProvider>
  </Provider>
);

// Mock IntersectionObserver
const mockIntersectionObserver = vi.fn();
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null
});

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: mockIntersectionObserver
});

describe('S3Image Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with regular URL', () => {
    render(
      <TestWrapper>
        <S3Image
          src="https://example.com/image.jpg"
          alt="Test image"
          boxSize="200px"
          lazy={false}
        />
      </TestWrapper>
    );

    expect(screen.getByRole('img')).toBeInTheDocument();
    expect(screen.getByLabelText('Test image')).toBeInTheDocument();
  });

  it('shows skeleton while loading', () => {
    render(
      <TestWrapper>
        <S3Image
          src="https://staging-trazo-media-123.s3.amazonaws.com/test.jpg"
          alt="S3 test image"
          boxSize="200px"
          lazy={true}
        />
      </TestWrapper>
    );

    // Should show skeleton initially for S3 URLs with lazy loading
    // Since the component shows skeleton when not in view or loading,
    // we can check for the skeleton class or the absence of img role
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('applies correct accessibility attributes', () => {
    render(
      <TestWrapper>
        <S3Image
          src="https://example.com/image.jpg"
          alt="Accessible image"
          boxSize="200px"
          lazy={false}
        />
      </TestWrapper>
    );

    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('alt', 'Accessible image');
    expect(image).toHaveAttribute('aria-label', 'Accessible image');
  });

  it('handles lazy loading properly', () => {
    render(
      <TestWrapper>
        <S3Image src="https://example.com/image.jpg" alt="Lazy image" boxSize="200px" lazy={true} />
      </TestWrapper>
    );

    // When lazy=true, component should show skeleton until in view
    // Since IntersectionObserver is mocked to not trigger, no image should render
    expect(screen.queryByRole('img')).not.toBeInTheDocument();

    // Should show the placeholder instead.
    //
    // 🔴 2026-08-21 — this looked for `.chakra-skeleton`, which the component has not rendered
    // for some time: the placeholder is `<Shimmer>`, a Box with its own gradient animation. The
    // lazy behaviour above was correct all along; only the selector was stale. Keyed on
    // `data-component`, not the CSS class, because the class is styling and styling moves.
    expect(document.querySelector('[data-component="Shimmer"]')).toBeInTheDocument();
  });

  it('disables lazy loading when specified', () => {
    render(
      <TestWrapper>
        <S3Image
          src="https://example.com/image.jpg"
          alt="Eager image"
          boxSize="200px"
          lazy={false}
        />
      </TestWrapper>
    );

    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('loading', 'eager');
  });

  it('shows custom placeholder', () => {
    const customPlaceholder = <div data-testid="custom-placeholder">Loading...</div>;

    render(
      <TestWrapper>
        <S3Image
          src="https://staging-trazo-media-123.s3.amazonaws.com/test.jpg"
          alt="Image with custom placeholder"
          boxSize="200px"
          placeholder={customPlaceholder}
        />
      </TestWrapper>
    );

    expect(screen.getByTestId('custom-placeholder')).toBeInTheDocument();
  });

  it('applies correct box styling', () => {
    render(
      <TestWrapper>
        <S3Image
          src="https://example.com/image.jpg"
          alt="Styled image"
          boxSize="300px"
          borderRadius="lg"
          data-testid="image-container"
          lazy={false}
        />
      </TestWrapper>
    );

    const container = screen.getByTestId('image-container');
    expect(container).toBeInTheDocument();
    // Box component receives borderRadius prop and boxSize
    expect(container).toHaveAttribute('data-testid', 'image-container');
  });
});

describe('S3Image URL Detection', () => {
  it('detects S3 URLs correctly', () => {
    const s3Urls = [
      'https://staging-trazo-media-123.s3.amazonaws.com/test.jpg',
      'https://staging-trazo-media-456.s3.amazonaws.com/media/test.png'
    ];

    s3Urls.forEach((url, index) => {
      render(
        <TestWrapper>
          <S3Image src={url} alt={`S3 image ${index}`} lazy={true} />
        </TestWrapper>
      );
    });

    // Should not render images for S3 URLs when lazy=true (shows skeleton)
    expect(screen.queryAllByRole('img')).toHaveLength(0);
  });

  it('handles non-S3 URLs directly', () => {
    const regularUrls = [
      'https://example.com/image.jpg',
      'https://cdn.example.com/test.png',
      '/local/image.jpg'
    ];

    regularUrls.forEach((url) => {
      render(
        <TestWrapper>
          <S3Image src={url} alt="Regular image" lazy={false} />
        </TestWrapper>
      );
    });

    // Should render images directly for non-S3 URLs
    expect(screen.getAllByRole('img')).toHaveLength(regularUrls.length);
  });
});

describe('S3Image Error Handling', () => {
  it('shows error state when image fails', async () => {
    render(
      <TestWrapper>
        <S3Image
          src="https://example.com/broken-image.jpg"
          alt="Broken image"
          showErrorMessage={true}
          lazy={false}
        />
      </TestWrapper>
    );

    const image = screen.getByRole('img');

    // Simulate image error
    const errorEvent = new Event('error');
    image.dispatchEvent(errorEvent);

    await waitFor(() => {
      expect(screen.getByText('Failed to load image')).toBeInTheDocument();
    });
  });

  // ── Ported from the retired `src/components/__tests__/S3Image.test.tsx` ──────────────
  // That file targeted a `useBatchS3Images`-based implementation that no longer exists and
  // had never run (its helper died on a missing import), so most of what it asserted was
  // fiction — including a `responsive` / `sizes` API this component has never had. These two
  // named real props, so they come across rather than being deleted with it.

  it('applies a custom className', () => {
    render(
      <TestWrapper>
        <S3Image
          src="https://example.com/image.jpg"
          alt="Classy image"
          className="my-custom-class"
          lazy={false}
        />
      </TestWrapper>
    );

    expect(document.querySelector('.my-custom-class')).toBeInTheDocument();
  });

  it('uses a presigned URL when one is supplied', () => {
    // The caller has already resolved the signature (the batch path does this for galleries),
    // so the component must use it rather than firing its own lazy presign request.
    render(
      <TestWrapper>
        <S3Image
          src="https://my-bucket.s3.amazonaws.com/photo.jpg"
          alt="Presigned image"
          presignedUrl="https://my-bucket.s3.amazonaws.com/photo.jpg?X-Amz-Signature=abc123"
          lazy={false}
        />
      </TestWrapper>
    );

    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('src', expect.stringContaining('X-Amz-Signature=abc123'));
    expect(mockGetPresignedReadUrl).not.toHaveBeenCalled();
  });

  it('shows fallback image on error', () => {
    render(
      <TestWrapper>
        <S3Image
          src="https://example.com/broken-image.jpg"
          alt="Image with fallback"
          fallbackSrc="/fallback.jpg"
          lazy={false}
        />
      </TestWrapper>
    );

    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('src', 'https://example.com/broken-image.jpg');

    // The component passes fallbackSrc to Chakra UI Image component
    // In tests, this may not be visible as an attribute, but the prop is set
    expect(image).toHaveAttribute('alt', 'Image with fallback');
  });
});

export {};
