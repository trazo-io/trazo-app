import { Company, Establishment } from 'types/company';
import { PayloadAction, createSlice } from '@reduxjs/toolkit';

type CompanyState = {
  currentCompany: Company | null;
  currentEstablishment: Establishment | null;
  isLoading: boolean;
};

const initialState: CompanyState = {
  currentCompany: null,
  currentEstablishment: null,
  isLoading: false
};

export const companySlice = createSlice({
  initialState,
  name: 'companySlice',
  reducers: {
    setCompany: (state, action: PayloadAction<Company | null>) => {
      state.currentCompany = action.payload;
      state.isLoading = false;
    },
    setEstablishment: (state, action: PayloadAction<Establishment | null>) => {
      state.currentEstablishment = action.payload;
    },
    clearCurrentCompany: (state) => {
      state.currentCompany = null;
    },
    setCompanyEstablishment: (state: CompanyState, action: PayloadAction<Establishment>) => {
      if (state.currentCompany && 'establishments' in state.currentCompany) {
        state.currentCompany.establishments = [action.payload];
      }
    },
    addCompanyEstablishment: (state, action: PayloadAction<Establishment>) => {
      if (state.currentCompany && 'establishments' in state.currentCompany) {
        if (!state.currentCompany.establishments) {
          state.currentCompany.establishments = [];
        }
        state.currentCompany.establishments = [
          ...state.currentCompany.establishments,
          action.payload
        ];
        state.currentEstablishment = action.payload;
      }
    },
    editCompanyEstablishment: (state, action: PayloadAction<Establishment>) => {
      if (
        state.currentCompany &&
        'establishments' in state.currentCompany &&
        state.currentCompany.establishments
      ) {
        state.currentCompany.establishments = [
          ...state.currentCompany.establishments.map((establishment: Establishment) => {
            if (establishment.id === action.payload.id) {
              return action.payload;
            }
            return establishment;
          })
        ];
      }
    },
    setEstablishmentParcel: (
      state,
      action: PayloadAction<{ establishmentId: string; parcel: any }>
    ) => {
      const { establishmentId, parcel } = action.payload;
      console.log('🔄 Redux setEstablishmentParcel: Adding parcel', {
        establishmentId,
        parcelName: parcel?.name,
        existingEstablishments: state.currentCompany?.establishments?.length
      });

      if (
        state.currentCompany &&
        'establishments' in state.currentCompany &&
        state.currentCompany.establishments
      ) {
        const oldEstablishment = state.currentCompany.establishments.find(
          (e) => e.id.toString() === establishmentId.toString()
        );
        console.log('🔄 Redux setEstablishmentParcel: Found establishment', {
          name: oldEstablishment?.name,
          currentParcelCount: oldEstablishment?.parcels?.length || 0
        });

        // ✅ CRITICAL FIX: Create new establishments array to trigger React re-renders
        state.currentCompany.establishments = state.currentCompany.establishments.map(
          (establishment: Establishment) => {
            if (establishment.id.toString() === establishmentId.toString()) {
              const newEstablishment = {
                ...establishment,
                parcels: [...(establishment.parcels || []), parcel]
              };
              console.log('🔄 Redux setEstablishmentParcel: New establishment created', {
                newParcelCount: newEstablishment.parcels.length
              });
              return newEstablishment;
            }
            return establishment;
          }
        );
      }
    },
    setEstablishmentParcelHasProduction: (state, action) => {
      const { establishmentId, parcelId, hasProduction } = action.payload;
      if (
        state.currentCompany &&
        'establishments' in state.currentCompany &&
        state.currentCompany.establishments
      ) {
        const establishment = state.currentCompany.establishments.find(
          (establishment: Establishment) => establishment.id === establishmentId
        );
        if (establishment && establishment.parcels) {
          const parcel = establishment.parcels.find((parcel) => parcel.id === parcelId);
          if (parcel) {
            parcel.has_current_production = hasProduction;
          }
        }
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    }
  }
});

export default companySlice.reducer;

export const {
  setCompany,
  setEstablishment,
  clearCurrentCompany,
  setCompanyEstablishment,
  addCompanyEstablishment,
  editCompanyEstablishment,
  setEstablishmentParcel,
  setEstablishmentParcelHasProduction,
  setLoading
} = companySlice.actions;
