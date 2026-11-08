/**
 * One facility's product rows, in the columns the agents' tables ask: CCOF G6.1 C2 (category,
 * detail, packaging form, and the manufacturer's ingredient statement of a multi-ingredient
 * product) and OTCO C7 7.10-2 (type, detail, organic label claim, label or brand name). The
 * facility itself is the "operation where the product is handled or processed".
 *
 * A column left empty stays empty: the plan prints "Not stated", and nothing here picks a default,
 * because a default label claim would print a claim nobody made for this product.
 *
 * Saving uploads the ingredient statement first and remembers the uploaded file, so a save that
 * fails after the upload does not upload it again on retry (the class flagged on app #333). The
 * form is read-only while a save runs, so an edit made mid-save is never dropped.
 */
import React, { useState } from 'react';
import { Badge, Divider, HStack, SimpleGrid, Text, useToast, VStack } from '@chakra-ui/react';
import { useIntl } from 'react-intl';

import {
  StandardButton,
  StandardField,
  StandardInput,
  StandardSelect
} from 'components/Design/StandardComponents';
import { useUploadFarmDocumentMutation } from 'store/api/documentsApi';
import {
  LABEL_CLAIMS,
  MULTI_INGREDIENT,
  PACKAGING_FORMS,
  useAddFacilityProductMutation,
  useDeleteFacilityProductMutation,
  useUpdateFacilityProductMutation,
  type FacilityProduct,
  type FacilityProductInput,
  type LabelClaim,
  type MultiIngredient,
  type PackagingForm
} from 'store/api/facilityProductApi';
import type { PostHarvestFacility } from 'store/api/postHarvestFacilityApi';
import { apiErrorMessage } from 'utils/apiErrorMessage';

type FormState = {
  category: string;
  detail: string;
  packaging_form: PackagingForm;
  label_claim: LabelClaim;
  brand_name: string;
  multi_ingredient: MultiIngredient;
};

const EMPTY: FormState = {
  category: '',
  detail: '',
  packaging_form: '',
  label_claim: '',
  brand_name: '',
  multi_ingredient: ''
};

const fromProduct = (p: FacilityProduct): FormState => ({
  category: p.category,
  detail: p.detail,
  packaging_form: p.packaging_form,
  label_claim: p.label_claim,
  brand_name: p.brand_name,
  multi_ingredient: p.multi_ingredient
});

interface Scope {
  companyId: string;
  farmId: string;
}

