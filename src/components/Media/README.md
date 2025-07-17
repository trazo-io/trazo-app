# S3Image Component - 2025 Modern React Implementation

## Overview

The S3Image component is a modern, enterprise-grade React component designed for handling S3 images with automatic presigned URL generation. It follows 2025 best practices including TypeScript-first design, lazy loading, error handling, and accessibility compliance.

## Features

- ✅ **Automatic S3 presigned URL handling**
- ✅ **Lazy loading with IntersectionObserver**
- ✅ **Error handling with graceful fallbacks**
- ✅ **TypeScript support with full type safety**
- ✅ **Accessibility compliant (WCAG 2.1)**
- ✅ **Performance optimized with RTK Query caching**
- ✅ **SSR compatible**
- ✅ **Retry logic for failed loads**
- ✅ **Fade-in animations**
- ✅ **Custom placeholder support**

## Quick Start

### Basic Usage

```tsx
import { S3Image } from 'components/Design';

// Simple image display
<S3Image
  src="https://staging-trazo-media-013640213707.s3.amazonaws.com/media/establishments/image.png"
  alt="Establishment image"
  boxSize="200px"
/>
```

### Establishment Image (Your Use Case)

```tsx
import { S3Image } from 'components/Design';

const EstablishmentCard = ({ establishment }) => (
  <Box bg="white" p={4} borderRadius="lg" boxShadow="md">
    <S3Image
      src={establishment.image}
      alt={establishment.name}
      boxSize="300px"
      borderRadius="md"
      objectFit="cover"
      showErrorMessage={true}
      fallbackSrc="/images/establishment-placeholder.jpg"
    />
    <Text mt={2} fontWeight="semibold">{establishment.name}</Text>
  </Box>
);
```

### Advanced Usage with Custom Placeholder

```tsx
<S3Image
  src={imageUrl}
  alt="Hero image"
  width="100%"
  height="400px"
  objectFit="cover"
  lazy={false}
  enableFadeIn={true}
  placeholder={
    <Box bg="gray.100" display="flex" alignItems="center" justifyContent="center">
      <Text color="gray.500">Loading...</Text>
    </Box>
  }
  onLoad={() => console.log('Image loaded')}
  onError={() => console.log('Image failed')}
/>
```

## Props API

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `src` | `string` | **required** | Image URL (S3 or regular) |
| `alt` | `string` | **required** | Alt text for accessibility |
| `fallbackSrc` | `string` | `'/images/placeholder.jpg'` | Fallback image URL |
| `placeholder` | `React.ReactNode` | `<Skeleton />` | Custom placeholder component |
| `objectFit` | `'cover' \| 'contain' \| 'fill' \| 'scale-down' \| 'none'` | `'cover'` | How image fits container |
| `lazy` | `boolean` | `true` | Enable lazy loading |
| `boxSize` | `string \| number` | `undefined` | Container size |
| `borderRadius` | `string` | `'md'` | Border radius |
| `enableFadeIn` | `boolean` | `true` | Enable fade-in animation |
| `showErrorMessage` | `boolean` | `false` | Show error text vs icon |
| `onLoad` | `() => void` | `undefined` | Load callback |
| `onError` | `() => void` | `undefined` | Error callback |

## How It Works

1. **URL Detection**: Automatically detects S3 URLs vs regular URLs
2. **Lazy Loading**: Uses IntersectionObserver for performance
3. **Presigned URLs**: Automatically fetches presigned URLs for S3 images
4. **Caching**: RTK Query caches presigned URLs for 30 minutes
5. **Error Handling**: Graceful fallbacks with retry logic
6. **Accessibility**: Proper ARIA labels and alt text

## Migration Guide

### From Regular Image Component

```tsx
// Before (regular Image)
<Image 
  src={establishment.image} 
  alt={establishment.name}
  boxSize="200px"
/>

// After (S3Image)
<S3Image
  src={establishment.image}
  alt={establishment.name}
  boxSize="200px"
  fallbackSrc="/images/establishment-placeholder.jpg"
/>
```

### Using the Hook Directly

For custom components, use the `useS3Image` hook:

```tsx
import { useS3Image } from 'hooks/useS3Image';

const CustomImage = ({ imageUrl }) => {
  const { displayUrl, isLoading, error } = useS3Image(imageUrl);
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading image</div>;
  
  return <img src={displayUrl} alt="Custom image" />;
};
```

## Performance Considerations

- **Caching**: Presigned URLs are cached for 30 minutes
- **Lazy Loading**: Images load only when entering viewport
- **Retry Logic**: Automatic retry for failed S3 requests
- **Bundle Size**: Uses tree-shaking friendly exports

## Browser Support

- **Modern Browsers**: Full support (Chrome 76+, Firefox 76+, Safari 13+)
- **Legacy Browsers**: Graceful degradation (no lazy loading)
- **Mobile**: Optimized for mobile performance

## Common Patterns

### Image Gallery
```tsx
const images = [
  { url: 's3-url-1', title: 'Image 1' },
  { url: 's3-url-2', title: 'Image 2' }
];

<Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={4}>
  {images.map((image, index) => (
    <S3Image
      key={index}
      src={image.url}
      alt={image.title}
      boxSize="200px"
      borderRadius="md"
    />
  ))}
</Grid>
```

### Avatar Component
```tsx
<S3Image
  src={user.image}
  alt={`${user.first_name} ${user.last_name}`}
  boxSize="60px"
  borderRadius="full"
  fallbackSrc="/images/default-avatar.jpg"
  lazy={false}
/>
```

## Troubleshooting

### Images Not Loading
1. Check browser console for errors
2. Verify S3 bucket permissions
3. Ensure presigned URL endpoint is working
4. Check network connectivity

### Performance Issues
1. Reduce image sizes for better performance
2. Use appropriate `boxSize` to avoid layout shifts
3. Consider using `lazy={false}` for above-the-fold images

### TypeScript Errors
1. Ensure proper imports: `import { S3Image } from 'components/Design'`
2. Check that `src` and `alt` props are provided
3. Verify RTK Query setup in store

## Support

For issues or questions:
1. Check the console for error messages
2. Verify your RTK Query store configuration
3. Ensure the backend presigned URL endpoint is working
4. Test with regular (non-S3) URLs to isolate issues