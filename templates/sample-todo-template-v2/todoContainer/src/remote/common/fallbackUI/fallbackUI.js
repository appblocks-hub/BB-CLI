import React from 'react'

const FallbackUI = () => {
  return (
    <div className="border-primary float-left my-4 mx-10 w-full max-w-5xl rounded-2xl border bg-white px-4 py-6 md:p-6">
      <div className="float-left flex min-h-[360px] w-full flex-col items-center justify-center space-y-2.5 p-4">
        <p className="text-gray-dark text-sm">Error Loading The Content</p>
        <button
          type="button"
          onClick={() => {
            location.reload(true)
          }}
          className="text-purple shadow-xs flex h-8 flex-shrink-0 items-center rounded-md border border-[#6F42C1] px-3.5 text-sm font-semibold transition-colors hover:bg-[#6F42C1] hover:text-white"
        >
          Reload
        </button>
      </div>
    </div>
  )
}

export default FallbackUI
