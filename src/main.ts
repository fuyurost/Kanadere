import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './styles/base.css'
import App from './App.vue'
import { useEventsStore } from './stores/eventsStore'

async function bootstrap() {
  // 禁用右键浏览器菜单（桌面 WebView2 与浏览器一致，含触屏长按菜单）
  window.addEventListener('contextmenu', (e) => e.preventDefault())
  const app = createApp(App)
  const pinia = createPinia()
  app.use(pinia)
  // 启动前完成事件加载：避免首帧后异步填充造成的编辑/删除竞态
  await useEventsStore(pinia).init()
  app.mount('#app')
}

void bootstrap()
