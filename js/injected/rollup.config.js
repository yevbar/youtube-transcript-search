import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
  input: 'src/main.js',
  output: {
    file: 'dist/injected.bundle.js',
    format: 'iife',
    name: 'YouTubeTranscriptInjected',
    sourcemap: false,
    // Disable strict mode to allow window.fetch assignment
    // The old single-file version worked without strict mode
    strict: false
  },
  plugins: [
    nodeResolve()
  ]
};
