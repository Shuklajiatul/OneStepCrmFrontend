"use client"

import { useState, useEffect } from "react"
import Sidebar from "./component/sidebar";
import Topbar from "./component/topbar";
import CustomFormPage from "./custom-form/page";
import MyFormsPage from "./my-forms/page"
import FormAnalyticsPage from "./form-analytics/page"
import CustomTableBuilder from "./custom-table-builder/page"
import LeadsPage from "./component/leadPage/page"
import { cn } from "@/lib/utils";

export default function Home() {
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard")
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed)
  }

  // UPDATE THIS renderContent FUNCTION
  const renderContent = () => {
    switch (activeTab) {
      case "leads": // ADD THIS CASE
        return <LeadsPage />
      case "custom-form":
        return <CustomFormPage />
      case "my-forms":
        return <MyFormsPage />
      case "form-analytics":
        return <FormAnalyticsPage />
      case "custom-table":
        return <CustomTableBuilder />
      case "dashboard":
      default:
        return (
          <div className="p-8">
            <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome to your CRM dashboard. Select "Leads" to manage your contacts or "Custom Form" to start building forms.
            </p>
          </div>
        )
    }
  }

  return (
    <main className="min-h-screen bg-background">
      {!isCollapsed && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsCollapsed(true)}
        />
      )}
      
      <div className="flex min-h-screen">
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab}
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
        />
        <section className={cn(
          "flex-1 transition-all duration-300 flex flex-col min-h-screen overflow-hidden",
          isCollapsed ? "md:ml-0" : "md:ml-0"
        )}>
          <div className="p-4 border-b border-border bg-card/50">
            <Topbar 
              darkMode={darkMode} 
              toggleDarkMode={toggleDarkMode}
              toggleSidebar={toggleSidebar}
            />
          </div>
          <div className="flex-1 p-4 md:p-6 bg-background overflow-x-hidden">
            {renderContent()}
          </div>
        </section>
      </div>  
    </main>
  );
}