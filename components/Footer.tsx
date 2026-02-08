
import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-black border-t border-white/10 py-12">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h1 className="text-2xl font-argent mb-4">QuantCure</h1>
            <p className="font-greycliff text-gray-400 text-sm">
              Advanced molecular docking and ML platform for research and drug discovery.
            </p>
          </div>
          <div>
            <h4 className="font-greycliff mb-4">Platform</h4>
            <ul className="space-y-2">
              <li><a href="#" className="font-greycliff text-gray-400 text-sm hover:text-white transition">Features</a></li>
              <li><a href="#" className="font-greycliff text-gray-400 text-sm hover:text-white transition">Documentation</a></li>
              <li><a href="#" className="font-greycliff text-gray-400 text-sm hover:text-white transition">API</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-greycliff mb-4">Company</h4>
            <ul className="space-y-2">
              <li><a href="#" className="font-greycliff text-gray-400 text-sm hover:text-white transition">About</a></li>
              <li><a href="#" className="font-greycliff text-gray-400 text-sm hover:text-white transition">Careers</a></li>
              <li><a href="#" className="font-greycliff text-gray-400 text-sm hover:text-white transition">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-greycliff mb-4">Legal</h4>
            <ul className="space-y-2">
              <li><a href="#" className="font-greycliff text-gray-400 text-sm hover:text-white transition">Privacy</a></li>
              <li><a href="#" className="font-greycliff text-gray-400 text-sm hover:text-white transition">Terms</a></li>
              <li><a href="#" className="font-greycliff text-gray-400 text-sm hover:text-white transition">Security</a></li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
};