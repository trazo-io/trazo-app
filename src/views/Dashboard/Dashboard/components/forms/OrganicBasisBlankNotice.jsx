import React from 'react';
import { useIntl } from 'react-intl';
import { useWatch } from 'react-hook-form';

import { StandardAlert } from 'components/Design/StandardComponents';

/*
 * The organic basis left blank (overall review 2026-11, OV-FJ-C21). Measured in a browser: a
 * spray saved right after the lookup showed matching OMRI and WSDA listings, with the basis
 * left empty, raised nothing at entry, then printed in the packet as "organic status not
 * recorded" and turned a long-certified block's line into "Organic transition status: Not
 * established from records in Trazo". The field is required only on farms whose farming method
 * says organic, so a pilot farm provisioned without one saved in silence.
 *
 * A warning, never a block: a conventional or unsure grower must still be able to log the spray.
 *
 * ⛔ `useWatch` in its own component, never `methods.watch(...)` in the tab body: ChemicalTab is
 * thousands of lines and a top-level watch re-renders all of it on every change.
 */
const OrganicBasisBlankNotice = ({ control, name = 'organic_approved', messageId }) => {
  const intl = useIntl();
  // No `defaultValue` here: useWatch returns it on the first render even when the form already
  // holds a value, so a reopened record with a basis would show the warning until edited.
  const basis = useWatch({ control, name });

  if (basis) return null;
  return (
    <StandardAlert status="warning" mb={0} description={intl.formatMessage({ id: messageId })} />
  );
};

export default OrganicBasisBlankNotice;
