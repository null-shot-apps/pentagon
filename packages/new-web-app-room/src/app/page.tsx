import { Header } from '../components/Header';
import { MatchList } from '../components/MatchList';
import { UserDashboard } from '../components/UserDashboard';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-4">
            AI Football Prediction Market
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Bet on Premier League matches with AI-powered odds calculation. 
            Secure, transparent, and powered by Polygon blockchain.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <MatchList />
          </div>
          <div className="lg:col-span-1">
            <UserDashboard />
          </div>
        </div>
      </main>
    </div>
  );
}
