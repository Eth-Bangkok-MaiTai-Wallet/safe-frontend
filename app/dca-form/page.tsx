"use client"
import React, { useState } from 'react';
import { ArrowLeft, HelpCircle, Settings } from 'lucide-react';

const DeFiInterface = () => {
  const [currentStep, setCurrentStep] = useState(1);

  const steps = [
    { number: 1, title: 'Choose Funding & Assets' },
    { number: 2, title: 'Configure Strategy' },
    { number: 3, title: 'Post Purchase' },
    { number: 4, title: 'Confirm & Sign' }
  ];

  const renderStepIndicator = () => (
    <div className="flex items-center space-x-2 mb-8">
      {steps.map((step, index) => (
        <React.Fragment key={step.number}>
          <div 
            className={`w-2 h-2 rounded-full ${
              currentStep >= step.number ? 'bg-green-400' : 'bg-gray-600'
            }`}
          />
          {index < steps.length - 1 && (
            <div 
              className={`w-8 h-0.5 ${
                currentStep > step.number ? 'bg-green-400' : 'bg-gray-600'
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <div className="flex justify-between items-center mb-4">
          <span className="text-gray-300">Buy strategies</span>
          <HelpCircle size={16} className="text-gray-500" />
        </div>
        <div className="flex space-x-2">
          <button className="px-4 py-2 bg-gray-800 rounded-lg text-gray-300">DCA in</button>
          <button className="px-4 py-2 bg-gray-800 rounded-lg text-gray-300">DCA in</button>
          <button className="px-4 py-2 bg-gray-800 rounded-lg text-gray-300">Weighted Scale in</button>
        </div>
      </div>

      <div>
        <label className="block text-gray-300 mb-2">
          How will you fund your first investment?
        </label>
        <div className="relative">
          <select className="w-full bg-gray-800 text-gray-300 rounded-lg px-4 py-3 appearance-none">
            <option>Choose asset</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-gray-300 mb-2">
          What asset do you want to invest in?
        </label>
        <div className="relative">
          <select className="w-full bg-gray-800 text-gray-300 rounded-lg px-4 py-3 appearance-none">
            <option>Choose asset</option>
          </select>
        </div>
      </div>

      <button 
        onClick={() => setCurrentStep(2)}
        className="w-full bg-yellow-500 text-black font-medium py-3 rounded-lg"
      >
        Next
      </button>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-blue-500 rounded-full" />
          <span className="text-gray-300">200 USDC</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-yellow-500 rounded-full" />
          <span className="text-gray-300">BTC</span>
        </div>
      </div>

      <div>
        <label className="block text-gray-300 mb-2">
          Start strategy immediately?
        </label>
        <div className="flex space-x-2">
          <button className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg">Yes</button>
          <button className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg">No</button>
        </div>
      </div>

      <button 
        onClick={() => setCurrentStep(3)}
        className="w-full bg-yellow-500 text-black font-medium py-3 rounded-lg"
      >
        Next
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            {currentStep > 1 && (
              <button onClick={() => setCurrentStep(currentStep - 1)}>
                <ArrowLeft size={20} />
              </button>
            )}
            <h1 className="text-xl font-medium">
              {steps.find(s => s.number === currentStep)?.title}
            </h1>
          </div>
          <Settings size={20} className="text-yellow-500" />
        </div>

        {renderStepIndicator()}

        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
      </div>
    </div>
  );
};

export default DeFiInterface;