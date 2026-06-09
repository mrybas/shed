import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { I18nProvider } from './i18n/I18nContext.jsx'
import './styles/tokens.css'
import './styles/app.css'
import './styles/pages.css'
import './styles/pages2.css'
import './styles/v2-extra.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </React.StrictMode>,
)
