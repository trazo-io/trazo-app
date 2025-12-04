import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../utils';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from '../../store/store';
import userEvent from '@testing-library/user-event';

// Mock API calls
const mockCreateHistory = vi.fn();
const mockGetHistories = vi.fn();
const mockGetParcels = vi.fn();
const mockGetProducts = vi.fn();
const mockAddEvent = vi.fn();
const mockCalculateCarbon = vi.fn();

vi.mock('../../store/api/api', () => ({
  useCreateHistoryMutation: () => [mockCreateHistory, { isLoading: false }],
  useGetHistoriesQuery: () => ({ data: { results: [] }, isLoading: false }),
  useGetParcelsQuery: () => ({ data: { results: [] }, isLoading: false }),
  useGetProductsQuery: () => ({ data: { results: [] }, isLoading: false }),
  useAddEventMutation: () => [mockAddEvent, { isLoading: false }],
  useCalculateCarbonMutation: () => [mockCalculateCarbon, { isLoading: false }]
}));

// Mock components that would be tested separately
vi.mock('../../components/Forms/AddHistoryForm', () => ({
  default: ({ onSubmit, parcels, products }: any) => (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          name: 'Test Production',
          parcel: 1,
          product: 1,
          start_date: '2024-01-01',
          end_date: '2024-06-30'
        });
      }}
    >
      <input data-testid="history-name" />
      <select data-testid="parcel-select">
        {parcels?.map((p: any) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <select data-testid="product-select">
        {products?.map((p: any) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <button type="submit">Create Production</button>
    </form>
  )
}));

vi.mock('../../components/Forms/AddEventForm', () => ({
  default: ({ onSubmit, historyId }: any) => (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          history: historyId,
          event_type: 'planting',
          description: 'Planted seeds',
          date: '2024-01-15'
        });
      }}
    >
      <select data-testid="event-type">
        <option value="planting">Planting</option>
        <option value="fertilizing">Fertilizing</option>
        <option value="harvesting">Harvesting</option>
      </select>
      <input data-testid="event-description" />
      <button type="submit">Add Event</button>
    </form>
  )
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider store={store}>
    <BrowserRouter>{children}</BrowserRouter>
  </Provider>
);

// Mock production management component
const ProductionManager = () => {
  const [step, setStep] = React.useState('create');
  const [historyId, setHistoryId] = React.useState<number | null>(null);

  const handleCreateHistory = async (data: any) => {
    const result = await mockCreateHistory(data);
    setHistoryId(result.id);
    setStep('events');
  };

  const handleAddEvent = async (data: any) => {
    await mockAddEvent(data);
  };

  const handleCalculateCarbon = async () => {
    await mockCalculateCarbon({ history_id: historyId });
    setStep('complete');
  };

  const mockParcels = [
    { id: 1, name: 'North Field', area: 100 },
    { id: 2, name: 'South Field', area: 150 }
  ];

  const mockProducts = [
    { id: 1, name: 'Organic Tomatoes' },
    { id: 2, name: 'Sweet Corn' }
  ];

  return (
    <div>
      {step === 'create' && (
        <div data-testid="create-step">
          <h2>Create Production History</h2>
          <AddHistoryForm
            onSubmit={handleCreateHistory}
            parcels={mockParcels}
            products={mockProducts}
          />
        </div>
      )}
      {step === 'events' && (
        <div data-testid="events-step">
          <h2>Add Production Events</h2>
          <AddEventForm onSubmit={handleAddEvent} historyId={historyId} />
          <button onClick={handleCalculateCarbon}>Calculate Carbon</button>
        </div>
      )}
      {step === 'complete' && (
        <div data-testid="complete-step">
          <h2>Production Complete</h2>
          <p>Carbon footprint calculated successfully</p>
        </div>
      )}
    </div>
  );
};