const ProductForm = ({
  facility,
  product,
  companyId,
  farmId,
  onDone
}: Scope & {
  facility: PostHarvestFacility;
  product: FacilityProduct | null;
  onDone: () => void;
}) => {
  const intl = useIntl();
  const toast = useToast();
  const [form, setForm] = useState<FormState>(product ? fromProduct(product) : EMPTY);
  const [file, setFile] = useState<File | null>(null);
  // The document a failed save already uploaded for `file`: reused on retry, never uploaded twice.
  const [uploadedId, setUploadedId] = useState<number | null>(null);
  const [upload, { isLoading: isUploading }] = useUploadFarmDocumentMutation();
  const [add, { isLoading: isAdding }] = useAddFacilityProductMutation();
  const [update, { isLoading: isUpdating }] = useUpdateFacilityProductMutation();
  const busy = isUploading || isAdding || isUpdating;
  const multi = form.multi_ingredient === 'yes';
  const inputId = React.useId();

  const set =
    (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm({ ...form, [key]: e.target.value });

  const save = async () => {
    try {
      const data: FacilityProductInput = { ...form, facility: facility.id };
      if (multi && file) {
        let documentId = uploadedId;
        if (documentId == null) {
          const doc = await upload({
            companyId,
            farmId,
            file,
            folder: 'certifications',
            title: intl.formatMessage(
              { id: 'handler.productRows.statementTitle' },
              { product: form.category.trim(), facility: facility.name }
            )
          }).unwrap();
          documentId = doc.id;
          setUploadedId(doc.id);
        }
        data.ingredient_statement_document = documentId;
      }
      if (product) await update({ companyId, farmId, productId: product.id, data }).unwrap();
      else await add({ companyId, farmId, data }).unwrap();
      onDone();
    } catch (err) {
      toast({
        status: 'error',
        title: intl.formatMessage({ id: 'handler.productRows.error' }),
        description: apiErrorMessage(err) ?? undefined
      });
    }
  };

  const notStated = intl.formatMessage({ id: 'handler.productRows.notStated' });

  return (
    <VStack align="stretch" spacing={3} data-testid={`facility-product-form-${facility.id}`}>
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
        <StandardField label={intl.formatMessage({ id: 'handler.productRows.category' })} required>
          <StandardInput
            value={form.category}
            onChange={set('category')}
            isDisabled={busy}
            placeholder={intl.formatMessage({ id: 'handler.productRows.categoryPlaceholder' })}
          />
        </StandardField>
        <StandardField label={intl.formatMessage({ id: 'handler.productRows.detail' })}>
          <StandardInput
            value={form.detail}
            onChange={set('detail')}
            isDisabled={busy}
            placeholder={intl.formatMessage({ id: 'handler.productRows.detailPlaceholder' })}
          />
        </StandardField>
        <StandardField label={intl.formatMessage({ id: 'handler.productRows.packagingForm' })}>
          <StandardSelect
            value={form.packaging_form}
            onChange={set('packaging_form')}
            isDisabled={busy}>
            <option value="">{notStated}</option>
            {PACKAGING_FORMS.map((v) => (
              <option key={v} value={v}>
                {intl.formatMessage({ id: `handler.productRows.packaging.${v}` })}
              </option>
            ))}
          </StandardSelect>
        </StandardField>
        <StandardField label={intl.formatMessage({ id: 'handler.productRows.labelClaim' })}>
          <StandardSelect value={form.label_claim} onChange={set('label_claim')} isDisabled={busy}>
            <option value="">{notStated}</option>
            {LABEL_CLAIMS.map((v) => (
              <option key={v} value={v}>
                {intl.formatMessage({ id: `handler.productRows.claim.${v}` })}
              </option>
            ))}
          </StandardSelect>
        </StandardField>
        <StandardField label={intl.formatMessage({ id: 'handler.productRows.brand' })}>
          <StandardInput value={form.brand_name} onChange={set('brand_name')} isDisabled={busy} />
        </StandardField>
        <StandardField label={intl.formatMessage({ id: 'handler.productRows.ingredients' })}>
          <StandardSelect
            value={form.multi_ingredient}
            onChange={set('multi_ingredient')}
            isDisabled={busy}>
            <option value="">{notStated}</option>
            {MULTI_INGREDIENT.map((v) => (
              <option key={v} value={v}>
                {intl.formatMessage({ id: `handler.productRows.multi.${v}` })}
              </option>
            ))}
          </StandardSelect>
        </StandardField>
      </SimpleGrid>
      {multi && (
        <StandardField
          label={intl.formatMessage({ id: 'handler.productRows.statement' })}
          helpText={intl.formatMessage({ id: 'handler.productRows.statementHelp' })}>
          <input
            id={inputId}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            style={{ display: 'none' }}
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              setUploadedId(null);
              e.target.value = '';
            }}
          />
          <StandardButton
            variant="outline"
            size="sm"
            isDisabled={busy}
            onClick={() => document.getElementById(inputId)?.click()}>
            {file
              ? file.name
              : product?.ingredient_statement_document_title
              ? intl.formatMessage(
                  { id: 'handler.productRows.statementReplace' },
                  { title: product.ingredient_statement_document_title }
                )
              : intl.formatMessage({ id: 'handler.productRows.statementChoose' })}
          </StandardButton>
        </StandardField>
      )}
      <HStack spacing={2}>
        <StandardButton
          size="sm"
          isDisabled={!form.category.trim()}
          isLoading={busy}
          onClick={save}>
          {intl.formatMessage({ id: 'handler.productRows.save' })}
        </StandardButton>
        <StandardButton variant="ghost" size="sm" isDisabled={busy} onClick={onDone}>
          {intl.formatMessage({ id: 'handler.productRows.cancel' })}
        </StandardButton>
      </HStack>
    </VStack>
  );
};

