import { CERTIFICATION_URL, CERTIFICATION_VERIFY_URL } from 'config';
import { Certification, CreateCertificationData } from 'types/certification';
import baseApi from './baseApi';

interface CertificationQueryParams {
  companyId: string;
  establishmentId: string;
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
      query: ({ companyId, establishmentId }) => ({
        url: CERTIFICATION_URL(companyId, establishmentId),
        method: 'GET',
        credentials: 'include'
      }),
      providesTags: ['Certification']
    }),

    addCertification: build.mutation<Certification, CertificationMutationParams>({
      query: ({ companyId, establishmentId, data }) => ({
        url: CERTIFICATION_URL(companyId, establishmentId),
        method: 'POST',
        body: data,
        credentials: 'include'
      }),
      invalidatesTags: ['Certification', 'Establishment']
    }),

    updateCertification: build.mutation<Certification, CertificationUpdateParams>({
      query: ({ companyId, establishmentId, certificationId, data }) => ({
        url: CERTIFICATION_URL(companyId, establishmentId, certificationId),
        method: 'PATCH',
        body: data,
        credentials: 'include'
      }),
      invalidatesTags: ['Certification', 'Establishment']
    }),

    deleteCertification: build.mutation<void, CertificationDeleteParams>({
      query: ({ companyId, establishmentId, certificationId }) => ({
        url: CERTIFICATION_URL(companyId, establishmentId, certificationId),
        method: 'DELETE',
        credentials: 'include'
      }),
      invalidatesTags: ['Certification', 'Establishment']
    }),

    verifyCertification: build.mutation<{ status: string; certification_id: number }, CertificationVerifyParams>({
      query: ({ companyId, establishmentId, certificationId }) => ({
        url: CERTIFICATION_VERIFY_URL(companyId, establishmentId, certificationId),
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
  useVerifyCertificationMutation
} = certificationApi;

export default certificationApi;
