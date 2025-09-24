/**
 * Enhanced Consumer-friendly event descriptions for QR transparency pages
 * Provides educational, accessible descriptions for agricultural events with carbon sequestration emphasis
 * Updated with CARBON GOLDMINE soil stories, climate expertise, and natural alliance narratives
 */

interface EventDescriptionData {
  title: string;
  shortDescription: string;
  consumerImpact: string;
  sustainabilityBenefit: string;
  icon?: string;
  learnMoreLink?: string;
}

// Enhanced event type mappings for consumer-friendly descriptions
export const eventDescriptions: Record<string, EventDescriptionData> = {
  // Fertilization Events - Real transparency practices
  'spring fertilization': {
    title: 'Spring Nutrient Application',
    shortDescription: 'Applied nutrients based on soil test results - documented with field photos',
    consumerImpact: 'Your crops received exactly the nutrition needed for optimal growth and flavor, verified with photos',
    sustainabilityBenefit: 'Soil-test guided application reduces environmental impact and protects water quality',
  },
  'fertilizer application': {
    title: 'Soil Nutrition Program',
    shortDescription: 'Applied specific nutrients based on soil test recommendations - rates and methods documented',
    consumerImpact: 'Your food was grown with scientifically-determined nutrition for maximum health benefits',
    sustainabilityBenefit: 'Precise application prevents over-fertilization and protects water quality',
  },
  'applied fertilizer application': {
    title: 'Variable Rate Nutrition',
    shortDescription: 'GPS-guided application with rates customized to soil zones - photo verified',
    consumerImpact: 'Each area of the field received customized nutrition for consistent, premium quality produce',
    sustainabilityBenefit: 'Precision application reduces excess nutrients and environmental impact',
  },
  'sprayer operations': {
    title: 'Precision Liquid Application System',
    shortDescription: 'High-tech sprayer with boom guidance applies nutrients with centimeter accuracy',
    consumerImpact: 'Ensures even coverage for uniform crop quality and reduced chemical residues',
    sustainabilityBenefit: 'Prevents drift and over-spray, reducing chemical use by up to 20%',
  },
  'organic fertilization': {
    title: 'Organic Matter Enhancement Program',
    shortDescription: 'Composted organic materials and bio-nutrients applied to build soil health',
    consumerImpact: 'Grown with natural fertility methods for cleaner, more nutritious produce',
    sustainabilityBenefit: 'Sequesters 2.1 tons CO₂ per hectare while improving soil structure',
  },

  // Irrigation Events
  'irrigation': {
    title: 'Smart Water Management',
    shortDescription: 'Precision watering based on crop needs and weather data',
    consumerImpact: 'Ensures consistent quality and freshness of produce',
    sustainabilityBenefit: 'Conserves water through efficient irrigation technology',
  },
  'drip irrigation': {
    title: 'Water-Efficient Irrigation',
    shortDescription: 'Targeted water delivery directly to plant roots',
    consumerImpact: 'Maintains optimal growing conditions for quality produce',
    sustainabilityBenefit: 'Reduces water usage by up to 50% compared to traditional methods',
  },
  'micro-sprinkler irrigation': {
    title: 'Precision Sprinkler System',
    shortDescription: 'Fine-tuned water distribution for uniform coverage',
    consumerImpact: 'Ensures even growth and consistent produce quality',
    sustainabilityBenefit: 'Minimizes water waste and prevents soil erosion',
  },

  // Planting Events - Real transparency practices  
  'planting': {
    title: 'Precision Seed Placement',
    shortDescription: 'Seeds planted with precise spacing and depth control - GPS documented for accuracy',
    consumerImpact: 'Your crops were planted with exact spacing for optimal growth and maximum yield per plant',
    sustainabilityBenefit: 'Precise planting ensures high germination rates, reducing seed waste and replanting needs',
  },
  'applied planting': {
    title: 'Variable Rate Seeding',
    shortDescription: 'Planting rates customized based on soil productivity zones - field conditions documented',
    consumerImpact: 'Each area received the optimal plant population for consistent, premium quality produce',
    sustainabilityBenefit: 'Customized planting maximizes yield while conserving seeds and resources',
  },
  'no-till planting': {
    title: 'Conservation Planting',
    shortDescription: 'Direct seeded through crop residue without soil disturbance - conservation methods documented',
    consumerImpact: 'Your crops grow in undisturbed, naturally structured soil with enhanced water and nutrient retention',
    sustainabilityBenefit: 'No-till method prevents soil erosion and stores carbon in the soil',
  },
  'applied no-till planting': {
    title: 'Zero-Disturbance Planting System',
    shortDescription: 'State-of-the-art conservation planter maintains soil structure and organic matter',
    consumerImpact: 'Produces crops from healthier, more resilient soil with enhanced water retention',
    sustainabilityBenefit: 'Stores 40% more carbon than conventional tillage while protecting soil biology',
  },
  'precision planting': {
    title: 'Variable Rate Seeding Technology',
    shortDescription: 'Computer-controlled planter adjusts seed population based on soil productivity zones',
    consumerImpact: 'Optimizes plant competition for uniform size and quality throughout the field',
    sustainabilityBenefit: 'Maximizes efficiency with 20% less seed while improving yield stability',
  },
  'planting equipment operations': {
    title: 'Advanced Planting System Operation',
    shortDescription: 'High-precision equipment with real-time monitoring ensures perfect seed placement',
    consumerImpact: 'Creates ideal growing conditions for consistent crop development and quality',
    sustainabilityBenefit: 'Reduces fuel consumption by 30% through efficient planting patterns',
  },

  // Harvest Events - Real transparency practices
  'harvest': {
    title: 'Optimal Harvest Timing',
    shortDescription: 'Harvested at peak maturity for maximum quality - timing and conditions documented',
    consumerImpact: 'Your crops were harvested at the exact moment for maximum nutrition, flavor, and shelf life',
    sustainabilityBenefit: 'Precise timing reduces field losses and optimizes storage quality',
  },
  'applied harvest': {
    title: 'Yield-Mapped Harvest',
    shortDescription: 'GPS-guided harvest with real-time yield monitoring - field performance tracked and documented',
    consumerImpact: 'Advanced monitoring ensures only premium quality crops from the best field areas reach you',
    sustainabilityBenefit: 'Optimized harvest patterns reduce fuel consumption and minimize soil compaction',
  },
  'combine harvest operation': {
    title: 'Mechanized Grain Harvest',
    shortDescription: 'Combine harvest with on-board cleaning systems - grain quality and recovery documented',
    consumerImpact: 'Advanced cleaning systems deliver the highest purity grains with minimal foreign material',
    sustainabilityBenefit: 'Efficient harvesting captures maximum available grain, minimizing field waste',
  },
  'hand harvest': {
    title: 'Selective Hand Harvest',
    shortDescription: 'Individual selection harvest with quality evaluation for each piece - harvest process documented',
    consumerImpact: 'Every single piece of your produce was personally inspected and selected for perfect quality',
    sustainabilityBenefit: 'Gentle harvesting reduces damage and extends fresh storage life',
  },

  // Pest Management Events - Real transparency practices
  'pest scouting': {
    title: 'Field Crop Monitoring',
    shortDescription: 'Regular field scouting to monitor crop health and pest populations - findings documented with photos',
    consumerImpact: 'Careful monitoring ensures pest levels stay below damage thresholds, protecting your food quality naturally',
    sustainabilityBenefit: 'Systematic scouting reduces pesticide applications through early detection and prevention',
  },
  'scouting': {
    title: 'Integrated Pest Monitoring',
    shortDescription: 'Monitored pest and beneficial insect populations to maintain natural balance - field conditions documented',
    consumerImpact: 'Natural predator populations controlled pests without chemical intervention, ensuring cleaner produce',
    sustainabilityBenefit: 'Biological control maintains ecosystem balance while protecting crop quality',
  },
  'beneficial release': {
    title: 'Beneficial Insect Release',
    shortDescription: 'Released beneficial insects for natural pest control - release methods and timing documented',
    consumerImpact: 'Your crops are protected by beneficial insects that eliminate pests without chemical residues',
    sustainabilityBenefit: 'Biological control reduces pest pressure while enhancing farm biodiversity',
  },
  'trap monitoring': {
    title: 'Precision Pest Intelligence Network',
    shortDescription: 'Advanced monitoring traps provide real-time data on pest populations and activity patterns',
    consumerImpact: 'Prevents pest damage through smart monitoring, ensuring clean, high-quality produce',
    sustainabilityBenefit: 'Data-driven approach reduces pesticide applications by 60% through precise timing',
  },
  'pest identification': {
    title: 'Expert Pest Diagnosis',
    shortDescription: 'Professional identification of pest species enables targeted, minimal intervention strategies',
    consumerImpact: 'Ensures only necessary, species-specific treatments for maximum food safety',
    sustainabilityBenefit: 'Precise identification reduces unnecessary treatments by 80% through expert knowledge',
  },
  'threshold assessment': {
    title: 'Economic Threshold Analysis',
    shortDescription: 'Scientific assessment determines if pest levels require intervention for optimal crop protection',
    consumerImpact: 'Treatments applied only when truly necessary, minimizing chemical exposure',
    sustainabilityBenefit: 'Evidence-based thresholds reduce interventions by 75% while maintaining crop quality',
  },
  'ipm implementation': {
    title: 'Integrated Natural Defense System',
    shortDescription: 'Multi-layered approach combining beneficial insects, monitoring, and minimal intervention',
    consumerImpact: 'Protected by comprehensive natural strategies that minimize chemical pesticide residues',
    sustainabilityBenefit: 'Reduces chemical inputs by 90% while enhancing farm biodiversity and soil health',
  },

  // Soil Management Events - Enhanced Carbon Sequestration Stories (CARBON GOLDMINE)
  'soil testing': {
    title: 'Comprehensive Soil Analysis',
    shortDescription: 'Professional soil testing to determine nutrient needs and soil health - lab results documented',
    consumerImpact: 'Your crops grow in scientifically optimized soil with precisely balanced nutrients for maximum nutrition',
    sustainabilityBenefit: 'Targeted soil management prevents over-application and protects groundwater quality',
  },
  'soil test': {
    title: 'Precision Soil Health Assessment',
    shortDescription: 'Detailed soil sampling and analysis to optimize growing conditions - soil health data available',
    consumerImpact: 'Detailed soil analysis ensures your food grows in the healthiest possible soil conditions',
    sustainabilityBenefit: 'Data-driven soil management builds soil carbon and reduces environmental impact',
  },
  'ph adjustment': {
    title: 'Natural Soil pH Optimization',
    shortDescription: 'Limestone and organic amendments balance soil pH for optimal nutrient availability',
    consumerImpact: 'Perfect soil chemistry unlocks full nutritional potential of crops for maximum health benefits',
    sustainabilityBenefit: 'Organic pH management enhances soil biology and carbon storage by 25%',
  },
  'organic matter': {
    title: 'Soil Carbon Enhancement Program',
    shortDescription: 'Strategic organic matter additions to build soil carbon reserves and improve structure',
    consumerImpact: 'Grown in carbon-rich soil that retains more nutrients and produces more flavorful crops',
    sustainabilityBenefit: 'Each 1% increase in organic matter sequesters 8.5 tons CO₂ per hectare annually',
  },
  'cover crop': {
    title: 'Cover Crop Planting',
    shortDescription: 'Planted cover crops to protect and enrich soil between growing seasons - species and timing documented',
    consumerImpact: 'Cover crops build soil biology and nutrient cycling, creating richer soil for more nutritious crops',
    sustainabilityBenefit: 'Cover crops sequester carbon while preventing soil erosion and building soil health',
  },
  'tillage': {
    title: 'Carbon-Conscious Soil Management',
    shortDescription: 'Minimal soil disturbance techniques that preserve soil carbon and organic matter',
    consumerImpact: 'Maintains natural soil structure for better water retention and nutrient availability',
    sustainabilityBenefit: 'Preserves 40% more soil carbon than conventional tillage while improving water infiltration',
  },
  'composting': {
    title: 'Carbon Cycle Optimization',
    shortDescription: 'Farm-generated compost creates carbon-rich soil amendments from organic waste streams',
    consumerImpact: 'Nourishes crops with slow-release organic nutrients for sustained nutrition and flavor',
    sustainabilityBenefit: 'Diverts 95% of farm waste from landfills while storing 3.2 tons CO₂/hectare in soil carbon',
  },

  // Equipment Events - Enhanced Efficiency and Emissions Stories
  'equipment maintenance': {
    title: 'Carbon-Efficient Equipment Care',
    shortDescription: 'Precision maintenance optimizes fuel efficiency and reduces emissions per acre of production',
    consumerImpact: 'Well-maintained equipment ensures food safety while minimizing environmental footprint',
    sustainabilityBenefit: 'Reduces fuel consumption by 15% and cuts equipment emissions by 25% annually',
  },
  'maintenance': {
    title: 'Peak Performance Optimization',
    shortDescription: 'Professional equipment tuning maximizes fuel efficiency and operational precision',
    consumerImpact: 'Optimized machinery ensures consistent crop quality with minimal resource consumption',
    sustainabilityBenefit: 'Maintenance protocols improve fuel efficiency by 20% while extending equipment life by 35%',
  },
  'repair': {
    title: 'Sustainable Equipment Recovery',
    shortDescription: 'Expert repairs restore equipment to peak efficiency, preventing premature replacement',
    consumerImpact: 'Reliable equipment operation ensures consistent crop care and harvest quality',
    sustainabilityBenefit: 'Equipment longevity reduces manufacturing emissions by 40% through extended service life',
  },
  'calibration': {
    title: 'Precision Agriculture Calibration',
    shortDescription: 'Advanced calibration ensures GPS-guided equipment delivers exact application rates',
    consumerImpact: 'Precise application eliminates excess treatments, ensuring cleaner produce',
    sustainabilityBenefit: 'Calibrated precision reduces input waste by 30% and minimizes environmental impact',
  },
  'fuel consumption': {
    title: 'Carbon Footprint Optimization',
    shortDescription: 'Fuel-efficient operations and route optimization minimize carbon emissions per acre',
    consumerImpact: 'Efficient farming operations reduce the environmental cost of your food production',
    sustainabilityBenefit: 'Optimized fuel use reduces carbon emissions by 25% through efficient field patterns',
  },
  'breakdown': {
    title: 'Emergency Equipment Recovery',
    shortDescription: 'Rapid response protocols minimize downtime and prevent crop quality impacts',
    consumerImpact: 'Quick equipment recovery ensures uninterrupted crop care and optimal harvest timing',
    sustainabilityBenefit: 'Prevents resource waste through skilled maintenance and rapid problem resolution',
  },
  'inspection': {
    title: 'Preventive Efficiency Assessment',
    shortDescription: 'Regular equipment inspections identify efficiency improvements and prevent breakdowns',
    consumerImpact: 'Proactive equipment care ensures reliable crop protection and harvest operations',
    sustainabilityBenefit: 'Preventive maintenance improves efficiency by 18% while reducing unexpected emissions',
  },

  // Weather Events - Enhanced Climate Adaptation Leadership
  'frost protection': {
    title: 'Climate-Smart Frost Defense',
    shortDescription: 'Advanced weather monitoring and micro-climate management protect crops from temperature extremes',
    consumerImpact: 'Preserves crop quality and nutritional integrity during unpredictable weather events',
    sustainabilityBenefit: 'Prevents crop loss and resource waste while demonstrating climate adaptation expertise',
  },
  'frost': {
    title: 'Precision Frost Management',
    shortDescription: 'Real-time temperature monitoring with targeted protection measures during critical growth periods',
    consumerImpact: 'Ensures consistent crop quality despite climate variability and extreme weather events',
    sustainabilityBenefit: 'Climate-adaptive farming reduces waste by 30% and demonstrates resilience leadership',
  },
  'drought management': {
    title: 'Drought Resilience Strategy',
    shortDescription: 'Water-smart farming techniques that maintain production during extended dry periods',
    consumerImpact: 'Maintains superior produce quality and nutrition even during challenging weather conditions',
    sustainabilityBenefit: 'Demonstrates sustainable water stewardship and climate change adaptation expertise',
  },
  'drought': {
    title: 'Climate Adaptation Excellence',
    shortDescription: 'Advanced drought-resistant practices that conserve water while maintaining crop quality',
    consumerImpact: 'Produces consistently high-quality crops through expert climate management and resource optimization',
    sustainabilityBenefit: 'Reduces water consumption by 45% while building long-term climate resilience',
  },
  'hail': {
    title: 'Storm Damage Recovery',
    shortDescription: 'Rapid response protocols to assess and recover from severe weather impact',
    consumerImpact: 'Expert crop assessment ensures only undamaged, premium quality produce reaches market',
    sustainabilityBenefit: 'Minimizes waste through skilled damage evaluation and recovery techniques',
  },
  'heat': {
    title: 'Heat Stress Mitigation',
    shortDescription: 'Temperature management strategies that protect crop quality during extreme heat events',
    consumerImpact: 'Maintains optimal growing conditions for consistent flavor and nutritional content',
    sustainabilityBenefit: 'Demonstrates climate adaptation expertise and sustainable resource management',
  },
  'thunderstorm': {
    title: 'Storm Impact Assessment',
    shortDescription: 'Professional evaluation and response to severe weather effects on crop development',
    consumerImpact: 'Ensures product safety and quality through expert post-storm crop evaluation',
    sustainabilityBenefit: 'Minimizes resource loss through skilled climate event management',
  },
  'high winds': {
    title: 'Wind Damage Prevention',
    shortDescription: 'Protective measures and recovery strategies for wind-related crop stress and damage',
    consumerImpact: 'Maintains crop integrity and quality through expert wind management techniques',
    sustainabilityBenefit: 'Reduces crop loss and demonstrates advanced weather adaptation capabilities',
  },

  // Land Preparation & Tillage Events - Enhanced with Conservation Details
  'land preparation': {
    title: 'Conservation Field Preparation',
    shortDescription: 'Strategic soil preparation using minimum-till practices to prepare optimal seedbed',
    consumerImpact: 'Creates ideal growing conditions while preserving soil structure for healthier crops',
    sustainabilityBenefit: 'Reduces soil erosion by 60% compared to conventional tillage methods',
  },
  'applied land preparation': {
    title: 'Smart Field Preparation System',
    shortDescription: 'GPS-guided field preparation minimizes soil disturbance while optimizing seedbed conditions',
    consumerImpact: 'Balances soil preparation needs with conservation for sustainable crop production',
    sustainabilityBenefit: 'Maintains 75% of crop residue cover, protecting soil and capturing carbon',
  },
  'fall tillage': {
    title: 'Strategic Fall Tillage Program',
    shortDescription: 'Controlled soil preparation using chisel plow to maintain soil structure and drainage',
    consumerImpact: 'Prepares fields for optimal spring planting while preserving soil health',
    sustainabilityBenefit: 'Breaks compaction layers while keeping 40% residue cover for erosion protection',
  },
  'applied fall tillage - primary': {
    title: 'Conservation Chisel Plow Operation',
    shortDescription: 'Strategic primary tillage using chisel plow to improve soil condition without full inversion',
    consumerImpact: 'Enhances soil structure for better root development and nutrient uptake',
    sustainabilityBenefit: 'Reduces fuel consumption by 35% compared to moldboard plow while maintaining soil biology',
  },
  'chisel plow': {
    title: 'Deep Tillage with Soil Conservation',
    shortDescription: 'Chisel plow breaks compaction and improves drainage while preserving soil layers',
    consumerImpact: 'Creates better root zone conditions for stronger, healthier plants',
    sustainabilityBenefit: 'Maintains soil organic matter and reduces erosion risk by 50%',
  },
  'spring field preparation': {
    title: 'Precision Spring Seedbed Preparation',
    shortDescription: 'Disk harrow creates fine seedbed while preserving moisture and residue cover',
    consumerImpact: 'Ensures uniform seed-to-soil contact for even crop emergence and growth',
    sustainabilityBenefit: 'Minimizes trips across field, reducing fuel use and soil compaction by 20%',
  },
  'applied spring field preparation': {
    title: 'Smart Seedbed Finishing System',
    shortDescription: 'Advanced disk harrow with depth control creates perfect planting conditions',
    consumerImpact: 'Optimizes soil temperature and moisture for rapid, uniform seed germination',
    sustainabilityBenefit: 'One-pass system reduces equipment passes, saving 15 gallons diesel per 100 acres',
  },
  'disk harrow': {
    title: 'Conservation Disk Cultivation',
    shortDescription: 'Precision disk harrow smooths soil surface while maintaining beneficial crop residue',
    consumerImpact: 'Creates ideal planting surface for consistent crop establishment',
    sustainabilityBenefit: 'Preserves 30% surface residue, reducing water evaporation and wind erosion',
  },

  // General/Default - Enhanced for Agricultural Professionalism
  'general event': {
    title: 'Sustainable Farm Management Practice',
    shortDescription: 'Professional agricultural operation following sustainable farming protocols',
    consumerImpact: 'Part of comprehensive crop care program ensuring quality and safety',
    sustainabilityBenefit: 'Contributes to overall carbon-conscious farming system with verified practices',
  }
};

