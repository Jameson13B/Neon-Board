import DefaultTheme from "vitepress/theme"
import "../../assets/styles.css"

import { h } from "vue"
import "./custom.css"

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      // This slot places the banner above the navigation bar
      "layout-top": () =>
        h(
          "div",
          { class: "beta-banner" },
          "🚨 Neon Board is currently in Beta. Some features may not work as expected. Breaking changes expected. 🚨",
        ),
    })
  },
}
