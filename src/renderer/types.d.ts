import type { SecureApi } from '../../electron/preload'

declare global {
  interface Window {
    secureApi: SecureApi
  }
}
