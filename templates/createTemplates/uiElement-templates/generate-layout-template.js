/* eslint-disable */

const generateLayoutTemplateJs = () => `
import React, { useState } from 'react';
import Header from '../Header';
import Sidebar from '../Sidebar';

const Index = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className='flex h-screen bg-gray-100'>
      {/* Sidebar */}
      <Sidebar sidebarOpen={sidebarOpen} />
      {/* Main content */}
      <main className='flex flex-col flex-1 overflow-hidden'>
        {/* Header */}
        <Header
          onHamburgerClick={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
        />
        {/* Page content */}
        <div className='w-4/5 md:w-1/2 mx-auto mt-8'>{children}</div>
      </main>
    </div>
  );
};

export default Index;
`

module.exports = { generateLayoutTemplateJs }
