import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './AboutSelector.css';
import Separator from '../Separator';
import { useLanguage } from '../../contexts/LanguageContext';

// Tab icons
import presentationIcon from '../../assets/svg/ghost-svgrepo-com.svg';
import toolsIcon from '../../assets/images/CardImages/tool.png';
import appsIcon from '../../assets/images/CardImages/app.png';
import inventoryIcon from '../../assets/images/CardImages/inventory.png';
import workspaceIcon from '../../assets/images/CardImages/workspace.png';

// Tools - Languages
import pythonImg from '../../assets/images/tools/python.webp';
import cImg from '../../assets/images/tools/C.webp';
import javaImg from '../../assets/images/tools/java.webp';
import javascriptImg from '../../assets/images/tools/javascript.webp';
import typescriptImg from '../../assets/images/tools/typescript.webp';
import bashImg from '../../assets/images/tools/bash.webp';

// Tools - Frameworks
import reactImg from '../../assets/images/tools/react.png';
import tailwindImg from '../../assets/images/tools/tailwind.png';

// Tools - Databases
import mysqlImg from '../../assets/images/tools/mysql.webp';
import mongodbImg from '../../assets/images/tools/mondongodb.webp';
import postgresImg from '../../assets/images/tools/postgres.webp';
import sqliteImg from '../../assets/images/tools/sqlite.png';

// Tools - Tools
import gitImg from '../../assets/images/tools/git.webp';
import dockerImg from '../../assets/images/tools/docker.webp';
import arduinoImg from '../../assets/images/tools/arduino.png';
import apacheImg from '../../assets/images/tools/apache.png';

// Tools - Languages (Human)
import spainFlagImg from '../../assets/images/tools/spain_flag.png';
import englandFlagImg from '../../assets/images/tools/england_flag.png';
import franceFlagImg from '../../assets/images/tools/france_flag.png';
import italyFlagImg from '../../assets/images/tools/italy_flag.webp';

// Applications
import vscodiumImg from '../../assets/images/applications/vscodium.webp';
import neovimImg from '../../assets/images/applications/neovim.webp';
import audaciousImg from '../../assets/images/applications/audacious.png';
import obsidianImg from '../../assets/images/applications/obsidian.webp';
import librewolfImg from '../../assets/images/applications/librewolf.webp';

// Inventory
import nothingA3Img from '../../assets/images/inventory/nothing_a3.webp';
import cameraImg from '../../assets/images/inventory/camera.webp';
import ipodMiniImg from '../../assets/images/inventory/ipod-mini.webp';
import microphoneImg from '../../assets/images/inventory/microphone_mv7+.png';

// Workspace
import rogStrixImg from '../../assets/images/workspace/rog_strix_g16.webp';
import hpLaptopImg from '../../assets/images/workspace/laptop_hp.png';

