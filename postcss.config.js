import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';

export default ({ mode }) => ({
  plugins: [tailwindcss, autoprefixer, ...(mode === 'production' ? [cssnano] : [])],
});
