import React from 'react';
import PropTypes from 'prop-types';
import './Window.css';

function Window({ title, children, className = '' }) {
    return (
        <div className={`window-container ${className}`.trim()}>
            <div className="window-titlebar">
                <span className="window-titlebar__title">{title}</span>
                <div className="window-titlebar__controls">
                    <span className="window-control">−</span>
                    <span className="window-control">□</span>
                    <span className="window-control">×</span>
                </div>
            </div>
            <div className="window-content">
                {children}
            </div>
        </div>
    );
}

Window.propTypes = {
    title: PropTypes.string.isRequired,
    children: PropTypes.node.isRequired,
    className: PropTypes.string,
};

export default Window;