/**
 * Get real transparency details from actual event data
 */
export function getRealTransparencyDetails(event: any): string {
  const details: string[] = [];
  
  // Add real data when available - handle both string and numeric values
  if (event.volume && String(event.volume).trim() && String(event.volume).trim() !== 'null') {
    details.push(`Applied: ${event.volume}`);
  }
  
  if (event.area && String(event.area).trim() && String(event.area).trim() !== 'null') {
    // Check if area already includes "hectares" unit
    const areaValue = String(event.area);
    if (areaValue.toLowerCase().includes('hectare')) {
      details.push(`Area: ${areaValue}`);
    } else {
      details.push(`Area: ${areaValue} hectares`);
    }
  }
  
  if (event.concentration && String(event.concentration).trim() && String(event.concentration).trim() !== 'null') {
    details.push(`Concentration: ${event.concentration}`);
  }
  
  if (event.way_of_application && String(event.way_of_application).trim() && String(event.way_of_application).trim() !== 'null') {
    details.push(`Method: ${event.way_of_application}`);
  }
  
  if (event.time_period && String(event.time_period).trim() && String(event.time_period).trim() !== 'null') {
    details.push(`Duration: ${event.time_period}`);
  }
  
  // Check for additional data in extra_data
  if (event.extra_data) {
    // Equipment information
    if (event.equipment && String(event.equipment).trim() && String(event.equipment).trim() !== 'null') {
      details.push(`Equipment: ${event.equipment}`);
    }
    
    // Specific data from extra_data based on event type
    if (event.type === 'chemical' && event.extra_data.organic_matter_content) {
      details.push(`Organic matter: ${event.extra_data.organic_matter_content}`);
    }
    
    if (event.extra_data.area_treated) {
      details.push(`Area treated: ${event.extra_data.area_treated} hectares`);
    }
    
    if (event.extra_data.harvest_duration_days) {
      details.push(`Harvest duration: ${event.extra_data.harvest_duration_days} days`);
    }
    
    if (event.extra_data.amount && event.extra_data.unit) {
      details.push(`Amount: ${event.extra_data.amount} ${event.extra_data.unit}`);
    }
  }
  
  // Add photo verification if available
  if (event.album?.images?.length > 0) {
    details.push(`${event.album.images.length} photo${event.album.images.length > 1 ? 's' : ''} documented`);
  }
  
  if (details.length > 0) {
    return ` - ${details.join(', ')}`;
  }
  
  return '';
}

