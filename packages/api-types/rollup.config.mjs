import { dts } from 'rollup-plugin-dts';

/**
 * Bundles the API types into one declaration file (ADR 0024).
 * - `preserveSymlinks: false`: the plugin turns it on by default, and then
 *   TypeScript cannot name types through pnpm's symlinked packages.
 * - Types from this repository's packages are inlined; libraries stay
 *   imports, which the mobile app installs (its sync script checks them).
 */
export default {
  input: 'src/index.ts',
  output: { file: 'dist/index.d.ts', format: 'es' },
  external: (id) =>
    !id.startsWith('.') && !id.startsWith('@doulisha/') && !/^([A-Za-z]:)?[\\/]/.test(id),
  plugins: [
    dts({
      respectExternal: true,
      tsconfig: 'tsconfig.json',
      compilerOptions: { preserveSymlinks: false },
    }),
  ],
};
