# 🚀 Next Steps Implementation - Setup Guide

## Overview

This guide covers the implementation of the next phase features:

1. **Project Redirections** instead of payment processing
2. **Sample Offset Entries** for Establishment La Primavera
3. **Enhanced Certified Projects** with registry URLs

## 🎯 **What's New**

### 1. Project Redirection System

- **No Payment Processing**: Users are redirected to external registries instead of processing payments
- **Smart Toast Notifications**: Interactive notifications with "View Project" buttons
- **Registry Integration**: Direct links to VCS, Gold Standard, CAR, and ACR registries
- **Verification Tracking**: External verification IDs stored for audit trails

### 2. Enhanced Certified Projects

- **5 Sample Projects**: Amazon conservation, wind energy, agriculture, biogas, mangrove restoration
- **Registry URLs**: Direct links to official project pages
- **Diverse Standards**: VCS, Gold Standard, CAR, ACR coverage
- **Rich Project Data**: Co-benefits, developer info, vintage years

### 3. Sample Offset Entries

- **8 Diverse Entries**: Covering all verification levels and offset types
- **Realistic Data**: GPS coordinates, evidence files, verification notes
- **Time Distribution**: Entries spread across different dates
- **Trust Score Demonstration**: Shows 50%, 75%, and 100% trust scores in action

## 🔧 **Setup Instructions**

### Step 1: Database Setup

First, ensure your database is running and create the certified projects:

```bash
# Navigate to backend
cd trazo-back

# Create certified projects with registry URLs
poetry run python manage.py create_certified_projects

# Create sample offset entries for La Primavera (ID: 14)
poetry run python manage.py create_sample_offsets --establishment-id 14

# For other establishments, specify the ID:
# poetry run python manage.py create_sample_offsets --establishment-id [YOUR_ID]
```

### Step 2: Verify API Endpoints

Test the certified projects API to ensure registry URLs are included:

```bash
# Test certified projects endpoint
curl -X GET "http://localhost:8000/api/carbon/offsets/certified_projects/" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected response should include `registry_url` fields:

```json
{
  "projects": [
    {
      "id": "VCS-1001",
      "name": "Amazon Rainforest Conservation Project",
      "registry_url": "https://registry.verra.org/app/projectDetail/VCS/1001"
      // ... other fields
    }
  ]
}
```

### Step 3: Frontend Testing

Test the new redirection functionality:

```bash
# Navigate to frontend
cd trazo-app

# Build to verify compilation
npm run build

