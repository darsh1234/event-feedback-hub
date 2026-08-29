import { ApolloProvider } from '@apollo/client/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './index.css'
import App from './App'
import { apolloClient } from './apollo/client'

// Provide one Apollo cache and transport stack to the entire React tree.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ApolloProvider client={apolloClient}>
      <App />
    </ApolloProvider>
  </StrictMode>,
)
