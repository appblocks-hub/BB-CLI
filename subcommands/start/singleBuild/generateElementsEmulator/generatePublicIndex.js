const generatePublicIndex = () => `
<html lang="en">
<head>
  <title>Appblocks</title>
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0, maximum-scale=1.0"
    user-scalable="no"
  />
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- Google Tag Manager -->
  <script>
    ;(function (w, d, s, l, i) {
      w[l] = w[l] || []
      w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' })
      var f = d.getElementsByTagName(s)[0],
        j = d.createElement(s),
        dl = l != 'dataLayer' ? '&l=' + l : ''
      j.async = true
      j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i + dl
      f.parentNode.insertBefore(j, f)
    })(window, document, 'script', 'dataLayer', 'GTM-PGM46LG')
  </script>
  <!-- End Google Tag Manager -->
  <script>
    tailwind.config = {
      theme: {
        extend: {
          screens: {
            md: '769px',
            'md-lt': {
              max: '768px',
            },
            'lg-lt': {
              max: '1023px',
            },
            xxs: {
              max: '420px',
            },
            '3xl': {
              min: '1820px',
            },
          },
          fontSize: {
            'ab-sm': ['13px', 'normal'],
            'ab-base': ['15px', 'normal'],
            'ab-3xl': ['28px', 'normal'],
          },
          colors: {
            primary: '#5E5EDD',
            secondary: '#D453B6',
            warning: '#FFF0F0',
            'ab-disabled': '#C2C2C2',
            'primary-light': '#F2EBFF',
            ab: {
              red: '#EB0000',
              green: '#01944C',
              black: '#484848',
              gray: {
                light: '#F8F8F8',
                dark: '#DDDDDD',
                medium: '#E0E0E0',
                bold: '#6A737D',
              },
            },
          },
          boxShadow: {
            box: '0px 8px 8px rgba(0, 0, 0, 0.024)',
            'box-md': '0px 0px 8px rgba(0, 0, 0, 0.12)',
          },
        },
      },
    }
  </script>
  <style type="text/tailwindcss">
    @layer components {
      .btn-secondary {
        @apply bg-secondary text-white px-5 py-1.5 rounded font-bold text-center cursor-pointer transition-all hover:bg-opacity-80;
      }
      .btn-primary {
        @apply bg-primary text-white px-5 py-1.5 rounded font-bold text-center cursor-pointer transition-all hover:bg-opacity-80;
      }
      .btn-default {
        @apply text-white px-5 py-1.5 rounded font-bold text-center cursor-pointer transition-opacity hover:bg-opacity-80;
      }
      .nav-menu-wrapper {
        @apply w-64 md-lt:fixed md-lt:h-[calc(100vh-64px)] md-lt:overflow-y-auto md-lt:overflow-x-hidden md-lt:px-3 md-lt:border-l md-lt:border-ab-gray-medium md-lt:basis-full top-16 md:flex items-center md:w-auto md-lt:dark:bg-[#110D17] md-lt:overflow-hidden md-lt:transition-all md-lt:!duration-500 md-lt:ease-linear;
      }
      .info-box {
        @apply flex items-center bg-ab-gray-light flex-shrink-0 border border-ab-gray-dark rounded-full !leading-tight;
      }
      .ab-tooltip {
        @apply font-semibold text-xs !rounded !bg-ab-black before:!content-none after:!content-none;
      }
    }
  </style>
</head>

<body>
  <!-- Google Tag Manager (noscript) -->
  <noscript
    ><iframe
      src="https://www.googletagmanager.com/ns.html?id=GTM-PGM46LG"
      height="0"
      width="0"
      style="display: none; visibility: hidden"
    ></iframe
  ></noscript>
  <!-- End Google Tag Manager (noscript) -->
  <div id="root"></div>
</body>
</html>
`
module.exports = {
  generatePublicIndex,
}
