export const globalStyles = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html, body {
    width: 100%;
    height: 100%;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background-color: #ECEFF3;
    color: #1C1C1E;
    overflow-x: hidden;
  }

  #root {
    width: 100%;
    height: auto;
    box-sizing: border-box;
  }

  main {
    width: 100%;
    box-sizing: border-box;
  }

  /* Scrollbar styling */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: #ECEFF3;
  }

  ::-webkit-scrollbar-thumb {
    background: #C7C7CC;
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: #8E8E93;
  }

  /* Selection */
  ::selection {
    background-color: #D6C9FF;
    color: #1C1C1E;
  }

  ::-moz-selection {
    background-color: #D6C9FF;
    color: #1C1C1E;
  }

  /* Focus styles */
  button:focus-visible,
  a:focus-visible {
    outline: 2px solid #D6C9FF;
    outline-offset: 2px;
  }

  /* Button resets */
  button {
    font-family: inherit;
    cursor: pointer;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Input resets */
  input, textarea, select {
    font-family: inherit;
    font-size: inherit;
  }

  /* Link styles */
  a {
    color: inherit;
    text-decoration: none;
  }

  /* Mobile optimizations */
  @media (max-width: 768px) {
    body {
      font-size: 14px;
    }

    button {
      -webkit-tap-highlight-color: transparent;
    }
  }

  @media (max-width: 480px) {
    h1 {
      font-size: 20px !important;
    }

    h2 {
      font-size: 16px !important;
    }

    body {
      font-size: 13px;
    }
  }
`;
