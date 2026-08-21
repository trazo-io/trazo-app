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
  'What a credit represents depends on the scheme that issued it, which is why the scheme is named rather than the credit alone.':
    'Lo que representa un crédito depende del esquema que lo emitió, por eso se nombra el esquema y no solo el crédito.',
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
  'Thinning dates and volumes are on record, which is what lets a size grade be traced back to a decision in the orchard.':
    'Las fechas y volúmenes de raleo quedan registrados, y eso permite rastrear un calibre hasta una decisión tomada en el huerto.',
  'What was applied, where and when is on record for this crop.':
    'Qué se aplicó, dónde y cuándo queda registrado para este cultivo.',
  'Work on the soil was recorded for this block': 'Se registró trabajo sobre el suelo en este lote',
  'Organic matter was added to the soil': 'Se aplicó materia orgánica al suelo',
  'Animals eat the weeds and leave manure behind, which is weed control and fertiliser in one pass.':
    'Los animales comen las malezas y dejan estiércol, que es control de malezas y fertilización en una sola pasada.',
  'Structures and their locations are on record, so the habitat can be checked on the ground.':
    'Las estructuras y sus ubicaciones quedan registradas, así el hábitat puede verificarse en el terreno.',
  'Releases are recorded by species and date, so the approach can be followed across the season.':
    'Las liberaciones se registran por especie y fecha, así se puede seguir el enfoque a lo largo de la temporada.',
  'A counted threshold is the difference between treating because the numbers say so and treating on a hunch.':
    'Un umbral contado es la diferencia entre tratar porque los números lo indican y tratar por corazonada.',
  'The method used against the pest is on record, alongside the counts that prompted it.':
    'El método usado contra la plaga queda registrado, junto con los conteos que lo motivaron.',

  'A mineral amendment was applied to correct the soil':
    'Se aplicó una enmienda mineral para corregir el suelo',
  'Soil chemistry decides how much of what a farm applies the crop can actually take up.':
    'La química del suelo determina cuánto de lo que aplica la finca puede realmente absorber el cultivo.',
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

  'A heat wave crossed the block and the trees were checked afterwards':
    'Una ola de calor cruzó el lote y después se revisaron los árboles',
  'Extreme heat shows up later as smaller fruit or sunburn marks on the skin.':
    'El calor extremo se ve después como fruta más pequeña o marcas de quemadura de sol en la cáscara.',
  'Frost was recorded on the block and its effect on the crop assessed':
    'Se registró una helada en el lote y se evaluó su efecto en el cultivo',
  'Cold nights decide how much fruit sets, so this is the weather the crop actually grew in.':
    'Las noches frías determinan cuánta fruta cuaja, así que este es el clima en el que realmente creció el cultivo.',
  'Dry conditions were tracked across the season':
    'Se hizo seguimiento de las condiciones de sequía durante la temporada',
  'Water is the scarcest input in California agriculture, so what a crop needed in a dry year is worth knowing.':
    'El agua es el insumo más escaso de la agricultura de California, así que vale la pena saber cuánta necesitó un cultivo en un año seco.',
  'Conditions on the block were recorded that day':
    'Se registraron las condiciones del lote ese día',
  'Weather is the one thing a farm cannot control, and it is logged here beside everything it can.':
    'El clima es lo único que una finca no puede controlar, y queda registrado aquí junto a todo lo que sí puede.',
  'A third-party certification was recorded for this crop':
    'Se registró una certificación de tercera parte para este cultivo',
  'The certificate number is published here, so this is a claim a buyer can check rather than take on trust.':
    'El número de certificado se publica aquí, así que es una afirmación que un comprador puede verificar en lugar de aceptarla sin más.',

  'Beneficial insects were released into the block': 'Se liberaron insectos benéficos en el lote',
  'Predator insects do the work a spray would otherwise do, and they stay in the orchard afterwards.':
    'Los insectos depredadores hacen el trabajo que haría una fumigación, y además se quedan en el huerto.',

  'Branches were cut back to let light and air into the trees':
    'Se podaron ramas para dejar entrar luz y aire a los árboles',
  'The soil between the rows was cultivated to turn weeds under':
    'Se cultivó el suelo entre las filas para enterrar las malezas',
  'Weeds pulled under by a machine are weeds not sprayed: the same job done with steel instead of chemistry.':
    'Las malezas enterradas por una máquina son malezas que no se fumigaron: el mismo trabajo hecho con hierro en lugar de química.',
  'Some of the young fruit was taken off so the rest could size up':
    'Se retiró parte de la fruta joven para que el resto pudiera crecer',
  'Thinning is why the fruit is the size it is. Fewer per branch means more of everything for each one.':
    'El raleo es la razón del tamaño de la fruta: menos por rama significa más de todo para cada una.',
  'Wind machines, heaters or sprinklers ran through a cold night to hold frost off the crop':
    'Máquinas de viento, calefactores o aspersores funcionaron toda una noche fría para evitar la helada en el cultivo',
  'Without that night of work there would be no fruit from this block at all.':
    'Sin esa noche de trabajo no habría nada de fruta de este lote.',
  'Livestock were grazed through the block to eat down the cover crop':
    'Se pastoreó ganado en el lote para consumir el cultivo de cobertura',
  'The pest was identified before any decision about treating it':
    'Se identificó la plaga antes de decidir cualquier tratamiento',
  'Knowing exactly which insect is present is what makes a targeted response possible instead of a broad one.':
    'Saber exactamente qué insecto está presente es lo que permite una respuesta dirigida en lugar de una general.',
  'Compost or manure was spread and worked into the ground':
    'Se esparció compost o estiércol y se incorporó al terreno',
  'Feeding the soil itself, rather than only the plant, is the slower and more durable way to keep ground productive.':
    'Alimentar al suelo mismo, y no solo a la planta, es la forma más lenta y más duradera de mantener la tierra productiva.',

  'Nurseries and varieties are logged before anything is in the ground, so the record starts on day one rather than at harvest.':
    'Los viveros y las variedades se registran antes de plantar, así el registro empieza el primer día y no en la cosecha.',

  // Short/impact split (2026-08-01 editorial review): 9 subtypes said the same sentence
  // twice — title line and green 'why' box were paraphrases. Short = what happened,
  // impact = why it matters to the person holding the food.
  'Hail hit the block and the damage was assessed':
    'El granizo golpeó el lote y se evaluaron los daños',
  'Hail leaves marks and smaller fruit rather than a safety problem, and the farm logged the storm instead of quietly dropping it.':
    'El granizo deja marcas y fruta más pequeña, no un problema de inocuidad, y la finca registró la tormenta en lugar de omitirla en silencio.',
  'High winds crossed the block and the crop was checked for damage afterwards':
    'Vientos fuertes cruzaron el lote y después se revisó el cultivo en busca de daños',
  'A rough weather day is in this record rather than left out of it, so you are seeing the season as it actually went.':
    'Un día de mal tiempo está en este registro en lugar de quedar fuera: estás viendo la temporada tal como ocurrió.',
  'The orchard floor was mown between the tree rows':
    'Se cortó la cubierta del suelo entre las filas de árboles',
  'Cutting ground cover is mechanical weed control, and it leaves a clean surface for fruit that is picked up off the floor.':
    'Cortar la cubierta vegetal es control mecánico de malezas y deja una superficie limpia para la fruta que se recoge del suelo.',
  'Lime or sulfur was worked into the ground to correct the soil pH':
    'Se incorporó cal o azufre al terreno para corregir el pH del suelo',
  'Soil at the right pH releases nutrients the crop can actually take up, so less fertilizer is needed to feed it.':
    'Un suelo con el pH correcto libera nutrientes que el cultivo sí puede absorber, así que hace falta menos fertilizante para alimentarlo',
  'The ground was worked to prepare a seedbed':
    'Se trabajó el terreno para preparar la cama de siembra',
  'How often soil gets turned is one of the things that decides whether it stays put, so each pass is logged rather than left unrecorded.':
    'La frecuencia con la que se remueve el suelo es uno de los factores que determina si se mantiene en su lugar, por eso cada pasada queda registrada.',
  'Hedgerows, flowering strips and living groundcover were planted along the field edges':
    'Se plantaron setos, franjas florales y cubierta vegetal viva en los bordes del lote',
  'Field edges left in permanent planting are acres the farm chose not to crop, kept for the insects and birds instead.':
    'Un hábitat permanente como este atrae a los insectos y aves que se comen las plagas del cultivo: control de plagas que no requiere aplicar ningún producto.',
  'Owl and songbird boxes, raptor perches and native-bee blocks were installed around the block':
    'Se instalaron cajas para lechuzas y aves canoras, perchas para rapaces y bloques para abejas nativas alrededor del lote',
  'Habitat is a long-term commitment rather than a one-off treatment. The owls and bees stay, so it keeps working season after season.':
    'La fauna que vive todo el año en la finca hace parte del control de plagas y de la polinización.',
  'Pest traps around the block were checked and the counts written down':
    'Se revisaron las trampas de plagas del lote y se anotaron los conteos',
  'Counting first is what lets a farm treat only when the numbers call for it, instead of on a fixed calendar.':
    'Contar primero es lo que permite tratar solo cuando los números lo justifican, en lugar de seguir un calendario fijo.',
  'Several pest-control methods were used together rather than relying on one':
    'Se combinaron varios métodos de control de plagas en lugar de depender de uno solo',
  'Mixing traps, beneficial insects and targeted treatment is what stops pests building resistance to any single product.':
    'Combinar trampas, insectos benéficos y tratamientos dirigidos es lo que evita que las plagas generen resistencia a un solo producto.',

  'A cover crop feeds the soil and crowds out weeds, which reduces the need to spray or cultivate for them.':
    'Un cultivo de cobertura alimenta el suelo y desplaza a las malezas, lo que reduce la necesidad de aplicar productos o laborear para controlarlas.',
  'A cover crop was sown between the rows': 'Se sembró un cultivo de cobertura entre las hileras',
  'A farm activity recorded as part of this crop’s history':
    'Una actividad agrícola registrada como parte del historial de este cultivo',
  'A lab measured what the soil actually needed, so nutrients were added on evidence rather than habit.':
    'Un laboratorio midió lo que el suelo realmente necesitaba, así que los nutrientes se aplicaron con evidencia y no por costumbre.',
  'A soil sample was sent to a lab': 'Se envió una muestra de suelo a un laboratorio',
  'A treatment was applied against a plant disease':
    'Se aplicó un tratamiento contra una enfermedad de la planta',
  'A treatment was applied against a specific pest':
    'Se aplicó un tratamiento contra una plaga específica',
  'Agricultural Activity': 'Actividad agrícola',
  'Agricultural activity completed as part of sustainable farming':
    'Actividad agrícola completada como parte de la agricultura sostenible',
  'Agricultural equipment operation with transparent operational tracking':
    'Operación de equipo agrícola con seguimiento operativo transparente',
  'Agricultural operation completed on the farm': 'Operación agrícola completada en la finca',
  'Agricultural practice completed as part of sustainable farming':
    'Práctica agrícola completada como parte de la agricultura sostenible',
  'An open canopy dries faster after rain, so the fruit needs less spraying to stay healthy.':
    'Una copa abierta se seca más rápido después de la lluvia, así que la fruta necesita menos aplicaciones para mantenerse sana.',
  'Applied integrated pest management strategy combining multiple sustainable control methods':
    'Se aplicó una estrategia de manejo integrado de plagas combinando múltiples métodos de control sostenibles',
  'Applied professional pest control to protect plants from harmful insects':
    'Se aplicó un control profesional de plagas para proteger las plantas de insectos dañinos',
  'Applied sustainable pest management practices to protect crop health':
    'Se aplicaron prácticas sostenibles de manejo de plagas para proteger la salud del cultivo',
  'Beneficial Release': 'Liberación de insectos benéficos',
  'Business Activity': 'Actividad comercial',
  'Business activity enhancing agricultural transparency and sustainability':
    'Actividad comercial que mejora la transparencia y la sostenibilidad agrícola',
  'Business activity supporting sustainable agricultural operations':
    'Actividad comercial que respalda operaciones agrícolas sostenibles',
  'Calibrated equipment prevents over-application, which means less input used and less chance of drift beyond the field.':
    'Un equipo calibrado evita la sobreaplicación, lo que significa menos insumo usado y menos posibilidad de deriva fuera del lote.',
  'Canopy Management': 'Manejo de la copa',
  'Carbon credit generation and transaction supporting environmental sustainability':
    'Generación y transacción de créditos de carbono que respalda la sostenibilidad ambiental',
  'Carefully processed after harvest to ensure quality and freshness':
    'Procesado cuidadosamente después de la cosecha para garantizar calidad y frescura',
  'Certification Event': 'Evento de certificación',
  'Certification means an accredited body reviewed this farm against a published standard and renews that review on a schedule.':
    'La certificación significa que un organismo acreditado evaluó esta finca conforme a una norma publicada y renueva esa evaluación periódicamente.',
  'Certifications are re-checked on a schedule, so they reflect an ongoing review rather than a one-time claim.':
    'Las certificaciones se vuelven a revisar periódicamente, por lo que reflejan una evaluación continua y no una declaración única.',
  'Checked monitoring traps to track pest populations and identify early warning signs':
    'Se revisaron las trampas de monitoreo para rastrear poblaciones de plagas e identificar señales tempranas de alerta',
  'Cleaning shared equipment between fields is what keeps an organic block organic, and the step is documented rather than assumed.':
    'Limpiar el equipo compartido entre lotes es lo que mantiene orgánico un lote orgánico, y el paso queda documentado en lugar de darse por supuesto.',
  'Completed general farming activity as part of farm operations':
    'Se completó una actividad agrícola general como parte de las operaciones de la finca',
  'Compliance Activity': 'Actividad de cumplimiento',
  'Compliance Activity: Certification': 'Actividad de cumplimiento: Certificación',
  'Compliance with environmental regulations and agricultural safety standards':
    'Cumplimiento de las regulaciones ambientales y las normas de seguridad agrícola',
  'Compost feeds the soil this crop grows in, rather than feeding the plant directly.':
    'El compost alimenta el suelo en el que crece este cultivo, en lugar de alimentar directamente a la planta.',
  'Compost was spread on the block': 'Se esparció compost en el lote',
  'Composting Operation': 'Operación de compostaje',
  'Composting turns orchard waste back into soil, and the organic matter it adds helps the ground hold water.':
    'El compostaje convierte los residuos del huerto nuevamente en suelo, y la materia orgánica que aporta ayuda a que la tierra retenga agua.',
  'Comprehensive audit ensuring environmental and social sustainability standards':
    'Auditoría integral que garantiza normas de sostenibilidad ambiental y social',
  'Comprehensive soil analysis to optimize growing conditions and ensure healthy crop development':
    'Análisis integral del suelo para optimizar las condiciones de cultivo y asegurar un desarrollo saludable del cultivo',
  'Conducted precision agriculture activities for data-driven farming':
    'Se realizaron actividades de agricultura de precisión para una agricultura basada en datos',
  'Conducted training activities to improve farming knowledge and skills':
    'Se realizaron actividades de capacitación para mejorar el conocimiento y las habilidades agrícolas',
  'Consumer transparency initiative providing visibility into agricultural practices':
    'Iniciativa de transparencia para el consumidor que brinda visibilidad de las prácticas agrícolas',
  'Coordinated team activities and planning sessions':
    'Se coordinaron actividades de equipo y sesiones de planificación',
  'Copper is one of the few disease treatments allowed on certified organic farms, and it was used here against a specific disease.':
    'El cobre es uno de los pocos tratamientos contra enfermedades permitidos en fincas orgánicas certificadas, y aquí se usó contra una enfermedad específica.',
  'Copper is tightly limited under organic rules because it builds up in soil, so the amount and timing are recorded.':
    'El cobre está muy limitado bajo las normas orgánicas porque se acumula en el suelo, por eso se registran la cantidad y el momento de aplicación.',
  'Cover Crop Management': 'Manejo de cultivos de cobertura',
  'Cover crop implementation to protect soil, prevent erosion, and enhance soil organic matter':
    'Implementación de cultivos de cobertura para proteger el suelo, prevenir la erosión y aumentar la materia orgánica del suelo',
  'Crops harvested at optimal ripeness and quality':
    'Cultivos cosechados en su punto óptimo de madurez y calidad',
  'Crops harvested at peak ripeness for maximum quality and nutrition':
    'Cultivos cosechados en su máxima madurez para obtener la mejor calidad y nutrición',
  Cultivation: 'Laboreo del suelo',
  'Documented farming practices for transparency and compliance':
    'Prácticas agrícolas documentadas para transparencia y cumplimiento',
  'Documented fuel consumption for field operations with transparent tracking of equipment efficiency':
    'Consumo de combustible documentado para operaciones de campo con seguimiento transparente de la eficiencia del equipo',
  'Drought Monitoring': 'Monitoreo de sequía',
  'Drought conditions tracked to optimize water management and assess crop water stress levels':
    'Condiciones de sequía registradas para optimizar el manejo del agua y evaluar los niveles de estrés hídrico del cultivo',
  'Emergency breakdown response and troubleshooting to restore equipment functionality':
    'Respuesta a averías de emergencia y diagnóstico para restablecer el funcionamiento del equipo',
  'Engaged with the community through farm tours and outreach':
    'Se interactuó con la comunidad mediante recorridos por la finca y actividades de divulgación',
  'Enhanced soil health through organic matter incorporation for improved fertility and structure':
    'Mejora de la salud del suelo mediante la incorporación de materia orgánica para una mejor fertilidad y estructura',
  'Environmental monitoring practice following sustainable agriculture principles':
    'Práctica de monitoreo ambiental que sigue los principios de la agricultura sostenible',
  'Equipment Maintenance': 'Mantenimiento de equipos',
  'Equipment Operation': 'Operación de equipos',
  'Equipment maintenance and service activities to ensure optimal operational efficiency':
    'Actividades de mantenimiento y servicio de equipos para asegurar una eficiencia operativa óptima',
  'Equipment operation completed as part of farm activities':
    'Operación de equipo completada como parte de las actividades de la finca',
  'Equipment operation following sustainable farming practices':
    'Operación de equipo que sigue prácticas agrícolas sostenibles',
  'Equipment repair operations to restore functionality and maintain operational efficiency':
    'Operaciones de reparación de equipos para restablecer el funcionamiento y mantener la eficiencia operativa',
  'Equipment that is maintained and calibrated uses less fuel and applies less product to do the same job.':
    'Un equipo mantenido y calibrado consume menos combustible y aplica menos producto para hacer el mismo trabajo.',
  'Equipment was cleaned before it touched this crop, so nothing carried over from another field.':
    'Se limpió el equipo antes de que tocara este cultivo, para que no se arrastrara nada de otro lote.',
  'Evaluated pest population levels against economic thresholds to determine treatment needs':
    'Se evaluaron los niveles de población de plagas frente a umbrales económicos para determinar la necesidad de tratamiento',
  'Farm equipment operation following best practices':
    'Operación de equipo agrícola siguiendo las mejores prácticas',
  'Farm equipment used and maintained for optimal performance':
    'Equipo agrícola utilizado y mantenido para un rendimiento óptimo',
  'Farm equipment used and maintained for optimal performance and efficiency':
    'Equipo agrícola utilizado y mantenido para un rendimiento y una eficiencia óptimos',
  'Farm equipment was serviced and kept in working order for the season.':
    'Se dio mantenimiento al equipo agrícola para mantenerlo en buen estado durante la temporada.',
  'Farm machinery was kept in working order so it applies inputs accurately and does not leak or spill in the field.':
    'Se mantuvo la maquinaria agrícola en buen estado para que aplique los insumos con precisión y no gotee ni derrame en el campo.',
  'Farm management activity following operational best practices':
    'Actividad de gestión agrícola que sigue las mejores prácticas operativas',
  'Frost Event': 'Evento de helada',
  'Frost Protection': 'Protección contra heladas',
  'Frost conditions monitored and documented to assess impact on crop health and implement protective measures':
    'Condiciones de heladas monitoreadas y documentadas para evaluar el impacto en la salud del cultivo e implementar medidas de protección',
  'Fruit or plant thinning to improve size and quality':
    'Raleo de frutos o plantas para mejorar el tamaño y la calidad',
  'Fruit or plant thinning to improve size, quality, and overall crop health':
    'Raleo de frutos o plantas para mejorar el tamaño, la calidad y la salud general del cultivo',
  'General Farm Activity': 'Actividad agrícola general',
  'General agricultural activity completed as part of farm operations':
    'Actividad agrícola general completada como parte de las operaciones de la finca',
  'Grazing Management': 'Manejo del pastoreo',
  'Habitat Development': 'Desarrollo de hábitat',
  'Hail Damage Assessment': 'Evaluación de daños por granizo',
  'Hail event documented with damage assessment to inform crop protection and recovery strategies':
    'Evento de granizo documentado con evaluación de daños para orientar la protección del cultivo y las estrategias de recuperación',
  'Harvest Operation': 'Operación de cosecha',
  'Heat Stress Monitoring': 'Monitoreo de estrés por calor',
  'High Humidity Monitoring': 'Monitoreo de humedad alta',
  'High Winds Event': 'Evento de vientos fuertes',
  'High humidity conditions tracked to prevent disease development and optimize growing conditions':
    'Condiciones de alta humedad registradas para prevenir el desarrollo de enfermedades y optimizar las condiciones de cultivo',
  'High temperature conditions monitored to protect crops and implement cooling strategies':
    'Condiciones de alta temperatura monitoreadas para proteger los cultivos e implementar estrategias de enfriamiento',
  'High wind conditions monitored and documented to assess crop damage and implement protective measures':
    'Condiciones de viento fuerte monitoreadas y documentadas para evaluar daños al cultivo e implementar medidas de protección',
  'IPM Implementation': 'Implementación de manejo integrado de plagas (MIP)',
  'Identified pest species to develop targeted management strategies':
    'Se identificaron especies de plagas para desarrollar estrategias de manejo específicas',
  'Independent verification of sustainable farming practices and transparency claims':
    'Verificación independiente de prácticas agrícolas sostenibles y declaraciones de transparencia',
  'Inspected farm facilities and equipment for safety compliance':
    'Se inspeccionaron las instalaciones y el equipo de la finca para cumplir con las normas de seguridad',
  'Inspection Process': 'Proceso de inspección',
  'Inspection Process: Certification': 'Proceso de inspección: Certificación',
  'Irrigation Operation': 'Operación de riego',
  'Living roots hold the soil between harvests, so the ground this crop grows in stays put over winter.':
    'Las raíces vivas sostienen el suelo entre cosechas, así la tierra en la que crece este cultivo no se pierde durante el invierno.',
  'Low Humidity Monitoring': 'Monitoreo de humedad baja',
  'Low humidity conditions monitored to assess plant stress and adjust irrigation strategies':
    'Condiciones de baja humedad monitoreadas para evaluar el estrés de las plantas y ajustar las estrategias de riego',
  'Maintained farm infrastructure and equipment for optimal operations':
    'Se mantuvo la infraestructura y el equipo de la finca para operaciones óptimas',
  'Managed pollinators placed to support crop growth, a natural, zero-emission process':
    'Polinizadores manejados ubicados para favorecer el crecimiento del cultivo, un proceso natural y sin emisiones',
  'Mechanical cultivation for weed control and soil aeration':
    'Cultivo mecánico para el control de malezas y la aireación del suelo',
  'Mechanical cultivation for weed control and soil aeration to optimize crop growth':
    'Cultivo mecánico para el control de malezas y la aireación del suelo para optimizar el crecimiento del cultivo',
  'Monitored crops for pest populations and damage levels to inform management decisions':
    'Se monitorearon los cultivos para detectar poblaciones de plagas y niveles de daño para orientar las decisiones de manejo',
  'Mowing / Orchard-Floor': 'Siega / manejo del suelo del huerto',
  'New plants went into the ground': 'Se plantaron nuevas plantas en el terreno',
  'Nutrients were applied to feed the crop': 'Se aplicaron nutrientes para alimentar el cultivo',
  'Orchard floor mowed or managed to support soil health and clean harvest conditions':
    'Piso del huerto segado o manejado para favorecer la salud del suelo y condiciones de cosecha limpias',
  'Organic Matter Addition': 'Incorporación de materia orgánica',
  'Organic certification traces a crop back to what was planted, so the planting record is the first link in that chain.':
    'La certificación orgánica rastrea un cultivo hasta lo que se plantó, así que el registro de siembra es el primer eslabón de esa cadena.',
  'Part of responsible farming practices that support environmental stewardship and long-term agricultural sustainability.':
    'Parte de prácticas agrícolas responsables que apoyan el cuidado ambiental y la sostenibilidad agrícola a largo plazo.',
  'Pest Identification': 'Identificación de plagas',
  'Pest Scouting': 'Monitoreo de plagas',
  'Planned and organized farming activities for optimal productivity':
    'Se planificaron y organizaron las actividades agrícolas para una productividad óptima',
  Planting: 'Siembra',
  'Plants pruned to optimize growth and fruit quality':
    'Plantas podadas para optimizar el crecimiento y la calidad de la fruta',
  Pollination: 'Polinización',
  'Post-Harvest Processing': 'Procesamiento poscosecha',
  'Precision calibration activities to ensure accurate equipment operation and optimal performance':
    'Actividades de calibración de precisión para asegurar una operación exacta del equipo y un rendimiento óptimo',
  'Precision nutrient management reduces waste and environmental impact while ensuring healthy crops.':
    'El manejo preciso de nutrientes reduce el desperdicio y el impacto ambiental, y mantiene cultivos sanos.',
  'Preventive maintenance activities to ensure optimal equipment performance and longevity':
    'Actividades de mantenimiento preventivo para asegurar un rendimiento óptimo y la durabilidad del equipo',
  'Professional agricultural treatment applied according to sustainable farming practices':
    'Tratamiento agrícola profesional aplicado según prácticas de agricultura sostenible',
  'Pruning Operation': 'Operación de poda',
  'Prunings are chipped back onto the orchard floor, returning the material to the soil instead of hauling it away.':
    'Los restos de poda se trituran y se devuelven al suelo del huerto, en lugar de retirarlos del campo.',
  'Recording the date, volume and grade is what lets a batch be traced back to one block and one week.':
    'Registrar la fecha, el volumen y la categoría es lo que permite rastrear un lote hasta una parcela y una semana concretas.',
  'Recording the product and the rate is what makes over-application visible rather than invisible.':
    'Registrar el producto y la dosis es lo que hace visible una sobreaplicación en vez de invisible.',
  'Recording the source and method makes water use checkable instead of assumed.':
    'Registrar la fuente y el método hace que el uso del agua sea verificable en lugar de supuesto.',
  'Recording the target pest shows the treatment answered a specific problem rather than a calendar.':
    'Registrar la plaga objetivo muestra que el tratamiento respondió a un problema concreto y no a un calendario.',
  'Recording what was used on weeds, and where, is what makes the choice checkable.':
    'Registrar qué se usó contra las malezas, y dónde, es lo que hace verificable esa decisión.',
  'Released beneficial insects to naturally control pest populations using biological methods':
    'Se liberaron insectos benéficos para controlar de forma natural las poblaciones de plagas mediante métodos biológicos',
  'Responded to emergency conditions with cleanup and damage repair':
    'Se respondió a condiciones de emergencia con limpieza y reparación de daños',
  'Seeds or seedlings planted with precision for optimal growth conditions':
    'Semillas o plántulas sembradas con precisión para condiciones óptimas de crecimiento',
  'Seeds planted to establish healthy crop growth':
    'Semillas sembradas para establecer un crecimiento saludable del cultivo',
  'Soil Testing & Analysis': 'Análisis de suelo',
  'Soil management activity supporting healthy growing conditions and sustainable farming practices':
    'Actividad de manejo del suelo que favorece condiciones de cultivo saludables y prácticas agrícolas sostenibles',
  'Soil management supporting sustainable farming practices':
    'Manejo del suelo que respalda prácticas agrícolas sostenibles',
  'Soil pH optimization to improve nutrient availability and support healthy plant growth':
    'Optimización del pH del suelo para mejorar la disponibilidad de nutrientes y favorecer un crecimiento saludable de las plantas',
  'Spray equipment was calibrated so each application lands where it should, in the amount intended.':
    'Se calibró el equipo de aplicación para que cada aplicación llegue donde debe, en la cantidad prevista.',
  'Storage and handling operations with complete documentation of equipment usage':
    'Operaciones de almacenamiento y manipulación con documentación completa del uso del equipo',
  'Storm & Wind Event': 'Evento de tormenta y viento',
  'Storm conditions and wind damage assessed to evaluate crop impact and recovery needs':
    'Condiciones de tormenta y daños por viento evaluados para determinar el impacto en el cultivo y las necesidades de recuperación',
  'Strategic pruning to improve plant health, air circulation, and fruit quality':
    'Poda estratégica para mejorar la salud de la planta, la circulación de aire y la calidad de la fruta',
  'Strategic soil cultivation for optimal seed bed preparation and crop establishment':
    'Cultivo estratégico del suelo para una preparación óptima de la cama de siembra y el establecimiento del cultivo',
  'Sustainable agricultural practice following industry best practices':
    'Práctica agrícola sostenible que sigue las mejores prácticas del sector',
  'Sustainable compost application to enrich soil fertility and promote beneficial microbial activity':
    'Aplicación sostenible de compost para enriquecer la fertilidad del suelo y promover la actividad microbiana benéfica',
  'Sustainable farming practice following industry best practices':
    'Práctica agrícola sostenible que sigue las mejores prácticas del sector',
  'Sustainable pest management practice following integrated pest management principles':
    'Práctica sostenible de manejo de plagas que sigue los principios del manejo integrado de plagas',
  'Systematic equipment inspection to ensure safety standards and operational readiness':
    'Inspección sistemática del equipo para asegurar las normas de seguridad y la disponibilidad operativa',
  Thinning: 'Raleo de frutos',
  'Testing before feeding means only what the soil is short of gets added.':
    'Analizar antes de fertilizar significa que solo se agrega aquello de lo que el suelo carece.',
  'The block was irrigated, from a recorded water source':
    'Se regó el lote, desde una fuente de agua registrada',
  'The crop was picked, weighed and graded': 'Se cosechó, pesó y clasificó el cultivo',
  'The farm logged work on its equipment as part of this crop’s record.':
    'La finca registró trabajos en su maquinaria como parte del historial de este cultivo.',
  'The trees were pruned to open up the canopy': 'Se podaron los árboles para abrir la copa',
  'The variety and the source of the planting stock are on record from this crop’s first day.':
    'La variedad y el origen del material de plantación quedan registrados desde el primer día de este cultivo.',
  'Third-party certification validating sustainable farming practices and product quality':
    'Certificación de terceros que valida prácticas agrícolas sostenibles y la calidad del producto',
  'This farming practice contributes to sustainable agriculture and food quality.':
    'Esta práctica agrícola contribuye a la agricultura sostenible y la calidad de los alimentos.',
  'This is a synthetic weedkiller. It is not permitted on certified organic ground, and the date and area treated are recorded.':
    'Este es un herbicida sintético. No está permitido en terreno orgánico certificado, y se registran la fecha y el área tratada.',
  'Threshold Assessment': 'Evaluación de umbral de acción',
  'Tillage Implementation': 'Labranza del suelo',
  'Transplanting Operation': 'Operación de trasplante',
  'Transplanting seedlings or plants to their permanent growing location':
    'Trasplante de plántulas o plantas a su ubicación de cultivo definitiva',
  'Transportation and logistics operations with documented fuel usage and efficiency tracking':
    'Operaciones de transporte y logística con uso de combustible documentado y seguimiento de la eficiencia',
  'Trap Monitoring': 'Monitoreo con trampas',
  'Treating a known disease early generally takes less product than treating an outbreak later.':
    'Tratar una enfermedad conocida a tiempo suele requerir menos producto que tratar un brote más adelante.',
  'Vine or tree canopy shaped for optimal fruit development and quality':
    'Copa de la vid o del árbol moldeada para un desarrollo y una calidad óptimos de la fruta',
  'Water applied to support healthy plant growth':
    'Se aplicó agua para favorecer un crecimiento saludable de las plantas',
  'Water applied to support healthy plant growth and optimal soil moisture':
    'Se aplicó agua para favorecer un crecimiento saludable de las plantas y una humedad óptima del suelo',
  'Weather conditions monitored to assess environmental impact on crop growth and development':
    'Condiciones meteorológicas monitoreadas para evaluar el impacto ambiental en el crecimiento y desarrollo del cultivo',

  // eventDescriptions map values (short descriptions shown on every card)
  'Applied agricultural treatment as part of integrated crop management program':
    'Se aplicó un tratamiento agrícola como parte de un programa de manejo integrado del cultivo',
  'Applied disease prevention treatment to protect plants from fungal infections':
    'Se aplicó un tratamiento de prevención de enfermedades para proteger las plantas de infecciones fúngicas',
  'Applied nutrients to support healthy plant growth and soil fertility':
    'Se aplicaron nutrientes para favorecer un crecimiento saludable de las plantas y la fertilidad del suelo',
  'Applied targeted pest control to protect plants from harmful insects':
    'Se aplicó un control de plagas dirigido para proteger las plantas de insectos dañinos',
  'Applied weed control to manage competing vegetation and protect crop health':
    'Se aplicó un control de malezas para manejar la vegetación competidora y proteger la salud del cultivo',
  'Completed agricultural activity as part of sustainable farming practices':
    'Actividad agrícola completada como parte de prácticas agrícolas sostenibles',
  'Configured and prepared equipment for farming activities':
    'Se configuró y preparó el equipo para las actividades agrícolas',
  'Harvested mature crops at optimal quality and freshness':
    'Se cosecharon cultivos maduros con calidad y frescura óptimas',
  'Improved farm infrastructure and facility maintenance':
    'Se mejoró la infraestructura de la finca y el mantenimiento de las instalaciones',
  'Maintained farming equipment for efficient operations':
    'Se mantuvo el equipo agrícola para operaciones eficientes',
  'Monitored for pests to inform protection strategies':
    'Se monitorearon las plagas para orientar las estrategias de protección',
  'Monitored weather conditions to inform farming decisions':
    'Se monitorearon las condiciones meteorológicas para orientar las decisiones agrícolas',
  'Performed general maintenance activities to ensure farm operations':
    'Se realizaron actividades de mantenimiento general para asegurar las operaciones de la finca',
  'Planted seeds or seedlings to establish the crop':
    'Se sembraron semillas o plántulas para establecer el cultivo',
  'Prepared soil for optimal growing conditions':
    'Se preparó el suelo para condiciones óptimas de cultivo',
  'Provided water to ensure optimal plant growth and health':
    'Se suministró agua para asegurar un crecimiento y una salud óptimos de las plantas',

  // Static consumerImpact / sustainabilityBenefit assigned inside type branches
  'Active participation in carbon reduction programs supporting climate goals with transparent verification':
    'Participación activa en programas de reducción de carbono que respaldan objetivos climáticos con verificación transparente',
  'Agricultural outreach promotes understanding of sustainable farming and supports local community resilience.':
    'La divulgación agrícola promueve la comprensión de la agricultura sostenible y fortalece la resiliencia de la comunidad local.',
  'Biological pest control builds sustainable farming systems that work with nature to maintain crop health and biodiversity.':
    'El control biológico de plagas construye sistemas agrícolas sostenibles que trabajan con la naturaleza para mantener la salud del cultivo y la biodiversidad.',
  'Climate-adaptive farming practices help crops thrive despite changing weather patterns.':
    'Las prácticas agrícolas adaptadas al clima ayudan a que los cultivos prosperen a pesar de los patrones climáticos cambiantes.',
  'Collaborative planning promotes best practices and continuous improvement in farming operations.':
    'La planificación colaborativa promueve las mejores prácticas y la mejora continua en las operaciones agrícolas.',
  'Community engagement builds connections between farmers and consumers, strengthening local food systems.':
    'La participación de la comunidad crea vínculos entre agricultores y consumidores, fortaleciendo los sistemas alimentarios locales.',
  'Composting recycles organic materials, reduces waste, and builds soil fertility through sustainable practices.':
    'El compostaje recicla materiales orgánicos, reduce los residuos y construye la fertilidad del suelo mediante prácticas sostenibles.',
  'Comprehensive planning reduces waste, optimizes inputs, and supports sustainable farming decision-making.':
    'La planificación integral reduce los residuos, optimiza los insumos y respalda la toma de decisiones agrícolas sostenibles.',
  'Contributing to sustainable agriculture and environmental stewardship':
    'Contribuye a la agricultura sostenible y al cuidado del medio ambiente',
  'Copper fungicide prevents plant diseases that could affect crop quality and yield, ensuring healthy produce.':
    'El fungicida de cobre previene enfermedades de las plantas que podrían afectar la calidad y el rendimiento del cultivo, asegurando productos saludables.',
  'Cover crops prevent soil erosion, suppress weeds, and improve soil structure while reducing input requirements.':
    'Los cultivos de cobertura previenen la erosión del suelo, suprimen las malezas y mejoran la estructura del suelo a la vez que reducen la necesidad de insumos.',
  'Data-driven farming reduces input waste, targets treatments precisely, and supports sustainable resource management.':
    'La agricultura basada en datos reduce el desperdicio de insumos, dirige los tratamientos con precisión y respalda el manejo sostenible de los recursos.',
  'Detailed farm documentation provides transparency and traceability that builds consumer trust in food production.':
    'La documentación detallada de la finca brinda transparencia y trazabilidad que generan la confianza del consumidor en la producción de alimentos.',
  'Disease prevention protects crop yields and reduces agricultural waste.':
    'La prevención de enfermedades protege el rendimiento del cultivo y reduce el desperdicio agrícola.',
  'Disease prevention reduces crop losses and food waste, contributing to more efficient resource use.':
    'La prevención de enfermedades reduce las pérdidas de cultivo y el desperdicio de alimentos, contribuyendo a un uso más eficiente de los recursos.',
  'Disease prevention through environmental monitoring reduces the need for chemical treatments.':
    'La prevención de enfermedades mediante el monitoreo ambiental reduce la necesidad de tratamientos químicos.',
  'Documented equipment operations demonstrate transparent farming practices and operational efficiency.':
    'Las operaciones de equipo documentadas demuestran prácticas agrícolas transparentes y eficiencia operativa.',
  'Documented soil management demonstrates commitment to soil health and environmental stewardship.':
    'El manejo del suelo documentado demuestra el compromiso con la salud del suelo y el cuidado del medio ambiente.',
  'Drought monitoring ensures water resources are used efficiently while maintaining crop health and quality.':
    'El monitoreo de la sequía asegura que los recursos hídricos se usen de forma eficiente mientras se mantiene la salud y la calidad del cultivo.',
  'Economic threshold-based decisions prevent overtreatment, reducing environmental impact while maintaining profitable farming.':
    'Las decisiones basadas en umbrales económicos evitan el tratamiento excesivo, reduciendo el impacto ambiental a la vez que mantienen una agricultura rentable.',
  'Effective weed control supports healthy crop growth and optimal resource utilization.':
    'El control eficaz de malezas favorece un crecimiento saludable del cultivo y un uso óptimo de los recursos.',
  'Efficient water management during dry conditions helps conserve water resources.':
    'El manejo eficiente del agua durante las condiciones secas ayuda a conservar los recursos hídricos.',
  'Environmental conditions are closely monitored to ensure optimal crop management and food quality.':
    'Las condiciones ambientales se monitorean de cerca para asegurar un manejo óptimo del cultivo y la calidad de los alimentos.',
  'Frost protection measures help preserve crop quality and prevent damage that could affect harvest yields.':
    'Las medidas de protección contra heladas ayudan a preservar la calidad del cultivo y a prevenir daños que podrían afectar los rendimientos de la cosecha.',
  'Fungicide treatment prevents plant diseases that could compromise food quality and safety.':
    'El tratamiento con fungicida previene enfermedades de las plantas que podrían comprometer la calidad y la inocuidad de los alimentos.',
  'Heat stress management protects crops during extreme temperatures to maintain fruit quality and nutritional value.':
    'El manejo del estrés por calor protege los cultivos durante temperaturas extremas para mantener la calidad de la fruta y su valor nutricional.',
  'Herbicide application controls weeds that compete with crops for nutrients and water, improving harvest quality.':
    'La aplicación de herbicida controla las malezas que compiten con los cultivos por nutrientes y agua, mejorando la calidad de la cosecha.',
  'Herbicide treatment manages weeds that compete with crops for essential resources.':
    'El tratamiento con herbicida maneja las malezas que compiten con los cultivos por recursos esenciales.',
  'High wind monitoring helps assess crop damage and implement protective measures to maintain harvest quality.':
    'El monitoreo de vientos fuertes ayuda a evaluar los daños al cultivo e implementar medidas de protección para mantener la calidad de la cosecha.',
  'Humidity monitoring helps prevent fungal diseases that could compromise crop health and safety.':
    'El monitoreo de la humedad ayuda a prevenir enfermedades fúngicas que podrían comprometer la salud y la inocuidad del cultivo.',
  'Independent verification building consumer trust in sustainable practices with traceable documentation':
    'Verificación independiente que genera la confianza del consumidor en las prácticas sostenibles con documentación trazable',
  'Integrated pest management reduces chemical dependency through biological controls, monitoring, and targeted interventions.':
    'El manejo integrado de plagas reduce la dependencia de químicos mediante controles biológicos, monitoreo e intervenciones dirigidas.',
  'Low humidity management ensures crops receive adequate moisture for optimal growth and quality.':
    'El manejo de la baja humedad asegura que los cultivos reciban la humedad adecuada para un crecimiento y una calidad óptimos.',
  'Monitoring traps provide early warning of pest populations, enabling targeted responses that protect crop quality.':
    'Las trampas de monitoreo brindan una alerta temprana de las poblaciones de plagas, permitiendo respuestas dirigidas que protegen la calidad del cultivo.',
  'Natural pest control reduces reliance on synthetic pesticides, promoting biodiversity and soil health.':
    'El control natural de plagas reduce la dependencia de pesticidas sintéticos, promoviendo la biodiversidad y la salud del suelo.',
  'Ongoing education promotes adoption of sustainable techniques and improves overall farming practices.':
    'La educación continua promueve la adopción de técnicas sostenibles y mejora las prácticas agrícolas en general.',
  'Organic matter addition improves soil structure, water retention, and long-term soil health naturally.':
    'La incorporación de materia orgánica mejora la estructura del suelo, la retención de agua y la salud del suelo a largo plazo de forma natural.',
  'Organic pest control provides natural protection without synthetic chemicals, supporting healthier food production.':
    'El control orgánico de plagas brinda protección natural sin químicos sintéticos, favoreciendo una producción de alimentos más saludable.',
  'Part of comprehensive farm management that ensures operational efficiency and environmental responsibility.':
    'Parte de un manejo integral de la finca que asegura la eficiencia operativa y la responsabilidad ambiental.',
  'Part of integrated farming approach that balances productivity with environmental responsibility.':
    'Parte de un enfoque agrícola integrado que equilibra la productividad con la responsabilidad ambiental.',
  'Part of integrated pest management approach that reduces reliance on synthetic pesticides and promotes ecological balance.':
    'Parte de un enfoque de manejo integrado de plagas que reduce la dependencia de pesticidas sintéticos y promueve el equilibrio ecológico.',
  'Precise fuel consumption tracking enables equipment efficiency optimization and environmental impact reduction.':
    'El seguimiento preciso del consumo de combustible permite optimizar la eficiencia del equipo y reducir el impacto ambiental.',
  'Precision agriculture technology enables data-driven decisions that optimize resource use and improve crop quality.':
    'La tecnología de agricultura de precisión permite tomar decisiones basadas en datos que optimizan el uso de recursos y mejoran la calidad del cultivo.',
  'Precision tillage minimizes soil disturbance while ensuring proper seedbed preparation and crop establishment.':
    'La labranza de precisión minimiza la alteración del suelo a la vez que asegura una preparación adecuada de la cama de siembra y el establecimiento del cultivo.',
  'Preventive maintenance extends equipment life, reduces fuel consumption, and minimizes operational carbon footprint.':
    'El mantenimiento preventivo prolonga la vida útil del equipo, reduce el consumo de combustible y minimiza la huella de carbono operativa.',
  'Preventive maintenance reduces equipment breakdowns, extends machinery life, and minimizes environmental impact from repairs.':
    'El mantenimiento preventivo reduce las averías del equipo, prolonga la vida útil de la maquinaria y minimiza el impacto ambiental de las reparaciones.',
  'Proactive frost monitoring reduces crop losses and food waste, supporting efficient resource utilization.':
    'El monitoreo proactivo de heladas reduce las pérdidas de cultivo y el desperdicio de alimentos, favoreciendo un uso eficiente de los recursos.',
  'Proactive scouting prevents pest outbreaks and supports precision agriculture practices that minimize environmental impact.':
    'El monitoreo proactivo previene brotes de plagas y respalda prácticas de agricultura de precisión que minimizan el impacto ambiental.',
  'Professional pesticide application protects crops from harmful pests while following strict safety protocols.':
    'La aplicación profesional de pesticidas protege los cultivos de plagas dañinas siguiendo estrictos protocolos de seguridad.',
  'Prompt damage repair minimizes crop loss and maintains farm resilience against weather events.':
    'La reparación oportuna de daños minimiza la pérdida de cultivo y mantiene la resiliencia de la finca ante los eventos climáticos.',
  'Quick response to hail damage minimizes crop losses and reduces the need for replanting, saving resources.':
    'La respuesta rápida a los daños por granizo minimiza las pérdidas de cultivo y reduce la necesidad de resembrar, ahorrando recursos.',
  'Rapid breakdown response minimizes operational delays and prevents resource waste from extended equipment downtime.':
    'La respuesta rápida ante averías minimiza las demoras operativas y evita el desperdicio de recursos por el tiempo de inactividad prolongado del equipo.',
  'Rapid damage assessment after hail events helps farmers implement recovery strategies to maintain crop quality.':
    'La evaluación rápida de daños tras eventos de granizo ayuda a los agricultores a implementar estrategias de recuperación para mantener la calidad del cultivo.',
  'Regular calibration improves precision, reduces resource waste, and optimizes equipment efficiency for environmental benefits.':
    'La calibración periódica mejora la precisión, reduce el desperdicio de recursos y optimiza la eficiencia del equipo en beneficio del medio ambiente.',
  'Regular inspections prevent equipment failures, extend machinery life, and maintain optimal efficiency for sustainability.':
    'Las inspecciones periódicas previenen fallas del equipo, prolongan la vida útil de la maquinaria y mantienen una eficiencia óptima para la sostenibilidad.',
  'Regular pest monitoring helps detect issues early, preventing damage and reducing the need for chemical interventions.':
    'El monitoreo periódico de plagas ayuda a detectar problemas a tiempo, previniendo daños y reduciendo la necesidad de intervenciones químicas.',
  'Regular safety inspections ensure farm operations meet high standards for worker safety and food quality.':
    'Las inspecciones de seguridad periódicas aseguran que las operaciones de la finca cumplan altos estándares de seguridad de los trabajadores y calidad de los alimentos.',
  'Resilient farming practices help minimize weather-related crop losses and maintain food security.':
    'Las prácticas agrícolas resilientes ayudan a minimizar las pérdidas de cultivo relacionadas con el clima y a mantener la seguridad alimentaria.',
  'Safety protocols protect workers and the environment while maintaining sustainable operational standards.':
    'Los protocolos de seguridad protegen a los trabajadores y al medio ambiente mientras mantienen estándares operativos sostenibles.',
  'Scientific soil analysis enables precision agriculture and reduces unnecessary inputs through data-driven decisions.':
    'El análisis científico del suelo permite la agricultura de precisión y reduce los insumos innecesarios mediante decisiones basadas en datos.',
  'Species-specific pest management reduces unnecessary treatments and supports integrated approaches that preserve beneficial organisms.':
    'El manejo de plagas específico por especie reduce los tratamientos innecesarios y respalda enfoques integrados que preservan los organismos benéficos.',
  'Storm damage assessment ensures only healthy, undamaged produce reaches consumers.':
    'La evaluación de daños por tormenta asegura que solo productos sanos y sin daños lleguen a los consumidores.',
  'Strategic farm planning optimizes resource allocation and ensures efficient crop management throughout the season.':
    'La planificación estratégica de la finca optimiza la asignación de recursos y asegura un manejo eficiente del cultivo durante toda la temporada.',
  'Targeted fertilizer application provides essential nutrients for healthy plant growth and optimal fruit quality.':
    'La aplicación dirigida de fertilizante aporta nutrientes esenciales para un crecimiento saludable de las plantas y una calidad óptima de la fruta.',
  'Targeted pest control prevents crop losses and reduces need for repeated treatments.':
    'El control dirigido de plagas previene pérdidas de cultivo y reduce la necesidad de tratamientos repetidos.',
  'Targeted weed management reduces the need for tillage, helping preserve soil structure and reduce erosion.':
    'El manejo dirigido de malezas reduce la necesidad de labranza, ayudando a preservar la estructura del suelo y a reducir la erosión.',
  'Team coordination ensures all farm operations are well-planned and executed with attention to quality.':
    'La coordinación del equipo asegura que todas las operaciones de la finca se planifiquen y ejecuten bien, con atención a la calidad.',
  'Third-party validation of sustainable farming practices ensuring environmental protection with documented certification proof':
    'Validación de terceros de prácticas agrícolas sostenibles que asegura la protección ambiental con prueba de certificación documentada',
  'This agricultural practice follows sustainable farming methods to ensure high-quality food production.':
    'Esta práctica agrícola sigue métodos de agricultura sostenible para asegurar una producción de alimentos de alta calidad.',
  'This equipment operation supports efficient and sustainable farming practices.':
    'Esta operación de equipo respalda prácticas agrícolas eficientes y sostenibles.',
  'This farm management activity supports efficient operations and sustainable farming practices.':
    'Esta actividad de gestión agrícola respalda operaciones eficientes y prácticas agrícolas sostenibles.',
  'This professional agricultural treatment follows industry best practices to ensure food safety and quality.':
    'Este tratamiento agrícola profesional sigue las mejores prácticas del sector para asegurar la inocuidad y la calidad de los alimentos.',
  'This soil management practice supports healthy growing conditions and sustainable farming.':
    'Esta práctica de manejo del suelo favorece condiciones de cultivo saludables y la agricultura sostenible.',
  'This sustainable pest management practice supports healthy crop production while protecting the environment.':
    'Esta práctica sostenible de manejo de plagas favorece una producción saludable del cultivo a la vez que protege el medio ambiente.',
  'Thorough record-keeping enables continuous improvement and demonstrates commitment to sustainable practices.':
    'El registro minucioso permite la mejora continua y demuestra el compromiso con las prácticas sostenibles.',
  'Timely equipment repairs prevent breakdowns, reduce waste from damaged equipment, and maintain operational efficiency.':
    'Las reparaciones oportunas del equipo previenen averías, reducen el desperdicio por equipos dañados y mantienen la eficiencia operativa.',
  'Trap monitoring reduces pesticide applications by providing precise timing for control measures only when needed.':
    'El monitoreo con trampas reduce las aplicaciones de pesticidas al brindar el momento preciso para las medidas de control solo cuando se necesitan.',
  'Water-smart farming practices during drought conditions help conserve this precious resource for future generations.':
    'Las prácticas agrícolas eficientes en el uso del agua durante las condiciones de sequía ayudan a conservar este recurso valioso para las generaciones futuras.',
  'Weather monitoring enables precise agricultural decisions that optimize resource use and minimize environmental impact.':
    'El monitoreo del clima permite tomar decisiones agrícolas precisas que optimizan el uso de recursos y minimizan el impacto ambiental.',
  'Weed control without tillage leaves soil structure intact, though it relies on a synthetic input to do it.':
    'El control de malezas sin laboreo mantiene intacta la estructura del suelo, aunque depende de un insumo sintético para lograrlo.',
  'Well-maintained equipment uses less fuel, applies inputs more accurately, and is documented alongside the field records.':
    'Un equipo bien mantenido consume menos combustible, aplica los insumos con mayor precisión y queda documentado junto con los registros de campo.',
  'Wind damage assessment enables quick response to protect crops and minimize agricultural losses.':
    'La evaluación de daños por viento permite una respuesta rápida para proteger los cultivos y minimizar las pérdidas agrícolas.',

  // Static sustainabilityBenefit assigned with backticks (no interpolation)
  'Documented cultivation practices demonstrate sustainable weed management and soil health maintenance.':
    'Las prácticas de cultivo documentadas demuestran un manejo sostenible de malezas y el mantenimiento de la salud del suelo.',
  'Documented harvest timing, yield tracking, and quality grading demonstrates responsible farming and rigorous quality control practices.':
    'El registro documentado del momento de cosecha, el seguimiento del rendimiento y la clasificación por calidad demuestran una agricultura responsable y rigurosas prácticas de control de calidad.',
  'Documented pruning practices reduce disease pressure and optimize plant productivity through transparency.':
    'Las prácticas de poda documentadas reducen la presión de enfermedades y optimizan la productividad de la planta mediante la transparencia.',
  'Documented thinning practices optimize resource allocation and demonstrate commitment to premium quality produce.':
    'Las prácticas de raleo documentadas optimizan la asignación de recursos y demuestran el compromiso con productos de calidad premium.',
  'Precision irrigation with complete documentation conserves water resources while maintaining optimal growing conditions.':
    'El riego de precisión con documentación completa conserva los recursos hídricos mientras mantiene condiciones de cultivo óptimas.',
  'Precision planting with documented seed rates optimizes resource use while providing transparency into farming practices.':
    'La siembra de precisión con tasas de semilla documentadas optimiza el uso de recursos y brinda transparencia sobre las prácticas agrícolas.',

  // Stage 2 (2026-06-14): consumerImpact sentences made static (in-sentence
  // quantities dropped — they render in Key Details) so they localize here.
  'Seeds planted with precision to ensure optimal plant spacing for healthy growth and maximum yield quality.':
    'Semillas sembradas con precisión para asegurar un espaciamiento óptimo de las plantas, un crecimiento saludable y la máxima calidad del rendimiento.',
  'Crops harvested at peak ripeness to ensure maximum nutritional value and freshness.':
    'Cultivos cosechados en su máxima madurez para asegurar el máximo valor nutricional y frescura.',
  'Targeted irrigation provides optimal water levels for healthy plant growth.':
    'El riego dirigido proporciona niveles óptimos de agua para un crecimiento saludable de las plantas.',
  'Strategic pruning improves plant health, air circulation, and fruit quality for better produce.':
    'La poda estratégica mejora la salud de la planta, la circulación de aire y la calidad de la fruta para obtener mejores productos.',
  'Mechanical cultivation controls weeds naturally and improves soil aeration for healthier plant roots.':
    'El cultivo mecánico controla las malezas de forma natural y mejora la aireación del suelo para raíces más sanas.',
  'Fruit thinning improves individual fruit size, quality, and sugar content by reducing competition for nutrients.':
    'El raleo de frutos mejora el tamaño, la calidad y el contenido de azúcar de cada fruto al reducir la competencia por los nutrientes.',
  'Soil testing and analysis ensures optimal growing conditions and informed farming decisions.':
    'El análisis y las pruebas de suelo aseguran condiciones de cultivo óptimas y decisiones agrícolas informadas.',
  'Soil pH adjustment optimizes nutrient availability for healthy crop development.':
    'El ajuste del pH del suelo optimiza la disponibilidad de nutrientes para un desarrollo saludable del cultivo.',
  'Organic matter enhancement builds soil fertility and supports beneficial microbial activity.':
    'El aumento de la materia orgánica construye la fertilidad del suelo y favorece la actividad microbiana benéfica.',
  'Cover crop management protects soil from erosion and enhances soil organic matter naturally.':
    'El manejo de cultivos de cobertura protege el suelo de la erosión y aumenta la materia orgánica del suelo de forma natural.',
  'Strategic tillage implementation prepares optimal seedbed conditions for healthy crop establishment.':
    'La implementación de labranza estratégica prepara condiciones óptimas de la cama de siembra para un establecimiento saludable del cultivo.',
  'Compost application enriches soil naturally and promotes beneficial microbial diversity.':
    'La aplicación de compost enriquece el suelo de forma natural y promueve la diversidad microbiana benéfica.',
  'Released beneficial organisms to naturally control pests, creating a healthy ecosystem that protects crops without chemicals.':
    'Se liberaron organismos benéficos para controlar las plagas de forma natural, creando un ecosistema saludable que protege los cultivos sin químicos.',
  'Accurate pest identification enables precise, targeted management that protects crops while minimizing environmental impact.':
    'La identificación precisa de plagas permite un manejo dirigido y exacto que protege los cultivos a la vez que minimiza el impacto ambiental.',
  'Scientific assessment of pest damage ensures treatments are only applied when economically necessary, protecting crop quality.':
    'La evaluación científica del daño por plagas asegura que los tratamientos solo se apliquen cuando son económicamente necesarios, protegiendo la calidad del cultivo.',
  'Implemented an integrated strategy combining multiple sustainable methods to manage pests while protecting crop health and quality.':
    'Se implementó una estrategia integrada que combina múltiples métodos sostenibles para manejar las plagas a la vez que protege la salud y la calidad del cultivo.',
  'Regular farm maintenance ensures equipment operates efficiently and safely for quality food production.':
    'El mantenimiento periódico de la finca asegura que el equipo funcione de manera eficiente y segura para una producción de alimentos de calidad.',
  'Professional training ensures best practices are followed for safe, high-quality food production.':
    'La capacitación profesional asegura que se sigan las mejores prácticas para una producción de alimentos segura y de alta calidad.',
  'Rapid emergency response protects crops and farm infrastructure, ensuring continued quality production.':
    'La respuesta rápida ante emergencias protege los cultivos y la infraestructura de la finca, asegurando una producción de calidad continua.',
  'Field equipment operation with complete fuel consumption documentation for transparency.':
    'Operación de equipo de campo con documentación completa del consumo de combustible para mayor transparencia.',
  'Equipment maintenance ensures optimal performance and reduces environmental impact from inefficient operations.':
    'El mantenimiento del equipo asegura un rendimiento óptimo y reduce el impacto ambiental de las operaciones ineficientes.',
  'Equipment repair restores functionality and maintains operational efficiency for sustainable farming.':
    'La reparación del equipo restablece el funcionamiento y mantiene la eficiencia operativa para una agricultura sostenible.',
  'Equipment calibration ensures precise operations and optimal resource usage for quality production.':
    'La calibración del equipo asegura operaciones precisas y un uso óptimo de los recursos para una producción de calidad.',
  'Equipment breakdown response ensures quick restoration of operations and minimal impact on production.':
    'La respuesta ante averías del equipo asegura una rápida restauración de las operaciones y un impacto mínimo en la producción.',
  'Equipment inspection ensures safety standards and optimal performance for reliable farming operations.':
    'La inspección del equipo asegura las normas de seguridad y un rendimiento óptimo para operaciones agrícolas confiables.',
  'Supporting agricultural transparency and sustainability':
    'Apoyo a la transparencia y la sostenibilidad agrícola',
  'Certified products ensuring quality and environmental standards':
    'Productos certificados que aseguran la calidad y las normas ambientales',
  'Contributing to carbon offset programs and climate action':
    'Contribución a programas de compensación de carbono y acción climática',
  'Documented practices providing trust and transparency':
    'Prácticas documentadas que brindan confianza y transparencia',
  'Enhanced visibility into how your food is grown':
    'Mayor visibilidad de cómo se cultiva tu alimento',
  'This equipment operation demonstrates efficient farm equipment management, showing how modern agricultural practices optimize resource use while maintaining food quality.':
    'Esta operación de equipo demuestra una gestión eficiente del equipo agrícola, mostrando cómo las prácticas agrícolas modernas optimizan el uso de recursos a la vez que mantienen la calidad de los alimentos.',
  'Documented equipment operations help build consumer trust through operational transparency and support sustainable farming through efficient resource management.':
    'Las operaciones de equipo documentadas ayudan a generar la confianza del consumidor mediante la transparencia operativa y respaldan la agricultura sostenible mediante un uso eficiente de los recursos.',

  // --- Biodiversity / habitat (GR grazing, HD habitat, NS nesting) — descriptions + impact + benefit ---
  // soilTypeMap descriptions
  'Integrated livestock grazing for natural weed control, cover-crop termination and soil health':
    'Pastoreo integrado de ganado para control natural de malezas, terminación de cultivos de cobertura y salud del suelo',
  // consumerImpact ("Qué significa para ti")
  'Integrated livestock grazing controls weeds naturally and builds soil health without chemicals.':
    'El pastoreo integrado de ganado controla las malezas de forma natural y mejora la salud del suelo sin químicos.',
  // sustainabilityBenefit ("Beneficio ambiental")
  'Managed grazing recycles nutrients, stimulates root growth, and reduces the need for mowing and herbicides.':
    'El pastoreo manejado recicla nutrientes, estimula el crecimiento de raíces y reduce la necesidad de siega y herbicidas.',
  'Documented habitat builds biodiversity and natural pest control, reducing reliance on chemical inputs.':
    'El hábitat documentado fomenta la biodiversidad y el control natural de plagas, reduciendo la dependencia de insumos químicos.',
  'Providing wildlife habitat supports natural pest control and pollination, a hallmark of regenerative farming.':
    'Brindar hábitat para la fauna favorece el control natural de plagas y la polinización, un sello de la agricultura regenerativa.',

  // --- Gaps closed 2026-07 (found by an ES-coverage sweep over eventDescriptions.ts) ---
  // Soil PA sustainabilityBenefit — the only impact/benefit sentence in the whole file that
  // had no Spanish translation, so a Spanish shopper saw one English paragraph mid-page.
  'You can see the week this fruit came off the block, and how much was picked that day.':
    'Puedes ver la semana en que esta fruta salió del lote y cuánto se cosechó ese día.',
  'The material, the quantity and the day it happened are all part of this entry.':
    'El material, la cantidad y el día en que ocurrió forman parte de esta entrada.',
  'The pest, the product aimed at it and the amount used are recorded here.':
    'La plaga, el producto dirigido a ella y la cantidad usada quedan registrados aquí.',
  'Both the target and the material are on file here, with the date.':
    'Tanto el objetivo como el material constan aquí, con la fecha.',
  'Weed control is logged with the product used and the area it covered.':
    'El control de malezas se registra con el producto usado y la superficie cubierta.',
  'You can see where the irrigation water came from and how it reached the trees.':
    'Puedes ver de dónde vino el agua de riego y cómo llegó a los árboles.',
  'pH Adjustment': 'Ajuste de pH',
  'pH optimization improves nutrient uptake efficiency, reducing fertilizer requirements and environmental impact.':
    'La optimización del pH mejora la eficiencia en la absorción de nutrientes, reduciendo la necesidad de fertilizantes y el impacto ambiental.',
  // Titles / descriptions that fell through to English.
  'Crop protected from frost damage on cold nights (wind machines, heaters or sprinklers)':
    'Cultivo protegido de daños por heladas en noches frías (máquinas de viento, calefactores o aspersores)',
  'Nesting / Shelter Structures': 'Estructuras de anidación / refugio',
  // §E-4 winter sanitation (CU) — title + description.
  'Winter Sanitation & Cultural Control': 'Sanidad invernal y control cultural',
  'Overwintering pest sites were physically removed from the orchard, the preventive practice used here instead of spraying':
    'Se retiraron físicamente del huerto los sitios donde las plagas pasan el invierno, la práctica preventiva usada aquí en lugar de aplicar un producto',
  // §E-2 lab analysis (LA) — title + description.
  'Independent Laboratory Analysis': 'Análisis de laboratorio independiente',
  'A sample of leaf, soil, compost or irrigation water sent to an outside laboratory, so nutrient decisions rest on measurements rather than guesswork':
    'Una muestra de hoja, suelo, compost o agua de riego enviada a un laboratorio externo, para que las decisiones de nutrición se basen en mediciones y no en suposiciones',
  'Soil Management Operation': 'Operación de manejo del suelo',
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
  'Honey bee hives were brought into the orchard during bloom so the crop could set fruit.':
    'Se llevaron colmenas de abejas al huerto durante la floración para que el cultivo pudiera cuajar fruto.',
  'Managed pollination supports bee colonies and is documented alongside the spray record, so applications can be timed away from bloom.':
    'La polinización manejada sostiene las colonias de abejas y se documenta junto al registro de aplicaciones, para poder programarlas fuera de la floración.',
  'After picking, the crop was hulled, dried or cooled to keep it sound on the way to you.':
    'Después de la recolección, el cultivo se descascaró, secó o enfrió para que llegue en buen estado hasta ti.',
  'Documented post-harvest handling reduces spoilage and waste, and records the temperature and sanitation steps the crop passed through.':
    'El manejo poscosecha documentado reduce el deterioro y el desperdicio, y registra los pasos de temperatura y sanitización por los que pasó el cultivo.',
  'The crop was protected through a cold night so the season’s fruit was not lost to frost.':
    'El cultivo se protegió durante una noche fría para que la fruta de la temporada no se perdiera por la helada.',
  'Protecting an established crop avoids the far larger footprint of losing a harvest and regrowing it.':
    'Proteger un cultivo ya establecido evita la huella mucho mayor de perder una cosecha y volver a producirla.',
  'The tree canopy was managed to let light and air reach the fruit, which improves ripening and reduces disease.':
    'Se manejó la copa del árbol para que la luz y el aire lleguen a la fruta, lo que mejora la maduración y reduce las enfermedades.',
  'An open canopy dries faster after rain, lowering disease pressure and the need for fungicide applications.':
    'Una copa abierta se seca más rápido después de la lluvia, lo que reduce la presión de enfermedades y la necesidad de aplicar fungicidas.',

  // --- Orchard-floor management (MO), incl. flame weeding — 2026-07 ---
  'Weeds were controlled with heat instead of chemicals, using a propane flamer along the tree rows.':
    'Las malezas se controlaron con calor en lugar de químicos, usando un flameador de propano a lo largo de las hileras de árboles.',
  'Flame weeding removes weeds without synthetic herbicides, leaving no chemical residue in the soil or on the crop.':
    'El deshierbe con llama elimina las malezas sin herbicidas sintéticos, sin dejar residuos químicos en el suelo ni en el cultivo.',
  'The orchard floor was mown and managed to keep ground cover healthy and harvest conditions clean.':
    'El suelo del huerto se segó y se manejó para mantener sana la cobertura vegetal y limpias las condiciones de cosecha.',
  'Managed ground cover protects soil from erosion, feeds pollinators and beneficial insects, and reduces the need for herbicides.':
    'La cobertura vegetal manejada protege el suelo de la erosión, alimenta a polinizadores e insectos benéficos y reduce la necesidad de herbicidas.'
};
