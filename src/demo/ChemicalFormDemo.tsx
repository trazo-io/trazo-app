import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { BrowserRouter } from 'react-router-dom';
import { IntlProvider } from 'react-intl';
import { StandardChemicalForm } from '../components/Forms/StandardChemicalForm';
import theme from '../themes/chakraTheme';

// Mock Redux store for demo
const demoStore = configureStore({
  reducer: {
    // Minimal reducer for demo
    demo: (state = {}, action) => state
  }
});

const ChemicalFormDemo: React.FC = () => {
  const handleSubmit = (data: any) => {
    console.log('Form submitted:', data);
    alert(
      `Form submitted successfully!\n\nChemical: ${data.commercialName}\nType: ${data.type}\nConcentration: ${data.concentration}`
    );
  };

  const handleCancel = () => {
    console.log('Form cancelled');
    alert('Form cancelled');
  };

  return (
    <ChakraProvider theme={theme}>
      <Provider store={demoStore}>
        <BrowserRouter>
          <IntlProvider locale="en" messages={{}}>
            <div style={{ padding: '16px', backgroundColor: '#f7fafc', minHeight: '100vh' }}>
              <StandardChemicalForm
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                parcelName="Demo Field - Mobile Testing"
                isLoading={false}
              />
            </div>
          </IntlProvider>
        </BrowserRouter>
      </Provider>
    </ChakraProvider>
  );
};

export default ChemicalFormDemo;
