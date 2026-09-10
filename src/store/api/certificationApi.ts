import { CERTIFICATION_URL, CERTIFICATION_VERIFY_URL, CERTIFYING_AGENTS_URL } from 'config';
import { Certification, CertifyingAgentOption, CreateCertificationData } from 'types/certification';
import baseApi from './baseApi';

interface CertificationQueryParams {
  companyId: string;
  farmId: string;
}

interface CertificationMutationParams extends CertificationQueryParams {
  data: CreateCertificationData;
}

interface CertificationUpdateParams extends CertificationQueryParams {
  certificationId: string;
  data: Partial<CreateCertificationData>;
}

interface CertificationDeleteParams extends CertificationQueryParams {
  certificationId: string;
}

interface CertificationVerifyParams extends CertificationQueryParams {
  certificationId: string;
}

const certificationApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getCertifications: build.query<Certification[], CertificationQueryParams>({
      query: ({ companyId, farmId }) => ({
        url: CERTIFICATION_URL(companyId, farmId),
        method: 'GET',
        credentials: 'include'
      }),
      providesTags: ['Certification']
    }),

    addCertification: build.mutation<Certification, CertificationMutationParams>({
      query: ({ companyId, farmId, data }) => ({
        url: CERTIFICATION_URL(companyId, farmId),
        method: 'POST',
        body: data,
        credentials: 'include'
      }),
      invalidatesTags: ['Certification', 'Farm']
    }),

    updateCertification: build.mutation<Certification, CertificationUpdateParams>({
      query: ({ companyId, farmId, certificationId, data }) => ({
        url: CERTIFICATION_URL(companyId, farmId, certificationId),
        method: 'PATCH',
        body: data,
        credentials: 'include'
      }),
      invalidatesTags: ['Certification', 'Farm']
    }),

    deleteCertification: build.mutation<void, CertificationDeleteParams>({
      query: ({ companyId, farmId, certificationId }) => ({
        url: CERTIFICATION_URL(companyId, farmId, certificationId),
        method: 'DELETE',
        credentials: 'include'
      }),
      invalidatesTags: ['Certification', 'Farm']
    }),

    // Static per deploy (it changes when an agent is added or a register ships), so it is
    // fetched once per session rather than on every picker mount.
    getCertifyingAgents: build.query<CertifyingAgentOption[], void>({
      query: () => ({ url: CERTIFYING_AGENTS_URL, method: 'GET', credentials: 'include' }),
      keepUnusedDataFor: 3600
    }),

    verifyCertification: build.mutation<
      { status: string; certification_id: number },
      CertificationVerifyParams
    >({
      query: ({ companyId, farmId, certificationId }) => ({
        url: CERTIFICATION_VERIFY_URL(companyId, farmId, certificationId),
        method: 'POST',
        credentials: 'include'
      }),
      invalidatesTags: ['Certification']
    })
  })
});

export const {
  useGetCertificationsQuery,
  useAddCertificationMutation,
  useUpdateCertificationMutation,
  useDeleteCertificationMutation,
  useVerifyCertificationMutation,
  useGetCertifyingAgentsQuery
} = certificationApi;

export default certificationApi;
