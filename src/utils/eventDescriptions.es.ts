// es-419 translations for the STATIC consumer event-description strings produced
// by getConsumerEventDescription() (utils/eventDescriptions.ts).
//
// Why a string-keyed dict and not the i18n JSON: these sentences are generated
// deep inside a 3400-line branching function from many type aliases. A
// render-time post-processor (localizeConsumerDescription) maps the English
// output → es-419 by exact string, which localizes shortDescription /
// consumerImpact / sustainabilityBenefit without restructuring that function.
//
// Coverage = the STATIC strings only. The ~36 DYNAMIC consumerImpact templates
// (area/pH/yield interpolated mid-sentence, e.g. "Soil testing and analysis
// across 20 ha (pH: 6.8) ensures…") are NOT here — they fall through to English
// until Stage 2 converts them to ICU messages. shortDescription (shown on every
// card) and most sustainabilityBenefit values ARE static and covered here.
//
// Compliance (es-419): "documentado"/"registrado", never "verificado" for Trazo's
// own claims; no "carbono neutral". Keep faithful to the English meaning.

export const CONSUMER_DESCRIPTION_ES: Record<string, string> = {
  // Run 8 (P1b, 2026-10-06): what the record holds, never what the work achieved.
  'A treatment was applied against a pest': 'Se aplicó un tratamiento contra una plaga',
  'A crop treatment was applied': 'Se aplicó un tratamiento al cultivo',
  'The crop was checked for pests and damage': 'Se revisó el cultivo en busca de plagas y daños',
  'Pest counts were compared with a treatment threshold':
    'Se compararon los conteos de plagas con un umbral de tratamiento',
  'Weather conditions were recorded': 'Se registraron las condiciones del tiempo',
  'Farm equipment was maintained': 'Se dio mantenimiento al equipo agrícola',
  'The crop was checked for pests': 'Se revisó el cultivo en busca de plagas',
  'Equipment was set up for field work': 'Se preparó el equipo para el trabajo de campo',
  'Farm infrastructure or facility work was recorded':
    'Se registró trabajo en la infraestructura o las instalaciones de la finca',
  'Farming practices were documented': 'Se documentaron prácticas agrícolas',
  'A training session was held': 'Se realizó una capacitación',
  'Farm facilities and equipment were inspected for safety':
    'Se inspeccionaron las instalaciones y el equipo de la finca por seguridad',
  'Seeds were planted': 'Se sembraron semillas',
  'A farm activity was recorded': 'Se registró una actividad de la finca',
  'Water was applied to the crop': 'Se aplicó agua al cultivo',
  'The plants were pruned': 'Se podaron las plantas',
  'Growth was cut back in the canopy': 'Se recortó el crecimiento del follaje',
  'Some of the developing crop was taken off': 'Se retiró parte del cultivo en desarrollo',
  'The soil was cultivated mechanically': 'Se cultivó el suelo con maquinaria',
  'Part of the developing crop was thinned': 'Se raleó parte del cultivo en desarrollo',
  'The canopy was shaped': 'Se dio forma al follaje',
  'Wind machines, heaters or sprinklers ran through a cold night on this block':
    'Ventiladores, calentadores o aspersores funcionaron durante una noche fría en este bloque',
  'This practice is part of the season record of the farm.':
    'Esta práctica forma parte del registro de la temporada de la finca.',
  'You can see when this lot was shaped.': 'Puedes ver cuándo se dio forma a este lote.',
  'You can see the weed work on this block was done by machine, and when.':
    'Puedes ver que el trabajo contra las malezas en este bloque se hizo con máquina, y cuándo.',
  'You can see the day the crop load on this lot was adjusted.':
    'Puedes ver el día en que se ajustó la carga del cultivo de este lote.',
  'Honey bee hives were brought into this block during bloom.':
    'Se trajeron colmenas a este bloque durante la floración.',
  'Canopy work on this block is dated and on record.':
    'El trabajo en el follaje de este bloque queda registrado con su fecha.',
  'Weeds were flamed with a propane burner.': 'Se quemaron las malezas con un quemador de propano.',
  'The weeding method and the date are on record.':
    'El método de deshierbe y la fecha quedan registrados.',
  'You can see when the ground under this crop was mowed.':
    'Puedes ver cuándo se cortó la cobertura bajo este cultivo.',
  'Ground-cover work on this block is dated and on record.':
    'El trabajo en la cobertura del suelo de este bloque queda registrado con su fecha.',
  'Equipment cleaning was recorded before this work on the crop.':
    'Se registró la limpieza del equipo antes de este trabajo en el cultivo.',
  'The cleaning step is dated and on record.': 'El paso de limpieza queda registrado con su fecha.',
  'Spray equipment calibration was recorded.':
    'Se registró la calibración del equipo de aplicación.',
  'Machine work is filed with the crop it served.':
    'El trabajo de la máquina queda archivado con el cultivo al que sirvió.',
  'Storm conditions and wind damage were recorded':
    'Se registraron la tormenta y los daños por viento',
  'Low humidity conditions were recorded': 'Se registraron condiciones de baja humedad',
  'You can ask the farm how this lot came through the cold.':
    'Puedes preguntarle a la finca cómo pasó este lote el frío.',
  'A dry year shows up in this record rather than being left out.':
    'Un año seco aparece en este registro en lugar de quedar fuera.',
  'You can ask the farm how this lot came through the hail.':
    'Puedes preguntarle a la finca cómo pasó este lote el granizo.',
  'You can ask the farm how this lot came through the heat.':
    'Puedes preguntarle a la finca cómo pasó este lote el calor.',
  'You can ask the farm how this lot came through the storm.':
    'Puedes preguntarle a la finca cómo pasó este lote la tormenta.',
  'A rough weather day is in this record rather than left out of it.':
    'Un día de mal tiempo está en este registro en lugar de quedar fuera.',
  'The humid spell is on record with its dates.':
    'El período húmedo queda registrado con sus fechas.',
  'The dry spell is on record with its dates.': 'El período seco queda registrado con sus fechas.',
  'Environmental conditions were recorded': 'Se registraron las condiciones ambientales',
  'This application is part of the season record for this crop.':
    'Esta aplicación forma parte del registro de la temporada del cultivo.',
  'A certifier can compare the treatment with the problem it answered.':
    'Un certificador puede comparar el tratamiento con el problema al que respondió.',
  'A copper-based treatment was applied against a disease.':
    'Se aplicó un tratamiento a base de cobre contra una enfermedad.',
  'Organic rules allow copper only where it does not build up in the soil, so the amount and timing are recorded.':
    'Las normas orgánicas permiten el cobre solo si no se acumula en el suelo, por eso se registran la cantidad y el momento.',
  'The disease and the product used against it are on record.':
    'La enfermedad y el producto usado contra ella quedan registrados.',
  'The product and the area treated are on record.':
    'El producto y el área tratada quedan registrados.',
  'A sample of leaf, soil, compost or irrigation water was sent to an outside laboratory':
    'Se envió una muestra de hoja, suelo, compost o agua de riego a un laboratorio externo',
  'This soil work is part of the season record for this crop.':
    'Este trabajo en el suelo forma parte del registro de la temporada del cultivo.',
  'The soil work, its date and its area are on record.':
    'El trabajo en el suelo, su fecha y su área quedan registrados.',
  'You can see that the farm sent samples to a lab and recorded the results.':
    'Puedes ver que la finca envió muestras a un laboratorio y registró los resultados.',
  'The lab results are on record beside the inputs applied to this block.':
    'Los resultados de laboratorio quedan registrados junto a los insumos aplicados en este bloque.',
  'A lab analysis is on record for this block.':
    'Hay un análisis de laboratorio registrado para este bloque.',
  'The test and the inputs that followed are on record, so one can be checked against the other.':
    'El análisis y los insumos que siguieron quedan registrados, así que uno se puede contrastar con el otro.',
  'You can see what the farm added to this ground, and how much.':
    'Puedes ver qué agregó la finca a esta tierra, y cuánto.',
  'You can see what went into the ground this lot grew in.':
    'Puedes ver qué se incorporó a la tierra donde creció este lote.',
  'The material, the amount and the area are on record.':
    'El material, la cantidad y el área quedan registrados.',
  'You can see what grew on this ground before this crop.':
    'Puedes ver qué creció en esta tierra antes de este cultivo.',
  'The cover crop work is dated and on record.':
    'El trabajo con el cultivo de cobertura queda registrado con su fecha.',
  'You can see how many passes went over this field.':
    'Puedes ver cuántas pasadas se hicieron sobre este campo.',
  'You can see what went onto this ground before the crop.':
    'Puedes ver qué se puso sobre esta tierra antes del cultivo.',
  'You can see when animals were on this ground.':
    'Puedes ver cuándo hubo animales en esta tierra.',
  'The grazing dates and the block are on record.':
    'Las fechas de pastoreo y el bloque quedan registrados.',
  'You can see what grows around this block besides the crop.':
    'Puedes ver qué crece alrededor de este bloque además del cultivo.',
  'The habitat, where it is and when it was planted are on record.':
    'El hábitat, dónde está y cuándo se plantó quedan registrados.',
  'You can see what was put up for birds and bees here.':
    'Puedes ver qué se instaló aquí para aves y abejas.',
  'Soil work recorded': 'Trabajo en el suelo registrado',
  'Overwintering pest sites were physically removed from this block':
    'Se retiraron físicamente de este bloque los sitios donde invernan las plagas',
  'The pest management method is on record with its date.':
    'El método de manejo de plagas queda registrado con su fecha.',
  'Prevention work like sanitation and habitat choices is logged here.':
    'El trabajo de prevención, como la sanidad y las decisiones de hábitat, queda registrado aquí.',
  'You can see how often someone walked this block looking for pests.':
    'Puedes ver con qué frecuencia alguien recorrió este bloque buscando plagas.',
  'You can see how many insects turned up here, and when.':
    'Puedes ver cuántos insectos aparecieron aquí, y cuándo.',
  'Trap counts are on record with their dates.':
    'Los conteos de trampas quedan registrados con sus fechas.',
  'You can see a living control was used here, and when.':
    'Puedes ver que aquí se usó un control vivo, y cuándo.',
  'The pest identification is on record.': 'La identificación de la plaga queda registrada.',
  'The species identified is on record with the date.':
    'La especie identificada queda registrada con la fecha.',
  'The count and the threshold it was compared with are on record.':
    'El conteo y el umbral con el que se comparó quedan registrados.',
  'Each method used against the pest is on record.':
    'Cada método usado contra la plaga queda registrado.',
  'A certifier can follow each method through the season.':
    'Un certificador puede seguir cada método a lo largo de la temporada.',
  'Pest management was recorded': 'Se registró manejo de plagas',
  'Team planning was recorded': 'Se registró planificación del equipo',
  'Community outreach was recorded': 'Se registró actividad con la comunidad',
  'Precision agriculture work was recorded': 'Se registró trabajo de agricultura de precisión',
  'Emergency cleanup and repair were recorded':
    'Se registraron limpieza y reparación de emergencia',
  'This management work is part of the season record of the farm.':
    'Este trabajo de gestión forma parte del registro de la temporada de la finca.',
  'The training session is on record.': 'La capacitación queda registrada.',
  'The documentation of this work is on record.':
    'La documentación de este trabajo por parte de la finca queda registrada.',
  'This record is part of the documentation of the farm.':
    'Este registro forma parte de la documentación de la finca.',
  'The safety inspection is on record.': 'La inspección de seguridad queda registrada.',
  'The precision agriculture work is on record.':
    'El trabajo de agricultura de precisión queda registrado.',
  'The outreach is on record.': 'La actividad con la comunidad queda registrada.',
  'The outreach event is on record.': 'El evento con la comunidad queda registrado.',
  'Equipment maintenance and calibration are on record.':
    'El mantenimiento y la calibración del equipo quedan registrados.',
  'Fuel used for field operations was recorded':
    'Se registró el combustible usado en el trabajo de campo',
  'Equipment repair recorded': 'Reparación de equipo registrada',
  'Equipment breakdown and repair recorded': 'Avería y reparación de equipo registradas',
  'Transport and logistics work recorded': 'Trabajo de transporte y logística registrado',
  'Storage and handling work recorded': 'Trabajo de almacenamiento y manejo registrado',
  'Equipment operation recorded': 'Operación de equipo registrada',
  'This equipment work is part of the season record for this crop.':
    'Este trabajo con equipo forma parte del registro de la temporada del cultivo.',
  'The machine, the work and the date are on record.':
    'La máquina, el trabajo y la fecha quedan registrados.',
  'Regulatory compliance record': 'Registro de cumplimiento normativo',
  'A note on what the farm makes public': 'Una nota sobre lo que la finca hace público',
  'Cover cropping recorded': 'Cultivo de cobertura registrado',
  'No-till practice recorded': 'Práctica sin labranza registrada',
  'Integrated pest management recorded': 'Manejo integrado de plagas registrado',
  'Water conservation measure recorded': 'Medida de conservación de agua registrada',
  'Renewable energy installation recorded': 'Instalación de energía renovable registrada',
  'On-farm composting recorded': 'Compostaje en la finca registrado',
  'Biodiversity conservation work recorded': 'Trabajo de conservación de biodiversidad registrado',
  'Soil health work recorded': 'Trabajo de salud del suelo registrado',
  'Business record': 'Registro de la empresa',
  'The certification and its dates are on record as the farm reported them.':
    'La certificación y sus fechas quedan registradas tal como las informó la finca.',
  'Business activity recorded': 'Actividad de la empresa registrada',
  // Run 8 (R8-09): what the record shows, never what it caused.
  'The fuel this machine used is on record.':
    'El combustible que usó esta máquina queda registrado.',
  'Which machine was serviced, and on what day, is on record.':
    'Qué máquina recibió mantenimiento, y en qué día, queda registrado.',
  'The repair, the machine and the date are on record.':
    'La reparación, la máquina y la fecha quedan registradas.',
  'The calibration, the machine and the date are on record.':
    'La calibración, la máquina y la fecha quedan registradas.',
  'The breakdown and what was done about it are on record.':
    'La avería y lo que se hizo al respecto quedan registrados.',
  'The inspection, the machine and the date are on record.':
    'La inspección, la máquina y la fecha quedan registradas.',
  'Machine work sits on the same record as the crop it served.':
    'El trabajo de la máquina queda en el mismo registro que el cultivo al que sirvió.',
  'After picking, the farm recorded how the crop was hulled, dried or cooled.':
    'Después de la cosecha, la finca registró cómo se descascaró, secó o enfrió el cultivo.',
  'Agricultural practice recorded by the farm': 'Práctica agrícola registrada por la finca',
  'Breakdown repair recorded.': 'Reparación de avería registrada.',
  'Calibration recorded.': 'Calibración registrada.',
  'You can see when the leaves around this crop were pulled or hedged.':
    'Puedes ver cuándo se deshojó o se recortó el follaje alrededor de este cultivo.',
  'Crop harvested': 'Se cosechó el cultivo',
  'Damage repair recorded.': 'Reparación de daños registrada.',
  'Emergency response recorded.': 'Respuesta a emergencia registrada.',
  'Equipment breakdown response recorded.': 'Respuesta a avería del equipo registrada.',
  'Equipment calibration recorded': 'Calibración del equipo registrada',
  'Equipment calibration recorded.': 'Calibración del equipo registrada.',
  'Equipment calibration was recorded before application.':
    'Se registró la calibración del equipo antes de la aplicación.',
  'Equipment inspection recorded': 'Inspección del equipo registrada',
  'Equipment inspection recorded.': 'Inspección del equipo registrada.',
  'Equipment maintenance and service recorded': 'Mantenimiento y servicio del equipo registrados',
  'Equipment maintenance recorded.': 'Mantenimiento del equipo registrado.',
  'Equipment operation recorded.': 'Operación de equipo registrada.',
  'Equipment repair recorded.': 'Reparación del equipo registrada.',
  'Farm activities planned': 'Se planificaron actividades de la finca',
  'Farm equipment operation recorded by the farm':
    'Operación de equipo agrícola registrada por la finca',
  'Farm equipment use or maintenance recorded': 'Uso o mantenimiento de equipo agrícola registrado',
  'Farm equipment use or maintenance recorded (Legacy: use EM for new events)':
    'Uso o mantenimiento de equipo agrícola registrado',
  'Farm equipment use or maintenance recorded (Legacy: use EM)':
    'Uso o mantenimiento de equipo agrícola registrado',
  'Farm infrastructure or equipment maintained':
    'Se hizo mantenimiento de la infraestructura o del equipo de la finca',
  'Farm maintenance recorded.': 'Mantenimiento de la finca registrado.',
  'Farm management activity recorded by the farm': 'Actividad de gestión registrada por la finca',
  'Farm management activity recorded.': 'Actividad de gestión de la finca registrada.',
  'Farm planning recorded.': 'Planificación de la finca registrada.',
  'Fertigation: fertilizer applied through the irrigation system. Application fuel is excluded from the carbon estimate so it is not counted twice with the irrigation record.':
    'Fertirriego: fertilizante aplicado a través del sistema de riego. El combustible de la aplicación se excluye de la estimación de carbono para no contarlo dos veces con el registro de riego.',
  'You can see the frost work done for this lot.':
    'Puedes ver el trabajo contra heladas hecho para este lote.',
  'Fuel use recorded for this equipment.': 'Consumo de combustible registrado para este equipo.',
  'General maintenance recorded': 'Se registró mantenimiento general',
  'Harvest recorded': 'Cosecha registrada',
  'High humidity conditions recorded': 'Condiciones de alta humedad registradas',
  'Inspection recorded.': 'Inspección registrada.',
  'Pest damage assessment recorded.': 'Evaluación de daño por plagas registrada.',
  'Pest management recorded': 'Manejo de plagas registrado',
  'Planning meeting recorded.': 'Reunión de planificación registrada.',
  'Planning session recorded.': 'Sesión de planificación registrada.',
  'Post-harvest handling recorded': 'Manejo poscosecha registrado',
  'Precision agriculture work recorded.': 'Trabajo de agricultura de precisión registrado.',
  'Preventive equipment maintenance recorded': 'Mantenimiento preventivo del equipo registrado',
  'Preventive maintenance recorded.': 'Mantenimiento preventivo registrado.',
  'Safety inspection recorded.': 'Inspección de seguridad registrada.',
  'Soil prepared': 'Se preparó el suelo',
  'Team coordination recorded.': 'Coordinación del equipo registrada.',
  'The handling record holds the temperature and sanitation steps the farm entered for the crop.':
    'El registro de manejo contiene los pasos de temperatura y sanitización que la finca ingresó para el cultivo.',
  'This practice is recorded by the farm.': 'Esta práctica figura en el registro de la finca.',
  'Tillage recorded.': 'Labranza registrada.',
  'Training session recorded.': 'Sesión de capacitación registrada.',
  'Water applied': 'Se aplicó agua',
  'Conditions on the day are logged beside the work done that day.':
    'Las condiciones del día quedan registradas junto al trabajo de ese día.',
  'USDA Organic Certification': 'Certificación USDA Organic',
  'GlobalG.A.P. Certification': 'Certificación GlobalG.A.P.',
  'Rainforest Alliance Certification': 'Certificación Rainforest Alliance',
  'Fair Trade Certification': 'Certificación Fair Trade',
  'Sustainable Agriculture Standard': 'Norma de agricultura sostenible',
  'Water Stewardship Certification': 'Certificación de gestión del agua',
  'Kosher Certification': 'Certificación kosher',
  'SQF / Food Safety Certification': 'Certificación SQF / inocuidad alimentaria',
  'USDA Organic: the National Organic Program standard, covering permitted inputs, land history and recordkeeping, assessed by a USDA-accredited certifier':
    'USDA Organic: la norma del National Organic Program, que abarca los insumos permitidos, el historial del terreno y los registros, evaluada por un certificador acreditado por el USDA',
  'GlobalG.A.P.: a farm-practice and food-safety standard covering production, handling and worker health, audited by an approved certification body':
    'GlobalG.A.P.: una norma de prácticas agrícolas e inocuidad alimentaria que abarca producción, manipulación y salud de los trabajadores, auditada por un organismo de certificación aprobado',
  'Rainforest Alliance: a standard covering farm management, biodiversity and working conditions, audited by an authorised certification body':
    'Rainforest Alliance: una norma que abarca la gestión del establecimiento, la biodiversidad y las condiciones laborales, auditada por un organismo de certificación autorizado',
  'Fair Trade: a standard covering labour conditions, trading terms and a producer premium, audited by the issuing body':
    'Fair Trade: una norma que abarca las condiciones laborales, los términos comerciales y una prima para el productor, auditada por el organismo emisor',
  'Regenerative Organic Certified: a standard layered on organic certification, adding soil practices, animal welfare and farmworker fairness':
    'Regenerative Organic Certified: una norma que se suma a la certificación orgánica y agrega prácticas de suelo, bienestar animal y equidad para los trabajadores',
  'Certified Naturally Grown: a peer-reviewed certification for farms following practices modelled on the National Organic Program':
    'Certified Naturally Grown: una certificación revisada por pares para establecimientos que siguen prácticas basadas en el National Organic Program',
  'Non-GMO Project Verified: a standard for avoiding genetically engineered inputs, assessed against the Project testing and traceability requirements':
    'Non-GMO Project Verified: una norma para evitar insumos modificados genéticamente, evaluada según los requisitos de análisis y trazabilidad del Project',
  'Sustainable Agriculture Standard, as recorded by this operation':
    'Norma de agricultura sostenible, según lo registrado por este establecimiento',
  'Water stewardship certification: a standard covering water use, catchment impact and water quality at the site':
    'Certificación de gestión del agua: una norma que abarca el uso del agua, el impacto en la cuenca y la calidad del agua en el sitio',
  'Kosher certification: a standard covering ingredients, equipment and handling, assessed by a certifying agency':
    'Certificación kosher: una norma que abarca ingredientes, equipos y manipulación, evaluada por una agencia certificadora',
  'SQF or equivalent food-safety certification: a standard covering handling, sanitation and traceability, audited by a licensed certification body':
    'Certificación SQF o equivalente de inocuidad alimentaria: una norma que abarca manipulación, sanidad y trazabilidad, auditada por un organismo de certificación habilitado',

  'Third-Party Verification': 'Verificación de tercera parte',
  'Transparency Initiative': 'Iniciativa de transparencia',

  'A business or compliance record was filed for this crop':
    'Se archivó un registro comercial o de cumplimiento para este cultivo',
  // Contamination-incident copy (eventDescriptions.ts). Overrides whatever `activity_type`
  // wording the record was filed under — see the note there.
  'A contamination incident was recorded for this block':
    'Se registró un incidente de contaminación en este bloque',
  'The farm recorded this incident itself, along with where it came from and how much of the block it reached.':
    'La finca registró este incidente por su cuenta, junto con su origen y qué parte del bloque alcanzó.',
  'Carbon credits were issued or transferred for this operation':
    'Se emitieron o transfirieron créditos de carbono para esta operación',
  'An audit of the operation was carried out and recorded':
    'Se realizó y registró una auditoría de la operación',
  'An outside body reviewed this operation against a written standard':
    'Un organismo externo revisó esta operación contra una norma escrita',
  "The date and the farm's own account of the audit are on record here, labelled as the farm reported them.":
    'Aquí quedan registrados la fecha y el relato de la propia finca sobre la auditoría, señalados como información que la finca reportó.',
  'An audit checks conformance to a written standard on the day it is carried out; the record here says which standard and when.':
    'Una auditoría verifica el cumplimiento de una norma escrita el día en que se realiza; el registro indica qué norma y cuándo.',
  'Credits are counted in a scheme with its own rules; the amount and the scheme are on record here.':
    'Los créditos se contabilizan en un esquema con sus propias reglas; la cantidad y el esquema quedan registrados aquí.',
  'The record behind this crop is open for a buyer to read, not summarised for them.':
    'El registro detrás de este cultivo está abierto para que un comprador lo lea, no resumido para él.',
  'The document, the issuer and the date are on record for this crop.':
    'El documento, el emisor y la fecha quedan registrados para este cultivo.',

  'The farm logged this alongside the rest of the season.':
    'La finca lo registró junto con el resto de la temporada.',

  'A farming activity was recorded on this date':
    'Se registró una actividad agrícola en esta fecha',
  'Farming activity recorded for this crop': 'Actividad agrícola registrada para este cultivo',
  'This activity is part of the record kept for this crop.':
    'Esta actividad forma parte del registro que se lleva de este cultivo.',
  'A farming activity was recorded for this crop':
    'Se registró una actividad agrícola para este cultivo',
  'Each cultivation pass is on record, which is how mechanical weed control is evidenced rather than asserted.':
    'Cada pasada de cultivo queda registrada, que es la forma de evidenciar el control mecánico de malezas en lugar de solo afirmarlo.',
  'Thinning dates and volumes are on record, which is what lets a size grade be traced back to a decision in the field.':
    'Las fechas y los volúmenes de raleo están registrados, que es lo que permite rastrear un calibre hasta una decisión en el campo.',
  'What was applied, where and when is on record for this crop.':
    'Qué se aplicó, dónde y cuándo queda registrado para este cultivo.',
  'Work on the soil was recorded for this block': 'Se registró trabajo sobre el suelo en este lote',
  'Organic matter was added to the soil': 'Se aplicó materia orgánica al suelo',
  'Structures and their locations are on record, so the habitat can be checked on the ground.':
    'Las estructuras y sus ubicaciones quedan registradas, así el hábitat puede verificarse en el terreno.',
  'Releases are recorded by species and date, so the approach can be followed across the season.':
    'Las liberaciones se registran por especie y fecha, así se puede seguir el enfoque a lo largo de la temporada.',
  'The method used against the pest is on record, alongside the counts that prompted it.':
    'El método usado contra la plaga queda registrado, junto con los conteos que lo motivaron.',

  'A mineral amendment was applied to correct the soil':
    'Se aplicó una enmienda mineral para corregir el suelo',
  'The amendment, the amount and the area are on record, so the correction can be checked against the soil test that prompted it.':
    'La enmienda, la cantidad y el área quedan registradas, así la corrección puede verificarse contra el análisis de suelo que la motivó.',
  'Counts and dates are on record, so a decision to treat, or not to treat, can be checked against what was actually found.':
    'Los conteos y las fechas quedan registrados, así la decisión de tratar, o de no tratar, puede verificarse contra lo que realmente se encontró.',

  'A pest treatment approved for organic growing was applied':
    'Se aplicó un tratamiento de plagas aprobado para producción orgánica',
  'Products allowed in organic growing are reviewed against a public national list before they can be used.':
    'Los productos permitidos en producción orgánica se revisan contra una lista nacional pública antes de poder usarse.',
  'The product, the target pest and the date are on record, so the treatment can be checked against that list.':
    'El producto, la plaga objetivo y la fecha quedan registrados, así el tratamiento puede verificarse contra esa lista.',

  'A treatment was applied to control weeds': 'Se aplicó un tratamiento para controlar malezas',

  'A heat wave crossed the block and the crop was checked afterwards':
    'Una ola de calor pasó por el bloque y después se revisó el cultivo',
  'Frost was recorded on the block and its effect on the crop assessed':
    'Se registró una helada en el lote y se evaluó su efecto en el cultivo',
  'Dry conditions were tracked across the season':
    'Se hizo seguimiento de las condiciones de sequía durante la temporada',
  'Conditions on the block were recorded that day':
    'Se registraron las condiciones del lote ese día',
  'Weather is the one thing a farm cannot control, and it is logged here beside everything it can.':
    'El clima es lo único que una finca no puede controlar, y queda registrado aquí junto a todo lo que sí puede.',
  'A third-party certification was recorded for this crop':
    'Se registró una certificación de tercera parte para este cultivo',
  'The certificate number is published here, so this is a claim a buyer can check rather than take on trust.':
    'El número de certificado se publica aquí, así que es una afirmación que un comprador puede verificar en lugar de aceptarla sin más.',

  'Beneficial insects were released into the block': 'Se liberaron insectos benéficos en el lote',

  'The soil was cultivated to turn weeds under': 'Se cultivó el suelo para enterrar las malezas',
  'Livestock were grazed through the block to eat down the cover crop':
    'Se pastoreó ganado en el lote para consumir el cultivo de cobertura',
  'The pest was identified before any decision about treating it':
    'Se identificó la plaga antes de decidir cualquier tratamiento',
  'Compost or manure was spread and worked into the ground':
    'Se esparció compost o estiércol y se incorporó al terreno',

  'Seed sources and varieties are logged before anything is in the ground, so the record starts on day one rather than at harvest.':
    'Los orígenes de la semilla y las variedades se registran antes de que algo entre a la tierra, así que el registro empieza el primer día y no en la cosecha.',

  // Short/impact split (2026-08-01 editorial review): 9 subtypes said the same sentence
  // twice — title line and green 'why' box were paraphrases. Short = what happened,
  // impact = why it matters to the person holding the food.
  'Hail hit the block and the damage was assessed':
    'El granizo golpeó el lote y se evaluaron los daños',
  'High winds crossed the block and the crop was checked for damage afterwards':
    'Vientos fuertes cruzaron el lote y después se revisó el cultivo en busca de daños',
  'Vegetation on this block was mown': 'Se segó la vegetación de este bloque',
  'Lime or sulfur was worked into the ground to correct the soil pH':
    'Se incorporó cal o azufre al terreno para corregir el pH del suelo',
  'The ground was worked to prepare a seedbed':
    'Se trabajó el terreno para preparar la cama de siembra',
  'Hedgerows, flowering strips and living groundcover were planted along the field edges':
    'Se plantaron setos, franjas florales y cubierta vegetal viva en los bordes del lote',
  'Owl and songbird boxes, raptor perches and native-bee blocks were installed around the block':
    'Se instalaron cajas para lechuzas y aves canoras, perchas para rapaces y bloques para abejas nativas alrededor del lote',
  'Pest traps around the block were checked and the counts written down':
    'Se revisaron las trampas de plagas del lote y se anotaron los conteos',
  'Several pest-control methods were used together rather than relying on one':
    'Se combinaron varios métodos de control de plagas en lugar de depender de uno solo',

  'A cover crop was recorded on this block': 'Se registró un cultivo de cobertura en este bloque',
  'A farm activity recorded as part of this crop’s history':
    'Una actividad agrícola registrada como parte del historial de este cultivo',
  'A soil sample was sent to a lab': 'Se envió una muestra de suelo a un laboratorio',
  'A treatment was applied against a plant disease':
    'Se aplicó un tratamiento contra una enfermedad de la planta',
  'A treatment was applied against a specific pest':
    'Se aplicó un tratamiento contra una plaga específica',
  'Agricultural Activity': 'Actividad agrícola',
  'Agricultural operation completed on the farm': 'Operación agrícola completada en la finca',
  'Beneficial Release': 'Liberación de insectos benéficos',
  'Certification & compliance': 'Certificación y cumplimiento',
  'Pest & scouting': 'Plagas y monitoreo',
  'Weather event': 'Evento climático',
  'Input application': 'Aplicación de insumos',
  'Canopy Management': 'Manejo de la copa',
  'Certification Event': 'Evento de certificación',
  'Certification means an accredited body reviewed this farm against a published standard and renews that review on a schedule.':
    'La certificación significa que un organismo acreditado evaluó esta finca conforme a una norma publicada y renueva esa evaluación periódicamente.',
  'Checked monitoring traps to track pest populations and identify early warning signs':
    'Se revisaron las trampas de monitoreo para rastrear poblaciones de plagas e identificar señales tempranas de alerta',
  'Compliance Activity': 'Actividad de cumplimiento',
  'Compliance Activity: Certification': 'Actividad de cumplimiento: Certificación',
  'Compost was spread on the block': 'Se esparció compost en el lote',
  'Composting Operation': 'Operación de compostaje',
  'Recording the amount, the area and the composting process is what makes soil building checkable rather than asserted.':
    'Registrar la cantidad, la superficie y el proceso de compostaje es lo que permite comprobar el trabajo en el suelo en lugar de afirmarlo.',
  'Cover Crop Management': 'Manejo de cultivos de cobertura',
  Cultivation: 'Laboreo del suelo',
  'Drought Monitoring': 'Monitoreo de sequía',
  'Equipment Maintenance': 'Mantenimiento de equipos',
  'Equipment work': 'Trabajo con equipos',
  'Equipment operation completed as part of farm activities':
    'Operación de equipo completada como parte de las actividades de la finca',
  'Which machine was used or serviced, and on what day, is on record.':
    'Qué máquina se usó o se mantuvo, y en qué día, queda registrado.',
  'Frost Event': 'Evento de helada',
  'Frost Protection': 'Protección contra heladas',
  'General Farm Activity': 'Actividad agrícola general',
  'Grazing Management': 'Manejo del pastoreo',
  'Habitat Development': 'Desarrollo de hábitat',
  'Hail Damage Assessment': 'Evaluación de daños por granizo',
  'Harvest Operation': 'Operación de cosecha',
  'Heat Stress Monitoring': 'Monitoreo de estrés por calor',
  'High Humidity Monitoring': 'Monitoreo de humedad alta',
  'High Winds Event': 'Evento de vientos fuertes',
  'IPM Implementation': 'Implementación de manejo integrado de plagas (MIP)',
  'Identified pest species to develop targeted management strategies':
    'Se identificaron especies de plagas para desarrollar estrategias de manejo específicas',
  'Inspection Process': 'Proceso de inspección',
  'Inspection Process: Certification': 'Proceso de inspección: Certificación',
  'Irrigation Operation': 'Operación de riego',
  'Low Humidity Monitoring': 'Monitoreo de humedad baja',
  'Managed pollinators were brought in to pollinate the crop':
    'Se trajeron polinizadores manejados para polinizar el cultivo',
  'Mowing / Ground Cover': 'Siega / manejo de la cobertura vegetal',
  'New plants went into the ground': 'Se plantaron nuevas plantas en el terreno',
  'Nutrients were applied to feed the crop': 'Se aplicaron nutrientes para alimentar el cultivo',
  'Orchard floor mowed or managed to support soil health and clean harvest conditions':
    'Piso del huerto segado o manejado para favorecer la salud del suelo y condiciones de cosecha limpias',
  'Organic Matter Addition': 'Incorporación de materia orgánica',
  'Organic certification traces a crop back to what was planted, so the planting record is the first link in that chain.':
    'La certificación orgánica rastrea un cultivo hasta lo que se plantó, así que el registro de siembra es el primer eslabón de esa cadena.',
  'Pest Identification': 'Identificación de plagas',
  'Pest Scouting': 'Monitoreo de plagas',
  Planting: 'Siembra',
  Pollination: 'Polinización',
  'Post-Harvest Processing': 'Procesamiento poscosecha',
  'Pruning Operation': 'Operación de poda',
  'Each pruning pass is dated and on record, which is how canopy work is evidenced rather than asserted.':
    'Cada pasada de poda queda fechada y registrada, que es la forma de evidenciar el trabajo de copa en lugar de afirmarlo.',
  'Recording the date, volume and grade is what lets a batch be traced back to one block and one week.':
    'Registrar la fecha, el volumen y la categoría es lo que permite rastrear un lote hasta una parcela y una semana concretas.',
  'The product, the date and the area treated are on record, so the certifier can check the application against the label.':
    'El producto, la fecha y el área tratada quedan registrados, así el certificador puede cotejar la aplicación con la etiqueta.',
  'Recording the source and method makes water use checkable instead of assumed.':
    'Registrar la fuente y el método hace que el uso del agua sea verificable en lugar de supuesto.',
  'Recording what was used on weeds, and where, is what makes the choice checkable.':
    'Registrar qué se usó contra las malezas, y dónde, es lo que hace verificable esa decisión.',
  'Soil Testing & Analysis': 'Análisis de suelo',
  'Storm & Wind Event': 'Evento de tormenta y viento',
  Thinning: 'Raleo de frutos',
  'The block was irrigated': 'Se regó el lote',
  'The farm logged work on its equipment as part of this crop’s record.':
    'La finca registró trabajos en su maquinaria como parte del historial de este cultivo.',
  'The trees were pruned to open up the canopy': 'Se podaron los árboles para abrir la copa',
  'The variety and the source of the planting stock are on record from this crop’s first day.':
    'La variedad y el origen del material de plantación quedan registrados desde el primer día de este cultivo.',
  'This is a synthetic weedkiller. It is not permitted on certified organic ground, and the date and area treated are recorded.':
    'Este es un herbicida sintético. No está permitido en terreno orgánico certificado, y se registran la fecha y el área tratada.',
  'Threshold Assessment': 'Evaluación de umbral de acción',
  'Tillage Implementation': 'Labranza del suelo',
  'Transplanting Operation': 'Operación de trasplante',
  'Plants were moved into their growing position in this block':
    'Se trasladaron las plantas a su posición de cultivo en este bloque',
  'Trap Monitoring': 'Monitoreo con trampas',
  'Weather conditions monitored to assess environmental impact on crop growth and development':
    'Condiciones meteorológicas monitoreadas para evaluar el impacto ambiental en el crecimiento y desarrollo del cultivo',

  // eventDescriptions map values (short descriptions shown on every card)
  'Planted seeds or seedlings to establish the crop':
    'Se sembraron semillas o plántulas para establecer el cultivo',

  // Static consumerImpact / sustainabilityBenefit assigned inside type branches
  'Active participation in carbon reduction programs supporting climate goals with transparent verification':
    'Participación activa en programas de reducción de carbono que respaldan objetivos climáticos con verificación transparente',
  'Herbicide treatment manages weeds that compete with crops for essential resources.':
    'El tratamiento con herbicida maneja las malezas que compiten con los cultivos por recursos esenciales.',

  // Static sustainabilityBenefit assigned with backticks (no interpolation)
  'Documented harvest timing, yield tracking, and quality grading demonstrates responsible farming and rigorous quality control practices.':
    'El registro documentado del momento de cosecha, el seguimiento del rendimiento y la clasificación por calidad demuestran una agricultura responsable y rigurosas prácticas de control de calidad.',

  // Stage 2 (2026-06-14): consumerImpact sentences made static (in-sentence
  // quantities dropped — they render in Key Details) so they localize here.
  'Field equipment operation with complete fuel consumption documentation for transparency.':
    'Operación de equipo de campo con documentación completa del consumo de combustible para mayor transparencia.',
  'Contributing to carbon offset programs and climate action':
    'Contribución a programas de compensación de carbono y acción climática',
  'Documented practices providing trust and transparency':
    'Prácticas documentadas que brindan confianza y transparencia',

  // --- Biodiversity / habitat (GR grazing, HD habitat, NS nesting) — descriptions + impact + benefit ---
  // soilTypeMap descriptions
  'Integrated livestock grazing for natural weed control, cover-crop termination and soil health':
    'Pastoreo integrado de ganado para control natural de malezas, terminación de cultivos de cobertura y salud del suelo',
  // consumerImpact ("Qué significa para ti")
  // sustainabilityBenefit ("Beneficio ambiental")
  'Providing wildlife habitat supports natural pest control and pollination, a hallmark of regenerative farming.':
    'Brindar hábitat para la fauna favorece el control natural de plagas y la polinización, un sello de la agricultura regenerativa.',

  // --- Gaps closed 2026-07 (found by an ES-coverage sweep over eventDescriptions.ts) ---
  // Soil PA sustainabilityBenefit — the only impact/benefit sentence in the whole file that
  // had no Spanish translation, so a Spanish shopper saw one English paragraph mid-page.
  'You can see which week this lot left the block, and how much came off that day.':
    'Puedes ver en qué semana este lote salió del bloque y cuánto se recogió ese día.',
  'The material, the quantity and the day it happened are all part of this entry.':
    'El material, la cantidad y el día en que ocurrió forman parte de esta entrada.',
  'The pest, the product aimed at it and the amount used are recorded here.':
    'La plaga, el producto dirigido a ella y la cantidad usada quedan registrados aquí.',
  'Both the target and the material are on file here, with the date.':
    'Tanto el objetivo como el material constan aquí, con la fecha.',
  'Weed control is logged with the product used and the area it covered.':
    'El control de malezas se registra con el producto usado y la superficie cubierta.',
  'You can see where the irrigation water came from and how it reached the crop.':
    'Puedes ver de dónde vino el agua de riego y cómo llegó al cultivo.',
  'pH Adjustment': 'Ajuste de pH',
  // Titles / descriptions that fell through to English.
  'Crop protected from frost damage on cold nights (wind machines, heaters or sprinklers)':
    'Cultivo protegido de daños por heladas en noches frías (máquinas de viento, calefactores o aspersores)',
  'Nesting / Shelter Structures': 'Estructuras de anidación / refugio',
  // §E-4 winter sanitation (CU) — title + description.
  'Winter Sanitation & Cultural Control': 'Sanidad invernal y control cultural',
  // §E-2 lab analysis (LA) — title + description.
  'Independent Laboratory Analysis': 'Análisis de laboratorio independiente',
  'Soil work': 'Trabajo en el suelo',
  'Farm Maintenance Activity': 'Actividad de mantenimiento de la finca',
  'Fuel Consumption - Field Operations': 'Consumo de combustible en operaciones de campo',
  'Transportation & Logistics': 'Transporte y logística',
  'Certification Achievement': 'Certificación obtenida',
  'Carbon Credits Transaction': 'Transacción de créditos de carbono',
  'Sustainability Assessment': 'Evaluación de sostenibilidad',
  // "Equipment Operations (Legacy)" is deliberately NOT translated: it is producer-facing
  // jargon for a deprecated event type. If it ever reaches a shopper that is the bug to fix,
  // not the missing translation.

  // --- Generic chemical titles used when a product name was not recorded — 2026-07 ---
  // Before this, a chemical event with a blank commercial_name fell out of the chemical
  // branch entirely and got the all-purpose default paragraph.
  'Fertilizer application': 'Aplicación de fertilizante',
  'Pest control application': 'Aplicación para control de plagas',
  'Disease control application': 'Aplicación para control de enfermedades',
  'Weed control application': 'Aplicación para control de malezas',
  'Crop input application': 'Aplicación de un insumo del cultivo',

  // --- Production sub-types that had no consumer copy: PO, PH, FP, CM — 2026-07 ---
  'Hive placement is on record beside the spray log, so applications can be checked against the days bees were on the block.':
    'La colocación de colmenas queda registrada junto al registro de aplicaciones, así se puede verificar cada aplicación frente a los días en que las abejas estuvieron en el bloque.',
  'The night, the method and the low temperature are on record, so frost protection is documented rather than assumed.':
    'La noche, el método y la temperatura mínima quedan registrados, así la protección contra heladas queda documentada y no supuesta.',

  // --- Orchard-floor management (MO), incl. flame weeding — 2026-07 ---

  // --- Certifier-only preview gaps closed 2026-08-25: TR, soil LA, pest CU, business audit/compliance ---
  'You can see when young plants went into this block and where the stock came from.':
    'Puedes ver cuándo entraron las plantas jóvenes a este lote y de dónde vino el material.',
  'Organic rules trace transplanted stock back to how it was raised, and this record is the first link in that trail.':
    'Las normas orgánicas rastrean el material trasplantado hasta cómo fue criado, y este registro es el primer eslabón de esa cadena.',
  'Organic pest management is built on prevention first, and this record is what puts that work on paper.':
    'El manejo orgánico de plagas empieza por la prevención, y este registro es lo que deja ese trabajo por escrito.',
  'What was reviewed, and when, is written down as the farm reported it, so a buyer can ask about specifics instead of generalities.':
    'Qué se revisó, y cuándo, queda escrito tal como la finca lo reportó, para que un comprador pregunte por lo concreto y no por generalidades.',
  'An audit trail with dates is what lets a buyer ask better questions, starting from what was actually reviewed and when.':
    'Un rastro de auditoría con fechas permite a un comprador hacer mejores preguntas, partiendo de qué se revisó realmente y cuándo.',
  'Compliance work like inspections and filings is dated and on record here, as the farm reported it.':
    'El trabajo de cumplimiento, como inspecciones y trámites, queda fechado y registrado aquí, tal como la finca lo reportó.',
  'Keeping compliance events in the same timeline as the field work makes the record continuous instead of split across binders.':
    'Mantener los eventos de cumplimiento en la misma línea de tiempo que el trabajo de campo hace el registro continuo, en lugar de dividido entre carpetas.'
};
