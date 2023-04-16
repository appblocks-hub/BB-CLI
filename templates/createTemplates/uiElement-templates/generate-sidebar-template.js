/* eslint-disable */

const generateSidebarTemplateJs = () => `
import React from 'react';

const Sidebar = (props) => {
  const { sidebarOpen } = props;
  return (
    <aside
      className={\`fixed z-30 inset-y-0 left-0 w-64 bg-gray-800 transform ${
        sidebarOpen ? 'translate-x-0 ease-out' : '-translate-x-full ease-in'
      } transition duration-300 md:translate-x-0 md:static md:h-screen md:ease-in-out\`}
    >
      <div className='flex items-center justify-center h-16 text-white'>
        Sidebar
      </div>
      <nav className='px-4 py-6'>
        <a
          href='#'
          className='block text-gray-400 hover:text-white font-semibold mb-2'
        >
          Item 1
        </a>
        <a
          href='#'
          className='block text-gray-400 hover:text-white font-semibold mb-2'
        >
          Item 2
        </a>
        <a
          href='#'
          className='block text-gray-400 hover:text-white font-semibold mb-2'
        >
          Item 3
        </a>
        <a
          href='#'
          className='block text-gray-400 hover:text-white font-semibold mb-2'
        >
          Item 4
        </a>
      </nav>
    </aside>
  );
};

export default Sidebar;
`

module.exports = { generateSidebarTemplateJs }
