import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function MainLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 antialiased">
      {/* Fixed top Navbar */}
      <Navbar />

      {/* 
        Main content wrapper:
        Automatically adds padding-top equal to the fixed navbar height (pt-16 = 64px),
        ensuring headers, hero sections, forms, and cards start cleanly below the navbar on all screen sizes.
      */}
      <main className="flex-1 w-full pt-16 flex flex-col min-h-0">
        {children ? children : <Outlet />}
      </main>
    </div>
  );
}
