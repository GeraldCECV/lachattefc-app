import '@testing-library/jest-dom'

// Mock Firebase
vi.mock('../firebase/config', () => ({
  auth: {},
  db: {},
}))

// Mock OneSignal
global.OneSignal = {
  push: vi.fn(),
  init: vi.fn(),
  showSlidedown: vi.fn(),
}
