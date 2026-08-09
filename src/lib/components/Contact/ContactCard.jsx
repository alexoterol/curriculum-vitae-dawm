import React from 'react';
import PropTypes from 'prop-types';
import './ContactCard.css';

import discordImg from '/src/lib/assets/images/contact/discord.webp';
import LinkedinImg from '/src/lib/assets/images/contact/linkedin.webp';
import mailImg from '/src/lib/assets/images/contact/email.webp';
import starImg from '/src/lib/assets/images/star.gif';

function ContactCard({ socialApp, name, linkText, link }) {

    const getIcon = () => {
        switch (socialApp) {
            case 'Discord':
                return discordImg;
            case 'LinkedIn':
                return LinkedinImg;
            case 'Mail':
                return mailImg;
            default:
                return null;
        }
    };

    return (
        <a href={link} className="contact-card-container" target="_blank" rel="noopener noreferrer">
            <div className="contact-card-container__img">
                <img src={getIcon()} alt={`${socialApp} icon`} />
            </div>

            <div className="contact-card-container__text">
                <h2>{name}</h2>
                <h3>{linkText}</h3>
            </div>

            <img className="contact-card-container__star" src={starImg} alt="Star" />
        </a>
    );
}

ContactCard.propTypes = {
    socialApp: PropTypes.oneOf(['Discord', 'Signal', 'LinkedIn', 'Mail']).isRequired,
    name: PropTypes.string.isRequired,
    linkText: PropTypes.string.isRequired,
    link: PropTypes.string.isRequired,
};

export default ContactCard;