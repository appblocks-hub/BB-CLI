/* eslint-disable */

const generateHeaderTemplateJs = () => `
import React from 'react';

const Header = (props) => {
  const { onHamburgerClick, sidebarOpen } = props;
  return (
    <header className='flex items-center justify-between px-6 py-4 bg-white border-b'>
      <div className='flex items-center'>
        <img src='logo' alt='Logo' className='mr-2' />
        <h1 className='text-lg font-semibold'>App Name</h1>
      </div>
      <nav className='flex space-x-4'>
        <a href='#' className='text-gray-800 hover:text-gray-600 font-semibold'>
          Item 1
        </a>
        <a href='#' className='text-gray-800 hover:text-gray-600 font-semibold'>
          Item 2
        </a>
        <a href='#' className='text-gray-800 hover:text-gray-600 font-semibold'>
          Item 3
        </a>
      </nav>
      <button className='block md:hidden' onClick={onHamburgerClick}>
        <svg
          className='w-6 h-6 text-gray-500'
          fill='none'
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth='2'
          viewBox='0 0 24 24'
          stroke='currentColor'
        >
          {sidebarOpen ? (
            <path d='M6 18L18 6M6 6l12 12'></path>
          ) : (
            <path d='M4 6h16M4 12h16M4 18h16'></path>
          )}
        </svg>
      </button>
    </header>
  );
};

export default Header;
`

module.exports = { generateHeaderTemplateJs }
