// ✅ NEW 6-STEP PARCEL FORM CONTENT - Production Ready
// This file contains the replacement step content for StandardParcelForm.tsx

/* 
STEP STRUCTURE (Backend-Supported Fields Only):
- Step 0: Basic Info (name, area) - REQUIRED
- Step 1: Location (polygon) - REQUIRED  
- Step 2: Description - REQUIRED
- Step 3: Contact Details (optional)
- Step 4: Agricultural Details (optional)
- Step 5: Certification & Media (optional)
*/

// Replace the step content section with this:

export const NEW_STEP_CONTENT = `
          {/* ✅ STEP 0: Basic Information */}
          {currentStep === 0 && (
            <StandardCard title="Parcel Information" subtitle="Essential details about your parcel">
              <VStack spacing={6} align="stretch">
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <StandardField
                    label="Parcel Name"
                    required
                    error={errors.name?.message}
                    helpText="Enter a descriptive name for this parcel">
                    <StandardInput
                      {...methods.register('name')}
                      placeholder="e.g., North Field, Orchard Block A"
                      isInvalid={!!errors.name}
                    />
                  </StandardField>

                  <StandardField
                    label="Area (Hectares)"
                    required
                    error={errors.area?.message}
                    helpText="Total area of the parcel in hectares">
                    <NumberInput
                      value={watch('area') || ''}
                      onChange={(_, num) => setValue('area', num || 0)}
                      min={0.01}
                      step={0.01}
                      precision={2}>
                      <NumberInputField />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  </StandardField>
                </SimpleGrid>

                {/* Navigation */}
                <HStack spacing={3} justify="space-between" pt={4}>
                  <Box /> {/* Empty space for alignment */}
                  <HStack spacing={3}>
                    <StandardButton variant="outline" onClick={onCancel}>
                      Cancel
                    </StandardButton>
                    <StandardButton
                      rightIcon={<FaChevronRight />}
                      onClick={nextStep}
                      isDisabled={!watch('name') || !watch('area') || watch('area') <= 0}>
                      Continue to Location
                    </StandardButton>
                  </HStack>
                </HStack>
              </VStack>
            </StandardCard>
          )}

          {/* ✅ STEP 1: Location */}
          {currentStep === 1 && (
            <StandardCard title="Parcel Location" subtitle="Define the boundaries on the map">
              <VStack spacing={6} align="stretch">
                {!isLoaded ? (
                  <Box textAlign="center" py={8}>
                    <Text>Loading Google Maps...</Text>
                  </Box>
                ) : loadError ? (
                  <StandardAlert
                    status="error"
                    title="Map Loading Error"
                    description="Unable to load Google Maps. Please check your internet connection."
                  />
                ) : (
                  <Box>
                    <Text mb={4} color="gray.600">
                      Use the drawing tools to outline your parcel boundaries on the map.
                    </Text>
                    <Box borderRadius="xl" overflow="hidden" h="500px">
                      <GoogleMap
                        mapContainerStyle={{ width: '100%', height: '100%' }}
                        center={mapCenter}
                        zoom={mapZoom}
                        onLoad={onLoad}
                        onUnmount={onUnmount}
                        options={{ 
                          mapTypeControl: true,
                          streetViewControl: false,
                          fullscreenControl: false,
                          zoomControl: true,
                          drawingMode: google.maps.drawing.OverlayType.POLYGON
                        }}>
                        {polygon && (
                          <Polygon
                            paths={polygon}
                            options={{
                              fillColor: '#38A169',
                              fillOpacity: 0.3,
                              strokeColor: '#38A169',
                              strokeOpacity: 0.8,
                              strokeWeight: 2,
                              editable: true,
                              draggable: false
                            }}
                            onMouseUp={updatePolygon}
                          />
                        )}
                      </GoogleMap>
                    </Box>
                    {polygon && polygon.length > 0 && (
                      <StandardAlert
                        status="success"
                        title="Polygon Defined"
                        description={\`Parcel boundary set with \${polygon.length} points\`}
                        mt={4}
                      />
                    )}
                  </Box>
                )}

                {/* Navigation */}
                <HStack spacing={3} justify="space-between" pt={4}>
                  <StandardButton
                    variant="outline"
                    leftIcon={<FaChevronLeft />}
                    onClick={previousStep}>
                    Back to Basic Info
                  </StandardButton>
                  <HStack spacing={3}>
                    <StandardButton variant="outline" onClick={onCancel}>
                      Cancel
                    </StandardButton>
                    <StandardButton
                      rightIcon={<FaChevronRight />}
                      onClick={nextStep}
                      isDisabled={!polygon || polygon.length === 0}>
                      Continue to Description
                    </StandardButton>
                  </HStack>
                </HStack>
              </VStack>
            </StandardCard>
          )}

          {/* ✅ STEP 2: Description */}
          {currentStep === 2 && (
            <StandardCard title="Parcel Description" subtitle="Detailed information about the parcel">
              <VStack spacing={6} align="stretch">
                <StandardField
                  label="Description"
                  required
                  error={errors.description?.message}
                  helpText="Describe the parcel, its characteristics, soil type, drainage, etc.">
                  <Textarea
                    {...methods.register('description')}
                    placeholder="Describe the parcel including soil type, drainage, topography, existing vegetation, and any other relevant characteristics..."
                    borderRadius="lg"
                    borderColor="gray.300"
                    _hover={{ borderColor: 'green.400' }}
                    _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px #38A169' }}
                    size="lg"
                    minH="120px"
                  />
                </StandardField>

                {/* Navigation */}
                <HStack spacing={3} justify="space-between" pt={4}>
                  <StandardButton
                    variant="outline"
                    leftIcon={<FaChevronLeft />}
                    onClick={previousStep}>
                    Back to Location
                  </StandardButton>
                  <HStack spacing={3}>
                    <StandardButton variant="outline" onClick={onCancel}>
                      Cancel
                    </StandardButton>
                    <StandardButton
                      rightIcon={<FaChevronRight />}
                      onClick={nextStep}
                      isDisabled={!watch('description')}>
                      Continue to Contact Details
                    </StandardButton>
                  </HStack>
                </HStack>
              </VStack>
            </StandardCard>
          )}

          {/* ✅ STEP 3: Contact Details */}
          {currentStep === 3 && (
            <StandardCard title="Contact Details" subtitle="Contact information for this parcel (optional)">
              <VStack spacing={6} align="stretch">
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <StandardField
                    label="Contact Person"
                    error={errors.contact_person?.message}
                    helpText="Primary contact for this parcel">
                    <StandardInput
                      {...methods.register('contact_person')}
                      placeholder="e.g., Farm Manager Name"
                    />
                  </StandardField>

                  <StandardField
                    label="Contact Phone"
                    error={errors.contact_phone?.message}
                    helpText="Phone number for parcel contact">
                    <StandardInput
                      {...methods.register('contact_phone')}
                      placeholder="e.g., +1 555 123 4567"
                    />
                  </StandardField>

                  <StandardField
                    label="Contact Email"
                    error={errors.contact_email?.message}
                    helpText="Email address for parcel contact">
                    <StandardInput
                      {...methods.register('contact_email')}
                      type="email"
                      placeholder="e.g., manager@farm.com"
                    />
                  </StandardField>

                  <StandardField
                    label="Address"
                    error={errors.address?.message}
                    helpText="Specific address or location details">
                    <StandardInput
                      {...methods.register('address')}
                      placeholder="e.g., 123 Farm Road, County"
                    />
                  </StandardField>
                </SimpleGrid>

                {/* Navigation */}
                <HStack spacing={3} justify="space-between" pt={4}>
                  <StandardButton
                    variant="outline"
                    leftIcon={<FaChevronLeft />}
                    onClick={previousStep}>
                    Back to Description
                  </StandardButton>
                  <HStack spacing={3}>
                    <StandardButton variant="outline" onClick={onCancel}>
                      Cancel
                    </StandardButton>
                    <StandardButton
                      rightIcon={<FaChevronRight />}
                      onClick={nextStep}>
                      Continue to Agricultural Details
                    </StandardButton>
                  </HStack>
                </HStack>
              </VStack>
            </StandardCard>
          )}

          {/* ✅ STEP 4: Agricultural Details */}
          {currentStep === 4 && (
            <StandardCard title="Agricultural Details" subtitle="Agricultural specifications and codes (optional)">
              <VStack spacing={6} align="stretch">
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <StandardField
                    label="Soil Type"
                    error={errors.soil_type?.message}
                    helpText="Primary soil classification">
                    <StandardSelect
                      {...methods.register('soil_type')}
                      placeholder="Select soil type">
                      <option value="clay">Clay</option>
                      <option value="loam">Loam</option>
                      <option value="sand">Sand</option>
                      <option value="silt">Silt</option>
                      <option value="clay-loam">Clay Loam</option>
                      <option value="sandy-loam">Sandy Loam</option>
                      <option value="silty-loam">Silty Loam</option>
                      <option value="other">Other</option>
                    </StandardSelect>
                  </StandardField>

                  <StandardField
                    label="Unique Code"
                    error={errors.unique_code?.message}
                    helpText="Internal parcel code or identifier">
                    <StandardInput
                      {...methods.register('unique_code')}
                      placeholder="e.g., P001, FIELD-A, etc."
                    />
                  </StandardField>
                </SimpleGrid>

                {/* Navigation */}
                <HStack spacing={3} justify="space-between" pt={4}>
                  <StandardButton
                    variant="outline"
                    leftIcon={<FaChevronLeft />}
                    onClick={previousStep}>
                    Back to Contact Details
                  </StandardButton>
                  <HStack spacing={3}>
                    <StandardButton variant="outline" onClick={onCancel}>
                      Cancel
                    </StandardButton>
                    <StandardButton
                      rightIcon={<FaChevronRight />}
                      onClick={nextStep}>
                      Continue to Certification
                    </StandardButton>
                  </HStack>
                </HStack>
              </VStack>
            </StandardCard>
          )}

          {/* ✅ STEP 5: Certification & Media */}
          {currentStep === 5 && (
            <StandardCard title="Certification & Media" subtitle="Certification status and parcel images">
              <VStack spacing={6} align="stretch">
                {/* Certification */}
                <StandardField
                  label="Certification"
                  helpText="Mark this parcel as certified if it meets certification standards">
                  <VStack align="stretch" spacing={4}>
                    <HStack>
                      <Switch
                        {...methods.register('certified')}
                        isChecked={watch('certified')}
                        colorScheme="green"
                        size="lg"
                      />
                      <VStack align="start" spacing={1}>
                        <Text fontSize="md" fontWeight="medium">
                          Certified Parcel
                        </Text>
                        <Text fontSize="sm" color="gray.500">
                          This parcel meets professional certification standards
                        </Text>
                      </VStack>
                    </HStack>

                    {watch('certified') && (
                      <StandardField
                        label="Certification Type"
                        error={errors.certification_type?.message}
                        helpText="Type of certification this parcel holds">
                        <StandardSelect
                          {...methods.register('certification_type')}
                          placeholder="Select certification type">
                          <option value="organic">Organic</option>
                          <option value="gmo-free">Non-GMO</option>
                          <option value="sustainable">Sustainable Agriculture</option>
                          <option value="fair-trade">Fair Trade</option>
                          <option value="carbon-neutral">Carbon Neutral</option>
                          <option value="other">Other</option>
                        </StandardSelect>
                      </StandardField>
                    )}
                  </VStack>
                </StandardField>

                {/* Image Upload */}
                <StandardField
                  label="Parcel Images"
                  helpText="Upload up to 5 high-quality images (JPG, PNG, GIF, WEBP - max 5MB each)">
                  <TrazoImageUpload
                    maxFiles={5}
                    maxSize={5 * 1024 * 1024} // 5MB
                    existingImages={uploadedImageUrls}
                    onImagesChange={setUploadedImageUrls}
                    isLoading={false}
                  />
                </StandardField>

                {/* Final Navigation */}
                <HStack spacing={3} justify="space-between" pt={4}>
                  <StandardButton
                    variant="outline"
                    leftIcon={<FaChevronLeft />}
                    onClick={previousStep}>
                    Back to Agricultural Details
                  </StandardButton>

                  <HStack spacing={3}>
                    <StandardButton variant="outline" onClick={onCancel}>
                      Cancel
                    </StandardButton>
                    <StandardButton
                      type="submit"
                      isLoading={isLoading}
                      loadingText={isEdit ? 'Updating...' : 'Creating...'}
                      leftIcon={<FaCheckCircle />}>
                      {isEdit ? 'Update Parcel' : 'Create Parcel'}
                    </StandardButton>
                  </HStack>
                </HStack>
              </VStack>
            </StandardCard>
          )}
`;
