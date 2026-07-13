import { createRoot } from 'react-dom/client';
import './styles/desktop.css';
import { App } from './App';

const element = document.getElementById('root');
if (element) createRoot(element).render(<App />);
