import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './styles/base.css'
import App from './App.vue'
import { useEventsStore } from './stores/eventsStore'

async function bootstrap() {
  const app = createApp(App)
  const pinia = createPinia()
  app.use(pinia)
  // 启动前完成事件加载：避免首帧后异步填充造成的编辑/删除竞态
  await useEventsStore(pinia).init()
  app.mount('#app')
}

void bootstrap()
