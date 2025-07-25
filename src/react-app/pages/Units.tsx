import { useNavigate } from 'react-router';
import { ArrowLeft, Shield } from 'lucide-react';
import Layout from '@/react-app/components/Layout';

export default function Units() {
  const navigate = useNavigate();

  const units = [
    { id: 1, role: 'Director', unit: '82' },
    { id: 2, role: 'Assistant Director', unit: '83' },
    { id: 3, role: 'Coordinator', unit: '95' },
    { id: 4, role: 'Coordinator', unit: '93' },
    { id: 5, role: 'Operator', unit: '92' },
    { id: 6, role: 'Central', unit: '101' },
  ];

  return (
    <Layout>
      <div className="container max-w-2xl mx-auto mt-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center space-x-2 text-accent hover:text-accent/80 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          <h2 className="text-2xl font-bold text-blue-600">Our Units</h2>
          <div className="w-16" /> {/* Spacer */}
        </div>

        {/* Units List */}
        <div className="bg-black/20 backdrop-blur border border-accent/30 rounded-lg p-6">
          <ol className="space-y-4">
            {units.map((unit) => (
              <li 
                key={unit.id}
                className="flex items-center justify-between p-4 bg-black/30 rounded-lg border border-accent/20"
              >
                <div className="flex items-center space-x-3">
                  <Shield className="w-5 h-5 text-accent" />
                  <span className="text-lg text-white">
                    {unit.role}
                  </span>
                </div>
                <span className="text-2xl font-bold text-accent">
                  {unit.unit}
                </span>
              </li>
            ))}
          </ol>
        </div>

        {/* Additional Info */}
        <div className="mt-6 bg-blue-900/20 backdrop-blur border border-blue-500/30 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-400 mb-2">
            Unit Hierarchy
          </h3>
          <p className="text-gray-300 text-sm">
            Our patrol units are organized in a clear command structure to ensure 
            effective coordination and response during safety operations. Each unit 
            has specific responsibilities and reporting lines.
          </p>
        </div>
      </div>
    </Layout>
  );
}
