import { useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import Layout from '@/react-app/components/Layout';

export default function Codes() {
  const navigate = useNavigate();

  const codes = [
    { code: '51', description: 'Busy' },
    { code: '59', description: 'Shutting Off' },
    { code: '82', description: 'Stabbing' },
    { code: '91', description: 'Mission Accomplished!' },
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
          <h2 className="text-2xl font-bold text-blue-600">Codes</h2>
          <div className="w-16" /> {/* Spacer */}
        </div>

        {/* Codes List */}
        <div className="bg-black/20 backdrop-blur border border-accent/30 rounded-lg p-6">
          <ul className="space-y-4">
            {codes.map((item, index) => (
              <li 
                key={index}
                className="flex items-center justify-between p-4 bg-black/30 rounded-lg border border-accent/20"
              >
                <span className="text-2xl font-bold text-accent">
                  {item.code}
                </span>
                <span className="text-lg text-white">
                  {item.description}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Additional Info */}
        <div className="mt-6 bg-blue-900/20 backdrop-blur border border-blue-500/30 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-400 mb-2">
            Communication Codes
          </h3>
          <p className="text-gray-300 text-sm">
            These standardized codes help maintain clear and efficient communication 
            during patrol operations. Use them in radio communications and status updates.
          </p>
        </div>
      </div>
    </Layout>
  );
}
