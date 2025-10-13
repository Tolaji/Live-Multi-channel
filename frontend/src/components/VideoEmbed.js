export class VideoEmbed {
  constructor() {
    this.videoId = null
    this.channelTitle = ''
    this.onReady = null
  }

  mount(container) {
    this.container = container
    this.render()
  }

  render() {
    if (!this.videoId) {
      this.container.innerHTML = '<div class="text-white p-4">No video selected</div>'
      return
    }

    this.container.innerHTML = `
      <iframe
        src="https://www.youtube.com/embed/${this.videoId}?autoplay=1&enablejsapi=1"
        title="${this.channelTitle}"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
        class="w-full h-full"
        onload="this.parentElement.component.handlePlayerReady()"
      ></iframe>
    `

    this.container.component = this
  }

  handlePlayerReady() {
    if (this.onReady) {
      this.onReady()
    }
  }
}