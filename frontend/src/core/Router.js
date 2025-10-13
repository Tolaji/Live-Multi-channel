export class Router {
  constructor() {
    this.routes = new Map()
    this.currentPath = window.location.pathname
  }

  addRoute(path, handler) {
    this.routes.set(path, handler)
  }

  start() {
    window.addEventListener('popstate', () => {
      this.currentPath = window.location.pathname
      this.handleRoute()
    })

    this.handleRoute()
  }

  handleRoute() {
    for (const [path, handler] of this.routes) {
      if (path === '*' || this.currentPath === path) {
        handler()
        break
      }
    }
  }

  navigate(path) {
    window.history.pushState({}, '', path)
    this.currentPath = path
    this.handleRoute()
  }
}