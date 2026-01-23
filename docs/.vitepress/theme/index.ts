import DefaultTheme from 'vitepress/theme';
import DemoModal from './components/DemoModal.vue';
import './style.css';

export default {
  ...DefaultTheme,
  enhanceApp({ app }) {
    app.component('DemoModal', DemoModal);
  },
};
