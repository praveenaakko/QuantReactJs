import React from 'react';

export const Loader: React.FC = () => {
  return (
    <div className="fixed top-[68px] left-0 w-full h-0.5 bg-cyan-400/20 z-[60] overflow-hidden" role="progressbar" aria-busy="true">
      <div className="loader-bar"></div>
    </div>
  );
};