const ProductRow = ({
  product,
  onEdit,
  onDelete
}: {
  product: FacilityProduct;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  const intl = useIntl();
  const notStated = intl.formatMessage({ id: 'handler.productRows.notStated' });
  const name = [product.category, product.detail].filter(Boolean).join(', ');
  const cells = [
    product.packaging_form
      ? intl.formatMessage({ id: `handler.productRows.packaging.${product.packaging_form}` })
      : `${intl.formatMessage({ id: 'handler.productRows.packagingForm' })}: ${notStated}`,
    product.label_claim
      ? intl.formatMessage({ id: `handler.productRows.claim.${product.label_claim}` })
      : `${intl.formatMessage({ id: 'handler.productRows.labelClaim' })}: ${notStated}`,
    product.brand_name ||
      `${intl.formatMessage({ id: 'handler.productRows.brand' })}: ${notStated}`,
    product.multi_ingredient
      ? intl.formatMessage({ id: `handler.productRows.multi.${product.multi_ingredient}` })
      : `${intl.formatMessage({ id: 'handler.productRows.ingredients' })}: ${notStated}`
  ];
  const missingStatement =
    product.multi_ingredient === 'yes' && !product.ingredient_statement_document;
  return (
    <VStack align="stretch" spacing={1} data-testid={`facility-product-${product.id}`}>
      <Text fontSize="sm" fontWeight="semibold">
        {name}
      </Text>
      <Text fontSize="xs" color="gray.600">
        {cells.join(' · ')}
      </Text>
      {product.multi_ingredient === 'yes' && product.ingredient_statement_document_title ? (
        <Text fontSize="xs" color="gray.600">
          {intl.formatMessage(
            { id: 'handler.productRows.statementOnFile' },
            { title: product.ingredient_statement_document_title }
          )}
        </Text>
      ) : null}
      {missingStatement ? (
        <HStack spacing={2} align="flex-start">
          <Badge variant="warning" fontSize="11px" flexShrink={0}>
            {intl.formatMessage({ id: 'handler.productRows.statementMissingBadge' })}
          </Badge>
          <Text fontSize="xs" color="gray.600">
            {intl.formatMessage({ id: 'handler.productRows.statementMissing' })}
          </Text>
        </HStack>
      ) : null}
      <HStack spacing={2}>
        <StandardButton size="sm" variant="ghost" onClick={onEdit}>
          {intl.formatMessage({ id: 'handler.productRows.edit' })}
        </StandardButton>
        <StandardButton size="sm" variant="ghost" onClick={onDelete}>
          {intl.formatMessage({ id: 'handler.productRows.delete' })}
        </StandardButton>
      </HStack>
    </VStack>
  );
};

const FacilityProductRows = ({
  facility,
  companyId,
  farmId
}: Scope & { facility: PostHarvestFacility }) => {
  const intl = useIntl();
  const toast = useToast();
  const products = facility.products ?? [];
  // null: no form open; 'new': adding; a number: editing that row.
  const [editing, setEditing] = useState<number | 'new' | null>(null);
  const [remove] = useDeleteFacilityProductMutation();

  const doDelete = async (product: FacilityProduct) => {
    try {
      await remove({ companyId, farmId, productId: product.id }).unwrap();
    } catch (err) {
      toast({
        status: 'error',
        title: intl.formatMessage({ id: 'handler.productRows.error' }),
        description: apiErrorMessage(err) ?? undefined
      });
    }
  };

  return (
    <VStack align="stretch" spacing={2} data-testid={`facility-product-rows-${facility.id}`}>
      <Text fontSize="xs" fontWeight="semibold" color="gray.700">
        {intl.formatMessage({ id: 'handler.productRows.title' })}
      </Text>
      {products.length === 0 && editing !== 'new' ? (
        <Text fontSize="xs" color="gray.600">
          {intl.formatMessage({ id: 'handler.productRows.empty' })}
        </Text>
      ) : null}
      {products.map((product, i) => (
        <React.Fragment key={product.id}>
          {i > 0 ? <Divider /> : null}
          {editing === product.id ? (
            <ProductForm
              facility={facility}
              product={product}
              companyId={companyId}
              farmId={farmId}
              onDone={() => setEditing(null)}
            />
          ) : (
            <ProductRow
              product={product}
              onEdit={() => setEditing(product.id)}
              onDelete={() => doDelete(product)}
            />
          )}
        </React.Fragment>
      ))}
      {editing === 'new' ? (
        <>
          {products.length > 0 ? <Divider /> : null}
          <ProductForm
            facility={facility}
            product={null}
            companyId={companyId}
            farmId={farmId}
            onDone={() => setEditing(null)}
          />
        </>
      ) : (
        <HStack>
          <StandardButton size="sm" variant="outline" onClick={() => setEditing('new')}>
            {intl.formatMessage({ id: 'handler.productRows.add' })}
          </StandardButton>
        </HStack>
      )}
    </VStack>
  );
};

export default FacilityProductRows;
