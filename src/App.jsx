import { useState } from 'react';
import './App.css';
import Header from './lib/components/Header';
import MainContent from './lib/components/MainContent';
import AboutMe from './lib/components/About Me/AboutMe';
import Projects from './lib/components/Project/Projects';
import Contact from './lib/components/Contact/Contact';
import Sidebar from './lib/components/Sidebar';
import Music from './lib/components/Music/Music';
import Games from './lib/components/Games/Games'
import Playground from './lib/components/Playground/Playground';
import { LanguageProvider } from './lib/contexts/LanguageContext';
import frame from './lib/assets/images/frame.png';


function App() {
  const [currentView, setCurrentView] = useState('home');

  const renderView = () => {
    switch (currentView) {
      case 'home':
        return <MainContent onNavigate={setCurrentView} />;
      case 'about':
        return <AboutMe onNavigate={setCurrentView} />;
      case 'projects':
        return <Projects onNavigate={setCurrentView} />
      case 'contact':
        return <Contact onNavigate={setCurrentView} />
      case 'games':
        return <Games onNavigate={setCurrentView} />
      case 'music':
        return <Music onNavigate={setCurrentView} />
      case 'playground':
        return <Playground onNavigate={setCurrentView} />
      default:
        return <MainContent onNavigate={setCurrentView} />;
    }
  };

  return (
    <LanguageProvider>
      <img src={frame} className='frame' alt="" />
      <Header />
      <Sidebar currentView={currentView} onNavigate={setCurrentView} />
      {renderView()}
    </LanguageProvider>
  );
}

export default App;