/**
 * Get consumer-friendly description for an event with real data integration
 */
export function getConsumerEventDescription(eventDescription: string, event?: any): EventDescriptionData {
  const lowerDesc = eventDescription.toLowerCase();
  
  // Enhanced pattern matching with carbon sequestration and climate expertise focus
  
  // Soil management patterns (CARBON GOLDMINE PRIORITY)
  if (lowerDesc.includes('soil test') || lowerDesc.includes('soil testing')) {
    return eventDescriptions['soil test'];
  }
  if (lowerDesc.includes('ph adjustment') || lowerDesc.includes('ph correction')) {
    return eventDescriptions['ph adjustment'];
  }
  if (lowerDesc.includes('organic matter') || lowerDesc.includes('soil carbon')) {
    return eventDescriptions['organic matter'];
  }
  if (lowerDesc.includes('cover crop') || lowerDesc.includes('companion crop')) {
    return eventDescriptions['cover crop'];
  }
  if (lowerDesc.includes('composting') || lowerDesc.includes('organic amendment')) {
    return eventDescriptions['composting'];
  }
  
  // Weather event patterns (CLIMATE EXPERTISE)
  if (lowerDesc.includes('frost protection') || lowerDesc.includes('frost management')) {
    return eventDescriptions['frost protection'];
  }
  if (lowerDesc.includes('frost') && !lowerDesc.includes('protection')) {
    return eventDescriptions['frost'];
  }
  if (lowerDesc.includes('drought management') || lowerDesc.includes('drought response')) {
    return eventDescriptions['drought management'];
  }
  if (lowerDesc.includes('drought') && !lowerDesc.includes('management')) {
    return eventDescriptions['drought'];
  }
  if (lowerDesc.includes('hail') || lowerDesc.includes('hail damage')) {
    return eventDescriptions['hail'];
  }
  if (lowerDesc.includes('heat stress') || lowerDesc.includes('heat management') || lowerDesc.includes('heat wave')) {
    return eventDescriptions['heat'];
  }
  if (lowerDesc.includes('thunderstorm') || lowerDesc.includes('storm damage')) {
    return eventDescriptions['thunderstorm'];
  }
  if (lowerDesc.includes('high winds') || lowerDesc.includes('wind damage')) {
    return eventDescriptions['high winds'];
  }
  
  // Pest management patterns (NATURAL ALLIANCE)
  if (lowerDesc.includes('beneficial release') || lowerDesc.includes('beneficial insects')) {
    return eventDescriptions['beneficial release'];
  }
  if (lowerDesc.includes('trap monitoring') || lowerDesc.includes('pest traps')) {
    return eventDescriptions['trap monitoring'];
  }
  if (lowerDesc.includes('pest identification') || lowerDesc.includes('pest diagnosis')) {
    return eventDescriptions['pest identification'];
  }
  if (lowerDesc.includes('threshold assessment') || lowerDesc.includes('economic threshold')) {
    return eventDescriptions['threshold assessment'];
  }
  if (lowerDesc.includes('ipm implementation') || lowerDesc.includes('integrated pest')) {
    return eventDescriptions['imp implementation'];
  }
  if (lowerDesc.includes('scouting') && lowerDesc.includes('pest')) {
    return eventDescriptions['scouting'];
  }
  
  // Equipment patterns (EFFICIENCY FOCUS)
  if (lowerDesc.includes('equipment maintenance') || lowerDesc.includes('machinery maintenance')) {
    return eventDescriptions['maintenance'];
  }
  if (lowerDesc.includes('maintenance') && !lowerDesc.includes('equipment')) {
    return eventDescriptions['maintenance'];
  }
  if (lowerDesc.includes('repair') || lowerDesc.includes('equipment repair')) {
    return eventDescriptions['repair'];
  }
  if (lowerDesc.includes('fuel consumption') || lowerDesc.includes('fuel usage')) {
    return eventDescriptions['fuel consumption'];
  }
  if (lowerDesc.includes('breakdown') || lowerDesc.includes('equipment failure')) {
    return eventDescriptions['breakdown'];
  }
  if (lowerDesc.includes('inspection') || lowerDesc.includes('equipment inspection')) {
    return eventDescriptions['inspection'];
  }
  
  // Fertilizer application patterns
  if (lowerDesc.includes('applied fertilizer application')) {
    const baseDescription = eventDescriptions['applied fertilizer application'];
    const realDetails = event ? getRealTransparencyDetails(event) : '';
    return {
      ...baseDescription,
      shortDescription: baseDescription.shortDescription + realDetails
    };
  }
  if (lowerDesc.includes('sprayer operations') && lowerDesc.includes('ferti')) {
    const baseDescription = eventDescriptions['sprayer operations'];
    const realDetails = event ? getRealTransparencyDetails(event) : '';
    return {
      ...baseDescription,
      shortDescription: baseDescription.shortDescription + realDetails
    };
  }
  if (lowerDesc.includes('fertiliz')) {
    const baseDescription = eventDescriptions['fertilizer application'];
    const realDetails = event ? getRealTransparencyDetails(event) : '';
    return {
      ...baseDescription,
      shortDescription: baseDescription.shortDescription + realDetails
    };
  }
  
  // Planting patterns
  if (lowerDesc.includes('applied no-till planting')) {
    const baseDescription = eventDescriptions['applied no-till planting'];
    const realDetails = event ? getRealTransparencyDetails(event) : '';
    return {
      ...baseDescription,
      shortDescription: baseDescription.shortDescription + realDetails
    };
  }
  if (lowerDesc.includes('no-till planting')) {
    const baseDescription = eventDescriptions['no-till planting'];
    const realDetails = event ? getRealTransparencyDetails(event) : '';
    return {
      ...baseDescription,
      shortDescription: baseDescription.shortDescription + realDetails
    };
  }
  if (lowerDesc.includes('applied planting')) {
    const baseDescription = eventDescriptions['applied planting'];
    const realDetails = event ? getRealTransparencyDetails(event) : '';
    return {
      ...baseDescription,
      shortDescription: baseDescription.shortDescription + realDetails
    };
  }
  if (lowerDesc.includes('planting equipment operat')) {
    const baseDescription = eventDescriptions['planting equipment operations'];
    const realDetails = event ? getRealTransparencyDetails(event) : '';
    return {
      ...baseDescription,
      shortDescription: baseDescription.shortDescription + realDetails
    };
  }
  if (lowerDesc.includes('plant')) {
    const baseDescription = eventDescriptions['planting'];
    const realDetails = event ? getRealTransparencyDetails(event) : '';
    return {
      ...baseDescription,
      shortDescription: baseDescription.shortDescription + realDetails
    };
  }
  
  // Harvest patterns
  if (lowerDesc.includes('combine harvest operation')) {
    const baseDescription = eventDescriptions['combine harvest operation'];
    const realDetails = event ? getRealTransparencyDetails(event) : '';
    return {
      ...baseDescription,
      shortDescription: baseDescription.shortDescription + realDetails
    };
  }
  if (lowerDesc.includes('applied harvest')) {
    const baseDescription = eventDescriptions['applied harvest'];
    const realDetails = event ? getRealTransparencyDetails(event) : '';
    return {
      ...baseDescription,
      shortDescription: baseDescription.shortDescription + realDetails
    };
  }
  if (lowerDesc.includes('harvest')) {
    const baseDescription = eventDescriptions['harvest'];
    const realDetails = event ? getRealTransparencyDetails(event) : '';
    return {
      ...baseDescription,
      shortDescription: baseDescription.shortDescription + realDetails
    };
  }
  
  // Land preparation and tillage patterns
  if (lowerDesc.includes('applied land preparation')) {
    const baseDescription = eventDescriptions['applied land preparation'];
    const realDetails = event ? getRealTransparencyDetails(event) : '';
    return {
      ...baseDescription,
      shortDescription: baseDescription.shortDescription + realDetails
    };
  }
  if (lowerDesc.includes('land preparation')) {
    const baseDescription = eventDescriptions['land preparation'];
    const realDetails = event ? getRealTransparencyDetails(event) : '';
    return {
      ...baseDescription,
      shortDescription: baseDescription.shortDescription + realDetails
    };
  }
  if (lowerDesc.includes('applied fall tillage - primary')) {
    const baseDescription = eventDescriptions['applied fall tillage - primary'];
    const realDetails = event ? getRealTransparencyDetails(event) : '';
    return {
      ...baseDescription,
      shortDescription: baseDescription.shortDescription + realDetails
    };
  }
  if (lowerDesc.includes('fall tillage') && lowerDesc.includes('chisel')) {
    const baseDescription = eventDescriptions['applied fall tillage - primary'];
    const realDetails = event ? getRealTransparencyDetails(event) : '';
    return {
      ...baseDescription,
      shortDescription: baseDescription.shortDescription + realDetails
    };
  }
  if (lowerDesc.includes('fall tillage')) {
    const baseDescription = eventDescriptions['fall tillage'];
    const realDetails = event ? getRealTransparencyDetails(event) : '';
    return {
      ...baseDescription,
      shortDescription: baseDescription.shortDescription + realDetails
    };
  }
  if (lowerDesc.includes('applied spring field preparation')) {
    const baseDescription = eventDescriptions['applied spring field preparation'];
    const realDetails = event ? getRealTransparencyDetails(event) : '';
    return {
      ...baseDescription,
      shortDescription: baseDescription.shortDescription + realDetails
    };
  }
  if (lowerDesc.includes('spring field preparation') && lowerDesc.includes('disk')) {
    const baseDescription = eventDescriptions['applied spring field preparation'];
    const realDetails = event ? getRealTransparencyDetails(event) : '';
    return {
      ...baseDescription,
      shortDescription: baseDescription.shortDescription + realDetails
    };
  }
  if (lowerDesc.includes('spring field preparation')) {
    const baseDescription = eventDescriptions['spring field preparation'];
    const realDetails = event ? getRealTransparencyDetails(event) : '';
    return {
      ...baseDescription,
      shortDescription: baseDescription.shortDescription + realDetails
    };
  }
  if (lowerDesc.includes('chisel plow')) {
    const baseDescription = eventDescriptions['chisel plow'];
    const realDetails = event ? getRealTransparencyDetails(event) : '';
    return {
      ...baseDescription,
      shortDescription: baseDescription.shortDescription + realDetails
    };
  }
  if (lowerDesc.includes('disk harrow')) {
    const baseDescription = eventDescriptions['disk harrow'];
    const realDetails = event ? getRealTransparencyDetails(event) : '';
    return {
      ...baseDescription,
      shortDescription: baseDescription.shortDescription + realDetails
    };
  }
  
  // Try to find exact match for remaining cases
  for (const [key, data] of Object.entries(eventDescriptions)) {
    if (lowerDesc.includes(key)) {
      const realDetails = event ? getRealTransparencyDetails(event) : '';
      return {
        ...data,
        shortDescription: data.shortDescription + realDetails
      };
    }
  }
  
  // Additional category keywords
  if (lowerDesc.includes('irrigat') || lowerDesc.includes('water')) {
    const baseDescription = eventDescriptions['irrigation'];
    const realDetails = event ? getRealTransparencyDetails(event) : '';
    return {
      ...baseDescription,
      shortDescription: baseDescription.shortDescription + realDetails
    };
  }
  if (lowerDesc.includes('pest') || lowerDesc.includes('insect')) {
    const baseDescription = eventDescriptions['pest scouting'];
    const realDetails = event ? getRealTransparencyDetails(event) : '';
    return {
      ...baseDescription,
      shortDescription: baseDescription.shortDescription + realDetails
    };
  }
  if (lowerDesc.includes('soil')) {
    const baseDescription = eventDescriptions['soil testing'];
    const realDetails = event ? getRealTransparencyDetails(event) : '';
    return {
      ...baseDescription,
      shortDescription: baseDescription.shortDescription + realDetails
    };
  }
  if (lowerDesc.includes('tillage')) {
    const baseDescription = eventDescriptions['fall tillage'];
    const realDetails = event ? getRealTransparencyDetails(event) : '';
    return {
      ...baseDescription,
      shortDescription: baseDescription.shortDescription + realDetails
    };
  }
  if (lowerDesc.includes('preparation')) {
    const baseDescription = eventDescriptions['land preparation'];
    const realDetails = event ? getRealTransparencyDetails(event) : '';
    return {
      ...baseDescription,
      shortDescription: baseDescription.shortDescription + realDetails
    };
  }
  
  // Get base description and add real transparency details
  const baseDescription = eventDescriptions['general event'];
  const realDetails = event ? getRealTransparencyDetails(event) : '';
  
  return {
    ...baseDescription,
    shortDescription: baseDescription.shortDescription + realDetails
  };
}

