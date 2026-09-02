import React from 'react';
import PropTypes from 'prop-types';
import './ProjectCard.css';

function ProjectCard({ name, description, img, tags, repoUrl, repoLabel }) {
    return (
        <div className="project-container">
            <img src={img} className="project-icon" alt={name} />

            <div className="project-info">
                <h3>{name}</h3>
                <p>{description}</p>
                {repoUrl && (
                    <a
                        className="project-repo"
                        href={repoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        {repoLabel} ↗
                    </a>
                )}
            </div>

            <div className="project-tags">
                {tags.map((tag, index) => (
                    <div key={index} className={`project-tag tag-${tag.toLowerCase()}`}>
                        <p>{tag}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

ProjectCard.propTypes = {
    name: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    img: PropTypes.string.isRequired,
    tags: PropTypes.arrayOf(PropTypes.string).isRequired,
    repoUrl: PropTypes.string,
    repoLabel: PropTypes.string,
};

export default ProjectCard;