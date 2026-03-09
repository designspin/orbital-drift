import DefaultTheme from 'vitepress/theme';
import CustomLayout from './CustomLayout.vue';
import DemoModal from './components/DemoModal.vue';
import './style.css';

export default {
  ...DefaultTheme,
  Layout: CustomLayout,
  enhanceApp({ app }) {
    app.component('DemoModal', DemoModal);
  },
};
