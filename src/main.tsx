import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { LearningProvider } from './learning/LearningProvider';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><LearningProvider><App/></LearningProvider></React.StrictMode>);
