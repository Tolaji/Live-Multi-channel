import { App } from './App.js'
import { ToastProvider } from './components/Toast.js'
import { ErrorBoundary } from './components/ErrorBoundary.js'

class Main {
  constructor() {
    this.root = document.getElementById('root')
    this.render()
  }

  render() {
    this.root.innerHTML = `
      <div id="error-boundary">
        <div id="toast-provider">
          <div id="app"></div>
        </div>
      </div>
    `

    const errorBoundary = new ErrorBoundary()
    const toastProvider = new ToastProvider()
    const app = new App()

    errorBoundary.mount(document.getElementById('error-boundary'))
    toastProvider.mount(document.getElementById('toast-provider'))
    app.mount(document.getElementById('app'))
  }
}

new Main()