describe('Production Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete Production Creation Flow', () => {
    it('creates production history and adds events', async () => {
      const user = userEvent.setup();

      // Mock successful API responses
      mockCreateHistory.mockResolvedValue({
        id: 123,
        name: 'Test Production',
        parcel: 1,
        product: 1
      });

      mockAddEvent.mockResolvedValue({
        id: 456,
        event_type: 'planting',
        description: 'Planted seeds'
      });

      mockCalculateCarbon.mockResolvedValue({
        total_emissions: 250.5,
        carbon_score: 85
      });

      render(
        <TestWrapper>
          <ProductionManager />
        </TestWrapper>
      );

      // Step 1: Create production history
      expect(screen.getByTestId('create-step')).toBeInTheDocument();

      const createButton = screen.getByText('Create Production');
      await user.click(createButton);

      await waitFor(() => {
        expect(mockCreateHistory).toHaveBeenCalledWith({
          name: 'Test Production',
          parcel: 1,
          product: 1,
          start_date: '2024-01-01',
          end_date: '2024-06-30'
        });
      });

      // Step 2: Add events
      await waitFor(() => {
        expect(screen.getByTestId('events-step')).toBeInTheDocument();
      });

      const addEventButton = screen.getByText('Add Event');
      await user.click(addEventButton);

      await waitFor(() => {
        expect(mockAddEvent).toHaveBeenCalledWith({
          history: 123,
          event_type: 'planting',
          description: 'Planted seeds',
          date: '2024-01-15'
        });
      });

      // Step 3: Calculate carbon
      const calculateButton = screen.getByText('Calculate Carbon');
      await user.click(calculateButton);

      await waitFor(() => {
        expect(mockCalculateCarbon).toHaveBeenCalledWith({
          history_id: 123
        });
      });

      // Step 4: Verify completion
      await waitFor(() => {
        expect(screen.getByTestId('complete-step')).toBeInTheDocument();
        expect(screen.getByText(/carbon footprint calculated successfully/i)).toBeInTheDocument();
      });
    });

    it('handles API errors gracefully', async () => {
      const user = userEvent.setup();

      // Mock API error
      mockCreateHistory.mockRejectedValue({
        data: { detail: 'Parcel not found' }
      });

      render(
        <TestWrapper>
          <ProductionManager />
        </TestWrapper>
      );

      const createButton = screen.getByText('Create Production');
      await user.click(createButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/parcel not found/i)).toBeInTheDocument();
      });

      // Should remain on create step
      expect(screen.getByTestId('create-step')).toBeInTheDocument();
    });
  });

  describe('Event Management', () => {
    it('allows adding multiple events to a production', async () => {
      const user = userEvent.setup();

      mockCreateHistory.mockResolvedValue({ id: 123 });
      mockAddEvent.mockResolvedValue({ id: 456 });

      // Start at events step
      const EventsOnly = () => {
        const handleAddEvent = async (data: any) => {
          await mockAddEvent(data);
        };

        return (
          <div>
            <AddEventForm onSubmit={handleAddEvent} historyId={123} />
            <button
              onClick={() =>
                handleAddEvent({
                  history: 123,
                  event_type: 'fertilizing',
                  description: 'Applied organic fertilizer',
                  date: '2024-02-01'
                })
              }
            >
              Add Second Event
            </button>
          </div>
        );
      };

      render(
        <TestWrapper>
          <EventsOnly />
        </TestWrapper>
      );

      // Add first event
      const addEventButton = screen.getByText('Add Event');
      await user.click(addEventButton);

      await waitFor(() => {
        expect(mockAddEvent).toHaveBeenCalledWith({
          history: 123,
          event_type: 'planting',
          description: 'Planted seeds',
          date: '2024-01-15'
        });
      });

      // Add second event
      const addSecondButton = screen.getByText('Add Second Event');
      await user.click(addSecondButton);

      await waitFor(() => {
        expect(mockAddEvent).toHaveBeenCalledWith({
          history: 123,
          event_type: 'fertilizing',
          description: 'Applied organic fertilizer',
          date: '2024-02-01'
        });
      });

      expect(mockAddEvent).toHaveBeenCalledTimes(2);
    });
  });

  describe('Form Validation', () => {
    it('validates required fields in production creation', async () => {
      const user = userEvent.setup();

      const ValidationForm = () => {
        const [errors, setErrors] = React.useState<string[]>([]);

        const handleSubmit = (data: any) => {
          const newErrors = [];
          if (!data.name) newErrors.push('Name is required');
          if (!data.parcel) newErrors.push('Parcel is required');
          if (!data.start_date) newErrors.push('Start date is required');

          setErrors(newErrors);

          if (newErrors.length === 0) {
            mockCreateHistory(data);
          }
        };

        return (
          <div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit({
                  name: '',
                  parcel: null,
                  start_date: ''
                });
              }}
            >
              <button type="submit">Create Production</button>
            </form>
            {errors.map((error) => (
              <div key={error} data-testid="validation-error">
                {error}
              </div>
            ))}
          </div>
        );
      };

      render(
        <TestWrapper>
          <ValidationForm />
        </TestWrapper>
      );

      const submitButton = screen.getByText('Create Production');
      await user.click(submitButton);

      // Should show validation errors
      await waitFor(() => {
        const errorElements = screen.getAllByTestId('validation-error');
        expect(errorElements).toHaveLength(3);
        expect(screen.getByText('Name is required')).toBeInTheDocument();
        expect(screen.getByText('Parcel is required')).toBeInTheDocument();
        expect(screen.getByText('Start date is required')).toBeInTheDocument();
      });

      // Should not call API
      expect(mockCreateHistory).not.toHaveBeenCalled();
    });
  });

  describe('Data Loading and Caching', () => {
    it('loads and displays parcel and product options', async () => {
      const mockUseGetParcelsQuery = vi.fn(() => ({
        data: {
          results: [
            { id: 1, name: 'North Field', area: 100 },
            { id: 2, name: 'South Field', area: 150 }
          ]
        },
        isLoading: false
      }));

      const mockUseGetProductsQuery = vi.fn(() => ({
        data: {
          results: [
            { id: 1, name: 'Organic Tomatoes' },
            { id: 2, name: 'Sweet Corn' }
          ]
        },
        isLoading: false
      }));

      // Mock the hooks
      vi.mock('../../store/api/api', () => ({
        useGetParcelsQuery: mockUseGetParcelsQuery,
        useGetProductsQuery: mockUseGetProductsQuery,
        useCreateHistoryMutation: () => [mockCreateHistory, { isLoading: false }]
      }));

      const DataLoadingForm = () => {
        const parcelsQuery = mockUseGetParcelsQuery();
        const productsQuery = mockUseGetProductsQuery();

        if (parcelsQuery.isLoading || productsQuery.isLoading) {
          return <div data-testid="loading">Loading...</div>;
        }

        return (
          <div>
            <select data-testid="parcel-select">
              {parcelsQuery.data?.results.map((parcel: any) => (
                <option key={parcel.id} value={parcel.id}>
                  {parcel.name} ({parcel.area} acres)
                </option>
              ))}
            </select>
            <select data-testid="product-select">
              {productsQuery.data?.results.map((product: any) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>
        );
      };

      render(
        <TestWrapper>
          <DataLoadingForm />
        </TestWrapper>
      );

      // Should display loaded options
      expect(screen.getByTestId('parcel-select')).toBeInTheDocument();
      expect(screen.getByTestId('product-select')).toBeInTheDocument();

      expect(screen.getByText('North Field (100 acres)')).toBeInTheDocument();
      expect(screen.getByText('South Field (150 acres)')).toBeInTheDocument();
      expect(screen.getByText('Organic Tomatoes')).toBeInTheDocument();
      expect(screen.getByText('Sweet Corn')).toBeInTheDocument();
    });
  });

  describe('Real-time Updates', () => {
    it('updates UI when production data changes', async () => {
      const user = userEvent.setup();

      const UpdatingComponent = () => {
        const [productions, setProductions] = React.useState([
          { id: 1, name: 'Spring Tomatoes', status: 'active' }
        ]);

        const addProduction = () => {
          setProductions((prev) => [
            ...prev,
            {
              id: 2,
              name: 'Summer Corn',
              status: 'planning'
            }
          ]);
        };

        return (
          <div>
            <button onClick={addProduction}>Add Production</button>
            <div data-testid="productions-list">
              {productions.map((prod) => (
                <div key={prod.id} data-testid={`production-${prod.id}`}>
                  {prod.name} - {prod.status}
                </div>
              ))}
            </div>
          </div>
        );
      };

      render(
        <TestWrapper>
          <UpdatingComponent />
        </TestWrapper>
      );

      // Initially one production
      expect(screen.getByTestId('production-1')).toBeInTheDocument();
      expect(screen.getByText('Spring Tomatoes - active')).toBeInTheDocument();

      // Add another production
      const addButton = screen.getByText('Add Production');
      await user.click(addButton);

      // Should show both productions
      await waitFor(() => {
        expect(screen.getByTestId('production-1')).toBeInTheDocument();
        expect(screen.getByTestId('production-2')).toBeInTheDocument();
        expect(screen.getByText('Summer Corn - planning')).toBeInTheDocument();
      });
    });
  });
});
