import React from 'react';
import './Projects.css';
import Separator from '../Separator';
import ProjectCard from './ProjectCard';
import { useLanguage } from '../../contexts/LanguageContext';

import projectImg from '../../assets/images/projects/copland.webp';

function Projects() {
    const { t } = useLanguage();
    
    const projectsList = t('projects.list');
    
    // El orden es deliberado: el proyecto de seguridad va primero.
    const projectsMeta = [
        {
            tags: ['Flutter', 'Dart', 'AES-256', 'SQLite'],
            repoUrl: 'https://github.com/alexoterol/password-manager'
        },
        {
            tags: ['C', 'IPC', 'Docker'],
            repoUrl: 'https://github.com/alexoterol/AKLight-messaging'
        },
        {
            tags: ['Python', 'PLY', 'FastAPI'],
            repoUrl: 'https://github.com/alexoterol/swift-lexer-parser-semantic-analyzer'
        },
        {
            tags: ['Python', 'Keras', 'PyQt5'],
            repoUrl: 'https://github.com/alexoterol/ai-backtrack-sudoku-solver'
        }
    ];

    const projectsData = projectsList.map((project, index) => ({
        ...project,
        ...projectsMeta[index],
        img: projectImg
    }));

    return (
        <div className="app-container">
            <main className="about-me-content">
                <div className="projects-container">
                    <h1 className="main-title">{t('projects.title')}</h1>
                    <Separator margin={false} />
                    
                    <div className="projects-list">
                        {projectsData.map((project) => (
                            <ProjectCard
                                key={project.name}
                                name={project.name}
                                description={project.description}
                                img={project.img}
                                tags={project.tags}
                                repoUrl={project.repoUrl}
                                repoLabel={t('projects.viewRepo')}
                            />
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}

export default Projects;