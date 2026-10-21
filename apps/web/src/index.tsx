import React from 'react';
import ReactDOM from 'react-dom/client';
import { ApolloProvider } from '@apollo/client';
import { Provider } from 'react-redux';
import { apolloClient } from './graphql/client';
import { store } from './store';
import { App } from './App';
import './global.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Failed to find root element with id "root"');
}

const root = ReactDOM.createRoot(container);

root.render(
  <React.StrictMode>
    <Provider store={store}>
      <ApolloProvider client={apolloClient}>
        <App />
      </ApolloProvider>
    </Provider>
  </React.StrictMode>,
);
