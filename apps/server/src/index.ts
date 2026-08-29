import { createApp } from './app.js'

const port = 4000
const app = createApp()

app.listen(port, () => {
  console.log(`Event Feedback Hub API listening on http://localhost:${port}`)
})
