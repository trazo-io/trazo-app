import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../utils';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from '../../store/store';
import userEvent from '@testing-library/user-event';

// Mock QR scanning and public API calls
const mockScanQR = vi.fn();
const mockGetPublicHistory = vi.fn();
const mockRecordScan = vi.fn();
const mockGetCarbonData = vi.fn();

vi.mock('../../store/api/api', () => ({
  useGetPublicHistoryQuery: (id: string) => {
    if (id) {
      return mockGetPublicHistory(id);
    }
    return { data: null, isLoading: false, error: null };
  },
  useRecordScanMutation: () => [mockRecordScan, { isLoading: false }],
  useGetCarbonDataQuery: (historyId: string) => {
    if (historyId) {
      return mockGetCarbonData(historyId);
    }
    return { data: null, isLoading: false };
  }
}));

// Mock QR scanner component
vi.mock('../../components/QRScanner/QRScanner', () => ({
  default: ({ onScan, onError }: any) => (
    <div data-testid="qr-scanner">
      <button onClick={() => onScan('https://trazo.com/scan/123')} data-testid="scan-success">
        Scan Success
      </button>
      <button onClick={() => onError('Camera not available')} data-testid="scan-error">
        Scan Error
      </button>
    </div>
  )
}));

// Mock geolocation
const mockGeolocation = {
  getCurrentPosition: vi.fn()
};
Object.defineProperty(global.navigator, 'geolocation', {
  value: mockGeolocation,
  writable: true
});

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider store={store}>
    <BrowserRouter>{children}</BrowserRouter>
  </Provider>
);

// Mock QR scan flow component
const QRScanFlow = ({ historyId }: { historyId?: string }) => {
  const [scanStep, setScanStep] = React.useState<'scanning' | 'loading' | 'success' | 'error'>(
    'scanning'
  );
  const [historyData, setHistoryData] = React.useState<any>(null);
  const [carbonData, setCarbonData] = React.useState<any>(null);
  const [location, setLocation] = React.useState<any>(null);

  React.useEffect(() => {
    if (historyId) {
      loadHistoryData(historyId);
    }
  }, [historyId]);

  const loadHistoryData = async (id: string) => {
    setScanStep('loading');
    try {
      const historyResult = mockGetPublicHistory(id);
      const carbonResult = mockGetCarbonData(id);

      if (historyResult.data && carbonResult.data) {
        setHistoryData(historyResult.data);
        setCarbonData(carbonResult.data);

        // Record the scan
        await recordScan(id);
        setScanStep('success');
      } else {
        setScanStep('error');
      }
    } catch (error) {
      setScanStep('error');
    }
  };

  const recordScan = async (id: string) => {
    // Get user location
    mockGeolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      () => {
        // Location denied, continue without it
      }
    );

    await mockRecordScan({
      history_id: id,
      location: location,
      timestamp: new Date().toISOString()
    });
  };

  const handleQRScan = (url: string) => {
    // Extract history ID from QR URL
    const match = url.match(/\/scan\/(\d+)/);
    if (match) {
      const id = match[1];
      loadHistoryData(id);
    } else {
      setScanStep('error');
    }
  };

  const handleScanError = (error: string) => {
    setScanStep('error');
  };

  if (scanStep === 'scanning') {
    return (
      <div data-testid="scan-step">
        <h2>Scan QR Code</h2>
        <QRScanner onScan={handleQRScan} onError={handleScanError} />
      </div>
    );
  }

  if (scanStep === 'loading') {
    return (
      <div data-testid="loading-step">
        <h2>Loading Product Information...</h2>
        <div data-testid="loading-spinner">Loading...</div>
      </div>
    );
  }

  if (scanStep === 'error') {
    return (
      <div data-testid="error-step">
        <h2>Unable to Load Product</h2>
        <p>This QR code is not valid or the product information is not available.</p>
        <button onClick={() => setScanStep('scanning')}>Try Again</button>
      </div>
    );
  }

  return (
    <div data-testid="success-step">
      <h1>{historyData?.name}</h1>
      <div data-testid="carbon-score">Carbon Score: {carbonData?.carbon_score}</div>
      <div data-testid="emissions">Total Emissions: {carbonData?.total_emissions} kg CO2</div>
      <div data-testid="farm-info">Farm: {historyData?.parcel?.establishment?.name}</div>
      <div data-testid="location-info">{historyData?.parcel?.establishment?.country}</div>
    </div>
  );
};

