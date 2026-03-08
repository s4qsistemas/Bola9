import React from 'react';

const Footer = () => {
    return (
        <footer className="w-full py-4 mt-auto border-t border-slate-800 bg-brand-dark">
            <div className="container mx-auto px-4 text-center">
                <p className="text-xs text-slate-500 font-medium tracking-wide">
                    Desarrollado por:{' '}
                    <a
                        href="https://s4q-sistemas.web.app/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-brand-primary transition-colors font-semibold"
                    >
                        s4q-sistemas
                    </a>
                </p>
            </div>
        </footer>
    );
};

export default Footer;