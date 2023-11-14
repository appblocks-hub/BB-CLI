import React from 'react'
import Logo from '../../assets/logo.png'
import LogoText from '../../assets/logo-txt.svg'

const Header = () => (
  <header className="top-0 left-0 z-[99] w-full border-b border-[#E1E4E8] bg-[#fafbfc]">
    <div className="w-full px-4 md:px-8">
      <div className="flex min-h-[72px] w-full items-center justify-between py-1 sm:py-2">
        <div className="flex items-center">
          <div className="flex flex-shrink-0 items-center focus:outline-none">
            <img className="max-w-[48px]" src={Logo} alt="AppblocksLogo" />
            <img className="lg-lt:hidden ml-3" src={LogoText} alt="Appblocks" />
          </div>
        </div>
      </div>
    </div>
  </header>
)

export default Header
