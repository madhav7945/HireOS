import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

const projectRoot = fileURLToPath(new URL('.', import.meta.url))
const srcRoot = fileURLToPath(new URL('./src', import.meta.url))

// Indeed XML feed middleware plugin
function indeedFeedPlugin() {
  return {
    name: 'indeed-xml-feed',
    configureServer(server) {
      server.middlewares.use('/feed/jobs.xml', async (req, res) => {
        try {
          // Dynamically import the generator
          const { generateIndeedXML } = await server.ssrLoadModule('/src/utils/generateIndeedXML.js')
          
          // Import mock data for dev (in production, this would come from Supabase)
          const { DEMO_JOBS } = await server.ssrLoadModule('/src/data/mockData.js')
          
          const siteUrl = `http://localhost:${server.config.server.port || 5173}`
          const xml = generateIndeedXML(DEMO_JOBS, siteUrl)
          
          res.setHeader('Content-Type', 'application/xml; charset=utf-8')
          res.setHeader('Cache-Control', 'public, max-age=3600')
          res.end(xml)
        } catch (err) {
          console.error('Feed generation error:', err)
          res.statusCode = 500
          res.end('Error generating feed')
        }
      })
    },
  }
}

export default defineConfig({
  root: projectRoot,
  plugins: [react(), indeedFeedPlugin()],
  resolve: {
    alias: {
      '@': srcRoot,
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    open: true,
  },
})
