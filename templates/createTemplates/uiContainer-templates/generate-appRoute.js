/* eslint-disable */

const generateUiContainerAppRoute = () => `
import React, { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";

const AppRoute = () => {
  const Layout = lazy(() => import("../../components/Layout/index.js"));

  return (
    <Suspense fallback="">
      <Routes>
        <Route path="/" element={<Layout />} exact />
      </Routes>
    </Suspense>
  );
};

export default AppRoute;
;
`

module.exports = { generateUiContainerAppRoute }
