import { describe, it, expect } from 'vitest'
import { render, screen } from '../../test/utils'
import FullScreenLoader from '../Loader/FullScreenLoader'

describe('FullScreenLoader', () => {
  it('renders loading spinner', () => {
    render(<FullScreenLoader />)
    
    // Check for loading elements
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('displays loading message when provided', () => {
    const message = 'Loading data...'
    render(<FullScreenLoader message={message} />)
    
    // Check for custom message
    expect(screen.getByText(message)).toBeInTheDocument()
  })

  it('has correct ARIA attributes for accessibility', () => {
    render(<FullScreenLoader />)
    
    const loader = screen.getByRole('status')
    expect(loader).toHaveAttribute('aria-live', 'polite')
  })

  it('applies fullscreen styles', () => {
    render(<FullScreenLoader />)
    
    const loader = screen.getByRole('status')
    expect(loader).toHaveStyle({
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%'
    })
  })
})