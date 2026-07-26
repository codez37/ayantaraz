/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {
      config: './tailwind.config.ts',
    },
    autoprefixer: {
      flexbox: 'no-2009',
      grid: 'autoplace',
    },
    ...(process.env.NODE_ENV === 'production' ? { cssnano: {} } : {}),
  },
};

export default config;
