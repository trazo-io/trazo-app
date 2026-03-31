import { Company, Farm } from 'types/company';
import { PayloadAction, createSlice } from '@reduxjs/toolkit';

type CompanyState = {
  currentCompany: Company | null;
  currentFarm: Farm | null;
  isLoading: boolean;
};

const initialState: CompanyState = {
  currentCompany: null,
  currentFarm: null,
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
    setFarm: (state, action: PayloadAction<Farm | null>) => {
      state.currentFarm = action.payload;
    },
    clearCurrentCompany: (state) => {
      state.currentCompany = null;
      state.currentFarm = null;
      state.isLoading = false;
    },
    setCompanyFarm: (state: CompanyState, action: PayloadAction<Farm>) => {
      if (state.currentCompany && 'establishments' in state.currentCompany) {
        state.currentCompany.establishments = [action.payload];
      }
    },
    addCompanyFarm: (state, action: PayloadAction<Farm>) => {
      if (state.currentCompany && 'establishments' in state.currentCompany) {
        if (!state.currentCompany.establishments) {
          state.currentCompany.establishments = [];
        }
        state.currentCompany.establishments = [
          ...state.currentCompany.establishments,
          action.payload
        ];
        state.currentFarm = action.payload;
      }
    },
    editCompanyFarm: (state, action: PayloadAction<Farm>) => {
      if (
        state.currentCompany &&
        'establishments' in state.currentCompany &&
        state.currentCompany.establishments
      ) {
        state.currentCompany.establishments = [
          ...state.currentCompany.establishments.map((farm: Farm) => {
            if (farm.id === action.payload.id) {
              return action.payload;
            }
            return farm;
          })
        ];
      }
    },
    setFarmParcel: (
      state,
      action: PayloadAction<{ farmId: string; parcel: any }>
    ) => {
      const { farmId, parcel } = action.payload;
      console.log('🔄 Redux setFarmParcel: Adding parcel', {
        farmId,
        parcelName: parcel?.name,
        existingFarms: state.currentCompany?.establishments?.length
      });

      if (
        state.currentCompany &&
        'establishments' in state.currentCompany &&
        state.currentCompany.establishments
      ) {
        const oldFarm = state.currentCompany.establishments.find(
          (e) => e.id.toString() === farmId.toString()
        );
        console.log('🔄 Redux setFarmParcel: Found farm', {
          name: oldFarm?.name,
          currentParcelCount: oldFarm?.parcels?.length || 0
        });

        // Create new establishments array to trigger React re-renders
        state.currentCompany.establishments = state.currentCompany.establishments.map(
          (farm: Farm) => {
            if (farm.id.toString() === farmId.toString()) {
              const newFarm = {
                ...farm,
                parcels: [...(farm.parcels || []), parcel]
              };
              console.log('🔄 Redux setFarmParcel: New farm created', {
                newParcelCount: newFarm.parcels.length
              });
              return newFarm;
            }
            return farm;
          }
        );
      }
    },
    setFarmParcelHasProduction: (state, action) => {
      const { farmId, parcelId, hasProduction } = action.payload;
      if (
        state.currentCompany &&
        'establishments' in state.currentCompany &&
        state.currentCompany.establishments
      ) {
        const farm = state.currentCompany.establishments.find(
          (farm: Farm) => farm.id === farmId
        );
        if (farm && farm.parcels) {
          const parcel = farm.parcels.find((parcel) => parcel.id === parcelId);
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
  setFarm,
  clearCurrentCompany,
  setCompanyFarm,
  addCompanyFarm,
  editCompanyFarm,
  setFarmParcel,
  setFarmParcelHasProduction,
  setLoading
} = companySlice.actions;

// Backward-compatible aliases
/** @deprecated Use setFarm instead */
export const setEstablishment = setFarm;
/** @deprecated Use setCompanyFarm instead */
export const setCompanyEstablishment = setCompanyFarm;
/** @deprecated Use addCompanyFarm instead */
export const addCompanyEstablishment = addCompanyFarm;
/** @deprecated Use editCompanyFarm instead */
export const editCompanyEstablishment = editCompanyFarm;
/** @deprecated Use setFarmParcel instead */
export const setEstablishmentParcel = setFarmParcel;
/** @deprecated Use setFarmParcelHasProduction instead */
export const setEstablishmentParcelHasProduction = setFarmParcelHasProduction;