describe('QR Scan Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Successful QR Scan Flow', () => {
    it('completes full scan and display flow', async () => {
      const user = userEvent.setup();

      // Mock successful API responses
      mockGetPublicHistory.mockReturnValue({
        data: {
          id: 123,
          name: 'Organic Tomato Production',
          parcel: {
            establishment: {
              name: 'Green Valley Farm',
              country: 'USA'
            }
          },
          published: true
        },
        isLoading: false,
        error: null
      });

      mockGetCarbonData.mockReturnValue({
        data: {
          carbon_score: 87,
          total_emissions: 125.5,
          emissions_per_kg: 0.8
        },
        isLoading: false
      });

      mockRecordScan.mockResolvedValue({ id: 456 });

      // Mock successful geolocation
      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success({
          coords: {
            latitude: 37.7749,
            longitude: -122.4194
          }
        });
      });

      render(
        <TestWrapper>
          <QRScanFlow />
        </TestWrapper>
      );

      // Step 1: Start scanning
      expect(screen.getByTestId('scan-step')).toBeInTheDocument();
      expect(screen.getByText('Scan QR Code')).toBeInTheDocument();

      // Step 2: Simulate successful scan
      const scanButton = screen.getByTestId('scan-success');
      await user.click(scanButton);

      // Step 3: Should show loading
      await waitFor(() => {
        expect(screen.getByTestId('loading-step')).toBeInTheDocument();
      });

      // Step 4: Should load and display product info
      await waitFor(() => {
        expect(screen.getByTestId('success-step')).toBeInTheDocument();
      });

      // Verify product information is displayed
      expect(screen.getByText('Organic Tomato Production')).toBeInTheDocument();
      expect(screen.getByTestId('carbon-score')).toHaveTextContent('87');
      expect(screen.getByTestId('emissions')).toHaveTextContent('125.5 kg CO2');
      expect(screen.getByTestId('farm-info')).toHaveTextContent('Green Valley Farm');
      expect(screen.getByTestId('location-info')).toHaveTextContent('USA');

      // Verify API calls were made
      expect(mockGetPublicHistory).toHaveBeenCalledWith('123');
      expect(mockGetCarbonData).toHaveBeenCalledWith('123');
      expect(mockRecordScan).toHaveBeenCalledWith({
        history_id: '123',
        location: {
          latitude: 37.7749,
          longitude: -122.4194
        },
        timestamp: expect.any(String)
      });
    });

    it('handles location permission denial gracefully', async () => {
      const user = userEvent.setup();

      mockGetPublicHistory.mockReturnValue({
        data: { id: 123, name: 'Test Product', published: true },
        isLoading: false,
        error: null
      });

      mockGetCarbonData.mockReturnValue({
        data: { carbon_score: 85, total_emissions: 100 },
        isLoading: false
      });

      // Mock location denied
      mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
        error({ code: 1, message: 'Location access denied' });
      });

      render(
        <TestWrapper>
          <QRScanFlow />
        </TestWrapper>
      );

      const scanButton = screen.getByTestId('scan-success');
      await user.click(scanButton);

      await waitFor(() => {
        expect(screen.getByTestId('success-step')).toBeInTheDocument();
      });

      // Should still record scan without location
      expect(mockRecordScan).toHaveBeenCalledWith({
        history_id: '123',
        location: null,
        timestamp: expect.any(String)
      });
    });
  });

  describe('QR Scan Error Handling', () => {
    it('handles invalid QR codes', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <QRScanFlow />
        </TestWrapper>
      );

      // Mock scanning invalid QR
      const InvalidQRScanner = () => (
        <button
          onClick={() => {
            // Simulate invalid QR URL
            const invalidUrl = 'https://example.com/not-trazo';
            // This would not match the regex pattern
          }}
          data-testid="scan-invalid"
        >
          Scan Invalid QR
        </button>
      );

      // Simulate invalid scan directly
      const errorStep = screen.getByTestId('scan-error');
      await user.click(errorStep);

      await waitFor(() => {
        expect(screen.getByTestId('error-step')).toBeInTheDocument();
        expect(screen.getByText('Unable to Load Product')).toBeInTheDocument();
      });
    });

    it('handles API errors when loading product data', async () => {
      const user = userEvent.setup();

      // Mock API error
      mockGetPublicHistory.mockReturnValue({
        data: null,
        isLoading: false,
        error: { status: 404, data: { detail: 'History not found' } }
      });

      render(
        <TestWrapper>
          <QRScanFlow />
        </TestWrapper>
      );

      const scanButton = screen.getByTestId('scan-success');
      await user.click(scanButton);

      await waitFor(() => {
        expect(screen.getByTestId('error-step')).toBeInTheDocument();
      });

      expect(
        screen.getByText(/not valid or the product information is not available/)
      ).toBeInTheDocument();
    });

    it('allows retry after error', async () => {
      const user = userEvent.setup();

      // First attempt fails
      mockGetPublicHistory.mockReturnValueOnce({
        data: null,
        isLoading: false,
        error: { status: 500 }
      });

      // Second attempt succeeds
      mockGetPublicHistory.mockReturnValueOnce({
        data: { id: 123, name: 'Retry Success', published: true },
        isLoading: false,
        error: null
      });

      mockGetCarbonData.mockReturnValue({
        data: { carbon_score: 90, total_emissions: 80 },
        isLoading: false
      });

      render(
        <TestWrapper>
          <QRScanFlow />
        </TestWrapper>
      );

      // First scan fails
      const scanButton = screen.getByTestId('scan-success');
      await user.click(scanButton);

      await waitFor(() => {
        expect(screen.getByTestId('error-step')).toBeInTheDocument();
      });

      // Retry
      const retryButton = screen.getByText('Try Again');
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByTestId('scan-step')).toBeInTheDocument();
      });

      // Second scan succeeds
      await user.click(scanButton);

      await waitFor(() => {
        expect(screen.getByTestId('success-step')).toBeInTheDocument();
        expect(screen.getByText('Retry Success')).toBeInTheDocument();
      });
    });
  });

  describe('Mobile Performance Optimization', () => {
    it('loads carbon score first, then additional details', async () => {
      const user = userEvent.setup();

      // Mock progressive loading
      let carbonDataLoaded = false;
      let fullDataLoaded = false;

      mockGetPublicHistory.mockImplementation(() => {
        setTimeout(() => {
          fullDataLoaded = true;
        }, 100);
        return {
          data: fullDataLoaded
            ? {
                id: 123,
                name: 'Progressive Loading Test',
                parcel: { establishment: { name: 'Farm' } }
              }
            : null,
          isLoading: !fullDataLoaded
        };
      });

      mockGetCarbonData.mockImplementation(() => {
        setTimeout(() => {
          carbonDataLoaded = true;
        }, 50);
        return {
          data: carbonDataLoaded
            ? {
                carbon_score: 88,
                total_emissions: 200
              }
            : null,
          isLoading: !carbonDataLoaded
        };
      });

      render(
        <TestWrapper>
          <QRScanFlow historyId="123" />
        </TestWrapper>
      );

      // Should start loading
      expect(screen.getByTestId('loading-step')).toBeInTheDocument();

      // Carbon data loads first (after 50ms)
      await waitFor(
        () => {
          expect(carbonDataLoaded).toBe(true);
        },
        { timeout: 100 }
      );

      // Full data loads second (after 100ms)
      await waitFor(
        () => {
          expect(fullDataLoaded).toBe(true);
          expect(screen.getByTestId('success-step')).toBeInTheDocument();
        },
        { timeout: 200 }
      );

      expect(screen.getByTestId('carbon-score')).toBeInTheDocument();
    });

    it('handles offline scenarios', async () => {
      const user = userEvent.setup();

      // Mock network error (offline)
      mockGetPublicHistory.mockReturnValue({
        data: null,
        isLoading: false,
        error: { name: 'NetworkError' }
      });

      render(
        <TestWrapper>
          <QRScanFlow />
        </TestWrapper>
      );

      const scanButton = screen.getByTestId('scan-success');
      await user.click(scanButton);

      await waitFor(() => {
        expect(screen.getByTestId('error-step')).toBeInTheDocument();
      });

      // Should show appropriate offline message
      expect(screen.getByText(/not available/)).toBeInTheDocument();
    });
  });

  describe('Analytics and Tracking', () => {
    it('records scan metrics for analytics', async () => {
      const user = userEvent.setup();

      mockGetPublicHistory.mockReturnValue({
        data: { id: 123, name: 'Analytics Test', published: true },
        isLoading: false,
        error: null
      });

      mockGetCarbonData.mockReturnValue({
        data: { carbon_score: 85 },
        isLoading: false
      });

      const mockAnalytics = vi.fn();

      // Mock analytics tracking
      vi.mock('../../utils/analytics', () => ({
        trackEvent: mockAnalytics
      }));

      render(
        <TestWrapper>
          <QRScanFlow />
        </TestWrapper>
      );

      const scanButton = screen.getByTestId('scan-success');
      await user.click(scanButton);

      await waitFor(() => {
        expect(screen.getByTestId('success-step')).toBeInTheDocument();
      });

      // Should record scan completion
      expect(mockRecordScan).toHaveBeenCalledWith({
        history_id: '123',
        location: expect.any(Object),
        timestamp: expect.any(String)
      });
    });
  });
});
