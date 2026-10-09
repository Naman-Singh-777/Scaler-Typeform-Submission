'use client';
import '@fontsource-variable/hanken-grotesk';
import '@fontsource-variable/newsreader';
import './landing.css';
import { useEffect, useState } from 'react';
import { api, getToken } from '@/lib/api';
import { INTEGRATIONS, STORIES, Integration, Story } from '@/lib/landingContent';
import { useReveal } from './useReveal';
import Nav from './Nav';
import Hero from './Hero';
import { Transition, ProductSections, Customers, Stories, Integrations, Cta } from './Sections';
import Footer from './Footer';
import CookieBar from './CookieBar';
import TyChat from './TyChat';
import ContactSalesModal from './ContactSalesModal';
import { LogoIcon } from './Logo';

export default function Landing() {
  const [contact, setContact] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [stories, setStories] = useState<Story[]>(STORIES);
  const [integrations, setIntegrations] = useState<Integration[]>(INTEGRATIONS);
  useReveal();

  useEffect(() => {
    // Stories + integrations come from the API (static copy is the fallback if the backend is down).
    api.siteContent().then((c) => {
      if (c.stories?.length) setStories(c.stories);
      if (c.integrations?.length) setIntegrations(c.integrations);
    }).catch(() => {});
    if (getToken()) api.me().then(() => setAuthed(true)).catch(() => setAuthed(false));
  }, []);

  return (
    <div className="lp">
      <Nav onContact={() => setContact(true)} authed={authed} />
      <main>
        <Hero authed={authed} />
        <Transition />
        <ProductSections authed={authed} />
        <Customers />
        <Stories stories={stories} />
        <Integrations items={integrations} />
        <Cta authed={authed} />
      </main>
      <Footer onContact={() => setContact(true)} />
      <TyChat authed={authed} onContact={() => setContact(true)} />
      <CookieBar />
      {contact && <ContactSalesModal onClose={() => setContact(false)} />}
    </div>
  );
}
