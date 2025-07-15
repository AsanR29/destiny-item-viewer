/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    'public/styles/*.css',
    'views/*.pug',
    'views/*/*.pug',
    'src/*.pug',
    'views/homepage.pug'
  ],
  safelist: [
    {
      pattern: /(bg|text|border)-(red|green|blue|yellow|purple|pink|gray|slate|zinc|neutral|stone|orange|amber|lime|emerald|teal|cyan|sky|indigo|violet|fuchsia|rose)-(50|100|200|300|400|500|600|700|800|900|950)/
    }
  ],
  theme: {
    extend: {
      colors: {
        blue: {
          890: "#254090",
          910: "#163282", //"#1e3a8a",
        },
        brand: {
          DEFAULT: "#ddaa77",
          light: "#eeaa88",
          dark: "#ccaa66",
          500: "#ddaa77",
        }
      },
      fontFamily: {
        headline: "Morrowind",  //, century gothic, Sans serif
      }
    },
  },
  plugins: [],
}
