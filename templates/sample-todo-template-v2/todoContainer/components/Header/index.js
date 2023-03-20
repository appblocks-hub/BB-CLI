import React from 'react'
import Logo from '../../assets/appblocks-logo.svg'

const Header = () => (
  <header className="top-0 left-0 z-[99] w-full border-b border-[#E1E4E8] bg-[#fafbfc]">
    <div className="w-full px-4 md:px-8">
      <div className="flex min-h-[72px] w-full items-center justify-between py-1 sm:py-2">
        <div className="flex items-center">
          <span className="mr-2">
            <img className=" h-11" alt="Appblocks" src={Logo} />
          </span>
        </div>
      </div>
    </div>
  </header>
)

export default Header
