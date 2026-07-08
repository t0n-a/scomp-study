import { useState } from 'react'
import Home from './pages/Home.jsx'
import Drill from './pages/Drill.jsx'
import Tracer from './pages/Tracer.jsx'
import Exam from './pages/Exam.jsx'
import Flashcards from './pages/Flashcards.jsx'
import CodeLab from './pages/CodeLab.jsx'
import Ex1 from './pages/Ex1.jsx'
import Guides from './pages/Guides.jsx'
import Course from './pages/Course.jsx'

const TABS = [
  { id: 'home', label: '~' },
  { id: 'course', label: './curso' },
  { id: 'drill', label: './drill' },
  { id: 'ex1', label: './ex1' },
  { id: 'tracer', label: './traços' },
  { id: 'exam', label: './exame' },
  { id: 'flashcards', label: './flashcards' },
  { id: 'codelab', label: './lab' },
  { id: 'guides', label: './guias' },
]

const EXAM_DATE = new Date(2026, 6, 9) // 9 de julho de 2026

function daysToExam() {
  return Math.max(0, Math.ceil((EXAM_DATE - Date.now()) / 86400000))
}

export default function App() {
  const [tab, setTab] = useState('home')
  // Set when Exam asks to open a template in Code Lab; CodeLab consumes it
  // via a useEffect keyed on this object identity.
  const [labRequest, setLabRequest] = useState(null)

  function openCodeLab(req) {
    const base = typeof req === 'string' ? { templateFile: req } : { ...req }
    setLabRequest({ ...base, nonce: Date.now() })
    setTab('codelab')
  }

  return (
    <div className="app">
      <nav className="tabs">
        <span className="prompt" aria-hidden="true">
          scomp@isep:~/estudo<span className="prompt-d">$</span>
        </span>
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab ${tab === t.id ? 'tab-active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
        <span className="term-cursor" aria-hidden="true" />
        <span className="term-countdown" title="Exame: 9 de julho">
          exame <strong>T−{daysToExam()}d</strong>
        </span>
      </nav>
      {/*
        All tabs stay mounted; the inactive ones are just hidden with CSS.
        This is what lets Exam state (Grupo I/II progress, self-grades)
        survive a trip to Code Lab and back — nothing unmounts.
      */}
      <div className={tab === 'home' ? '' : 'tab-hidden'}>
        <Home onNavigate={setTab} />
      </div>
      <div className={tab === 'course' ? '' : 'tab-hidden'}>
        <Course onOpenCodeLab={openCodeLab} />
      </div>
      <div className={tab === 'drill' ? '' : 'tab-hidden'}>
        <Drill />
      </div>
      <div className={tab === 'ex1' ? '' : 'tab-hidden'}>
        <Ex1 />
      </div>
      <div className={tab === 'tracer' ? '' : 'tab-hidden'}>
        <Tracer />
      </div>
      <div className={tab === 'exam' ? '' : 'tab-hidden'}>
        <Exam onOpenCodeLab={openCodeLab} />
      </div>
      <div className={tab === 'flashcards' ? '' : 'tab-hidden'}>
        <Flashcards />
      </div>
      <div className={tab === 'codelab' ? '' : 'tab-hidden'}>
        <CodeLab pendingLoad={labRequest} />
      </div>
      <div className={tab === 'guides' ? '' : 'tab-hidden'}>
        <Guides />
      </div>
    </div>
  )
}
