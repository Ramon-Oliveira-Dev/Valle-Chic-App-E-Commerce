import React, { createContext, useContext, useState, useEffect } from 'react';

type ThemeContextType = {
  isNavyTheme: boolean;
  toggleTheme: () => void;
  isDesktopSidebarCollapsed: boolean;
  toggleDesktopSidebar: () => void;
  setDesktopSidebarCollapsed: (collapsed: boolean) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isNavyTheme, setIsNavyTheme] = useState(() => {
    const saved = localStorage.getItem('Valle Chic-theme');
    return saved === 'navy';
  });

  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('vc_desktop_sidebar_collapsed');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('Valle Chic-theme', isNavyTheme ? 'navy' : 'brown');
    
    // Update body class for global styling if needed
    if (isNavyTheme) {
      document.body.classList.add('theme-navy');
      document.body.classList.remove('theme-brown');
    } else {
      document.body.classList.add('theme-brown');
      document.body.classList.remove('theme-navy');
    }
  }, [isNavyTheme]);

  useEffect(() => {
    localStorage.setItem('vc_desktop_sidebar_collapsed', isDesktopSidebarCollapsed ? 'true' : 'false');
  }, [isDesktopSidebarCollapsed]);

  const toggleTheme = () => setIsNavyTheme(prev => !prev);
  const toggleDesktopSidebar = () => setIsDesktopSidebarCollapsed(prev => !prev);
  const setDesktopSidebarCollapsed = (collapsed: boolean) => setIsDesktopSidebarCollapsed(collapsed);

  return (
    <ThemeContext.Provider value={{ 
      isNavyTheme, 
      toggleTheme, 
      isDesktopSidebarCollapsed, 
      toggleDesktopSidebar, 
      setDesktopSidebarCollapsed 
    }}>
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

