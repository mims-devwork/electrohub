import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

// No <StrictMode>: its dev-only double mount races with drei's <Html> portals
// (React 19 "synchronously unmount a root" errors) and drops 3D labels.
createRoot(document.getElementById('root')!).render(<App />)
