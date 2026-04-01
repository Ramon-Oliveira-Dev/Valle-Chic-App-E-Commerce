import React, { createContext, useContext, useState, useEffect } from 'react';

type ThemeContextType = {
  isNavyTheme: boolean;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isNavyTheme, setIsNavyTheme] = useState(() => {
    const saved = localStorage.getItem('vallechic-theme');
    return saved === 'navy';
  });

  useEffect(() => {
    localStorage.setItem('vallechic-theme', isNavyTheme ? 'navy' : 'brown');
    
    // Update body class for global styling if needed
    if (isNavyTheme) {
      document.body.classList.add('theme-navy');
      document.body.classList.remove('theme-brown');
    } else {
      document.body.classList.add('theme-brown');
      document.body.classList.remove('theme-navy');
    }
  }, [isNavyTheme]);

  const toggleTheme = () => setIsNavyTheme(prev => !prev);

  return (
    <ThemeContext.Provider value={{ isNavyTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
