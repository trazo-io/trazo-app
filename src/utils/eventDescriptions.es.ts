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
  'Agricultural activity completed as part of sustainable farming':
    'Actividad agrícola completada como parte de la agricultura sostenible',
  'Agricultural equipment operation with transparent operational tracking':
    'Operación de equipo agrícola con seguimiento operativo transparente',
  'Agricultural operation completed on the farm': 'Operación agrícola completada en la finca',
  'Agricultural practice completed as part of sustainable farming':
    'Práctica agrícola completada como parte de la agricultura sostenible',
  'Applied integrated pest management strategy combining multiple sustainable control methods':
    'Se aplicó una estrategia de manejo integrado de plagas combinando múltiples métodos de control sostenibles',
  'Applied sustainable pest management practices to protect crop health':
    'Se aplicaron prácticas sostenibles de manejo de plagas para proteger la salud del cultivo',
  'Business activity enhancing agricultural transparency and sustainability':
    'Actividad comercial que mejora la transparencia y la sostenibilidad agrícola',
  'Business activity supporting sustainable agricultural operations':
    'Actividad comercial que respalda operaciones agrícolas sostenibles',
  'Carbon credit generation and transaction supporting environmental sustainability':
    'Generación y transacción de créditos de carbono que respalda la sostenibilidad ambiental',
  'Carefully processed after harvest to ensure quality and freshness':
    'Procesado cuidadosamente después de la cosecha para garantizar calidad y frescura',
  'Checked monitoring traps to track pest populations and identify early warning signs':
    'Se revisaron las trampas de monitoreo para rastrear poblaciones de plagas e identificar señales tempranas de alerta',
  'Completed general farming activity as part of farm operations':
    'Se completó una actividad agrícola general como parte de las operaciones de la finca',
  'Compliance with environmental regulations and agricultural safety standards':
    'Cumplimiento de las regulaciones ambientales y las normas de seguridad agrícola',
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
  'Cover crop implementation to protect soil, prevent erosion, and enhance soil organic matter':
    'Implementación de cultivos de cobertura para proteger el suelo, prevenir la erosión y aumentar la materia orgánica del suelo',
  'Crops harvested at optimal ripeness and quality':
    'Cultivos cosechados en su punto óptimo de madurez y calidad',
  'Crops harvested at peak ripeness for maximum quality and nutrition':
    'Cultivos cosechados en su máxima madurez para obtener la mejor calidad y nutrición',
  'Documented farming practices for transparency and compliance':
    'Prácticas agrícolas documentadas para transparencia y cumplimiento',
  'Documented fuel consumption for field operations with transparent tracking of equipment efficiency':
    'Consumo de combustible documentado para operaciones de campo con seguimiento transparente de la eficiencia del equipo',
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
  'Equipment maintenance and service activities to ensure optimal operational efficiency':
    'Actividades de mantenimiento y servicio de equipos para asegurar una eficiencia operativa óptima',
  'Equipment operation completed as part of farm activities':
    'Operación de equipo completada como parte de las actividades de la finca',
  'Equipment operation following sustainable farming practices':
    'Operación de equipo que sigue prácticas agrícolas sostenibles',
  'Equipment repair operations to restore functionality and maintain operational efficiency':
    'Operaciones de reparación de equipos para restablecer el funcionamiento y mantener la eficiencia operativa',
  'Evaluated pest population levels against economic thresholds to determine treatment needs':
    'Se evaluaron los niveles de población de plagas frente a umbrales económicos para determinar la necesidad de tratamiento',
  'Farm equipment operation following best practices':
    'Operación de equipo agrícola siguiendo las mejores prácticas',
  'Farm equipment used and maintained for optimal performance':
    'Equipo agrícola utilizado y mantenido para un rendimiento óptimo',
  'Farm equipment used and maintained for optimal performance and efficiency':
    'Equipo agrícola utilizado y mantenido para un rendimiento y una eficiencia óptimos',
  'Farm management activity following operational best practices':
    'Actividad de gestión agrícola que sigue las mejores prácticas operativas',
  'Frost conditions monitored and documented to assess impact on crop health and implement protective measures':
    'Condiciones de heladas monitoreadas y documentadas para evaluar el impacto en la salud del cultivo e implementar medidas de protección',
  'Fruit or plant thinning to improve size and quality':
    'Raleo de frutos o plantas para mejorar el tamaño y la calidad',
  'Fruit or plant thinning to improve size, quality, and overall crop health':
    'Raleo de frutos o plantas para mejorar el tamaño, la calidad y la salud general del cultivo',
  'General agricultural activity completed as part of farm operations':
    'Actividad agrícola general completada como parte de las operaciones de la finca',
  'Hail event documented with damage assessment to inform crop protection and recovery strategies':
    'Evento de granizo documentado con evaluación de daños para orientar la protección del cultivo y las estrategias de recuperación',
  'High humidity conditions tracked to prevent disease development and optimize growing conditions':
    'Condiciones de alta humedad registradas para prevenir el desarrollo de enfermedades y optimizar las condiciones de cultivo',
  'High temperature conditions monitored to protect crops and implement cooling strategies':
    'Condiciones de alta temperatura monitoreadas para proteger los cultivos e implementar estrategias de enfriamiento',
  'High wind conditions monitored and documented to assess crop damage and implement protective measures':
    'Condiciones de viento fuerte monitoreadas y documentadas para evaluar daños al cultivo e implementar medidas de protección',
  'Identified pest species to develop targeted management strategies':
    'Se identificaron especies de plagas para desarrollar estrategias de manejo específicas',
  'Independent verification of sustainable farming practices and transparency claims':
    'Verificación independiente de prácticas agrícolas sostenibles y declaraciones de transparencia',
  'Inspected farm facilities and equipment for safety compliance':
    'Se inspeccionaron las instalaciones y el equipo de la finca para cumplir con las normas de seguridad',
  'Low humidity conditions monitored to assess plant stress and adjust irrigation strategies':
    'Condiciones de baja humedad monitoreadas para evaluar el estrés de las plantas y ajustar las estrategias de riego',
  'Maintained farm infrastructure and equipment for optimal operations':
    'Se mantuvo la infraestructura y el equipo de la finca para operaciones óptimas',
  'Managed pollinators placed to support crop growth — a natural, zero-emission process':
    'Polinizadores manejados ubicados para favorecer el crecimiento del cultivo, un proceso natural y sin emisiones',
  'Mechanical cultivation for weed control and soil aeration':
    'Cultivo mecánico para el control de malezas y la aireación del suelo',
  'Mechanical cultivation for weed control and soil aeration to optimize crop growth':
    'Cultivo mecánico para el control de malezas y la aireación del suelo para optimizar el crecimiento del cultivo',
  'Monitored crops for pest populations and damage levels to inform management decisions':
    'Se monitorearon los cultivos para detectar poblaciones de plagas y niveles de daño para orientar las decisiones de manejo',
  'Orchard floor mowed or managed to support soil health and clean harvest conditions':
    'Piso del huerto segado o manejado para favorecer la salud del suelo y condiciones de cosecha limpias',
  'Part of responsible farming practices that support environmental stewardship and long-term agricultural sustainability.':
    'Parte de prácticas agrícolas responsables que apoyan el cuidado ambiental y la sostenibilidad agrícola a largo plazo.',
  'Planned and organized farming activities for optimal productivity':
    'Se planificaron y organizaron las actividades agrícolas para una productividad óptima',
  'Plants pruned to optimize growth and fruit quality':
    'Plantas podadas para optimizar el crecimiento y la calidad de la fruta',
  'Precision calibration activities to ensure accurate equipment operation and optimal performance':
    'Actividades de calibración de precisión para asegurar una operación exacta del equipo y un rendimiento óptimo',
  'Preventive maintenance activities to ensure optimal equipment performance and longevity':
    'Actividades de mantenimiento preventivo para asegurar un rendimiento óptimo y la durabilidad del equipo',
  'Released beneficial insects to naturally control pest populations using biological methods':
    'Se liberaron insectos benéficos para controlar de forma natural las poblaciones de plagas mediante métodos biológicos',
  'Responded to emergency conditions with cleanup and damage repair':
    'Se respondió a condiciones de emergencia con limpieza y reparación de daños',
  'Seeds or seedlings planted with precision for optimal growth conditions':
    'Semillas o plántulas sembradas con precisión para condiciones óptimas de crecimiento',
  'Seeds planted to establish healthy crop growth':
    'Semillas sembradas para establecer un crecimiento saludable del cultivo',
  'Soil management activity supporting healthy growing conditions and sustainable farming practices':
    'Actividad de manejo del suelo que favorece condiciones de cultivo saludables y prácticas agrícolas sostenibles',
  'Soil management supporting sustainable farming practices':
    'Manejo del suelo que respalda prácticas agrícolas sostenibles',
  'Soil pH optimization to improve nutrient availability and support healthy plant growth':
    'Optimización del pH del suelo para mejorar la disponibilidad de nutrientes y favorecer un crecimiento saludable de las plantas',
  'Storage and handling operations with complete documentation of equipment usage':
    'Operaciones de almacenamiento y manipulación con documentación completa del uso del equipo',
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
  'Third-party certification validating sustainable farming practices and product quality':
    'Certificación de terceros que valida prácticas agrícolas sostenibles y la calidad del producto',
  'This farming practice contributes to sustainable agriculture and food quality.':
    'Esta práctica agrícola contribuye a la agricultura sostenible y la calidad de los alimentos.',
  'Transplanting seedlings or plants to their permanent growing location':
    'Trasplante de plántulas o plantas a su ubicación de cultivo definitiva',
  'Transportation and logistics operations with documented fuel usage and efficiency tracking':
    'Operaciones de transporte y logística con uso de combustible documentado y seguimiento de la eficiencia',
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
  'On-farm habitat — hedgerows, insectary plantings and living groundcover — that supports beneficial insects and birds':
    'Hábitat en la finca — setos vivos, plantaciones insectarias y cobertura viva — que sostiene insectos benéficos y aves',
  'Wildlife structures — owl and songbird boxes, raptor perches, native-bee blocks — that invite natural pest control':
    'Estructuras para fauna — cajas para lechuzas y aves canoras, perchas para rapaces, bloques para abejas nativas — que favorecen el control natural de plagas',
  // consumerImpact ("Qué significa para ti")
  'Integrated livestock grazing controls weeds naturally and builds soil health without chemicals.':
    'El pastoreo integrado de ganado controla las malezas de forma natural y mejora la salud del suelo sin químicos.',
  'On-farm habitat — hedgerows, insectary plantings and living groundcover — supports the beneficial insects and birds that keep this farm in balance.':
    'El hábitat en la finca — setos vivos, plantaciones insectarias y cobertura viva — sostiene los insectos benéficos y las aves que mantienen el equilibrio de esta finca.',
  'Nesting and shelter structures — owl and songbird boxes, raptor perches, native-bee blocks — invite wildlife that controls pests naturally.':
    'Las estructuras de anidación y refugio — cajas para lechuzas y aves canoras, perchas para rapaces, bloques para abejas nativas — atraen fauna que controla las plagas de forma natural.',
  // sustainabilityBenefit ("Beneficio ambiental")
  'Managed grazing recycles nutrients, stimulates root growth, and reduces the need for mowing and herbicides.':
    'El pastoreo manejado recicla nutrientes, estimula el crecimiento de raíces y reduce la necesidad de siega y herbicidas.',
  'Documented habitat builds biodiversity and natural pest control, reducing reliance on chemical inputs.':
    'El hábitat documentado fomenta la biodiversidad y el control natural de plagas, reduciendo la dependencia de insumos químicos.',
  'Providing wildlife habitat supports natural pest control and pollination, a hallmark of regenerative farming.':
    'Brindar hábitat para la fauna favorece el control natural de plagas y la polinización, un sello de la agricultura regenerativa.'
};