# Start development server
npm run dev
```

### Step 4: Test User Flow

1. **Navigate to Dashboard**: Go to establishment dashboard
2. **Add Offset**: Click "Add Carbon Offset" button
3. **Select Certified Projects Tab**: Choose the third tab
4. **Select Project**: Choose any certified project
5. **Submit**: Fill amount and submit
6. **Verify Redirection**: Should see interactive toast with "View Project" button
7. **Test Registry Link**: Click "View Project" to open registry in new tab

## 🧪 **Testing Scenarios**

### Scenario 1: Self-Reported Offset

- **Action**: Create on-farm offset with evidence
- **Expected**: 50% trust score, orange badge
- **Verification**: Check effective amount calculation

### Scenario 2: Community Verified Offset

- **Action**: Create offset with community attestations
- **Expected**: 75% trust score, blue badge
- **Verification**: Shows attestation count

### Scenario 3: Certified Project Offset

- **Action**: Select certified project and submit
- **Expected**: 100% trust score, green badge, redirection toast
- **Verification**: Registry URL opens correctly

### Scenario 4: Dashboard Integration

- **Action**: View updated dashboard
- **Expected**: All verification badges visible, effective amounts shown
- **Verification**: Trust scores displayed correctly

## 📊 **Sample Data Overview**

### Certified Projects Created:

1. **VCS-1001**: Amazon Rainforest Conservation ($12.50/credit)
2. **GS-2002**: Wind Farm Renewable Energy ($15.75/credit)
3. **CAR-3003**: Improved Agricultural Practices ($18.25/credit)
4. **ACR-4004**: Biogas from Livestock Waste ($22.00/credit)
5. **VCS-5005**: Mangrove Restoration Initiative ($28.50/credit)

### Sample Offsets for La Primavera:

- **3 Self-Reported**: No-till farming, cover crops, composting (50% trust)
- **2 Community Verified**: Tree planting, solar panels (75% trust)
- **2 Certified Projects**: Amazon conservation, wind energy (100% trust)
- **Total**: ~17,600 kg CO₂e claimed, ~14,300 kg effective

## 🎨 **UX Features**

### Interactive Toast Notifications

- **Success State**: Green with project details
- **Action Buttons**: "View Project" and "Close"
- **Auto-dismiss**: 8 seconds with manual close option
- **Registry Integration**: Opens official project pages

### Verification Badges

- **Color Coding**: Orange (50%), Blue (75%), Green (100%)
- **Trust Score Display**: Percentage and effective amounts
- **Badge Consistency**: Same styling across all components

### Project Marketplace

- **Rich Project Cards**: Detailed information with co-benefits
- **Filtering Options**: By standard, type, region
- **Featured Projects**: Highlighted with special indicators
- **Trazo Verified**: Additional trust indicator

## 🔍 **Troubleshooting**

### Common Issues:

1. **Registry URLs Not Working**

   - **Check**: API response includes `registry_url` field
   - **Fix**: Run `create_certified_projects` command again

2. **Toast Not Showing**

   - **Check**: Browser console for JavaScript errors
   - **Fix**: Verify Chakra UI imports are correct

3. **Sample Data Missing**

   - **Check**: Database has certified projects
   - **Fix**: Run both management commands in order

4. **Verification Badges Not Displaying**
   - **Check**: Trust scores are calculated correctly
   - **Fix**: Verify `trust_score` field in database

## 🚀 **Next Phase Enhancements**

### Planned Improvements:

1. **Community Verification System**: Real attestation workflow
2. **Evidence Upload**: Actual file upload functionality
3. **Registry API Integration**: Real-time project availability
4. **Payment Gateway**: Optional payment processing for direct purchases
5. **Automated Verification**: IoT-based evidence collection
6. **Offset Retirement**: Blockchain-based credit retirement

## 📝 **Development Notes**

### Key Files Modified:

- `ModernOffsetModal.tsx`: Added redirection logic
- `carbon/views.py`: Added registry_url to API
- `create_certified_projects.py`: New management command
- `create_sample_offsets.py`: New management command

### Database Changes:

- Added `registry_url` field to CertifiedOffsetProject API response
- Created 5 certified projects with real registry URLs
- Created 8 sample offset entries with diverse verification levels

### Frontend Enhancements:

- Interactive toast notifications with action buttons
- Registry URL integration in project interface
- Enhanced project selection with external link indicators

## ✅ **Verification Checklist**

- [ ] Database migrations applied successfully
- [ ] Certified projects created with registry URLs
- [ ] Sample offset entries created for test establishment
- [ ] API returns registry_url in certified projects endpoint
- [ ] Frontend builds without errors
- [ ] Toast notifications display correctly with action buttons
- [ ] Registry links open in new tabs
- [ ] Dashboard shows verification badges and trust scores
- [ ] Effective amounts calculated correctly
- [ ] All verification levels working (50%, 75%, 100%)

## 🎉 **Success Metrics**

The implementation is successful when:

1. Users can create offsets across all verification levels
2. Trust scores are calculated and displayed correctly
3. Certified project selection redirects to registries
4. Dashboard shows comprehensive verification information
5. Sample data demonstrates the full verification system

---

**Ready for Production**: This implementation provides a complete MVP for the verification system with registry integration, ready for real-world testing and user feedback.
