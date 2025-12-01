"use client"

export default function Home() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
      <p className="text-muted-foreground">
        Welcome to your CRM dashboard. Select &quot;Leads&quot; to manage your contacts or &quot;Custom Form&quot; to start building forms.
      </p>
    </div>
  );
}