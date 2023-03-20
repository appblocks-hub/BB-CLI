/* eslint-disable */

const generateUiContainerAppJs = () => `
import React from "react";
import { ErrorBoundary } from "react-error-boundary";
import AppRoute from "../common/routes/appRoute";

const App = () => {

  const handleError = (error, errorInfo) => {
    // handle error
    console.log(error, errorInfo)
  };

  return (
    <ErrorBoundary fallback="" onError={handleError}>
      <div className="App">
        <React.Suspense fallback="">
          <AppRoute />
        </React.Suspense>
      </div>
    </ErrorBoundary>
  );
};

export default App;
`

module.exports = { generateUiContainerAppJs }
