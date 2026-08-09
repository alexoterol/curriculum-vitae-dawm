import React from 'react';
import './Contact.css';
import Separator from '../Separator';
import ContactCard from './ContactCard';
import { useLanguage } from '../../contexts/LanguageContext';

function Contact() {
    const { t } = useLanguage();
    
    const contactMethods = t('contact.methods');
    
    const contacts = [
        {
            ...contactMethods[0],
            link: 'mailto:adotero@espol.edu.ec'
        },
        {
            ...contactMethods[1],
            link: 'https://discord.gg/772M4DuCCK'
        },
        {
            ...contactMethods[2],
            link: 'https://www.linkedin.com/in/alex-otero-limones-768957267/'
        }
    ];

    return (
        <div className="app-container">
            <main className="about-me-content">
                <div className="contact-container">
                    <h1 className="main-title">{t('contact.title')}</h1>
                    <Separator margin={true} />
                    
                    <div className="contact-methods-grid">
                        {contacts.map((contact, index) => (
                            <ContactCard
                                key={index}
                                socialApp={contact.socialApp}
                                name={contact.name}
                                linkText={contact.linkText}
                                link={contact.link}
                            />
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}

export default Contact;