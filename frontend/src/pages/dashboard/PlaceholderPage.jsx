import React from 'react';
import { useLocation } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

export const PlaceholderPage = () => {
  const location = useLocation();
  const title = location.pathname.split('/')[1].replace('-', ' ') || 'module';
  return <section className="placeholder-page"><div className="placeholder-icon"><Sparkles size={25} /></div><p className="eyebrow">Coming in a later phase</p><h1>{title.replace(/^./, (letter) => letter.toUpperCase())}</h1><p>This workspace is ready for the {title} module. Its workflows will be implemented in the next phase.</p></section>;
};
