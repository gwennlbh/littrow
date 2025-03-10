declare global {
  interface ArkEnv {
    meta(): {
      // meta properties should always be optional
      ["@littrow"]?: {
        indexes: string[]
      }
    }
  }
}

export {}