function AboutSelector({ onNavigate }) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('presentation');

  const tabs = [
    { id: 'presentation', icon: presentationIcon, labelKey: 'aboutMe.tabs.presentation' },
    { id: 'tools', icon: toolsIcon, labelKey: 'aboutMe.tabs.tools' },
    { id: 'apps', icon: appsIcon, labelKey: 'aboutMe.tabs.apps' },
    { id: 'inventory', icon: inventoryIcon, labelKey: 'aboutMe.tabs.inventory' },
    { id: 'workspace', icon: workspaceIcon, labelKey: 'aboutMe.tabs.workspace' },
  ];

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'presentation':
        return (
          <div className="tab-content presentation-content presentation-text">
            <h2 className="content-title">{t('aboutMe.presentation.title')}</h2>
            <div className="content-text">
              <p className='presentation-text'>
                {t('aboutMe.presentation.text1')}
              </p>
              <p className='presentation-text'>
                {t('aboutMe.presentation.text2')}
              </p>
              <p className='presentation-text'>
                {t('aboutMe.presentation.text3')}
              </p>
            </div>
          </div>
        );
      
      case 'tools':
        return (
          <div className="tools-container">
            <h2 className="content-title">{t('aboutMe.toolsSection.title')}</h2>
            
            <fieldset className="tools-section">
                <legend>{t('aboutMe.toolsSection.langs')}</legend>
                <div className="tool-entry">
                    <img src={pythonImg} alt="Python" />
                </div>
                <div className="tool-entry">
                    <img src={cImg} alt="C" />
                </div>
                <div className="tool-entry">
                    <img src={javaImg} alt="Java" />
                </div>
                <div className="tool-entry">
                    <img src={javascriptImg} alt="JavaScript" />
                </div>
                <div className="tool-entry">
                    <img src={typescriptImg} alt="TypeScript" />
                </div>
                <div className="tool-entry">
                    <img src={bashImg} alt="Bash" />
                </div>
            </fieldset>

            <fieldset className="tools-section">
                <legend>{t('aboutMe.toolsSection.frameworks')}</legend>
                <div className="tool-entry">
                    <img src={reactImg} alt="React" />
                </div>
                <div className="tool-entry">
                    <img src={tailwindImg} alt="Tailwind" />
                </div>
            </fieldset>

            <fieldset className="tools-section">
                <legend>{t('aboutMe.toolsSection.dbs')}</legend>
                <div className="tool-entry">
                    <img src={mysqlImg} alt="MySQL" />
                </div>
                <div className="tool-entry">
                    <img src={mongodbImg} alt="MongoDB" />
                </div>
                <div className="tool-entry">
                    <img src={postgresImg} alt="PostgreSQL" />
                </div>
                <div className="tool-entry">
                    <img src={sqliteImg} alt="SQLite" />
                </div>
            </fieldset>

            <fieldset className="tools-section">
                <legend>{t('aboutMe.toolsSection.tools')}</legend>
                <div className="tool-entry">
                    <img src={gitImg} alt="Git" />
                </div>
                <div className="tool-entry">
                    <img src={dockerImg} alt="Docker" />
                </div>
                <div className="tool-entry">
                    <img src={arduinoImg} alt="Arduino UNO" />
                </div>
                <div className="tool-entry">
                    <img src={apacheImg} alt="Apache" />
                </div>
            </fieldset>

            <fieldset className="tools-section">
                <legend>{t('aboutMe.toolsSection.humanLanguages')}</legend>
                <div className="tool-entry">
                    <img src={spainFlagImg} alt="Spanish" />
                </div>
                <div className="tool-entry">
                    <img src={englandFlagImg} alt="English" />
                </div>
                <div className="tool-entry">
                    <img src={franceFlagImg} alt="French" />
                </div>
                <div className="tool-entry">
                    <img src={italyFlagImg} alt="Italian" />
                </div>
            </fieldset>
        </div>
        );
      
      case 'apps':
        return (
          <div className="apps-container">
            <h2 className="content-title">{t('aboutMe.appsSection.title')}</h2>
            
            <div className="apps-grid">
                <div className="app-entry">
                    <div className="app-icon">
                        <img src={vscodiumImg} alt="VSCodium" />
                    </div>
                    <span className="app-name">VSCodium</span>
                </div>

                <div className="app-entry">
                    <div className="app-icon">
                        <img src={neovimImg} alt="Neovim" />
                    </div>
                    <span className="app-name">Neovim</span>
                </div>

                <div className="app-entry">
                    <div className="app-icon">
                        <img src={audaciousImg} alt="Audacious" />
                    </div>
                    <span className="app-name">Audacious</span>
                </div>

                <div className="app-entry">
                    <div className="app-icon">
                        <img src={obsidianImg} alt="Obsidian" />
                    </div>
                    <span className="app-name">Obsidian</span>
                </div>
                <div className="app-entry">
                    <div className="app-icon">
                        <img src={librewolfImg} alt="LibreWolf" />
                    </div>
                    <span className="app-name">LibreWolf</span>
                </div>
            </div>
        </div>
        );
      
      case 'inventory':
        return (
          <div className="inventory-container">
            <h2 className="content-title">{t('aboutMe.inventorySection.title')}</h2>
            
            <div className="inventory-grid">
                <div className="inventory-item">
                    <div className="inventory-image">
                        <img src={nothingA3Img} alt="Nothing a3" />
                    </div>
                    <span className="inventory-name">Nothing a3</span>
                </div>

                <div className="inventory-item">
                    <div className="inventory-image">
                        <img src={cameraImg} alt="Camera" />
                    </div>
                    <span className="inventory-name">Camera</span>
                </div>

                <div className="inventory-item">
                    <div className="inventory-image">
                        <img src={ipodMiniImg} alt="iPod Mini" />
                    </div>
                    <span className="inventory-name">iPod Mini</span>
                </div>

                <div className="inventory-item">
                    <div className="inventory-image">
                        <img src={microphoneImg} alt="MV7+" />
                    </div>
                    <span className="inventory-name">Shure MV7+</span>
                </div>
            </div>
        </div>
        );
      
      case 'workspace':
        return (
          <div className="workspace-container">
            <h2 className="content-title">{t('aboutMe.workspaceSection.title')}</h2>
            
            <div className="workspace-display">
                <div className="workspace-image">
                    <img className="crop-img" src={rogStrixImg} alt="Workspace" />
                </div>
                <Separator margin={false}/>
                <div className="workspace-specs">
                    <div className="workspace-spec-item">
                        <span className="workspace-spec-label">{t('aboutMe.workspaceSection.model')} :</span>
                        <span className="workspace-spec-value">Rog Strix G16</span>
                    </div>
                    <div className="workspace-spec-item">
                        <span className="workspace-spec-label">{t('aboutMe.workspaceSection.chipset')} :</span>
                        <span className="workspace-spec-value">Intel Core i7</span>
                    </div>
                </div>
            </div>
            <div className="workspace-display">
                <div className="workspace-image">
                    <img src={hpLaptopImg} alt="Alt. Workspace" />
                </div>
                <Separator margin={false}/>
                <div className="workspace-specs">
                    <div className="workspace-spec-item">
                        <span className="workspace-spec-label">{t('aboutMe.workspaceSection.model')} :</span>
                        <span className="workspace-spec-value">HP 14-BS026la</span>
                    </div>
                    <div className="workspace-spec-item">
                        <span className="workspace-spec-label">{t('aboutMe.workspaceSection.chipset')} :</span>
                        <span className="workspace-spec-value">Intel Core i5</span>
                    </div>
                </div>
            </div>
        </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="section-content">
      <div className="tabs-navigation">

        {tabs.map((tab) => (
          <button
          key={tab.id}
          className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => handleTabClick(tab.id)}
          title={t(tab.labelKey)}
          >
            <img src={tab.icon} alt="" className="tab-icon" />
            <span className="tab-label">{t(tab.labelKey)}</span>
          </button>
        ))}

      </div>

      <div className="interaction-area-about-me">
        {renderContent()}
      </div>
    </div>
  );
}

AboutSelector.propTypes = {
  onNavigate: PropTypes.func,
};

export default AboutSelector;