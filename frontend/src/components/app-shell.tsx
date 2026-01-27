'use client';

import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Navbar } from '@/components/navbar';
import { motion } from 'framer-motion';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;

    const setProp = (el: HTMLElement, prop: string, value: string) => {
      el.style.setProperty(prop, value, 'important');
    };

    const clearProp = (el: HTMLElement, prop: string) => {
      el.style.removeProperty(prop);
    };

    const applyFix = () => {
      if (body.hasAttribute('data-scroll-locked')) {
        setProp(body, 'margin-right', '0px');
        setProp(body, 'padding-right', '0px');
        setProp(body, 'overflow-y', 'scroll');
        setProp(body, '--removed-body-scroll-bar-size', '0px');
        setProp(html, 'margin-right', '0px');
        setProp(html, 'padding-right', '0px');
        setProp(html, 'overflow-y', 'scroll');
      } else {
        clearProp(body, 'margin-right');
        clearProp(body, 'padding-right');
        clearProp(body, 'overflow-y');
        clearProp(body, '--removed-body-scroll-bar-size');
        clearProp(html, 'margin-right');
        clearProp(html, 'padding-right');
        clearProp(html, 'overflow-y');
      }
    };

    applyFix();
    const observer = new MutationObserver(applyFix);
    observer.observe(body, {
      attributes: true,
      attributeFilter: ['data-scroll-locked'],
    });

    return () => {
      observer.disconnect();
      clearProp(body, 'margin-right');
      clearProp(body, 'padding-right');
      clearProp(body, 'overflow-y');
      clearProp(body, '--removed-body-scroll-bar-size');
      clearProp(html, 'margin-right');
      clearProp(html, 'padding-right');
      clearProp(html, 'overflow-y');
    };
  }, []);

  return (
    <div className="min-h-screen bg-background transition-colors duration-300 text-foreground overflow-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 h-[32rem] w-[32rem] rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-[-12rem] right-[-6rem] h-[28rem] w-[28rem] rounded-full bg-emerald-500/25 blur-3xl" />
        <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(rgba(16,185,129,0.18)_1px,transparent_1px)] [background-size:26px_26px]" />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(3,105,161,0.06),transparent_40%,rgba(16,185,129,0.12))]" />
      </div>
      <Navbar />
      <main className="relative z-10 mx-auto max-w-7xl px-4 pb-16 pt-28 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="space-y-10"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
