import { lazy, Suspense } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './ui/Layout'

const named = <K extends string>(load: () => Promise<Record<K, React.ComponentType>>, name: K) => lazy(() => load().then((m) => ({ default: m[name] })))

const HomePage = named(() => import('./pages/HomePage'), 'HomePage')
const MapPage = named(() => import('./pages/MapPage'), 'MapPage')
const HubPage = named(() => import('./pages/HubPage'), 'HubPage')
const LessonPage = named(() => import('./pages/LessonPage'), 'LessonPage')
const ExperimentPage = named(() => import('./pages/ExperimentPage'), 'ExperimentPage')
const SandboxPage = named(() => import('./pages/SandboxPage'), 'SandboxPage')
const ComponentsPage = named(() => import('./pages/ComponentsPage'), 'ComponentsPage')
const ProjectsPage = named(() => import('./pages/ProjectsPage'), 'ProjectsPage')
const ProgressPage = named(() => import('./pages/ProgressPage'), 'ProgressPage')

function Loading() {
  return (
    <div className="grid min-h-[60vh] place-items-center text-sm text-fog-400">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 animate-ping rounded-full bg-volt" /> Powering up the lab…
      </div>
    </div>
  )
}

function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center text-fog-300">
      <div className="text-4xl">🔌</div>
      <p className="mt-3">Nothing is connected here. That’s an open circuit.</p>
      <a href="#/" className="mt-3 inline-block text-flow hover:underline">
        Back to the lab
      </a>
    </div>
  )
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          {[
            ['/', HomePage],
            ['/map', MapPage],
            ['/hub/:hubId', HubPage],
            ['/lesson/:id', LessonPage],
            ['/experiment/:id', ExperimentPage],
            ['/lab/sandbox', SandboxPage],
            ['/components/:componentId', ComponentsPage],
            ['/projects', ProjectsPage],
            ['/progress', ProgressPage],
          ].map(([path, Page]) => {
            const C = Page as React.ComponentType
            return (
              <Route
                key={path as string}
                path={path as string}
                element={
                  <Suspense fallback={<Loading />}>
                    <C />
                  </Suspense>
                }
              />
            )
          })}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