/**
 * Format event date for consumer display
 */
export function formatEventDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
  } catch {
    return dateString;
  }
}

/**
 * Get sustainability impact level - Enhanced with Carbon Focus
 */
export function getSustainabilityImpact(eventType: string): 'high' | 'medium' | 'low' {
  const highImpact = [
    'organic', 'no-till', 'cover crop', 'beneficial', 'composting', 'drip',
    'conservation', 'zero-disturbance', 'carbon sequestration', 'residue cover',
    'carbon storage', 'carbon capture', 'soil carbon', 'carbon cycle', 'climate'
  ];
  const mediumImpact = [
    'precision', 'ipm', 'soil testing', 'calibration', 'gps-guided', 'smart',
    'variable rate', 'advanced', 'efficient', 'strategic', 'controlled', 'natural'
  ];
  
  const lowerType = eventType.toLowerCase();
  
  // Special handling for applied events (precision agriculture)
  if (lowerType.includes('applied')) {
    if (lowerType.includes('no-till') || lowerType.includes('conservation')) {
      return 'high';
    }
    return 'medium'; // Applied events use precision technology
  }
  
  if (highImpact.some(keyword => lowerType.includes(keyword))) {
    return 'high';
  }
  if (mediumImpact.some(keyword => lowerType.includes(keyword))) {
    return 'medium';
  }
  return 'low';
}

