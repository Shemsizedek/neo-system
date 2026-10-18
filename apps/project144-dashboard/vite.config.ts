import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {resolve} from 'node:path';
export default defineConfig({plugins:[react()],base:'/',root:resolve(process.cwd()),build:{outDir:'dist-project144',emptyOutDir:true,rollupOptions:{input:resolve(process.cwd(),'project144-dashboard.html')}}});
