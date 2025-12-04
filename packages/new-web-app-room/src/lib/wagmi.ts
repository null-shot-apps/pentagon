import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { polygon, polygonMumbai, localhost } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'AI Football Prediction Market',
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || 'demo-project-id',
  chains: [
    localhost,
    polygon,
    polygonMumbai,
  ],
  ssr: true,
});

// Contract addresses (from deployment)
export const CONTRACTS = {
  POL_TOKEN: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  PREDICTION_MARKET: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
} as const;

