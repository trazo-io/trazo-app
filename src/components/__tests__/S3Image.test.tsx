import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../../test/utils'
import S3Image from '../Media/S3Image'

// Mock the batch S3 images hook
vi.mock('../../hooks/useBatchS3Images', () => ({
  default: vi.fn(() => ({
    presignedUrls: {},
    isLoading: false,
    error: null,
    requestUrls: vi.fn(),
  }))
}))

describe('S3Image', () => {
  const mockProps = {
    src: 'https://test-bucket.s3.amazonaws.com/test-image.jpg',
    alt: 'Test image',
    width: 200,
    height: 150,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders image with correct attributes', () => {
    render(<S3Image {...mockProps} />)
    
    const image = screen.getByRole('img')
    expect(image).toHaveAttribute('alt', 'Test image')
    expect(image).toHaveAttribute('width', '200')
    expect(image).toHaveAttribute('height', '150')
  })

  it('handles loading state', () => {
    const useBatchS3Images = vi.mocked(
      require('../../hooks/useBatchS3Images').default
    )
    useBatchS3Images.mockReturnValue({
      presignedUrls: {},
      isLoading: true,
      error: null,
      requestUrls: vi.fn(),
    })

    render(<S3Image {...mockProps} />)
    
    // Should show loading placeholder
    expect(screen.getByTestId('image-loading')).toBeInTheDocument()
  })

  it('handles error state gracefully', async () => {
    const useBatchS3Images = vi.mocked(
      require('../../hooks/useBatchS3Images').default
    )
    useBatchS3Images.mockReturnValue({
      presignedUrls: {},
      isLoading: false,
      error: 'Failed to load image',
      requestUrls: vi.fn(),
    })

    render(<S3Image {...mockProps} />)
    
    // Should show error placeholder or fallback
    await waitFor(() => {
      expect(screen.getByTestId('image-error')).toBeInTheDocument()
    })
  })

  it('uses presigned URL when available', () => {
    const presignedUrl = 'https://presigned-url.com/image.jpg'
    const useBatchS3Images = vi.mocked(
      require('../../hooks/useBatchS3Images').default
    )
    useBatchS3Images.mockReturnValue({
      presignedUrls: {
        [mockProps.src]: presignedUrl
      },
      isLoading: false,
      error: null,
      requestUrls: vi.fn(),
    })

    render(<S3Image {...mockProps} />)
    
    const image = screen.getByRole('img')
    expect(image).toHaveAttribute('src', presignedUrl)
  })

  it('handles non-S3 URLs directly', () => {
    const directUrl = 'https://example.com/direct-image.jpg'
    
    render(<S3Image {...mockProps} src={directUrl} />)
    
    const image = screen.getByRole('img')
    expect(image).toHaveAttribute('src', directUrl)
  })

  it('applies custom CSS classes', () => {
    const customClass = 'custom-image-class'
    
    render(<S3Image {...mockProps} className={customClass} />)
    
    const image = screen.getByRole('img')
    expect(image).toHaveClass(customClass)
  })

  it('supports responsive sizing', () => {
    render(
      <S3Image 
        {...mockProps} 
        responsive 
        sizes="(max-width: 768px) 100vw, 50vw"
      />
    )
    
    const image = screen.getByRole('img')
    expect(image).toHaveAttribute('sizes', '(max-width: 768px) 100vw, 50vw')
  })
})