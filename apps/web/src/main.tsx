import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { sepolia } from '@starknet-react/chains';
import {
  argent,
  braavos,
  jsonRpcProvider,
  StarknetConfig,
  useInjectedConnectors,
} from '@starknet-react/core';
import App from './App.tsx';
import './index.css';

const rpcUrl =
  import.meta.env.VITE_STARKNET_RPC_URL || 'https://starknet-sepolia.drpc.org';

const provider = jsonRpcProvider({
  rpc: () => ({ nodeUrl: rpcUrl }),
});

function StarknetProvider({ children }: { children: React.ReactNode }) {
  const { connectors } = useInjectedConnectors({
    recommended: [argent(), braavos()],
    includeRecommended: 'always',
    order: 'alphabetical',
    shimLegacyConnectors: ['argentX', 'braavos'],
  });

  return (
    <StarknetConfig
      autoConnect
      chains={[sepolia]}
      connectors={connectors}
      defaultChainId={sepolia.id}
      provider={provider}
    >
      {children}
    </StarknetConfig>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StarknetProvider>
      <App />
    </StarknetProvider>
  </StrictMode>,
);
