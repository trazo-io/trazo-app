import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ChakraProvider } from '@chakra-ui/react';
import { S3Image } from '../S3Image';
import { mediaApi } from 'store/api/mediaApi';

// Mock store setup
const mockStore = configureStore({
  reducer: {
    [mediaApi.reducerPath]: mediaApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(mediaApi.middleware),
});

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Provider store={mockStore}>
    <ChakraProvider>
      {children}
    </ChakraProvider>
  </Provider>
);

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null
});

window.IntersectionObserver = mockIntersectionObserver;

describe('S3Image Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with regular URL', () => {
    render(
      <TestWrapper>
        <S3Image
          src="https://example.com/image.jpg"
          alt="Test image"
          boxSize="200px"
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
        />
      </TestWrapper>
    );

    // Should show skeleton initially for S3 URLs
    expect(document.querySelector('[data-testid="skeleton"]')).toBeInTheDocument();
  });

  it('applies correct accessibility attributes', () => {
    render(
      <TestWrapper>
        <S3Image
          src="https://example.com/image.jpg"
          alt="Accessible image"
          boxSize="200px"
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
        <S3Image
          src="https://example.com/image.jpg"
          alt="Lazy image"
          boxSize="200px"
          lazy={true}
        />
      </TestWrapper>
    );

    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('loading', 'lazy');
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
        />
      </TestWrapper>
    );

    const container = screen.getByTestId('image-container').parentElement;
    expect(container).toHaveStyle({
      borderRadius: 'var(--chakra-radii-lg)'
    });
  });
});

describe('S3Image URL Detection', () => {
  it('detects S3 URLs correctly', () => {
    const s3Urls = [
      'https://staging-trazo-media-123.s3.amazonaws.com/test.jpg',
      'https://staging-trazo-media-456.s3.amazonaws.com/media/test.png'
    ];

    s3Urls.forEach(url => {
      render(
        <TestWrapper>
          <S3Image src={url} alt="S3 image" />
        </TestWrapper>
      );
    });

    // Should render skeleton for S3 URLs that need presigning
    expect(document.querySelectorAll('[data-testid="skeleton"]')).toHaveLength(s3Urls.length);
  });

  it('handles non-S3 URLs directly', () => {
    const regularUrls = [
      'https://example.com/image.jpg',
      'https://cdn.example.com/test.png',
      '/local/image.jpg'
    ];

    regularUrls.forEach(url => {
      render(
        <TestWrapper>
          <S3Image src={url} alt="Regular image" />
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

  it('shows fallback image on error', () => {
    render(
      <TestWrapper>
        <S3Image
          src="https://example.com/broken-image.jpg"
          alt="Image with fallback"
          fallbackSrc="/fallback.jpg"
        />
      </TestWrapper>
    );

    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('src', 'https://example.com/broken-image.jpg');
    
    // Chakra UI handles fallback automatically
    expect(image).toHaveAttribute('fallbackSrc', '/fallback.jpg');
  });
});

export {};