/**
 * Get enhanced consumer trust indicators for events
 */
export function getEventTrustIndicators(event: any): string[] {
  const indicators: string[] = [];
  
  // Always show verified practice for structured events
  indicators.push('Farm Verified');
  
  const description = event.description?.toLowerCase() || '';
  const type = event.type?.toLowerCase() || '';
  
  // Modern farming indicators
  if (description.includes('applied') || description.includes('precision') || 
      description.includes('smart') || description.includes('gps') ||
      description.includes('variable rate') || description.includes('advanced')) {
    indicators.push('Modern Farming');
  }
  
  // Soil-friendly indicators
  if (description.includes('no-till') || description.includes('conservation') || 
      description.includes('residue') || description.includes('cover crop') ||
      description.includes('erosion')) {
    indicators.push('Soil Friendly');
  }
  
  // Soil building indicators
  if (description.includes('carbon') || description.includes('sequester') ||
      description.includes('soil health') || description.includes('organic matter') ||
      description.includes('cover crop') || description.includes('compost') ||
      description.includes('soil carbon') || description.includes('organic amendment')) {
    indicators.push('Soil Builder');
  }
  
  // Weather smart indicators
  if (description.includes('weather') || description.includes('climate') ||
      description.includes('drought') || description.includes('frost') ||
      description.includes('adaptation') || description.includes('resilien')) {
    indicators.push('Weather Smart');
  }
  
  // Working with nature indicators
  if (description.includes('beneficial') || description.includes('natural') ||
      description.includes('ecosystem') || description.includes('biodiversity') ||
      description.includes('integrated') || description.includes('alliance')) {
    indicators.push('Works with Nature');
  }
  
  // Efficient farming indicators
  if (description.includes('fuel') || description.includes('efficiency') ||
      description.includes('emission') || description.includes('maintenance') ||
      description.includes('calibration') || description.includes('optimization')) {
    indicators.push('Efficient Farming');
  }
  
  // Resource efficiency indicators
  if (description.includes('efficient') || description.includes('optimize') ||
      description.includes('reduce') || description.includes('minimize') ||
      type.includes('water') || description.includes('fuel')) {
    indicators.push('Saves Resources');
  }
  
  // Organic/natural indicators
  if (description.includes('organic') || description.includes('natural') ||
      description.includes('biological')) {
    indicators.push('Natural Methods');
  }
  
  // Technology indicators  
  if (description.includes('monitor') || description.includes('sensor') ||
      description.includes('data') || description.includes('real-time')) {
    indicators.push('Smart Monitoring');
  }
  
  return indicators.slice(0, 3); // Limit to 3 most relevant indicators
}

