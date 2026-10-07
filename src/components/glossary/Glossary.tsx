import { GLOSSARY_CATEGORIES, loadGlossary } from '@/lib/glossary';
import { GlossaryBrowser } from './GlossaryBrowser';

export function Glossary() {
  return <GlossaryBrowser terms={loadGlossary()} categories={GLOSSARY_CATEGORIES} />;
}
