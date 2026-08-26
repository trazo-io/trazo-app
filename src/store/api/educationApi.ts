import baseApi from './baseApi';

/**
 * Education API — the FAQ endpoint only.
 *
 * The category/course/lesson/dashboard/bookmark endpoints (and their types)
 * were removed 2026-08-24 together with their backend viewsets: no component
 * ever consumed them — the education topic pages are i18n strings bundled
 * with the app — while the seeded course content still taught the pre-pivot
 * transparency score and the withdrawn blockchain add-on. The only education
 * surface the product serves is the farmer FAQ.
 */

/** Mirrors FarmerQuestion.QUESTION_CATEGORIES in trazo-back/education/models.py. */
export type FarmerQuestionCategory =
  | 'records'
  | 'quick_add'
  | 'osp_renewal'
  | 'consumer_page'
  | 'setup';

export interface FarmerQuestionAnswer {
  id: number;
  question: string;
  answer: string;
  /**
   * A slug, NOT an object. `FarmerQuestion.category` is a CharField with choices on the
   * backend and FarmerQuestionAnswerSerializer emits it directly.
   *
   * Typing it as an object once made every correct use in EducationFAQ.tsx an error —
   * indexing a label map by it, comparing it to the selected filter, using it as a React
   * key. The component was right and the type was wrong; had anyone "fixed" the component
   * to satisfy this type, the chips would have rendered [object Object].
   */
  category: FarmerQuestionCategory;
  is_featured: boolean;
  tags: string[];
  view_count: number;
  created_at: string;
  updated_at: string;
}

export const educationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getFarmerQuestions: builder.query<
      FarmerQuestionAnswer[],
      {
        category_id?: number;
        search?: string;
        featured?: boolean;
      }
    >({
      query: (params) => ({
        url: 'education/faqs/',
        method: 'GET',
        params,
        credentials: 'include'
      }),
      providesTags: ['Education']
    }),

    getFarmerQuestion: builder.query<FarmerQuestionAnswer, number>({
      query: (questionId) => ({
        url: `education/faqs/${questionId}/`,
        method: 'GET',
        credentials: 'include'
      }),
      providesTags: ['Education']
    })
  }),
  overrideExisting: false
});

export const { useGetFarmerQuestionsQuery, useGetFarmerQuestionQuery } = educationApi;
