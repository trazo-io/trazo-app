/**
 * es-419 translations for the photo-guidance strings produced by utils/verificationTierHelpers.ts.
 *
 * Why a string-keyed dict and not i18n JSON: the guidance lives in a large hand-authored data
 * structure (event-level PHOTO_RECOMMENDATIONS + per-subtype recommendations), each entry
 * carrying a guidanceText plus arrays of examples and tips. Threading message ids through that
 * structure would mean rewriting every entry and inventing ~123 keys for content that is never
 * interpolated. A render-time post-processor maps the English output to es-419 by exact string —
 * the same approach already used by eventDescriptions.es.ts and fieldValues.es.ts.
 *
 * Coverage: every user-visible string that reaches PhotoRecommendationsBox and
 * EventPreviewModal — event-type names, subtype names, guidance paragraphs, examples and tips.
 *
 * NOT translated (absent → rendered as authored): none currently. If a string is added upstream
 * without an entry here, localizePhotoGuidance returns it unchanged, so the page degrades to
 * English for that one line rather than showing a broken key.
 */

export const PHOTO_GUIDANCE_ES: Record<string, string> = {
  // ---- Event-type names ----
  'Weather Event': 'Evento climático',
  'Production Activity': 'Actividad de producción',
  'Chemical Application': 'Aplicación de insumos',
  'General Activity': 'Actividad general',
  'Equipment Operation': 'Operación de equipos',
  'Soil Management': 'Manejo del suelo',
  'Pest Management': 'Manejo de plagas',
  'Business Activity': 'Actividad comercial',

  // ---- Production subtype names ----
  Planting: 'Siembra',
  Harvesting: 'Cosecha',
  Irrigation: 'Riego',
  'Pruning/Trimming': 'Poda',
  Transplanting: 'Trasplante',
  'Equipment Maintenance': 'Mantenimiento de equipos',
  'Equipment Operations (Legacy)': 'Operaciones de equipos (heredado)',

  // ---- Subtype guidance paragraphs ----
  'Capture seeding equipment in operation and planted rows showing seed placement. Photos should document the establishment of new crops with visible planting patterns.':
    'Capture la sembradora en operación y los surcos sembrados mostrando la colocación de la semilla. Las fotos deben documentar el establecimiento del nuevo cultivo con patrones de siembra visibles.',
  'Document harvesting equipment collecting crops and harvested product. Show the active collection process and crop condition at harvest time.':
    'Documente la cosechadora recolectando el cultivo y el producto cosechado. Muestre el proceso de recolección en curso y el estado del cultivo al momento de la cosecha.',
  'Capture irrigation equipment in operation and water being applied to crops. Show active water delivery with visible spray patterns or water flow.':
    'Capture el equipo de riego en operación y el agua aplicándose al cultivo. Muestre la entrega de agua en curso con patrones de aspersión o flujo visibles.',
  'Document pruning work in progress and plant condition before/after trimming. Show the maintenance activity improving plant structure and health.':
    'Documente la poda en curso y el estado de la planta antes y después. Muestre la labor de mantenimiento que mejora la estructura y la salud de la planta.',
  'Capture seedlings being moved and transplanted plants in new locations. Document careful handling and proper plant establishment.':
    'Capture el traslado de las plántulas y las plantas trasplantadas en su nueva ubicación. Documente el manejo cuidadoso y el establecimiento correcto de la planta.',
  'Document equipment maintenance, repair work, or operation verification. Show maintenance activity with visible equipment components or hour meter readings.':
    'Documente el mantenimiento, la reparación o la verificación de operación del equipo. Muestre la labor con los componentes del equipo o la lectura del horómetro visibles.',

  // ---- Weather examples + tips ----
  'Frost damage on crops or plants': 'Daño por helada en cultivos o plantas',
  'Hail impact on plants or equipment': 'Impacto del granizo en plantas o equipos',
  'Drought conditions (brown/stressed plants)': 'Condiciones de sequía (plantas secas o estresadas)',
  'Heavy rain or flooding evidence': 'Evidencia de lluvia intensa o inundación',
  'Wind damage to crops or structures': 'Daño por viento en cultivos o estructuras',
  'Include date/timestamp in photo if possible':
    'Incluya la fecha u hora en la foto si es posible',
  'Show plants or crops affected by the weather':
    'Muestre las plantas o cultivos afectados por el clima',
  'Include scale reference (hand, ruler) for damage assessment':
    'Incluya una referencia de escala (mano, regla) para evaluar el daño',
  'Multiple angles strengthen verification': 'Varios ángulos refuerzan la verificación',

  // ---- Production examples + tips ----
  'Planting activity (seeding equipment, planted rows)':
    'Labor de siembra (sembradora, surcos sembrados)',
  'Growth stage documentation (crop at different heights)':
    'Documentación de la etapa de crecimiento (cultivo a distintas alturas)',
  'Harvesting in progress (equipment collecting crops)':
    'Cosecha en curso (equipo recolectando el cultivo)',
  'Equipment operation (tractor in field, irrigation running)':
    'Operación de equipos (tractor en el campo, riego funcionando)',
  'Field conditions before/after activity': 'Condiciones del lote antes y después de la labor',
  'Show equipment in operation, not just parked':
    'Muestre el equipo en operación, no solo estacionado',
  'Include field context (rows, crop height, size reference)':
    'Incluya contexto del lote (surcos, altura del cultivo, referencia de tamaño)',
  'Time-stamp photos during the activity': 'Tome las fotos con marca de hora durante la labor',
  'Different angles prove the activity actually occurred':
    'Distintos ángulos comprueban que la labor realmente ocurrió',

  // ---- Chemical examples + tips ----
  'Chemical bottle/container label clearly visible':
    'Etiqueta del envase del producto claramente visible',
  'Chemical being mixed or prepared': 'Producto siendo mezclado o preparado',
  'Application equipment spraying in field': 'Equipo de aplicación pulverizando en el lote',
  'Field after application (wet/covered areas)':
    'Lote después de la aplicación (áreas mojadas o cubiertas)',
  'Active ingredient name and concentration visible':
    'Nombre del ingrediente activo y concentración visibles',
  'Chemical label must be clearly readable (brand, active ingredient)':
    'La etiqueta debe leerse con claridad (marca, ingrediente activo)',
  'Show container size for dosage verification':
    'Muestre el tamaño del envase para verificar la dosis',
  'Photo of application equipment being used strengthens verification':
    'Una foto del equipo de aplicación en uso refuerza la verificación',
  'Field condition after application shows completion':
    'El estado del lote tras la aplicación evidencia que se completó',

  // ---- General examples + tips ----
  'Activity being performed (people, tools, equipment visible)':
    'Labor en ejecución (personas, herramientas o equipos visibles)',
  'Activity location/context in farm setting': 'Ubicación y contexto de la labor en la finca',
  'Results of activity (before/after if applicable)':
    'Resultados de la labor (antes y después, si aplica)',
  'Equipment or tools being used': 'Equipos o herramientas en uso',
  'Team/workers involved in activity': 'Equipo de trabajo que participó en la labor',
  'Activity should be clearly identifiable in photos':
    'La labor debe identificarse con claridad en las fotos',
  'Include farm context (location, surroundings)':
    'Incluya contexto de la finca (ubicación, entorno)',
  'People or equipment in photo adds credibility':
    'Incluir personas o equipos en la foto aporta credibilidad',
  'Sequential photos show progression of work':
    'Las fotos secuenciales muestran el avance del trabajo',

  // ---- Equipment examples + tips ----
  'Equipment in operation (tractor, harvester, pump running)':
    'Equipo en operación (tractor, cosechadora, bomba funcionando)',
  'Equipment odometer/hour meter reading': 'Lectura del odómetro u horómetro del equipo',
  'Equipment maintenance or repair work': 'Mantenimiento o reparación del equipo',
  'Fuel being added to equipment': 'Carga de combustible al equipo',
  'Equipment on the farm (with identifying features)':
    'Equipo en la finca (con rasgos que lo identifiquen)',
  'Clear view of equipment type (brand, model visible)':
    'Vista clara del tipo de equipo (marca y modelo visibles)',
  'Operating photo: equipment actively doing work':
    'Foto en operación: el equipo realizando la labor',
  'Hour meter: photo of dashboard/display showing hours':
    'Horómetro: foto del tablero o pantalla mostrando las horas',
  'Odometer: clear reading of mileage': 'Odómetro: lectura clara del kilometraje',

  // ---- Soil examples + tips ----
  'Soil sample or soil testing being performed': 'Muestra de suelo o análisis en ejecución',
  'Soil condition (color, texture, structure visible)':
    'Estado del suelo (color, textura y estructura visibles)',
  'Soil testing equipment or kit': 'Equipo o kit de análisis de suelo',
  'Soil amendment materials being applied': 'Aplicación de enmiendas al suelo',
  'Before/after soil condition photos': 'Fotos del suelo antes y después',
  'Soil sample: include scale reference (hand, ruler)':
    'Muestra de suelo: incluya una referencia de escala (mano, regla)',
  'Testing: show equipment being used or results displayed':
    'Análisis: muestre el equipo en uso o los resultados a la vista',
  'Depth: indicate depth if relevant to testing':
    'Profundidad: indíquela si es relevante para el análisis',
  'Before/after: dramatically improves verification credibility':
    'Antes y después: mejora notablemente la credibilidad de la verificación',

  // ---- Pest examples + tips ----
  'Pest evidence (damage to crops, pest insects visible)':
    'Evidencia de plagas (daño al cultivo, insectos visibles)',
  'Traps or monitoring equipment in field': 'Trampas o equipos de monitoreo en el lote',
  'Pest identification (close-up of insect or disease)':
    'Identificación de la plaga (primer plano del insecto o la enfermedad)',
  'Scouting activity (person examining crops)':
    'Labor de monitoreo (persona revisando el cultivo)',
  'Treatment equipment or beneficial insects being released':
    'Equipo de tratamiento o liberación de insectos benéficos',
  'Pest damage: wide shot showing extent + close-up of damage':
    'Daño por plaga: toma amplia que muestre la extensión más un primer plano del daño',
  'Traps: show trap in field location with identifying context':
    'Trampas: muestre la trampa en su ubicación con contexto que la identifique',
  'Insects: macro/close-up photo of actual pest':
    'Insectos: foto macro o primer plano de la plaga real',
  'Scouting: person examining plants with farm context':
    'Monitoreo: persona revisando plantas con contexto de la finca',

  // ---- Business examples + tips ----
  'Certification document or certificate': 'Documento o certificado de certificación',
  'Inspection report or inspector on farm': 'Informe de inspección o inspector en la finca',
  'Compliance documentation being reviewed': 'Revisión de la documentación de cumplimiento',
  'Third-party verification official seal/stamp':
    'Sello oficial de verificación de terceros',
  'Certification agency representative at farm':
    'Representante de la agencia certificadora en la finca',
  'Document: certificate number and date clearly readable':
    'Documento: número y fecha del certificado claramente legibles',
  'Inspection: show inspector on farm or inspection documents':
    'Inspección: muestre al inspector en la finca o los documentos de inspección',
  'Agency stamp: official seal or verification mark visible':
    'Sello de la agencia: sello oficial o marca de verificación visible',
  'Recent dates: current certifications strengthen verification':
    'Fechas recientes: las certificaciones vigentes refuerzan la verificación',

  // ---- Per-subtype examples + tips ----
  'Seeding equipment actively planting (not parked)':
    'Sembradora sembrando activamente (no estacionada)',
  'Freshly planted rows showing seed spacing':
    'Surcos recién sembrados mostrando el espaciamiento de la semilla',
  'Close-up of seed placement in soil': 'Primer plano de la semilla colocada en el suelo',
  'Show seeding equipment actively working in the field':
    'Muestre la sembradora trabajando activamente en el lote',
  'Include wide shots of planted rows showing pattern':
    'Incluya tomas amplias de los surcos sembrados mostrando el patrón',
  'Harvester equipment actively collecting crops':
    'Cosechadora recolectando activamente el cultivo',
  'Harvested product in bins or containers': 'Producto cosechado en bines o contenedores',
  'Field condition during harvest showing crop maturity':
    'Estado del lote durante la cosecha mostrando la madurez del cultivo',
  'Capture harvester in operation, not parked':
    'Capture la cosechadora en operación, no estacionada',
  'Show harvested product quantity for yield verification':
    'Muestre la cantidad cosechada para verificar el rendimiento',
  'Irrigation system actively running (sprinklers, drip lines)':
    'Sistema de riego funcionando (aspersores, líneas de goteo)',
  'Water being applied to crops with visible moisture':
    'Agua aplicándose al cultivo con humedad visible',
  'Irrigation pump or control system showing operation':
    'Bomba o sistema de control de riego en operación',
  'Show water actively flowing or spraying':
    'Muestre el agua fluyendo o pulverizando activamente',
  'Include irrigation timer or pump hour meter if available':
    'Incluya el temporizador de riego o el horómetro de la bomba si está disponible',
  'Worker actively pruning or trimming plants': 'Trabajador podando activamente las plantas',
  'Before/after comparison showing pruned branches':
    'Comparación antes y después mostrando las ramas podadas',
  'Pruning tools and removed plant material':
    'Herramientas de poda y material vegetal retirado',
  'Before/after shots dramatically improve verification':
    'Las tomas antes y después mejoran notablemente la verificación',
  'Show removed branches/material to document work completion':
    'Muestre las ramas o el material retirado para documentar el trabajo terminado',
  'Seedlings being prepared for transplanting': 'Plántulas preparadas para el trasplante',
  'Worker transplanting plants with visible roots':
    'Trabajador trasplantando plantas con las raíces visibles',
  'Newly transplanted rows showing spacing pattern':
    'Surcos recién trasplantados mostrando el patrón de espaciamiento',
  'Show seedling root systems for transparency':
    'Muestre el sistema radicular de las plántulas para mayor transparencia',
  'Document transplanting technique and spacing':
    'Documente la técnica de trasplante y el espaciamiento',
  'Maintenance or repair work being performed on equipment':
    'Mantenimiento o reparación realizándose sobre el equipo',
  'Equipment hour meter or odometer reading clearly visible':
    'Lectura del horómetro u odómetro del equipo claramente visible',
  'Equipment in operation showing active use': 'Equipo en operación mostrando uso activo',
  'Hour meter readings provide strong verification':
    'Las lecturas del horómetro aportan una verificación sólida',
  'Show maintenance parts or fluids being replaced':
    'Muestre las piezas o los fluidos que se están reemplazando',

  // ---- toAchieveTier sentences (composed into the guidance line, one pair per event type) ----
  'One clear photo showing the weather impact (frost damage, hail damage, drought stress, etc.)':
    'Una foto clara del impacto climático (daño por helada, granizo, estrés hídrico, etc.)',
  '2+ photos from different angles showing the weather event and its impact on the farm':
    '2 o más fotos desde distintos ángulos que muestren el evento climático y su impacto en la finca',
  'One clear photo of the production activity (planting, harvesting, irrigation, etc.)':
    'Una foto clara de la labor de producción (siembra, cosecha, riego, etc.)',
  '2+ photos showing different stages or angles of the same production activity':
    '2 o más fotos que muestren distintas etapas o ángulos de la misma labor de producción',
  'One clear photo showing the chemical container/label or application in progress':
    'Una foto clara del envase o la etiqueta del producto, o de la aplicación en curso',
  '2+ photos: (1) chemical bottle with label visible, (2) application equipment in use or field after application':
    '2 o más fotos: (1) el envase con la etiqueta visible, (2) el equipo de aplicación en uso o el lote después de aplicar',
  'One photo clearly showing the activity being performed or its results':
    'Una foto que muestre con claridad la labor realizada o sus resultados',
  '2+ photos showing the activity from different angles or at different stages of completion':
    '2 o más fotos de la labor desde distintos ángulos o en distintas etapas de avance',
  'One photo showing the equipment being operated or maintained':
    'Una foto del equipo en operación o en mantenimiento',
  '2+ photos: (1) equipment in operation, (2) odometer/hour meter or maintenance detail':
    '2 o más fotos: (1) el equipo en operación, (2) el odómetro u horómetro o el detalle del mantenimiento',
  'One photo showing soil sample, soil testing, or soil condition':
    'Una foto de la muestra de suelo, el análisis o el estado del suelo',
  '2+ photos showing: (1) soil sample/testing activity, (2) testing results or soil condition detail':
    '2 o más fotos: (1) la toma de muestra o el análisis, (2) los resultados o el detalle del estado del suelo',
  'One photo showing pest evidence, trap, or scouting activity':
    'Una foto de la evidencia de plaga, la trampa o la labor de monitoreo',
  '2+ photos showing: (1) pest or pest damage, (2) monitoring/treatment equipment or beneficial insects':
    '2 o más fotos: (1) la plaga o su daño, (2) el equipo de monitoreo o tratamiento o los insectos benéficos',
  'One photo showing certification document, inspection report, or verification official':
    'Una foto del certificado, el informe de inspección o el funcionario verificador',
  '2+ photos showing: (1) certification document clearly visible, (2) verification official or agency stamp':
    '2 o más fotos: (1) el certificado claramente visible, (2) el funcionario verificador o el sello de la agencia'
};

/**
 * Map a photo-guidance string to es-419. Returns the input unchanged for any other locale, and
 * for any string without an entry — so a newly added upstream line degrades to English rather
 * than rendering an empty or broken value.
 */
export const localizePhotoGuidance = (value: string, locale: string): string => {
  if (!value || !locale.toLowerCase().startsWith('es')) return value;
  return PHOTO_GUIDANCE_ES[value] ?? value;
};