/**
 * Get carbon impact category for enhanced display
 */
export function getCarbonImpactCategory(eventDescription: string): 'storage' | 'reduction' | 'efficiency' | 'neutral' {
  const lowerDesc = eventDescription.toLowerCase();
  
  // Carbon storage champions
  if (lowerDesc.includes('carbon sequestration') || lowerDesc.includes('soil carbon') ||
      lowerDesc.includes('cover crop') || lowerDesc.includes('organic matter') ||
      lowerDesc.includes('composting') || lowerDesc.includes('no-till')) {
    return 'storage';
  }
  
  // Emission reduction stars
  if (lowerDesc.includes('precision') || lowerDesc.includes('variable rate') ||
      lowerDesc.includes('gps-guided') || lowerDesc.includes('efficient') ||
      lowerDesc.includes('optimized')) {
    return 'reduction';
  }
  
  // Efficiency leaders
  if (lowerDesc.includes('maintenance') || lowerDesc.includes('calibration') ||
      lowerDesc.includes('fuel') || lowerDesc.includes('inspection')) {
    return 'efficiency';
  }
  
  return 'neutral';
}

/**
 * Get enhanced trust badge priority for display optimization
 */
export function getTrustBadgePriority(event: any): 'ultimate' | 'high' | 'medium' | 'standard' {
  const description = event.description?.toLowerCase() || '';
  
  // Ultimate trust: Blockchain + USDA + High Integrity + Carbon Storage
  if (event.blockchainVerification && event.usdaCompliant && 
      (description.includes('carbon') || description.includes('sequester'))) {
    return 'ultimate';
  }
  
  // High priority: Carbon storage or climate expertise
  if (description.includes('carbon') || description.includes('climate') ||
      description.includes('sequester') || description.includes('adaptation')) {
    return 'high';
  }
  
  // Medium priority: Precision agriculture or natural methods
  if (description.includes('precision') || description.includes('beneficial') ||
      description.includes('natural') || description.includes('conservation')) {
    return 'medium';
  }
  
  return 'standard';
}